import { categories, type Category, type Settings } from "./types";
export const MAX_PDF_SIZE = 20 * 1024 * 1024;
export function validatePdf(buffer: Uint8Array, name: string) {
  if (!name.toLowerCase().endsWith(".pdf")) throw new Error("Please choose a PDF file.");
  if (!buffer.length || buffer.length > MAX_PDF_SIZE) throw new Error("PDFs must be between 1 byte and 20 MB.");
  if (Buffer.from(buffer.subarray(0, 5)).toString() !== "%PDF-") throw new Error("This file does not contain a valid PDF header.");
  if (!Buffer.from(buffer.subarray(Math.max(0, buffer.length - 2048))).toString().includes("%%EOF")) throw new Error("This PDF is incomplete or damaged.");
}
export function brochureFields(input: Record<string, unknown>) {
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const category = String(input.category ?? "");
  if (!title || title.length > 100) throw new Error("Enter a brochure title between 1 and 100 characters.");
  if (description.length > 350) throw new Error("Keep the description under 350 characters.");
  if (!categories.includes(category as Category)) throw new Error("Choose a valid collection.");
  if (input.published !== undefined && typeof input.published !== "boolean") throw new Error("Invalid publication status.");
  return { title, description, category: category as Category, published: input.published !== false };
}
export function validateSettings(input: Record<string, unknown>): Settings {
  const result = Object.fromEntries(["instagram", "facebook", "whatsapp", "phone", "address", "hours"].map(key => [key, String(input[key] ?? "").trim()])) as Settings;
  for (const key of ["instagram", "facebook"] as const) {
    if (!result[key]) continue;
    let url: URL;
    try { url = new URL(result[key]); } catch { throw new Error(`Enter a complete ${key} URL.`); }
    const domain = key === "instagram" ? "instagram.com" : "facebook.com";
    if (url.protocol !== "https:" || !(url.hostname === domain || url.hostname.endsWith(`.${domain}`)) || url.username || url.password || result[key].length > 500) throw new Error(`Use an https://${domain} link.`);
  }
  for (const key of ["whatsapp", "phone"] as const) {
    if (result[key] && !/^\+?[\d\s()-]{7,24}$/.test(result[key])) throw new Error(`Enter a valid ${key} number with country code.`);
    const digits = result[key].replace(/\D/g, "");
    if (result[key] && (digits.length < 7 || digits.length > 15)) throw new Error(`Enter a valid ${key} number with country code.`);
  }
  if (result.address.length > 300 || result.hours.length > 150) throw new Error("Please shorten the address or opening hours.");
  return result;
}
