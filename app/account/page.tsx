"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Submission = { id: string; word: string; status: string; submitted_at: string };

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [notice, setNotice] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const load = async () => { const { data } = await supabase.from("submissions").select("id, word, status, submitted_at").order("submitted_at", { ascending: false }); setSubmissions(data ?? []); };
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) load(); }); const { data: l } = supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); if (session?.user) load(); }); return () => l.subscription.unsubscribe(); }, []);
  async function signIn(event: React.FormEvent) { event.preventDefault(); setState("sending"); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/account` } }); if (error) { setState("idle"); setNotice("Transmission failed. Try again."); } else setState("sent"); }
  async function remove(item: Submission) { await supabase.from("submissions").delete().eq("id", item.id); setSubmissions((list) => list.filter((work) => work.id !== item.id)); }

  if (state !== "idle") return <main className="account-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST ACCESS</span></header><section className="transmission"><p>{state === "sending" ? "UPLOADING PERSPECTIVE…" : "PERSPECTIVE RECEIVED."}</p><h1>{state === "sending" ? <>LOOKING<br />CLOSER.</> : <>CHECK<br />YOUR EMAIL.</>}</h1><span>{state === "sending" ? "ESTABLISHING PRIVATE ACCESS" : "A PRIVATE SIGN-IN LINK IS WAITING FOR YOU."}</span></section></main>;
  if (!user) return <main className="account-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST ACCESS</span></header><section className="account-intro"><p>SUBMIT / REVIEW / REMOVE</p><h1>YOUR WORK,<br />YOUR CONTROL.</h1><form onSubmit={signIn}><label>EMAIL ADDRESS</label><div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@email.com" /><button>EMAIL ME A LINK →</button></div></form><div className="email-link-note"><strong>NO PASSWORD NEEDED.</strong><span>We’ll send a private sign-in link to this email address.</span></div><small>{notice}</small></section></main>;
  return <main className="account-page"><header className="account-header"><a href="/">← FALSE IDOLS</a><span>ARTIST DASHBOARD</span></header><section className="account-intro"><p>YOU ARE SIGNED IN</p><h1>YOUR<br />WORK.</h1><div className="account-email">{user.email}</div><div className="my-work"><span>MY SUBMISSIONS / ACCOUNT CONTROL</span>{submissions.length ? submissions.map((item) => <article key={item.id}><div><strong>{item.word}</strong><small>{item.status.toUpperCase()}</small></div><button onClick={() => remove(item)}>REMOVE</button></article>) : <p>No submissions yet. Your next submission is available now.</p>}</div><button className="signout" onClick={() => supabase.auth.signOut()}>SIGN OUT</button></section></main>;
}
