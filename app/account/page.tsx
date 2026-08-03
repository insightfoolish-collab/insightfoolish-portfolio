"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { flowType: "implicit" } },
);
const OWNER_EMAIL = "insightfoolish@gmail.com";

type Work = { id: string; word: string; project: string; status: string; submitted_at: string; display_image_path: string; raw_file_path: string };
type MfaSetup = { factorId: string; qr: string };

export default function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [project, setProject] = useState("");
  const [word, setWord] = useState("");
  const [story, setStory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [raw, setRaw] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [recovery, setRecovery] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("submissions").select("id, word, project, status, submitted_at, display_image_path, raw_file_path").order("submitted_at", { ascending: false });
    setWorks(data ?? []);
  };

  async function checkAccess(currentUser: User | null) {
    if (!currentUser) return;
    if (currentUser.email?.toLowerCase() !== OWNER_EMAIL) {
      setNotice("This workspace is reserved for the portfolio owner.");
      await supabase.auth.signOut();
      return;
    }
    setUser(currentUser);
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel === "aal2") {
      setMfaFactorId(null);
      setMfaRequired(false);
      await load();
      return;
    }
    setMfaRequired(true);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.find((factor) => factor.status === "verified");
    setMfaFactorId(verified?.id ?? null);
  }

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => checkAccess(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      void checkAccess(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("Checking owner access...");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setNotice("That email or password was not accepted.");
    setPassword("");
    await checkAccess(data.user);
    setNotice("Password accepted. Enter your authenticator code to continue.");
  }

  async function sendPasswordSetup() {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/account` });
    setBusy(false);
    setNotice(error ? "The password setup email could not be sent. Try again shortly." : "A secure password setup link has been sent to your email.");
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setNotice("Your password could not be saved. Choose a longer password and try again.");
    setPassword("");
    setRecovery(false);
    setNotice("Password saved. Sign in again with your new password.");
    await supabase.auth.signOut();
    setUser(null);
  }

  async function beginMfaSetup() {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Insightfoolish owner" });
    setBusy(false);
    if (error || !data) return setNotice("Two-step verification could not be started. Please try again.");
    setSetup({ factorId: data.id, qr: data.totp.qr_code });
    setNotice("Scan this code with Google Authenticator, Authy, or 1Password.");
  }

  async function verifyMfa(event: React.FormEvent, factorId = setup?.factorId ?? mfaFactorId) {
    event.preventDefault();
    if (!factorId) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setNotice("That six-digit code was not accepted. Try the newest code.");
    setCode("");
    setSetup(null);
    await checkAccess(user);
    setNotice("Owner workspace unlocked.");
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!user || mfaRequired || !image || !raw) return setNotice("Add the final image and its source file.");
    setBusy(true);
    const folder = `${user.id}/${crypto.randomUUID()}`, display = `${folder}/final-${image.name}`, source = `${folder}/source-${raw.name}`;
    const a = await supabase.storage.from("submissions").upload(display, image);
    const b = a.error ? { error: a.error } : await supabase.storage.from("submissions").upload(source, raw);
    if (a.error || b.error) { setBusy(false); return setNotice("The files could not be uploaded."); }
    const { error } = await supabase.from("submissions").insert({ user_id: user.id, project: project.trim().toUpperCase(), word: word.trim().toUpperCase(), story: story.trim(), display_image_path: display, raw_file_path: source, status: "approved" });
    if (error) { await supabase.storage.from("submissions").remove([display, source]); setNotice(error.message); }
    else { setProject(""); setWord(""); setStory(""); setImage(null); setRaw(null); setNotice("Published to the current rotation."); await load(); }
    setBusy(false);
  }

  async function archive(item: Work) {
    const { error } = await supabase.from("submissions").update({ status: item.status === "archived" ? "approved" : "archived" }).eq("id", item.id);
    if (error) return setNotice("That change could not be saved.");
    await load();
  }

  const header = <header className="account-header"><a href="/">← INSIGHTFOOLISH</a><span>PRIVATE WORKSPACE</span></header>;
  if (!user) return <main className="account-page">{header}<section className="account-intro"><p>OWNER ACCESS</p><h1>PUBLISH<br />WORK.</h1><form className="owner-login" onSubmit={signIn}><label>EMAIL ADDRESS<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button disabled={busy}>{busy ? "CHECKING..." : "SIGN IN →"}</button><button type="button" className="text-button" disabled={busy} onClick={() => void sendPasswordSetup()}>SET OR RESET PASSWORD</button></form><small>{notice || "One owner login. No public accounts."}</small></section></main>;
  if (recovery) return <main className="account-page">{header}<section className="account-intro"><p>PASSWORD SETUP</p><h1>MAKE IT<br />YOURS.</h1><form className="owner-login" onSubmit={savePassword}><label>NEW PASSWORD<input type="password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button disabled={busy}>{busy ? "SAVING..." : "SAVE PASSWORD →"}</button></form><small>{notice || "Use at least 12 characters."}</small></section></main>;
  if (mfaRequired || mfaFactorId || setup) return <main className="account-page">{header}<section className="account-intro"><p>TWO-STEP VERIFICATION</p><h1>LOOK<br />CLOSER.</h1>{setup ? <><img className="mfa-qr" src={setup.qr} alt="Scan this code in your authenticator app" /><p className="mfa-copy">Scan the code, then enter the six-digit code from your authenticator app.</p></> : <><p className="mfa-copy">Enter the six-digit code from your authenticator app.</p>{!mfaFactorId && <button className="mfa-start" disabled={busy} onClick={() => void beginMfaSetup()}>SET UP TWO-STEP VERIFICATION →</button>}</>} {(setup || mfaFactorId) && <form className="owner-login" onSubmit={(event) => void verifyMfa(event)}><label>AUTHENTICATOR CODE<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></label><button disabled={busy}>{busy ? "VERIFYING..." : "UNLOCK WORKSPACE →"}</button></form>}<small>{notice}</small></section></main>;
  return <main className="account-page">{header}<section className="account-intro"><p>IMAGE PUBLISHER</p><h1>YOUR<br />WORK.</h1><div className="account-email">{user.email}</div><form className="submission-form" onSubmit={publish}><span>ADD TO PORTFOLIO</span><label>PROJECT<input value={project} onChange={(e) => setProject(e.target.value)} required placeholder="e.g. STREET STUDIES" /></label><label>IMAGE TITLE<input value={word} onChange={(e) => setWord(e.target.value)} required placeholder="One word" /></label><label>NOTES<textarea value={story} onChange={(e) => setStory(e.target.value)} required /></label><label>FINAL IMAGE<input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} required /></label><label>SOURCE FILE<input type="file" onChange={(e) => setRaw(e.target.files?.[0] ?? null)} required /></label><button disabled={busy}>{busy ? "UPLOADING..." : "PUBLISH TO CURRENT PROJECT →"}</button></form><small className="account-notice">{notice}</small><div className="my-work"><span>PROJECT ARCHIVE</span>{works.map((item) => <article key={item.id}><div><strong>{item.word}</strong><small>{item.project} / {item.status.toUpperCase()}</small></div><button onClick={() => void archive(item)}>{item.status === "archived" ? "RESTORE" : "ARCHIVE"}</button></article>)}</div><button className="signout" onClick={() => void supabase.auth.signOut()}>SIGN OUT</button></section></main>;
}
