import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowUpRight } from "lucide-react";
export default function NotFound() { return <main className="not-found"><Brand /><span className="eyebrow">A LITTLE DETOUR · 404</span><h1>Let’s get you<br /><em>back home.</em></h1><p>This corner of DravoHome doesn’t exist yet.</p><Link href="/" className="solid-button">Back to home <ArrowUpRight size={16} /></Link></main>; }
