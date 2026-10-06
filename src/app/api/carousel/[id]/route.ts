import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { guard, errorResponse } from "@/lib/api";
import { updateDatabase } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guardResponse = await guard(request);
  if (guardResponse) return guardResponse;

  const { id } = await props.params;
  let body: { alt?: string; order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const carouselImage = await updateDatabase(db => {
      const index = (db.carouselImages || []).findIndex(img => img.id === id);
      if (index === -1) throw new Error("Carousel image not found.");

      if (body.alt !== undefined) db.carouselImages[index].alt = body.alt.trim();
      if (body.order !== undefined) db.carouselImages[index].order = body.order;

      return db.carouselImages[index];
    });

    return NextResponse.json({ carouselImage });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guardResponse = await guard(request);
  if (guardResponse) return guardResponse;

  const { id } = await props.params;

  let filename: string;
  try {
    filename = await updateDatabase(db => {
      const index = (db.carouselImages || []).findIndex(img => img.id === id);
      if (index === -1) throw new Error("Carousel image not found.");
      const { filename } = db.carouselImages[index];
      db.carouselImages.splice(index, 1);
      return filename;
    });
  } catch (error) {
    return errorResponse(error);
  }

  // Delete file after successful database update
  const filePath = path.join(process.cwd(), "public", "images", "carousel", filename);
  try {
    await unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete carousel image file: ${filename}`, error);
  }

  return NextResponse.json({ success: true });
}
