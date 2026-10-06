"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, LockKeyhole, LoaderCircle } from "lucide-react";
import { Brand } from "./brand";
export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: fields.get("username"), password: fields.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      router.replace("/admin"); router.refresh();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <main className="login-page"><div className="login-photo"><Image src="/images/hero.png" alt="A thoughtfully curated living space" fill priority sizes="50vw" /><div className="photo-shade" /><div className="login-brand"><Brand light /></div><div className="login-photo-copy"><span className="eyebrow">THE DRAVOHOME STUDIO</span><h2>Beautiful living.<br /><em>Thoughtfully managed.</em></h2></div></div><div className="login-side"><Link href="/" className="login-back"><ArrowLeft size={16} /> Back to DravoHome</Link><div className="login-form-wrap"><span className="login-lock"><LockKeyhole size={23} strokeWidth={1.2} /></span><span className="eyebrow">WELCOME TO THE STUDIO</span><h1>A little behind<br /><em>the beautiful.</em></h1><p>Sign in to curate your brochure collection<br />and keep DravoHome connected.</p><form onSubmit={login}><label>Username<input name="username" autoComplete="username" required maxLength={100} placeholder="Enter your username" /></label><label>Password<div className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={1000} placeholder="Enter your password" /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <p className="error-message" role="alert">{error}</p>}<button className="solid-button" disabled={busy} type="submit">{busy ? "Signing in…" : "Enter the studio"}{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUpRight size={17} />}</button></form><span className="login-secure"><LockKeyhole size={12} /> Secure access for the DravoHome team</span></div><span className="login-copyright">© {new Date().getFullYear()} DravoHome. The art of living well.</span></div></main>;
}
