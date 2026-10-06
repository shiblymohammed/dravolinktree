"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Instagram, Facebook, Phone, X, MessageCircle } from "lucide-react";
import type { Settings } from "@/lib/types";
export function ContactLinks({ settings }: { settings: Settings }) {
  const [missing, setMissing] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (missing) dialog.current?.showModal(); else dialog.current?.close(); }, [missing]);
  const links = [
    { label: "Let’s talk on WhatsApp", description: "Your dream space starts with a hello", icon: MessageCircle, value: settings.whatsapp, href: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hello DravoHome! I’d love to explore your furniture collections.")}`, className: "whatsapp-link", name: "WhatsApp" },
    { label: "Find your inspiration", description: "A little DravoHome, on Instagram", icon: Instagram, value: settings.instagram, href: settings.instagram, className: "", name: "Instagram" },
    { label: "Be part of our story", description: "Join our community on Facebook", icon: Facebook, value: settings.facebook, href: settings.facebook, className: "", name: "Facebook" },
    { label: "A conversation away", description: "Call our experience centre", icon: Phone, value: settings.phone, href: `tel:${settings.phone.replace(/[^+\d]/g, "")}`, className: "", name: "Phone" },
  ];
  return <><div className="contact-links">{links.map(({ label, description, icon: Icon, value, href, className, name }, index) => {
    const content = <><span className="link-icon"><Icon size={21} strokeWidth={1.55} /></span><span className="link-copy"><strong>{label}</strong><span>{description}</span></span><ArrowUpRight className="link-arrow" size={19} strokeWidth={1.4} /></>;
    return value ? <a style={{ animationDelay: `${index * 70}ms` }} className={`contact-link ${className}`} key={name} href={href} target={name === "Phone" ? undefined : "_blank"} rel={name === "Phone" ? undefined : "noopener noreferrer"}>{content}</a> : <button style={{ animationDelay: `${index * 70}ms` }} className={`contact-link ${className}`} key={name} onClick={() => setMissing(name)}>{content}</button>;
  })}</div><Link className="brochure-cta" href="/brochures"><BookOpen size={20} strokeWidth={1.5} /><span>Explore our brochures</span><ArrowUpRight size={20} strokeWidth={1.5} /></Link><dialog ref={dialog} className="contact-dialog" onCancel={() => setMissing(null)} onClick={event => { if (event.target === event.currentTarget) setMissing(null); }}><button className="dialog-close icon-button" aria-label="Close" onClick={() => setMissing(null)}><X size={20} /></button><span className="eyebrow">LET’S CONNECT</span><h2>A little more<br />inspiration awaits.</h2><p>Our {missing} details are being updated. In the meantime, make yourself at home and explore our collections.</p><Link className="solid-button" href="/brochures">View brochures <ArrowUpRight size={16} /></Link></dialog></>;
}
