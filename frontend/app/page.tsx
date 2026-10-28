"use client";
import { useState } from "react";

type Segment = { id: string; text: string };
type Card = { expression: string; meaning: string; segment_id: string; context: string };
type Result = { cards: Card[]; notice: string; mode: string; elapsed_ms: number };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SAMPLE = "في صباح هادئ، ذهب سامي إلى المكتبة القديمة في وسط المدينة. كان يبحث عن كتاب يتحدث عن السفر والثقافات المختلفة.\n\nاستقبلته أمينة المكتبة بابتسامة، وقالت إن القراءة رحلة لا تحتاج إلى تذكرة. اختار سامي قصة عن مسافر اكتشف قرية صغيرة بين الجبال.\n\nجلس قرب النافذة وبدأ يقرأ. كانت شوارع المدينة مزدحمة، لكن داخل المكتبة شعر بالهدوء والفضول. قرر أن يعود كل أسبوع ليكتشف حكاية جديدة.";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(70000) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Check your passage and settings, then try again.");
  return data;
}

export default function Home() {
  const [text, setText] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState("intermediate");
  const [variety, setVariety] = useState("Modern Standard Arabic");
  const [language, setLanguage] = useState("English");
  const [mode, setMode] = useState("baseline");
  const [result, setResult] = useState<Result | null>(null);
  const [known, setKnown] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remaining = result?.cards.filter(card => !known.includes(card.expression)) || [];
  const active = remaining[index];

  function resetResults() { setResult(null); setKnown([]); setReview(false); setIndex(0); setFlipped(false); }
  function changeText(value: string) { setText(value); setSegments([]); setSelected([]); resetResults(); setError(""); }
  async function parse() {
    setBusy(true); setError(""); resetResults();
    try { const data = await post<Segment[]>("/api/segments", { text }); setSegments(data); setSelected(data.map(s => s.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Cannot connect to the backend."); }
    finally { setBusy(false); }
  }
  async function generate() {
    setBusy(true); setError(""); resetResults();
    try { setResult(await post<Result>("/api/generate", { text, segment_ids: selected, proficiency: level, variety, explanation_language: language, mode })); }
    catch (e) { setError(e instanceof Error ? e.message : "Generation failed."); }
    finally { setBusy(false); }
  }

  return <main>
    <header><a className="brand" href="/">ل <span>Language Media Prep</span></a><span className="badge">ARABIC · LOCAL PREVIEW</span></header>
    <section className="hero"><p className="eyebrow">LESS LOOKING UP. MORE GETTING LOST IN THE STORY.</p><h1>Meet the words.<br /><em>Then meet the world.</em></h1><p>A short vocabulary preview for the Arabic you want to read.<br />Bring a passage, find your unfamiliar words, and step into the story.</p></section>
    <nav aria-label="Preparation steps" className="steps"><span className="current">01 &nbsp; Bring your text</span><span className={segments.length ? "current" : ""}>02 &nbsp; Choose your words</span><span className={result ? "current" : ""}>03 &nbsp; Make them familiar</span></nav>
    <div className="workspace"><section className="panel source"><div className="section-title"><div><p className="eyebrow">YOUR STARTING POINT</p><h2>A passage worth exploring</h2></div><span className="number">01</span></div><div className="source-toolbar"><span>Paste Arabic text</span><button className="text-button" disabled={busy} onClick={() => changeText(SAMPLE)}>Try a sample ↗</button></div><label className="sr-only" htmlFor="source">Arabic passage</label><textarea id="source" lang="ar" dir="rtl" maxLength={20000} placeholder="الصق النص العربي هنا…" value={text} disabled={busy} onChange={e => changeText(e.target.value)} /><div className="source-footer"><span>{text.length.toLocaleString()} / 20,000 characters</span><span>Separate passages with a blank line</span></div><button className="primary" onClick={parse} disabled={busy || !text.trim()}>{busy ? "Working…" : "Choose passages →"}</button>
    {segments.length > 0 && <div className="passages"><h3>Choose what you’ll read</h3><p className="muted">Only selected passages are used for vocabulary.</p>{segments.map((s, i) => <label className="passage" key={s.id}><input type="checkbox" disabled={busy} checked={selected.includes(s.id)} onChange={() => { setSelected(selected.includes(s.id) ? selected.filter(id => id !== s.id) : [...selected, s.id]); resetResults(); }} /><span><small>PASSAGE {i + 1}</small><span dir="rtl" lang="ar">{s.text}</span></span></label>)}</div>}
    </section><aside className="panel settings"><p className="eyebrow">MAKE IT YOURS</p><h2>A little context helps.</h2><p className="muted">Provisional starting settings. Adjust them for your reading.</p><label>Your proficiency<select disabled={busy} value={level} onChange={e => {setLevel(e.target.value); resetResults();}}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label>Target Arabic variety<select disabled={busy} value={variety} onChange={e => {setVariety(e.target.value); resetResults();}}>{["Modern Standard Arabic", "Egyptian", "Levantine", "Gulf", "Unspecified"].map(v => <option key={v}>{v}</option>)}</select></label><label>Explain meanings in<select disabled={busy} value={language} onChange={e => {setLanguage(e.target.value); resetResults();}}><option>English</option><option>Arabic</option></select></label><label>Vocabulary method<select disabled={busy} value={mode} onChange={e => {setMode(e.target.value); resetResults();}}><option value="baseline">Frequency baseline · no API key</option><option value="llm">Contextual AI · backend key required</option></select></label><p className="note">{mode === "baseline" ? "Baseline mode ranks repeated words. Meanings and learner-specific prioritization require contextual AI." : "Selected passages are sent to the backend’s configured AI provider. Generated meanings need proficient review."}</p><button className="primary" disabled={busy || !selected.length} onClick={generate}>{busy ? "Working…" : "Prepare my vocabulary →"}</button><p className="tiny">Up to 15 words · No account needed<br />Session stays in memory; refreshing clears it.</p></aside></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div aria-live="polite">{busy && <p className="muted">Preparing your passage. AI requests can take up to a minute.</p>}</div>
    {result && <section className="panel results"><div className="section-title"><div><p className="eyebrow">YOUR VOCABULARY PREVIEW</p><h2>A few words before you go.</h2></div><span className="badge">{result.cards.length} ITEMS · {result.elapsed_ms} MS</span></div><p className="note">{result.notice}</p><div className="review-toolbar"><span>{known.length} familiar · {remaining.length} to review</span><button className="primary" disabled={!remaining.length} onClick={() => {setReview(!review); setIndex(0); setFlipped(false);}}>{review ? "Back to words" : "Review flashcards →"}</button></div>
    {review ? active ? <div className="review"><p className="eyebrow">CARD {index + 1} OF {remaining.length}</p><button className="flashcard" aria-label="Flip flashcard" onClick={() => setFlipped(!flipped)}><span lang="ar" dir="rtl" className="expression">{active.expression}</span>{flipped ? <span dir="auto">{active.meaning}</span> : <span className="muted">Click to reveal meaning</span>}</button>{flipped && <blockquote lang="ar" dir="rtl">{active.context}</blockquote>}<div className="review-actions"><button onClick={() => {setKnown([...known, active.expression]); setIndex(0); setFlipped(false);}}>Mark familiar</button><button onClick={() => {setIndex((index + 1) % remaining.length); setFlipped(false);}}>Next card →</button></div></div> : <p>All words marked familiar. You’re ready to return to your passage.</p> : <div className="cards">{result.cards.map(card => <article className={known.includes(card.expression) ? "vocab known" : "vocab"} key={card.expression}><div className="card-top"><h3 lang="ar" dir="rtl">{card.expression}</h3><label><input type="checkbox" checked={known.includes(card.expression)} onChange={() => setKnown(known.includes(card.expression) ? known.filter(w => w !== card.expression) : [...known, card.expression])} /> Familiar</label></div><p dir="auto">{card.meaning}</p><details><summary>View source passage</summary><blockquote lang="ar" dir="rtl">{card.context}</blockquote><small>Source: {card.segment_id}</small></details></article>)}</div>}</section>}
    <footer><span>Small preparation. Richer stories.</span><span>Arabic first. Built for a focused start.</span></footer>
  </main>;
}
