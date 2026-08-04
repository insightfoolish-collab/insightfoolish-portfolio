"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

type Work = { id: string; word: string; project: string; story: string; image: string; status: "approved" | "archived" };

const samples: Work[] = [
  { id: "city-01", word: "RUPTURE", project: "CURRENT PROJECT", story: "A study of distance, caught in the second before a room becomes unfamiliar.", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=85", status: "approved" },
  { id: "city-02", word: "RELIC", project: "STREET STUDIES", story: "An object outliving its original meaning, then asking to be seen again.", image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1800&q=85", status: "archived" },
  { id: "city-03", word: "WITNESS", project: "STREET STUDIES", story: "A quiet record of what remains when the lights go out.", image: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1800&q=85", status: "archived" },
  { id: "city-04", word: "THRESHOLD", project: "AFTER HOURS", story: "The edge between the private self and the image offered to the world.", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=85", status: "archived" },
];

export default function Home() {
  const [works, setWorks] = useState<Work[]>(samples);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (rotationPaused) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % works.length), 11000);
    return () => window.clearInterval(timer);
  }, [rotationPaused, works.length]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("submissions").select("id, word, story, project, display_image_path, status").in("status", ["approved", "archived"]);
      if (!data?.length) return;
      const loaded = await Promise.all(data.map(async (item) => {
        const { data: file } = await supabase.storage.from("submissions").createSignedUrl(item.display_image_path, 3600);
        return file?.signedUrl ? { id: item.id, word: item.word, story: item.story, project: item.project || "ARCHIVE", image: file.signedUrl, status: item.status as Work["status"] } : null;
      }));
      const ready = loaded.filter((item): item is Work => item !== null);
      if (ready.length) { setWorks(ready); setActive(0); }
    })();
  }, []);

  const work = works[active];
  const viewerWork = works[viewerIndex];
  const openViewer = (index: number) => { setViewerIndex(index); setOpen(true); };
  const moveViewer = (direction: number) => setViewerIndex((index) => (index + direction + works.length) % works.length);
  const archive = useMemo(() => works.filter((item) => item.status === "archived").reduce<Record<string, Work[]>>((groups, item) => {
    (groups[item.project] ||= []).push(item);
    return groups;
  }, {}), [works]);

  return <main className="gallery-shell portfolio-shell">
    <header>
      <a className="brand" href="#top">INSIGHTFOOLISH</a>
      <button className="archive-link" onClick={() => setArchiveOpen(true)}>ARCHIVE / PROJECTS</button>
      <span className="portfolio-note">PERSONAL WORK / 2026</span>
    </header>
    <section className="stage" id="top">
      <span className="stage-issue">CURRENT PROJECT<br />{work.project}</span>
      <span className="stage-axis">INSIGHTFOOLISH / IMAGE ARCHIVE</span>
      <span className="corner corner-tl" /><span className="corner corner-tr" /><span className="corner corner-bl" /><span className="corner corner-br" />
      {works.map((item, index) => <button className={`frame ${index === active ? "is-active" : ""}`} key={item.id} onClick={() => openViewer(index)} aria-label={`Open ${item.word}`}><img src={item.image} alt="" /></button>)}
      <button className="work-caption" onClick={() => openViewer(active)}><span className="work-word" data-text={work.word}>{work.word}</span><span className="work-meta">{work.project.toUpperCase()} / 2026</span></button>
      <span className="work-index">0{active + 1} / 0{works.length}</span>
      <span className="instruction">CLICK TO<br />OPEN WORK</span>
    </section>
    <footer>
      <span className="portfolio-footer">A PERSONAL IMAGE PRACTICE</span>
      <div className="pager">{works.map((item, index) => <button key={item.id} onClick={() => setActive(index)} className={index === active ? "selected" : ""} aria-label={`Show ${item.word}`} />)}</div>
      <button className="rotation-toggle" onClick={() => setRotationPaused((paused) => !paused)}>{rotationPaused ? "PLAY ROTATION" : "PAUSE ROTATION"}</button>
      <button className="legal-link contact-trigger" onClick={() => setContactOpen(true)}>CONTACT</button>
    </footer>
    {open && <div className="overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}><article onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setOpen(false)} aria-label="Close work">×</button><img src={viewerWork.image} alt={viewerWork.word} /><div className="detail"><p className="detail-word">{viewerWork.word}</p><p>{viewerWork.story}</p><span>{viewerWork.project.toUpperCase()} / 2026</span><div className="viewer-controls"><button onClick={() => moveViewer(-1)}>← PREVIOUS</button><span>{String(viewerIndex + 1).padStart(2, "0")} / {String(works.length).padStart(2, "0")}</span><button onClick={() => moveViewer(1)}>NEXT →</button></div></div></article></div>}
    {archiveOpen && <div className="overlay archive-overlay" role="dialog" aria-modal="true" onClick={() => setArchiveOpen(false)}><article className="archive-card" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setArchiveOpen(false)} aria-label="Close archive">×</button><div className="archive-intro"><span>INSIGHTFOOLISH / PROJECT INDEX</span><h1>ARCHIVE</h1><p>Images are held here by the project they belong to.</p></div>{Object.entries(archive).map(([project, entries]) => <section className="project-group" key={project}><h2>{project}</h2><div className="archive-grid">{entries.map((item) => <button key={item.id} onClick={() => { openViewer(works.findIndex((entry) => entry.id === item.id)); setArchiveOpen(false); }}><img src={item.image} alt="" /><span>{item.word}</span><small>{project}</small></button>)}</div></section>)}</article></div>}
    {contactOpen && <div className="overlay contact-overlay" role="dialog" aria-modal="true" onClick={() => setContactOpen(false)}><article className="contact-card" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setContactOpen(false)} aria-label="Close contact">×</button><span>INSIGHTFOOLISH / CONTACT</span><h1>KEEP IN<br />TOUCH.</h1><a href="mailto:insightfoolish@gmail.com">INSIGHTFOOLISH@GMAIL.COM</a><a href="https://instagram.com/insightfoolish" target="_blank" rel="noreferrer">@INSIGHTFOOLISH</a></article></div>}
  </main>;
}
