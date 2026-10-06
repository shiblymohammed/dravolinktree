import "server-only";
import { sql } from "@vercel/postgres";
import type { Brochure, Database, Settings, CarouselImage } from "./types";

export async function readDatabase(): Promise<Database> {
  const [brochuresData, carouselData, settingsData] = await Promise.all([
    sql`SELECT * FROM brochures ORDER BY "createdAt" DESC;`,
    sql`SELECT * FROM carousel_images ORDER BY "order" ASC;`,
    sql`SELECT * FROM settings WHERE id = 1;`
  ]);

  return {
    brochures: brochuresData.rows as Brochure[],
    carouselImages: carouselData.rows as CarouselImage[],
    settings: (settingsData.rows[0] as Settings) || { instagram: "", facebook: "", whatsapp: "", phone: "", address: "", hours: "" }
  };
}

export async function saveSettings(settings: Settings) {
  await sql`
    INSERT INTO settings (id, instagram, facebook, whatsapp, phone, address, hours)
    VALUES (
      1,
      ${settings.instagram},
      ${settings.facebook},
      ${settings.whatsapp},
      ${settings.phone},
      ${settings.address},
      ${settings.hours}
    )
    ON CONFLICT (id) DO UPDATE SET 
      instagram = EXCLUDED.instagram,
      facebook = EXCLUDED.facebook,
      whatsapp = EXCLUDED.whatsapp,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      hours = EXCLUDED.hours;
  `;
}

export async function insertBrochure(b: Brochure) {
  await sql`
    INSERT INTO brochures (id, title, category, description, published, filename, storage, "originalName", size, "createdAt")
    VALUES (${b.id}, ${b.title}, ${b.category}, ${b.description}, ${b.published}, ${b.filename}, ${b.storage}, ${b.originalName}, ${b.size}, ${b.createdAt});
  `;
}

export async function updateBrochure(b: Brochure) {
  await sql`
    UPDATE brochures SET 
      title = ${b.title}, category = ${b.category}, description = ${b.description}, published = ${b.published}
    WHERE id = ${b.id};
  `;
}

export async function removeBrochure(id: string) {
  await sql`DELETE FROM brochures WHERE id = ${id};`;
}

export async function insertCarouselImage(img: CarouselImage) {
  await sql`
    INSERT INTO carousel_images (id, alt, filename, "order", "createdAt")
    VALUES (${img.id}, ${img.alt}, ${img.filename}, ${img.order}, ${img.createdAt});
  `;
}

export async function updateCarouselImageOrder(id: string, order: number) {
  await sql`UPDATE carousel_images SET "order" = ${order} WHERE id = ${id};`;
}

export async function removeCarouselImage(id: string) {
  await sql`DELETE FROM carousel_images WHERE id = ${id};`;
}

export async function listBrochures(publishedOnly = true): Promise<Brochure[]> {
  const query = publishedOnly 
    ? sql`SELECT * FROM brochures WHERE published = true ORDER BY "createdAt" DESC;`
    : sql`SELECT * FROM brochures ORDER BY "createdAt" DESC;`;
  const result = await query;
  return result.rows as Brochure[];
}

export async function listCarouselImages(): Promise<CarouselImage[]> {
  const result = await sql`SELECT * FROM carousel_images ORDER BY "order" ASC;`;
  return result.rows as CarouselImage[];
}
