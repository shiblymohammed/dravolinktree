import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
export function Header({ library = false }: { library?: boolean }) {
  return <header className="site-header"><Brand /><span className="header-center"><span className="little-dot" /> A PREMIUM FURNITURE EXPERIENCE</span><Link className="header-link" href={library ? "/" : "/brochures"}>{library ? "Back to home" : "The collections"}<ArrowUpRight size={16} /></Link></header>;
}
