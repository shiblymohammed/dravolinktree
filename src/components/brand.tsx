import Link from "next/link";
import Image from "next/image";
export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="DravoHome home" className={`brand ${light ? "brand-light" : ""}`}><Image src="/DRAVO_HOME_logo.png" alt="DravoHome" width={120} height={48} style={{ height: 48, width: "auto" }} /></Link>;
}
