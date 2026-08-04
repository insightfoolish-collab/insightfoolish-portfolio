"use client";

import { useEffect, useState } from "react";

export default function FullFrame() {
  const [image, setImage] = useState("");
  const [word, setWord] = useState("FULL FRAME");
  const [project, setProject] = useState("INSIGHTFOOLISH");
  const [story, setStory] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setImage(params.get("image") || "");
    setWord(params.get("word") || "FULL FRAME");
    setProject(params.get("project") || "INSIGHTFOOLISH");
    setStory(params.get("story") || "");
  }, []);

  return <main className="full-frame-page">
    <header><a href="/">← INSIGHTFOOLISH</a><span>{project.toUpperCase()}</span><span>FULL FRAME</span></header>
    <section className="full-frame-work">
      {image ? <img src={image} alt={word} /> : <p>IMAGE UNAVAILABLE</p>}
      {image && <div className="full-frame-info"><strong>{word}</strong><span>{project.toUpperCase()}</span>{story && <p>{story}</p>}<small>MOVE OVER IMAGE TO READ</small></div>}
    </section>
    <footer><span>{word}</span><a href="/">RETURN TO GALLERY</a></footer>
  </main>;
}
