"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

type Submission = {
  id: string;
  word: string;
  status: string;
  submitted_at: string;
  display_image_path: string;
  raw_file_path: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [notice, setNotice] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [word, setWord] = useState("");
  const [story, setStory] = useState("");
  const [finalImage, setFinalImage] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("submissions")
      .select("id, word, status, submitted_at, display_image_path, raw_file_path")
      .order("submitted_at", { ascending: false });
    setSubmissions(data ?? []);
  };

  useEffect(() => {
    const finishEmailSignIn = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setNotice("That sign-in link has expired. Please request a new one.");
        window.history.replaceState({}, "", "/account");
      }
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) await load();
    };
    finishEmailSignIn();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void load();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setNotice("");
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setState("idle");
      setNotice("We could not send a sign-in link. Please try again in a moment.");
      return;
    }
    window.setTimeout(() => setState("sent"), 650);
  }

  async function submitWork(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !finalImage || !rawFile) {
      setNotice("Please include your final image and the original RAW file.");
      return;
    }
    setUploading(true);
    setNotice("");
    const folder = `${user.id}/${crypto.randomUUID()}`;
    const displayPath = `${folder}/final-${finalImage.name}`;
    const rawPath = `${folder}/raw-${rawFile.name}`;
    const finalUpload = await supabase.storage.from("submissions").upload(displayPath, finalImage);
    const rawUpload = finalUpload.error
      ? { error: finalUpload.error }
      : await supabase.storage.from("submissions").upload(rawPath, rawFile);

    if (finalUpload.error || rawUpload.error) {
      await supabase.storage.from("submissions").remove([displayPath, rawPath]);
      setNotice("The files could not be received. Please try again.");
      setUploading(false);
      return;
    }

    const { error } = await supabase.from("submissions").insert({
      user_id: user.id,
      word: word.trim().toUpperCase(),
      story: story.trim(),
      display_image_path: displayPath,
      raw_file_path: rawPath,
    });
    if (error) {
      await supabase.storage.from("submissions").remove([displayPath, rawPath]);
      setNotice(error.message.includes("72")
        ? "Your next submission opens 72 hours after your most recent one."
        : "Your work could not be submitted. Please try again.");
    } else {
      setWord("");
      setStory("");
      setFinalImage(null);
      setRawFile(null);
      setNotice("Perspective received. It is now awaiting review.");
      await load();
    }
    setUploading(false);
  }

  async function remove(item: Submission) {
    const confirmed = window.confirm(`Remove ${item.word} and its uploaded files? This cannot be undone.`);
    if (!confirmed) return;
    const { error: storageError } = await supabase.storage
      .from("submissions")
      .remove([item.display_image_path, item.raw_file_path]);
    if (storageError) {
      setNotice("We could not remove the files. Please try again.");
      return;
    }
    const { error } = await supabase.from("submissions").delete().eq("id", item.id);
    if (error) {
      setNotice("The submission could not be removed. Please contact us if this continues.");
      return;
    }
    setSubmissions((list) => list.filter((work) => work.id !== item.id));
    setNotice("The submission and its files have been removed.");
  }

  if (state !== "idle") {
    return <main className="account-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST ACCESS</span></header><section className="transmission"><p>{state === "sending" ? "UPLOADING CONSCIOUS PERSPECTIVE..." : "PERSPECTIVE RECEIVED."}</p><h1>{state === "sending" ? <>LOOKING<br />CLOSER.</> : <>CHECK<br />YOUR EMAIL.</>}</h1><span>{state === "sending" ? "ESTABLISHING PRIVATE ACCESS" : "YOUR SIGN-IN LINK IS WAITING FOR YOU IN YOUR EMAIL."}</span></section></main>;
  }

  if (!user) {
    return <main className="account-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST ACCESS</span></header><section className="account-intro"><p>SUBMIT / REVIEW / REMOVE</p><h1>YOUR WORK,<br />YOUR CONTROL.</h1><form onSubmit={signIn}><label>EMAIL ADDRESS</label><div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@email.com" /><button>EMAIL ME A LINK →</button></div></form><div className="email-link-note"><strong>NO PASSWORD NEEDED.</strong><span>We’ll send a private sign-in link to this email address.</span></div><small>{notice}</small></section></main>;
  }

  return <main className="account-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST DASHBOARD</span></header><section className="account-intro account-dashboard"><p>YOU ARE SIGNED IN</p><h1>YOUR<br />WORK.</h1><div className="account-email">{user.email}</div><form className="submission-form" onSubmit={submitWork}><span>NEW SUBMISSION / ONE EVERY 72 HOURS</span><label>ONE WORD<input value={word} onChange={(event) => setWord(event.target.value)} maxLength={30} required placeholder="The meaning, not a caption" /></label><label>THE STORY<textarea value={story} onChange={(event) => setStory(event.target.value)} maxLength={1000} required placeholder="What should someone look for?" /></label><label>FINAL EDIT<input type="file" accept="image/*" onChange={(event) => setFinalImage(event.target.files?.[0] ?? null)} required /></label><label>ORIGINAL RAW FILE<input type="file" accept="image/*,.dng,.raw,.cr2,.nef,.arw" onChange={(event) => setRawFile(event.target.files?.[0] ?? null)} required /></label><button disabled={uploading}>{uploading ? "RECEIVING WORK..." : "SUBMIT PERSPECTIVE →"}</button></form><small className="account-notice">{notice}</small><div className="my-work"><span>MY SUBMISSIONS / ACCOUNT CONTROL</span>{submissions.length ? submissions.map((item) => <article key={item.id}><div><strong>{item.word}</strong><small>{item.status.toUpperCase()} / {new Date(item.submitted_at).toLocaleDateString()}</small></div><button onClick={() => void remove(item)}>REMOVE</button></article>) : <p>No submissions yet. Your next submission is available now.</p>}</div><p className="account-help">Need your account removed? <a href="/legal">Contact the collective</a> and we will verify and complete the request.</p><button className="signout" onClick={() => void supabase.auth.signOut()}>SIGN OUT</button></section></main>;
}
