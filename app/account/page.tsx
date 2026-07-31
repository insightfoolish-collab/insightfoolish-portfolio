"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Submission = { id: string; word: string; story: string; status: string; submitted_at: string; display_image_path: string; raw_file_path: string };

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [word, setWord] = useState("");
  const [story, setStory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadSubmissions() {
    const { data } = await supabase.from("submissions").select("id, word, story, status, submitted_at, display_image_path, raw_file_path").order("submitted_at", { ascending: false });
    setSubmissions(data ?? []);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) loadSubmissions(); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) loadSubmissions(); });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/account` } });
    setNotice(error ? "Something went wrong. Please try again." : "Check your email for your private sign-in link.");
  }

  async function removeSubmission(work: Submission) {
    const { error: storageError } = await supabase.storage.from("submissions").remove([work.display_image_path, work.raw_file_path]);
    if (storageError) { setNotice("This work could not be removed. Please try again."); return; }
    const { error } = await supabase.from("submissions").delete().eq("id", work.id);
    if (error) { setNotice("This work could not be removed. Please try again."); return; }
    setSubmissions((current) => current.filter((item) => item.id !== work.id));
    setNotice("Removed. This work is no longer visible to the collective.");
  }

  async function submitWork(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !image || !rawFile) { setNotice("Please include both the final image and the RAW file."); return; }
    setUploading(true);
    const folder = `${user.id}/${crypto.randomUUID()}`;
    const imagePath = `${folder}/final-${image.name}`;
    const rawPath = `${folder}/raw-${rawFile.name}`;
    const imageUpload = await supabase.storage.from("submissions").upload(imagePath, image);
    const rawUpload = imageUpload.error ? { error: imageUpload.error } : await supabase.storage.from("submissions").upload(rawPath, rawFile);
    if (imageUpload.error || rawUpload.error) { setNotice("The files could not be uploaded. Please try again."); setUploading(false); return; }
    const { error } = await supabase.from("submissions").insert({ user_id: user.id, word: word.trim().toUpperCase(), story: story.trim(), display_image_path: imagePath, raw_file_path: rawPath });
    if (error) { await supabase.storage.from("submissions").remove([imagePath, rawPath]); setNotice(error.message.includes("72") ? "You can submit again 72 hours after your last submission." : "Your submission could not be saved. Please try again."); setUploading(false); return; }
    setWord(""); setStory(""); setImage(null); setRawFile(null); setNotice("Submitted. Your work is now in private review."); setUploading(false); loadSubmissions();
  }

  return <main className="account-page">
    <header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST ACCESS</span></header>
    {!user ? <section className="account-intro"><p>SUBMIT / REVIEW / REMOVE</p><h1>YOUR WORK,<br />YOUR CONTROL.</h1><form onSubmit={signIn}><label htmlFor="email">EMAIL ADDRESS</label><div><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@email.com" /><button>CONTINUE ↗</button></div></form><small>{notice || "A private link will be sent to your email. No password required."}</small></section> : <section className="account-intro"><p>WELCOME BACK</p><h1>YOUR<br />WORK.</h1><div className="account-email">{user.email}</div><form className="submission-form" onSubmit={submitWork}><span>NEW SUBMISSION</span><input value={word} onChange={(event) => setWord(event.target.value)} maxLength={28} required placeholder="ONE WORD" /><textarea value={story} onChange={(event) => setStory(event.target.value)} maxLength={800} required placeholder="What does this work mean?" /><label>FINAL IMAGE<input type="file" accept="image/*" required onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label><label>RAW FILE<input type="file" accept=".dng,.cr2,.cr3,.nef,.arw,.raf,.orf,.rw2" required onChange={(event) => setRawFile(event.target.files?.[0] ?? null)} /></label><button disabled={uploading}>{uploading ? "SUBMITTING..." : "SUBMIT FOR REVIEW ↗"}</button></form><small>{notice || "One submission every 72 hours. You can remove your work at any time."}</small><div className="my-work"><span>MY SUBMISSIONS</span>{submissions.length === 0 ? <p>No submissions yet.</p> : submissions.map((work) => <article key={work.id}><div><strong>{work.word}</strong><small>{work.status.toUpperCase()}</small></div><button onClick={() => removeSubmission(work)}>REMOVE</button></article>)}</div><button className="signout" onClick={() => supabase.auth.signOut()}>SIGN OUT</button></section>}
  </main>;
}
