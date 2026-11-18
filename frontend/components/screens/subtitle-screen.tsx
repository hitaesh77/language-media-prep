import { useEffect, useRef, useState } from "react";
import { Title } from "../flow-controls";

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
  const selected = cues.filter((c) => c.end_ms > start * 1000 && c.start_ms < end * 1000);
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
        <label>
          Upload SRT or VTT{" "}
          <input
            type="file"
            accept=".srt,.vtt,text/plain,text/vtt"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                run(async () => {
                  if (f.size > 500000)
                    throw Error("Subtitle file must be at most 500 KB.");
                  load(await post("parse", { text: await f.text() }));
                  setName(f.name.replace(/\.(srt|vtt)$/i, ""));
                });
            }}
          />
        </label>
      </div>
      {cues.length > 0 && (
        <>
          <div className="subtitle-range">
            <label>
              From seconds{" "}
              <input
                type="number"
                min="0"
                value={start}
                disabled={busy}
                onChange={(e) => setStart(Number(e.target.value))}
              />
            </label>{" "}
            <label>
              To seconds{" "}
              <input
                type="number"
                min="0"
                value={end}
                disabled={busy}
                onChange={(e) => setEnd(Number(e.target.value))}
              />
            </label>
          </div>
          <p>
            {selected.length} cues selected. Choose a shorter range if the text exceeds
            20,000 characters or 100 passages.
          </p>
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
            disabled={busy || end <= start || !selected.length || selected.length > 100}
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
