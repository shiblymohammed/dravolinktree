import "server-only";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Brochure, Database } from "./types";
export const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
export const uploadsDirectory = path.join(dataDirectory, "uploads");
const databasePath = path.join(dataDirectory, "database.json");
const emptyDatabase: Database = { brochures: [], settings: { instagram: "", facebook: "", whatsapp: "", phone: "", address: "", hours: "" }, carouselImages: [] };
const globalState = globalThis as typeof globalThis & { dravoWriteQueue?: Promise<unknown> };
export async function readDatabase(): Promise<Database> {
  try { return JSON.parse(await readFile(databasePath, "utf8")) as Database; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(emptyDatabase); throw error; }
}
export async function updateDatabase<T>(mutate: (database: Database) => T | Promise<T>): Promise<T> {
  const task = (globalState.dravoWriteQueue || Promise.resolve()).then(async () => {
    await mkdir(uploadsDirectory, { recursive: true });
    const database = await readDatabase();
    const result = await mutate(database);
    const temporary = `${databasePath}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, JSON.stringify(database, null, 2), { mode: 0o600 }); await rename(temporary, databasePath); }
    catch (error) { await unlink(temporary).catch(() => {}); throw error; }
    return result;
  });
  globalState.dravoWriteQueue = task.catch(() => {});
  return task;
}
export async function listBrochures(publishedOnly = true): Promise<Brochure[]> {
  const { brochures } = await readDatabase();
  return brochures.filter(item => !publishedOnly || item.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function listCarouselImages() {
  const { carouselImages } = await readDatabase();
  return (carouselImages || []).slice().sort((a, b) => a.order - b.order);
}
