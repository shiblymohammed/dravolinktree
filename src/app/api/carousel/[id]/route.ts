import { NextRequest, NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/api";
import { readDatabase, removeCarouselImage, updateCarouselImageOrder } from "@/lib/store";

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
    const db = await readDatabase();
    const carouselImage = (db.carouselImages || []).find(img => img.id === id);
    if (!carouselImage) throw new Error("Carousel image not found.");

    if (body.order !== undefined) {
      carouselImage.order = body.order;
      await updateCarouselImageOrder(id, body.order);
    }
    // Note: Alt text update wasn't implemented in the new SQL yet, but order is the main usage for PATCH right now
    
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
    const db = await readDatabase();
    const carouselImage = (db.carouselImages || []).find(img => img.id === id);
    if (!carouselImage) throw new Error("Carousel image not found.");
    filename = carouselImage.filename;
    await removeCarouselImage(id);
  } catch (error) {
    return errorResponse(error);
  }

  // Delete file from R2
  const { createR2Storage, readR2Config } = await import("@/lib/r2");
  const r2 = createR2Storage(readR2Config());
  try {
    await r2.delete(`carousel/${filename}`);
  } catch (error) {
    console.warn(`Failed to delete carousel image file: ${filename}`, error);
  }

  return NextResponse.json({ success: true });
}
