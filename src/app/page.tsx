import Image from "next/image";
import { ArrowDown, ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ContactLinks } from "@/components/contact-links";
import { Carousel } from "@/components/carousel";
import { readDatabase } from "@/lib/store";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { settings, carouselImages } = await readDatabase();
  const sortedImages = (carouselImages || []).slice().sort((a, b) => a.order - b.order);
  return <div className="site-shell"><Header /><main><section className="home-grid"><Carousel images={sortedImages} /><div className="home-content"><div className="welcome-eyebrow"><span /> WELCOME TO DRAVOHOME</div><h1>Make yourself<br />at <em>home.</em><span className="heading-star"><Sparkles size={29} strokeWidth={1} /></span></h1><p className="home-intro">Furniture with feeling. Spaces with soul.<br />Your next chapter of beautiful living starts here.</p><ContactLinks settings={settings} /><div className="home-note"><span className="little-dot" /> A little inspiration. A world of possibilities.</div></div></section><section className="brand-strip"><div className="strip-intro"><span className="eyebrow">CURATED WITH CARE</span><span>Every room. Every feeling.</span></div><div className="strip-collections"><span>Living</span><span className="collection-divider" /><span>Dining</span><span className="collection-divider" /><span>Bedroom</span><span className="collection-divider" /><span>Outdoor</span></div><a className="strip-explore" href="#experience">Discover DravoHome <ArrowDown size={16} /></a></section><section className="experience-section" id="experience"><div className="experience-title"><span className="eyebrow">MORE THAN A SHOWROOM</span><h2>Come for the furniture.<br /><em>Stay for the feeling.</em></h2></div><div className="experience-details"><p>Touch the textures. Find your favourite corner. Imagine what's possible. Our experience centre brings beautiful design a little closer to home.</p>{settings.address ? <div className="address-line"><MapPin size={18} strokeWidth={1.4} /><div><span>{settings.address}</span>{settings.hours && <small>{settings.hours}</small>}</div></div> : <div className="experience-signature"><span className="little-dot" /> Thoughtfully selected. Made to be lived in.</div>}</div></section></main><Footer /></div>;
}
