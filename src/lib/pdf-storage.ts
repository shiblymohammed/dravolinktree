import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createR2Storage, readR2Config, StorageConfigurationError } from "./r2";
import { uploadsDirectory } from "./store";
import type { Brochure, StorageKind } from "./types";

export function activeStorage(): StorageKind {
  const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase() || "local";
  if (driver !== "local" && driver !== "r2") throw new StorageConfigurationError("STORAGE_DRIVER must be local or r2.");
  if (driver === "r2") readR2Config();
  return driver;
}

function storageFor(kind: StorageKind) {
  if (kind === "r2") return createR2Storage(readR2Config());
  return null;
}

function localFile(filename: string) {
  if (!/^[a-f0-9-]+\.pdf$/i.test(filename)) throw new Error("Invalid brochure filename.");
  return path.join(uploadsDirectory, filename);
}

export async function savePdf(filename: string, bytes: Uint8Array, kind: StorageKind) {
  const r2 = storageFor(kind);
  if (r2) return r2.put(filename, bytes);
  await mkdir(uploadsDirectory, { recursive: true });
  await writeFile(localFile(filename), bytes, { flag: "wx", mode: 0o600 });
}

export async function removePdf(filename: string, kind: StorageKind) {
  const r2 = storageFor(kind);
  if (r2) return r2.delete(filename);
  await unlink(localFile(filename)).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}

export async function servePdf(brochure: Brochure, download: boolean): Promise<Response> {
  const kind = brochure.storage || "local";
  const r2 = storageFor(kind);
  if (r2 && !download) {
    const url = await r2.previewUrl(brochure.filename);
    return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  }
  const name = brochure.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "dravohome-brochure";
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}.pdf"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
  };
  if (r2) {
    const result = await r2.get(brochure.filename);
    if (result.size !== undefined) headers["Content-Length"] = String(result.size);
    return new Response(result.body, { headers });
  }
  const bytes = await readFile(localFile(brochure.filename));
  headers["Content-Length"] = String(bytes.length);
  return new Response(bytes, { headers });
}
