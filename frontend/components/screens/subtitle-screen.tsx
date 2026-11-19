import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Title } from "../flow-controls";
import { moviePosition, subtitleRange } from "../../lib/subtitle-range";

type Cue = { id: string; start_ms: number; end_ms: number; text: string };
type Result = { id: number; title: string; year?: number; release: string };
const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export function SubtitleScreen({
  onBack,
  onUse,
}: {
  onBack: () => void;
  onUse: (cues: Cue[], name: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  async function post(path: string, body: unknown) {
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 30000);
    try {
      const response = await fetch(`${base}/api/subtitles/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(
          typeof data.detail === "string" ? data.detail : "Subtitle request failed.",
        );
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subtitle request failed.");
    } finally {
      setBusy(false);
    }
  }
  function chooseFiles(files: File[]) {
    if (busy || !files.length) return;
    if (files.length !== 1 || !/\.(srt|vtt)$/i.test(files[0].name)) {
      setError("Choose one SRT or VTT file.");
      return;
    }
    const f = files[0];
    void run(async () => {
      if (!f.size || f.size > 500000) throw Error("Choose a nonempty subtitle file of at most 500 KB.");
      load(await post("parse", { text: await f.text() }));
      setName(f.name.replace(/\.(srt|vtt)$/i, ""));
    });
  }
  function load(value: unknown) {
    if (
      !Array.isArray(value) ||
      !value.length ||
      value.length > 10000 ||
      value.some(
        (c) =>
          !c ||
          typeof c.id !== "string" ||
          typeof c.text !== "string" ||
          !Number.isSafeInteger(c.start_ms) ||
          !Number.isSafeInteger(c.end_ms) ||
          c.start_ms < 0 ||
          c.end_ms <= c.start_ms,
      )
    )
      throw Error("Invalid subtitle response.");
    setCues(value);
    setStart(0);
    setEnd(Math.ceil(Math.max(...value.map((c) => c.end_ms)) / 1000));
  }
  const selected = subtitleRange(cues, start, end);
  const duration = cues.length ? Math.ceil(Math.max(...cues.map((c) => c.end_ms)) / 1000) : 0;
  const characters = [...selected.map((c) => c.text).join("\n\n")].length;
  const invalidRange = !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end <= start;
  return (
    <>
      <Title
        title="Prepare from a movie"
        subtitle="Search for Arabic subtitles or upload an SRT/VTT file."
      />
      <div className="subtitle-search">
        <label>
          Movie title{" "}
          <input
            value={query}
            disabled={busy}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>{" "}
        <button
          disabled={busy || !query.trim()}
          onClick={() =>
            run(async () => {
              const data = await post("search", { query });
              if (
                !Array.isArray(data) ||
                data.length > 30 ||
                data.some(
                  (r) =>
                    !r ||
                    !Number.isSafeInteger(r.id) ||
                    r.id <= 0 ||
                    typeof r.title !== "string" ||
                    typeof r.release !== "string",
                )
              )
                throw Error("Invalid search response.");
              setResults(data);
              setSearched(true);
            })
          }
        >
          Search
        </button>
      </div>
      {searched && !results.length && (
        <p>No Arabic subtitles found. Try another title or upload a file.</p>
      )}
      <div className="subtitle-results">
        {results.map((r, i) => (
          <div className="subtitle-result" key={`${r.id}-${i}`}>
            <span>
              {r.title} {r.year || ""} — {r.release}
            </span>{" "}
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  load(await post("download", { file_id: r.id }));
                  setName(r.title);
                })
              }
            >
              Use subtitles
            </button>
          </div>
        ))}
      </div>
      <div className="subtitle-upload">
        <input ref={fileInput} type="file" hidden accept=".srt,.vtt,text/plain,text/vtt" disabled={busy} aria-label="Choose subtitle file" onChange={(e) => { chooseFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <button type="button" className={`upload-target${dragging ? " dragging" : ""}`} disabled={busy}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = busy ? "none" : "copy"; if (!busy) setDragging(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFiles(Array.from(e.dataTransfer.files)); }}>
          <FileText size={24} aria-hidden="true" />
          <strong>{dragging ? "Drop your subtitles here" : "Drag an SRT or VTT file here"}</strong>
          <span className="upload-browse">Browse files</span>
        </button>
        <p className="upload-help">SRT or VTT subtitle file, up to 500 KB.</p>
      </div>
      {cues.length > 0 && (
        <>
          <p>
            Subtitles end at approximately {Math.floor(duration / 60)} minutes {duration % 60} seconds. This is the last subtitle time, not necessarily the movie’s full runtime.
          </p>
          <p>Choose a portion to prepare. A subtitle passage is a timed line or group of lines.</p>
          <div className="subtitle-range">
            {[10, 30].map((minutes) => (
              <button key={minutes} type="button" disabled={busy} onClick={() => { setStart(0); setEnd(Math.min(minutes * 60, duration)); }}>
                First {minutes} minutes
              </button>
            ))}
            <button type="button" disabled={busy} onClick={() => { setStart(0); setEnd(Math.ceil(duration / 2)); }}>First half</button>
            <button type="button" disabled={busy} onClick={() => { setStart(0); setEnd(duration); }}>Full subtitles</button>
          </div>
          <div className="subtitle-range">
            <label>
              From minute{" "}
              <input
                type="number"
                min="0"
                max={duration / 60}
                step="any"
                value={Math.round(start / 60 * 100) / 100}
                disabled={busy}
                onChange={(e) => setStart(Number(e.target.value) * 60)}
              />
            </label>{" "}
            <label>
              To minute{" "}
              <input
                type="number"
                min="0"
                max={duration / 60}
                step="any"
                value={Math.round(end / 60 * 100) / 100}
                disabled={busy}
                onChange={(e) => setEnd(Number(e.target.value) * 60)}
              />
            </label>
          </div>
          <p>
            {selected.length} subtitle passages selected ({characters.toLocaleString()} characters).
          </p>
          {selected.length > 0 && (
            <p>The end time rounds up to a complete subtitle, ending at {(Math.max(...selected.map((c) => c.end_ms)) / 1000).toFixed(1)} seconds.</p>
          )}
          {selected.length > 100 && <p>Showing the first 100 selected passages below.</p>}
          <div className="subtitle-cues">
            {selected.slice(0, 100).map((c) => (
              <p key={c.id}>
                <small>
                  {(c.start_ms / 1000).toFixed(3)}–{(c.end_ms / 1000).toFixed(3)}s
                </small>{" "}
                <span lang="ar" dir="rtl">
                  {c.text}
                </span>
              </p>
            ))}
          </div>
          <button
            className="primary"
            disabled={busy || invalidRange || !selected.length}
            onClick={() => run(() => onUse(selected, name || query || "Movie subtitles"))}
          >
            Use selected subtitles
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button disabled={busy} onClick={onBack}>
          Back
        </button>
      </div>
    </>
  );
}
