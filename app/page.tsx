"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { flowType: "implicit" } });
type Work = { id: string; word: string; artist: string; story: string; image: string; status: "approved" | "archived" };
const sampleWorks: Work[] = [
  { id: "sample-1", word: "RUPTURE", artist: "Mara Vale", story: "A study of distance, caught in the second before a room becomes unfamiliar.", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=85", status: "approved" },
  { id: "sample-2", word: "RELIC", artist: "Elias North", story: "An object outliving its original meaning, then asking to be seen again.", image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1800&q=85", status: "archived" },
  { id: "sample-3", word: "WITNESS", artist: "Noor Imani", story: "A quiet record of what remains when the lights go out.", image: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1800&q=85", status: "archived" },
  { id: "sample-4", word: "THRESHOLD", artist: "Sora Kim", story: "The edge between the private self and the image offered to the world.", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=85", status: "archived" },
];

export default function Home() {
  const [works, setWorks] = useState<Work[]>(sampleWorks);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [philosophyOpen, setPhilosophyOpen] = useState(false);
  const [artistEmail, setArtistEmail] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Record<string, string[]>>({
    RUPTURE: ["The distance in this feels physical."],
    RELIC: ["It makes an ordinary object feel ceremonial."],
    WITNESS: [],
    THRESHOLD: [],
  });

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % works.length), 9500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setArtistEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setArtistEmail(session?.user?.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadExhibition() {
      const { data } = await supabase.from("submissions").select("id, word, story, display_image_path, status").in("status", ["approved", "archived"]);
      if (!data?.length) return;
      const published = await Promise.all(data.map(async (item) => {
        const { data: file } = await supabase.storage.from("submissions").createSignedUrl(item.display_image_path, 60 * 60);
        return file?.signedUrl ? { id: item.id, word: item.word, story: item.story, image: file.signedUrl, artist: "CONTRIBUTOR", status: item.status as "approved" | "archived" } : null;
      }));
      const ready = published.filter((item): item is Work => item !== null);
      if (ready.length) setWorks(ready);
    }
    loadExhibition();
  }, []);

  const work = works[active];

  return (
    <main className="gallery-shell">
      <header>
        <a className="brand" href="#top" aria-label="False Idols Collective home">FALSE IDOLS</a>
        <button className="archive-link" onClick={() => setArchiveOpen(true)}>ARCHIVE / MEMORY</button>
        {artistEmail ? <a className="submit" href="/account">ARTIST DASHBOARD</a> : <button className="submit" onClick={() => setSubmitOpen(true)}>SUBMIT <span aria-hidden="true">↗</span></button>}
      </header>

      <section className="stage" id="top" aria-label="Featured work">
        <span className="corner corner-tl" aria-hidden="true" />
        <span className="corner corner-tr" aria-hidden="true" />
        <span className="corner corner-bl" aria-hidden="true" />
        <span className="corner corner-br" aria-hidden="true" />
        {works.map((item, index) => (
          <button
            className={`frame ${index === active ? "is-active" : ""}`}
            key={item.id}
            onClick={() => { setActive(index); setOpen(true); }}
            aria-label={`Open ${item.word} by ${item.artist}`}
          >
            <img src={item.image} alt="" />
          </button>
        ))}
        <button className="work-caption" onClick={() => setOpen(true)}>
          <span className="work-word" data-text={work.word}>{work.word}</span>
          <span className="work-meta">BY {work.artist.toUpperCase()} / 2026</span>
        </button>
        <span className="work-index">OBSERVATION / 0{active + 1}</span>
        <span className="instruction">LOOK CLOSER</span>
      </section>

      <footer>
        <button className="philosophy-link" onClick={() => setPhilosophyOpen(true)}>REALITY IS STILL HERE</button>
        <div className="pager">{works.map((item, index) => <button key={item.id} onClick={() => setActive(index)} className={index === active ? "selected" : ""} aria-label={`Show ${item.word}`} />)}</div>
        <div className="footer-actions"><a className="legal-link" href="/legal">CONTACT / TERMS</a><button className="objects-link" onClick={() => setShopOpen(true)}>APPAREL / OBJECTS ↗</button></div>
      </footer>

      {open && <div className="overlay" role="dialog" aria-modal="true" aria-label={work.word} onClick={() => setOpen(false)}>
        <article onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setOpen(false)} aria-label="Close work">×</button>
          <img src={work.image} alt={work.word} />
          <div className="detail"><p className="detail-word">{work.word}</p><p>{work.story}</p><span>— {work.artist}</span>
            <div className="comments">
              <div className="comments-label">PUBLIC NOTES / {comments[work.word].length}</div>
              {comments[work.word].map((note, index) => <p className="comment" key={`${note}-${index}`}>{note}</p>)}
              <form onSubmit={(event) => { event.preventDefault(); const note = comment.trim(); if (!note) return; setComments((current) => ({ ...current, [work.word]: [...current[work.word], note] })); setComment(""); }}>
                <label htmlFor="comment">LEAVE A NOTE</label>
                <div><input id="comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={280} placeholder="Keep it considered." /><button type="submit">↗</button></div>
                <small>All notes are reviewed before they appear publicly.</small>
              </form>
            </div>
          </div>
        </article>
      </div>}

      {archiveOpen && <div className="overlay archive-overlay" role="dialog" aria-modal="true" aria-label="Archive" onClick={() => setArchiveOpen(false)}>
        <article className="archive-card" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setArchiveOpen(false)} aria-label="Close archive">×</button>
          <div className="archive-intro"><span>FALSE IDOLS / PERMANENT COLLECTION</span><h1>ARCHIVE</h1><p>Works that completed their week in rotation remain here as a record of the collective.</p></div>
          <div className="archive-grid">{works.filter((item) => item.status === "archived").map((item) => <button key={item.id} onClick={() => { setActive(works.findIndex((work) => work.id === item.id)); setArchiveOpen(false); setOpen(true); }}><img src={item.image} alt="" /><span>{item.word}</span><small>{item.artist.toUpperCase()}</small></button>)}</div>
        </article>
      </div>}

      {philosophyOpen && <div className="overlay philosophy-overlay" role="dialog" aria-modal="true" aria-label="Philosophy" onClick={() => setPhilosophyOpen(false)}>
        <article className="philosophy-card" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setPhilosophyOpen(false)} aria-label="Close philosophy">×</button>
          <span>FALSE IDOLS / PHILOSOPHY</span><h1>LOOK<br />AROUND.</h1>
          <p>We follow false idols when we mistake attention for meaning. False Idols Collective is for the untold human story: the masks we wear, the details we miss, and the reality waiting in plain sight. Every image is an invitation to look longer.</p>
        </article>
      </div>}

      {shopOpen && <div className="overlay objects-overlay" role="dialog" aria-modal="true" aria-label="Apparel and objects" onClick={() => setShopOpen(false)}>
        <article className="objects-card" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setShopOpen(false)} aria-label="Close apparel">×</button>
          <div className="objects-head"><span>FALSE IDOLS / OBJECTS 01</span><h1>REPRESENT<br />THE REAL.</h1><p>Limited artifacts for people who choose to look longer.</p></div>
          <div className="objects-grid">
            <div className="object"><div className="garment tee">FALSE<br />IDOLS</div><p>REALITY TEE</p><small>HEAVYWEIGHT COTTON / BLACK</small><button>COMING SOON</button></div>
            <div className="object"><div className="garment cap">FI<br /><span>01</span></div><p>ARCHIVE CAP</p><small>WASHED COTTON / CHARCOAL</small><button>COMING SOON</button></div>
          </div>
        </article>
      </div>}

      {submitOpen && <div className="overlay submission-overlay" role="dialog" aria-modal="true" aria-label="Submission information" onClick={() => setSubmitOpen(false)}>
        <article className="submission-card" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setSubmitOpen(false)} aria-label="Close submission information">×</button>
          <div className="submission-heading"><span>FALSE IDOLS COLLECTIVE / ISSUE 01</span><h1>LOOK<br />AT WHAT<br />IS REAL.</h1></div>
          <div className="submission-copy">
            <p>False Idols is a rotating exhibition for images that hold a point of view. Every work begins with a story, even if the viewer has to spend time finding it.</p>
            <ul>
              <li>One submission per artist, every 72 hours.</li>
              <li>Include the original RAW file and the final edit.</li>
              <li>Give the work one word: its meaning, not its caption.</li>
              <li>No AI-generated art. No exceptions.</li>
            </ul>
            <p>Selected work appears in the rotating collection for one week, then enters the archive. Submissions that do not move forward are removed after three days.</p>
            <a className="begin-submit" href="/account">SIGN IN TO SUBMIT</a>
          </div>
        </article>
      </div>}
    </main>
  );
}
