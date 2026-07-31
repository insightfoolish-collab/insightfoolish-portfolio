import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Philosophy — False Idols Collective",
  description: "The human stories hiding in plain sight.",
};

export default function Philosophy() {
  return (
    <main className="philosophy-page">
      <header className="philosophy-header">
        <a className="philosophy-back" href="/">← RETURN TO COLLECTIVE</a>
        <span>FALSE IDOLS COLLECTIVE / PHILOSOPHY</span>
      </header>
      <section className="manifesto">
        <p className="eyebrow">01 / LOOK LONGER</p>
        <h1>LOOK AT<br />WHAT IS REAL.</h1>
        <div className="manifesto-copy">
          <p className="manifesto-statement">False idols are the things we follow instead of the people in front of us: the image, the status, the distraction, the performance. Beyond them is the untold human story—behind every mask, in every passing moment, and in the reality we only see when we choose to look around.</p>
        </div>
      </section>
      <footer className="philosophy-footer"><span>FALSE IDOLS / 2026</span><span>EVERY IMAGE IS A WAY OF SEEING</span></footer>
    </main>
  );
}
