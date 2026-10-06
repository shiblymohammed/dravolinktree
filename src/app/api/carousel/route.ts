import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import imageSize from "image-size";
import { guard, errorResponse } from "@/lib/api";
import { readDatabase, updateDatabase } from "@/lib/store";
import type { CarouselImage } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const { carouselImages } = await readDatabase();
  const sorted = (carouselImages || []).slice().sort((a, b) => a.order - b.order);
  return NextResponse.json({ carouselImages: sorted });
}

export async function POST(request: NextRequest) {
  const guardResponse = await guard(request);
  if (guardResponse) return guardResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const alt = (formData.get("alt") as string || "").trim();

  if (!file) return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  if (!alt) return NextResponse.json({ error: "Alt text is required." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WebP images are allowed." }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes
    const magicBytes = buffer.subarray(0, 12);
    const isJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF;
    const isPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
    const isWebP = magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46 &&
                   magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42 && magicBytes[11] === 0x50;

    if (!isJPEG && !isPNG && !isWebP) {
      return NextResponse.json({ error: "Invalid image format." }, { status: 400 });
    }

    // Validate image dimensions
    const dimensions = imageSize(buffer);
    if (!dimensions.width || !dimensions.height) {
      return NextResponse.json({ error: "Could not read image dimensions." }, { status: 400 });
    }
    if (dimensions.width < 800 || dimensions.height < 400) {
      return NextResponse.json({ error: "Image must be at least 800×400px." }, { status: 400 });
    }
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio < 0.33 || aspectRatio > 3) {
      return NextResponse.json({ error: "Image aspect ratio must be between 1:3 and 3:1." }, { status: 400 });
    }

    const filename = `${randomUUID()}.${ext}`;
    const carouselDir = path.join(process.cwd(), "public", "images", "carousel");
    await mkdir(carouselDir, { recursive: true });
    const filePath = path.join(carouselDir, filename);
    await writeFile(filePath, buffer);

    const carouselImage = await updateDatabase(db => {
      const maxOrder = Math.max(0, ...(db.carouselImages || []).map(img => img.order));
      const newImage: CarouselImage = {
        id: randomUUID(),
        filename,
        alt,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      };
      db.carouselImages = [...(db.carouselImages || []), newImage];
      return newImage;
    });

    return NextResponse.json({ carouselImage }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
