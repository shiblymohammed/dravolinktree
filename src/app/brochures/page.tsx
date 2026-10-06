import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BrochureLibrary } from "@/components/brochure-library";
import { listBrochures } from "@/lib/store";
export const metadata: Metadata = { title: "The brochure collection" };
export const dynamic = "force-dynamic";
export default async function BrochuresPage() {
  const brochures = await listBrochures();
  return <div className="site-shell"><Header library /><main className="library-page"><div className="library-heading"><div><span className="welcome-eyebrow"><span /> A CLOSER LOOK AT BEAUTIFUL LIVING</span><h1>Your home.<br /><em>A world of possibilities.</em></h1></div><p>Take your time. Find your inspiration.<br />Explore our collections, one considered detail at a time.</p></div><BrochureLibrary brochures={brochures} /><div className="library-footnote"><span className="little-dot" /> A collection worth coming home to.<span>PDF brochures · View online or download</span></div></main><Footer /></div>;
}
