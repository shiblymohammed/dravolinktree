import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3001"),
  title: { default: "DravoHome — The art of living well", template: "%s | DravoHome" },
  description: "A premium furniture experience centre. Discover thoughtfully curated furniture, explore our brochures, and connect with DravoHome.",
  openGraph: { title: "DravoHome — The art of living well", description: "Thoughtful furniture. Beautiful spaces. A place to feel at home.", type: "website", images: [{ url: "/images/hero.png", width: 1536, height: 1024, alt: "A warm, thoughtfully curated DravoHome living space" }] },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
