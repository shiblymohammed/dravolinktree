import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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
