export const categories = ["Living", "Dining", "Bedroom", "Outdoor", "Complete collection"] as const;
export type Category = (typeof categories)[number];
export type StorageKind = "local" | "r2";
export type Brochure = {
  id: string;
  title: string;
  description: string;
  category: Category;
  filename: string;
  /** Older records without this field remain on local disk. */
  storage?: StorageKind;
  originalName: string;
  size: number;
  published: boolean;
  createdAt: string;
};
export type CarouselImage = {
  id: string;
  filename: string;
  alt: string;
  order: number;
  createdAt: string;
};
export type Settings = { instagram: string; facebook: string; whatsapp: string; phone: string; address: string; hours: string };
export type Database = { brochures: Brochure[]; settings: Settings; carouselImages: CarouselImage[] };
