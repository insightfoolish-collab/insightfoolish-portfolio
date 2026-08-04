"use client";

import { useEffect, useState } from "react";

export default function FullFrame() {
  const [image, setImage] = useState("");
  const [word, setWord] = useState("FULL FRAME");
  const [project, setProject] = useState("INSIGHTFOOLISH");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setImage(params.get("image") || "");
    setWord(params.get("word") || "FULL FRAME");
    setProject(params.get("project") || "INSIGHTFOOLISH");
  }, []);

  return <main className="full-frame-page">
    <header><a href="/">← INSIGHTFOOLISH</a><span>{project.toUpperCase()}</span><span>FULL FRAME</span></header>
    <section>
      {image ? <img src={image} alt={word} /> : <p>IMAGE UNAVAILABLE</p>}
    </section>
    <footer><span>{word}</span><a href="/">RETURN TO GALLERY</a></footer>
  </main>;
}
