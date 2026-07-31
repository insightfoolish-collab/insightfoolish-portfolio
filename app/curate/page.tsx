"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { flowType: "implicit" } });
type Submission = { id: string; word: string; story: string; status: "pending" | "approved" | "rejected" | "archived"; submitted_at: string; display_image_path: string; raw_file_path: string };

export default function CuratePage() {
  const [user, setUser] = useState<User | null>(null);
  const [work, setWork] = useState<Submission[]>([]);
  const [notice, setNotice] = useState("Checking curator access…");
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  async function loadWork() {
    const { data, error } = await supabase.from("submissions").select("id, word, story, status, submitted_at, display_image_path, raw_file_path").order("submitted_at", { ascending: false });
    if (error) { setNotice("This account does not have curator access."); return; }
    setWork(data ?? []); setNotice(data?.length ? "Private review queue" : "No work is waiting for review.");
  }
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) loadWork(); else setNotice("Sign in through Artist Access before opening this page."); }); }, []);
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/curate` } });
    setNotice(error ? "Something went wrong. Please try again." : "Check your email for your private sign-in link.");
  }
  async function setStatus(item: Submission, status: Submission["status"]) {
    setBusy(item.id); const { error } = await supabase.from("submissions").update({ status }).eq("id", item.id); setBusy(null);
    if (error) { setNotice("That change could not be saved."); return; }
    setWork((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
    setNotice(status === "approved" ? "Approved — ready for the public rotation." : status === "rejected" ? "Marked as not accepted." : "Moved to the archive.");
  }
  async function remove(item: Submission) {
    if (!window.confirm("Permanently remove both files and this submission?")) return;
    setBusy(item.id); const { error: storageError } = await supabase.storage.from("submissions").remove([item.display_image_path, item.raw_file_path]); const { error } = storageError ? { error: storageError } : await supabase.from("submissions").delete().eq("id", item.id); setBusy(null);
    if (error) { setNotice("This work could not be removed."); return; }
    setWork((current) => current.filter((entry) => entry.id !== item.id)); setNotice("Permanently removed.");
  }
  return <main className="curator-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>PRIVATE CURATION</span></header><section className="curator-shell"><p className="curator-eyebrow">{notice}</p><h1>LOOK<br />CLOSER.</h1>{!user ? <form className="curator-login" onSubmit={signIn}><label htmlFor="curator-email">EMAIL ADDRESS</label><div><input id="curator-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@email.com" /><button>CONTINUE ↗</button></div><small>Use the email you registered with. We’ll send a private sign-in link.</small></form> : <><div className="curator-user">SIGNED IN AS {user.email}</div><div className="review-list">{work.map((item) => <article className="review-card" key={item.id}><div className="review-image"><PrivateImage path={item.display_image_path} /></div><div className="review-copy"><small>{new Date(item.submitted_at).toLocaleDateString()} · {item.status.toUpperCase()}</small><h2>{item.word}</h2><p>{item.story}</p><div className="review-actions"><button disabled={busy === item.id} onClick={() => setStatus(item, "approved")}>APPROVE</button><button disabled={busy === item.id} onClick={() => setStatus(item, "rejected")}>DECLINE</button><button disabled={busy === item.id} onClick={() => setStatus(item, "archived")}>ARCHIVE</button><button disabled={busy === item.id} onClick={() => remove(item)}>REMOVE</button></div></div></article>)}</div></>}</section></main>;
}

function PrivateImage({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { supabase.storage.from("submissions").createSignedUrl(path, 600).then(({ data }) => setSrc(data?.signedUrl ?? null)); }, [path]);
  return src ? <img src={src} alt="Submission for review" /> : <span>LOADING PRIVATE IMAGE</span>;
}
