import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="DravoHome home" className={`brand ${light ? "brand-light" : ""}`}><span className="brand-symbol" aria-hidden="true"><span /><span /><span /></span><span className="brand-name">dravo<span>home</span><span className="brand-caption">THE ART OF LIVING WELL</span></span></Link>;
}
