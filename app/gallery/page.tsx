"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Work = { id: string; word: string; project: string; story: string; image: string };

export default function Gallery() {
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("submissions").select("id, word, story, project, display_image_path").in("status", ["approved", "archived"]).order("submitted_at", { ascending: false });
      const loaded = await Promise.all((data ?? []).map(async (item) => {
        const { data: file } = await supabase.storage.from("submissions").createSignedUrl(item.display_image_path, 3600);
        return file?.signedUrl ? { id: item.id, word: item.word, story: item.story, project: item.project || "UNTITLED", image: file.signedUrl } : null;
      }));
      setWorks(loaded.filter((item): item is Work => item !== null));
    })();
  }, []);

  const projects = useMemo(() => works.reduce<Record<string, Work[]>>((groups, item) => {
    (groups[item.project] ||= []).push(item);
    return groups;
  }, {}), [works]);
  const fullFrameHref = (item: Work) => `/view?image=${encodeURIComponent(item.image)}&word=${encodeURIComponent(item.word)}&project=${encodeURIComponent(item.project)}&story=${encodeURIComponent(item.story)}`;

  return <main className="gallery-page">
    <header><a href="/">← INSIGHTFOOLISH</a><span>COMPLETE PORTFOLIO</span><span>{String(works.length).padStart(2, "0")} WORKS</span></header>
    <section className="gallery-page-intro"><p>INSIGHTFOOLISH / IMAGE INDEX</p><h1>GALLERY</h1><span>Every work, held by the project it belongs to.</span></section>
    <div className="gallery-projects">{Object.entries(projects).map(([project, entries]) => <section className="gallery-project" key={project}><header><h2>{project}</h2><span>{String(entries.length).padStart(2, "0")} WORKS</span></header><div>{entries.map((item) => <a href={fullFrameHref(item)} target="_blank" rel="noreferrer" key={item.id}><img src={item.image} alt={item.word} /><span>{item.word}</span></a>)}</div></section>)}{!works.length && <p className="gallery-empty">LOADING GALLERY…</p>}</div>
  </main>;
}
