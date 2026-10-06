import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Footer() {
  return <footer className="site-footer"><span>© {new Date().getFullYear()} DravoHome. Thoughtfully curated.</span><span className="footer-middle">MADE FOR THE WAY YOU LIVE.</span><Link href="/admin">Partner & admin access <ArrowUpRight size={13} /></Link></footer>;
}
