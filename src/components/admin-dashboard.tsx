"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Check, ChevronDown, ChevronUp, CircleCheck, Eye, FileText, Image as ImageIcon, LayoutGrid, LoaderCircle, LogOut, Pencil, Plus, Search, Settings2, Trash2, UploadCloud, X } from "lucide-react";
import { Brand } from "./brand";
import { categories, type Brochure, type CarouselImage, type Database, type Settings } from "@/lib/types";
import { formatSize } from "@/lib/format";
import { MAX_PDF_SIZE } from "@/lib/validation";
export function AdminDashboard({ initialData }: { initialData: Database }) {
  const router = useRouter();
  const [tab, setTab] = useState<"brochures" | "settings" | "carousel">("brochures");
  const [brochures, setBrochures] = useState(initialData.brochures.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const [settings, setSettings] = useState(initialData.settings);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>((initialData.carouselImages || []).slice().sort((a, b) => a.order - b.order));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All brochures");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brochure | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Brochure | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [pageError, setPageError] = useState("");
  const [carouselFile, setCarouselFile] = useState<File | null>(null);
  const [carouselAlt, setCarouselAlt] = useState("");
  const [carouselBusy, setCarouselBusy] = useState(false);
  const [carouselError, setCarouselError] = useState("");
  const [carouselDragging, setCarouselDragging] = useState(false);
  const [pendingCarouselDelete, setPendingCarouselDelete] = useState<CarouselImage | null>(null);
  const editDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const carouselDeleteDialog = useRef<HTMLDialogElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const carouselInput = useRef<HTMLInputElement>(null);
  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (modalOpen) editDialog.current?.showModal(); else editDialog.current?.close(); }, [modalOpen]);
  useEffect(() => { if (pendingDelete) deleteDialog.current?.showModal(); else deleteDialog.current?.close(); }, [pendingDelete]);
  useEffect(() => { if (pendingCarouselDelete) carouselDeleteDialog.current?.showModal(); else carouselDeleteDialog.current?.close(); }, [pendingCarouselDelete]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 5000); return () => clearTimeout(timer); }, [notice]);
  const published = brochures.filter(item => item.published).length;
  const shown = brochures.filter(item => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All brochures" || item.published === (filter === "Published")));
  async function request(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    const result = await response.json();
    if (response.status === 401) { router.replace("/admin/login"); throw new Error("Your session expired. Please sign in again."); }
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    return result;
  }
  function openEditor(item: Brochure | null = null) { setEditing(item); setFile(null); setError(""); setModalOpen(true); }
  function chooseFile(chosen?: File) {
    setError("");
    if (!chosen) return;
    if (!chosen.name.toLowerCase().endsWith(".pdf")) { setError("Please select a PDF file."); return; }
    if (chosen.size > MAX_PDF_SIZE) { setError("The maximum PDF size is 20 MB."); return; }
    setFile(chosen);
  }
  function chooseCarouselFile(chosen?: File) {
    setCarouselError("");
    if (!chosen) return;
    const ext = chosen.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) { setCarouselError("Only JPG, PNG, and WebP images are allowed."); return; }
    if (chosen.size > 5 * 1024 * 1024) { setCarouselError("Image must be 5 MB or smaller."); return; }
    setCarouselFile(chosen);
  }
  async function saveBrochure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!editing && !file) { setError("Choose a PDF before uploading."); return; }
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      let result: { brochure: Brochure };
      if (editing) {
        result = await request(`/api/brochures/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: data.get("title"), description: data.get("description"), category: data.get("category"), published: data.get("published") === "on" }) });
        setBrochures(items => items.map(item => item.id === editing.id ? result.brochure : item));
      } else {
        data.set("file", file!); data.set("published", String(data.get("published") === "on"));
        result = await request("/api/brochures", { method: "POST", body: data });
        setBrochures(items => [result.brochure, ...items]);
      }
      setModalOpen(false); setNotice(editing ? "Brochure updated." : "Your brochure has been uploaded."); router.refresh();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function deleteBrochure() {
    if (!pendingDelete) return;
    setBusy(true); setDeleteError("");
    try { await request(`/api/brochures/${pendingDelete.id}`, { method: "DELETE" }); setBrochures(items => items.filter(item => item.id !== pendingDelete.id)); setPendingDelete(null); setNotice("Brochure deleted."); router.refresh(); }
    catch (error) { setDeleteError((error as Error).message); } finally { setBusy(false); }
  }
  async function uploadCarouselImage() {
    if (!carouselFile) { setCarouselError("Choose an image before uploading."); return; }
    if (!carouselAlt.trim()) { setCarouselError("Alt text is required."); return; }
    setCarouselBusy(true); setCarouselError("");
    const data = new FormData();
    data.set("file", carouselFile);
    data.set("alt", carouselAlt);
    try {
      const result = await request("/api/carousel", { method: "POST", body: data });
      setCarouselImages(items => [...items, result.carouselImage].sort((a, b) => a.order - b.order));
      setCarouselFile(null); setCarouselAlt(""); setNotice("Carousel image uploaded."); router.refresh();
    } catch (error) { setCarouselError((error as Error).message); } finally { setCarouselBusy(false); }
  }
  async function deleteCarouselImage() {
    if (!pendingCarouselDelete) return;
    setCarouselBusy(true); setCarouselError("");
    try {
      await request(`/api/carousel/${pendingCarouselDelete.id}`, { method: "DELETE" });
      setCarouselImages(items => items.filter(item => item.id !== pendingCarouselDelete.id));
      setPendingCarouselDelete(null); setNotice("Carousel image deleted."); router.refresh();
    } catch (error) { setCarouselError((error as Error).message); } finally { setCarouselBusy(false); }
  }
  async function moveCarouselImage(image: CarouselImage, direction: "up" | "down") {
    const currentIndex = carouselImages.findIndex(img => img.id === image.id);
    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === carouselImages.length - 1) return;
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapImage = carouselImages[swapIndex];
    setCarouselBusy(true); setCarouselError("");
    try {
      await request(`/api/carousel/${image.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: swapImage.order }) });
      await request(`/api/carousel/${swapImage.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: image.order }) });
      const updated = [...carouselImages];
      updated[currentIndex] = { ...image, order: swapImage.order };
      updated[swapIndex] = { ...swapImage, order: image.order };
      setCarouselImages(updated.sort((a, b) => a.order - b.order));
      
      // Debounce router.refresh() to avoid overhead when moving multiple items
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
      refreshTimeout.current = setTimeout(() => router.refresh(), 1000);
    } catch (error) { setCarouselError((error as Error).message); } finally { setCarouselBusy(false); }
  }
  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setPageError("");
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Settings;
    try { const result = await request("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); setSettings(result.settings); setNotice("Your contact details are now live."); router.refresh(); }
    catch (error) { setPageError((error as Error).message); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setPageError("");
    try { await request("/api/auth/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
    catch (error) { setPageError((error as Error).message); setBusy(false); }
  }
  return <div className="admin-shell"><aside className="admin-sidebar"><Brand light /><span className="sidebar-label">THE ADMIN STUDIO</span><nav aria-label="Admin navigation"><button className={tab === "brochures" ? "selected" : ""} onClick={() => { setTab("brochures"); setPageError(""); }}><BookOpen size={18} /> Brochure library<span>{brochures.length}</span></button><button className={tab === "carousel" ? "selected" : ""} onClick={() => { setTab("carousel"); setPageError(""); }}><ImageIcon size={18} /> Carousel images<span>{carouselImages.length}</span></button><button className={tab === "settings" ? "selected" : ""} onClick={() => { setTab("settings"); setPageError(""); }}><Settings2 size={18} /> Contact & links</button></nav><div className="sidebar-bottom"><p>Beautiful things,<br /><em>thoughtfully managed.</em></p><Link href="/" target="_blank">Visit the website <ArrowUpRight size={15} /></Link><button disabled={busy} onClick={logout}><LogOut size={16} /> Sign out</button></div></aside><div className="admin-workspace"><header className="admin-header"><span><LayoutGrid size={15} /> DravoHome / <strong>{tab === "brochures" ? "Brochure library" : tab === "carousel" ? "Carousel images" : "Contact & links"}</strong></span><span className="admin-profile"><span>D</span>DravoHome team</span></header><main className="admin-main"><div className="admin-page-heading"><div><span className="eyebrow">{tab === "brochures" ? "A LITTLE BEHIND THE BEAUTIFUL" : tab === "carousel" ? "SHOWCASE YOUR BEST" : "KEEP THE CONVERSATION GOING"}</span><h1>{tab === "brochures" ? "Your brochure library." : tab === "carousel" ? "Carousel images." : "Keep the conversation going."}</h1><p>{tab === "brochures" ? "Curate, share, and keep your collections looking their best." : tab === "carousel" ? "Upload images for the homepage carousel. They auto-advance every 5 seconds." : "One home for every way your customers can reach you."}</p></div>{tab === "brochures" && <button className="solid-button" onClick={() => openEditor()}><Plus size={18} /> Upload brochure</button>}</div>{pageError && <p role="alert" className="error-message">{pageError}</p>}{tab === "brochures" ? <><div className="admin-stats"><div><span className="stat-icon"><BookOpen size={20} /></span><div><span>Total brochures</span><strong>{brochures.length.toString().padStart(2, "0")}</strong></div><span className="stat-note">YOUR COLLECTION</span></div><div><span className="stat-icon green"><CircleCheck size={20} /></span><div><span>Published</span><strong>{published.toString().padStart(2, "0")}</strong></div><span className="stat-note">LIVE ON YOUR WEBSITE</span></div><div><span className="stat-icon"><FileText size={20} /></span><div><span>Drafts</span><strong>{(brochures.length - published).toString().padStart(2, "0")}</strong></div><span className="stat-note">WAITING IN THE WINGS</span></div></div><section className="admin-library"><div className="admin-library-top"><div className="admin-filter-tabs">{["All brochures", "Published", "Drafts"].map(item => <button className={filter === item ? "active" : ""} aria-pressed={filter === item} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="search-field"><Search size={16} /><span className="sr-only">Search your library</span><input placeholder="Search your library" value={query} onChange={event => setQuery(event.target.value)} /></label></div>{shown.length ? <div className="table-scroll"><table className="brochure-table"><thead><tr><th>Brochure</th><th>Collection</th><th>Status</th><th>Added</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map(item => <tr key={item.id}><td><div className="table-file"><span><FileText size={23} strokeWidth={1.3} /></span><div><strong>{item.title}</strong><small>PDF · {formatSize(item.size)}</small></div></div></td><td>{item.category}</td><td><span className={`status-badge ${item.published ? "published" : "draft"}`}><span />{item.published ? "Published" : "Draft"}</span></td><td>{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td><td><div className="table-actions"><a className="icon-button" href={`/api/brochures/${item.id}`} aria-label={`Preview ${item.title}`} target="_blank" rel="noopener noreferrer"><Eye size={16} /></a><button className="icon-button" onClick={() => openEditor(item)} aria-label={`Edit ${item.title}`}><Pencil size={15} /></button><button className="icon-button delete-action" onClick={() => { setPendingDelete(item); setDeleteError(""); }} aria-label={`Delete ${item.title}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="admin-empty"><span className="empty-icon"><UploadCloud size={35} strokeWidth={1.1} /></span><h2>{brochures.length ? "Nothing in this corner yet." : "Your first collection starts here."}</h2><p>{brochures.length ? "Try a different search or filter to find your brochure." : "Upload a brochure and give your customers a closer look at beautiful living."}</p>{!brochures.length && <button className="solid-button" onClick={() => openEditor()}><Plus size={16} /> Upload your first brochure</button>}</div>}<div className="admin-table-footer"><span>{shown.length} {shown.length === 1 ? "brochure" : "brochures"}</span><span>PDF files · Up to 20 MB each</span></div></section><div className="admin-tip"><span className="tip-icon"><Check size={16} /></span><p>Published brochures appear in your <Link href="/brochures" target="_blank">public collection <ArrowUpRight size={12} /></Link>. Drafts are visible only to your team.</p></div></> : tab === "carousel" ? <><section className="admin-library"><div style={{ padding: "28px 32px", borderBottom: "1px solid var(--line)" }}><h2 style={{ fontFamily: "Georgia, serif", fontSize: "23px", fontWeight: 400, margin: "0 0 20px" }}>Upload a new image</h2><input ref={carouselInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={event => chooseCarouselFile(event.target.files?.[0])} /><button className={`drop-zone ${carouselDragging ? "dragging" : ""} ${carouselFile ? "has-file" : ""}`} type="button" onClick={() => carouselInput.current?.click()} onDragOver={event => { event.preventDefault(); setCarouselDragging(true); }} onDragLeave={() => setCarouselDragging(false)} onDrop={event => { event.preventDefault(); setCarouselDragging(false); chooseCarouselFile(event.dataTransfer.files[0]); }} style={{ marginBottom: "20px" }}><UploadCloud size={30} strokeWidth={1.2} /><strong>{carouselFile ? carouselFile.name : "Drop your image here"}</strong><span>{carouselFile ? `${formatSize(carouselFile.size)} · Click to choose another image` : "or click to choose a file · JPG, PNG, WebP up to 5 MB"}</span></button><label style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "11px", color: "#6a6155", marginBottom: "20px" }}>Alt text (required)<input value={carouselAlt} onChange={e => setCarouselAlt(e.target.value)} placeholder="Describe the image for accessibility" maxLength={200} style={{ background: "#ffffff3d", border: "1px solid var(--line)", padding: "13px 14px", width: "100%", fontSize: "12px", color: "var(--ink)" }} /></label>{carouselError && <p role="alert" className="error-message" style={{ marginBottom: "20px" }}>{carouselError}</p>}<button className="solid-button" disabled={carouselBusy || !carouselFile || !carouselAlt.trim()} onClick={uploadCarouselImage}>{carouselBusy ? "Uploading…" : "Upload image"}{carouselBusy ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}</button></div>{carouselImages.length ? <div className="table-scroll"><table className="brochure-table"><thead><tr><th>Image</th><th>Alt text</th><th>Order</th><th>Uploaded</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{carouselImages.map((image, index) => <tr key={image.id}><td><img src={`/images/carousel/${image.filename}`} alt={image.alt} style={{ width: "40px", height: "40px", objectFit: "cover" }} /></td><td style={{ maxWidth: "300px" }}>{image.alt}</td><td>{image.order}</td><td>{new Date(image.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td><td><div className="table-actions"><button className="icon-button" disabled={index === 0 || carouselBusy} onClick={() => moveCarouselImage(image, "up")} aria-label="Move up"><ChevronUp size={16} /></button><button className="icon-button" disabled={index === carouselImages.length - 1 || carouselBusy} onClick={() => moveCarouselImage(image, "down")} aria-label="Move down"><ChevronDown size={16} /></button><button className="icon-button delete-action" disabled={carouselBusy} onClick={() => setPendingCarouselDelete(image)} aria-label={`Delete ${image.alt}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="admin-empty"><span className="empty-icon"><ImageIcon size={35} strokeWidth={1.1} /></span><h2>No carousel images yet.</h2><p>Upload your first image to get started. Images will auto-advance on the homepage.</p></div>}<div className="admin-table-footer"><span>{carouselImages.length} {carouselImages.length === 1 ? "image" : "images"}</span><span>JPG, PNG, WebP · Up to 5 MB each</span></div></section></> : <form className="settings-form" onSubmit={saveSettings}><div className="settings-intro"><span className="stat-icon"><Settings2 size={22} /></span><div><h2>Every connection, considered.</h2><p>Leave a field blank to show a friendly "coming soon" message.</p></div></div><div className="settings-grid"><label>Instagram URL<input type="url" name="instagram" defaultValue={settings.instagram} placeholder="https://www.instagram.com/yourprofile" maxLength={500} /><small>Use your full Instagram profile link.</small></label><label>Facebook URL<input type="url" name="facebook" defaultValue={settings.facebook} placeholder="https://www.facebook.com/yourpage" maxLength={500} /><small>Use your full Facebook page link.</small></label><label>WhatsApp number<input name="whatsapp" type="tel" defaultValue={settings.whatsapp} placeholder="+91 98765 43210" maxLength={24} /><small>Include the country code.</small></label><label>Phone number<input name="phone" type="tel" defaultValue={settings.phone} placeholder="+91 98765 43210" maxLength={24} /><small>The call button will dial this number.</small></label><label className="full-width">Experience centre address<textarea name="address" defaultValue={settings.address} placeholder="Your showroom address" rows={3} maxLength={300} /></label><label className="full-width">Opening hours<input name="hours" defaultValue={settings.hours} placeholder="e.g. Monday–Saturday, 10 am–8 pm" maxLength={150} /></label></div><div className="settings-save"><span>Changes appear on your homepage immediately.</span><button className="solid-button" disabled={busy} type="submit">{busy ? "Saving…" : "Save changes"}{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}</button></div></form>}<div className="admin-copyright">© {new Date().getFullYear()} DravoHome. The art of living well.</div></main></div><div className={`toast ${notice ? "visible" : ""}`} role="status" aria-live="polite">{notice && <><CircleCheck size={18} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></>}</div><dialog className="editor-dialog" ref={editDialog} onCancel={event => { if (busy) event.preventDefault(); else setModalOpen(false); }} onClick={event => { if (event.target === event.currentTarget && !busy) setModalOpen(false); }}>{modalOpen && <><div className="dialog-header"><div><span className="eyebrow">CURATE YOUR COLLECTION</span><h2>{editing ? "A little refinement." : "Something beautiful to share."}</h2></div><button disabled={busy} className="icon-button" aria-label="Close editor" onClick={() => setModalOpen(false)}><X size={20} /></button></div><form key={editing?.id || "new"} onSubmit={saveBrochure}>{!editing && <><input ref={uploadInput} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} onChange={event => chooseFile(event.target.files?.[0])} /><button className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`} type="button" onClick={() => uploadInput.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}><UploadCloud size={30} strokeWidth={1.2} /><strong>{file ? file.name : "Drop your brochure here"}</strong><span>{file ? `${formatSize(file.size)} · Click to choose another PDF` : "or click to choose a file · PDF up to 20 MB"}</span></button></>}<label>Brochure title<input name="title" required maxLength={100} defaultValue={editing?.title} placeholder="e.g. The Living Collection" /></label><label>Collection<select name="category" defaultValue={editing?.category || "Living"}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>A few words about the collection<textarea name="description" maxLength={350} rows={3} defaultValue={editing?.description} placeholder="A little introduction to what's inside…" /></label><label className="checkbox-label"><input name="published" type="checkbox" defaultChecked={editing?.published ?? true} /><span><strong>Publish to your website</strong><small>Uncheck to save privately as a draft.</small></span></label>{error && <p role="alert" className="error-message">{error}</p>}<div className="dialog-footer"><button className="outline-button" type="button" disabled={busy} onClick={() => setModalOpen(false)}>Cancel</button><button className="solid-button" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Upload brochure"}{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowUpRight size={16} />}</button></div></form></>}</dialog><dialog className="delete-dialog" ref={deleteDialog} onCancel={event => { if (busy) event.preventDefault(); else setPendingDelete(null); }}><span className="delete-dialog-icon"><Trash2 size={24} /></span><h2>Remove this brochure?</h2><p>"{pendingDelete?.title}" will be removed from your library and website. You can upload it again later.</p>{deleteError && <p className="error-message" role="alert">{deleteError}</p>}<div className="dialog-footer"><button className="outline-button" disabled={busy} onClick={() => setPendingDelete(null)}>Keep brochure</button><button className="danger-button" disabled={busy} onClick={deleteBrochure}>{busy ? "Deleting…" : "Delete brochure"}</button></div></dialog><dialog className="delete-dialog" ref={carouselDeleteDialog} onCancel={event => { if (carouselBusy) event.preventDefault(); else setPendingCarouselDelete(null); }}><span className="delete-dialog-icon"><Trash2 size={24} /></span><h2>Remove this image?</h2><p>This carousel image will be removed from your homepage. You can upload it again later.</p>{carouselError && <p className="error-message" role="alert">{carouselError}</p>}<div className="dialog-footer"><button className="outline-button" disabled={carouselBusy} onClick={() => setPendingCarouselDelete(null)}>Keep image</button><button className="danger-button" disabled={carouselBusy} onClick={deleteCarouselImage}>{carouselBusy ? "Deleting…" : "Delete image"}</button></div></dialog></div>;
}
