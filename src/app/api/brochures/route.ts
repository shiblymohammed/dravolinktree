import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { guard, errorResponse } from "@/lib/api";
import { insertBrochure } from "@/lib/store";
import { activeStorage, removePdf, savePdf } from "@/lib/pdf-storage";
import { StorageConfigurationError } from "@/lib/r2";
import { brochureFields, validatePdf, MAX_PDF_SIZE } from "@/lib/validation";
import type { Brochure } from "@/lib/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denial = await guard(request); if (denial) return denial;
  let storage;
  try { storage = activeStorage(); }
  catch (error) { if (error instanceof StorageConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 }); throw error; }
  if (Number(request.headers.get("content-length")) > MAX_PDF_SIZE + 1024 * 1024) return NextResponse.json({ error: "The maximum PDF size is 20 MB." }, { status: 413 });
  let data: FormData;
  try { data = await request.formData(); } catch { return NextResponse.json({ error: "Could not read the upload." }, { status: 400 }); }
  const file = data.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  if (file.size > MAX_PDF_SIZE) return NextResponse.json({ error: "The maximum PDF size is 20 MB." }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  let fields;
  try { validatePdf(buffer, file.name); fields = brochureFields({ title: data.get("title"), description: data.get("description"), category: data.get("category"), published: data.get("published") === "true" }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const id = randomUUID();
  const filename = `${id}.pdf`;
  const brochure: Brochure = { id, ...fields, filename, storage, originalName: path.basename(file.name).slice(0, 200), size: file.size, createdAt: new Date().toISOString() };
  let uploaded = false;
  try {
    await savePdf(filename, buffer, storage);
    uploaded = true;
    await insertBrochure(brochure);
    return NextResponse.json({ brochure }, { status: 201 });
  } catch (error) {
    if (uploaded) await removePdf(filename, storage).catch(cleanupError => console.error("Could not clean up failed brochure upload:", cleanupError));
    return errorResponse(error);
  }
}
