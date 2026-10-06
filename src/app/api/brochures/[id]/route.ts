import { NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { readDatabase, updateBrochure, removeBrochure } from "@/lib/store";
import { removePdf, servePdf } from "@/lib/pdf-storage";
import { StorageConfigurationError } from "@/lib/r2";
import { brochureFields } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const brochure = (await readDatabase()).brochures.find(item => item.id === id);
  if (!brochure || (!brochure.published && !await isAuthenticated())) return NextResponse.json({ error: "Brochure not found." }, { status: 404 });
  if (!/^[a-f0-9-]+\.pdf$/i.test(brochure.filename)) return NextResponse.json({ error: "Brochure not found." }, { status: 404 });
  try {
    const download = new URL(request.url).searchParams.get("download") === "1";
    return await servePdf(brochure, download);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || ["NoSuchKey", "NotFound"].includes((error as Error).name)) return NextResponse.json({ error: "This PDF is currently unavailable." }, { status: 404 });
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  const denial = await guard(request); if (denial) return denial;
  const { id } = await context.params;
  let fields;
  try { fields = brochureFields(await request.json()); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    const db = await readDatabase();
    const item = db.brochures.find(b => b.id === id);
    if (!item) return NextResponse.json({ error: "Brochure not found." }, { status: 404 });
    Object.assign(item, fields);
    await updateBrochure(item);
    return NextResponse.json({ brochure: item });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  const denial = await guard(request); if (denial) return denial;
  const { id } = await context.params;
  try {
    const brochure = (await readDatabase()).brochures.find(item => item.id === id);
    if (!brochure) return NextResponse.json({ error: "Brochure not found." }, { status: 404 });
    await removePdf(brochure.filename, brochure.storage || "local");
    await removeBrochure(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    return errorResponse(error);
  }
}
