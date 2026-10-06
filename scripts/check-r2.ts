import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createR2Storage, readR2Config } from "../src/lib/r2";

if (process.env.STORAGE_DRIVER !== "r2") throw new Error("Set STORAGE_DRIVER=r2 in .env.local before checking R2.");
const storage = createR2Storage(readR2Config());
const key = `healthchecks/${randomUUID()}.pdf`;
const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
let uploaded = false;
try {
  await storage.put(key, bytes);
  uploaded = true;
  const preview = await fetch(await storage.previewUrl(key));
  assert.equal(preview.status, 200, "Signed R2 preview did not succeed.");
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), bytes);
  const downloaded = await storage.get(key);
  assert.deepEqual(Buffer.from(await new Response(downloaded.body).arrayBuffer()), bytes);
} finally {
  if (uploaded) await storage.delete(key);
}
console.log("R2 upload, signed preview, download, and deletion check passed.");
