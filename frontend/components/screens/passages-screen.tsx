import { ArrowLeft, ArrowRight } from "lucide-react";
import type {
  PageReference,
  SavedSet,
  Segment,
  SubtitleReference,
} from "../../lib/api/types";
import { Title, SourceNameInput } from "../flow-controls";

type PassagesScreenProps = {
  name: string;
  mode: SavedSet["type"];
  segments: Segment[];
  pages?: PageReference[];
  subtitles?: SubtitleReference[];
  selected: string[];
  failedPages: { page: number; reason: string }[];
  busy: boolean;
  progress: string;
  onRetry: () => void;
  onNameChange: (name: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export function PassagesScreen({
  name,
  mode,
  segments,
  pages,
  subtitles,
  selected,
  failedPages,
  busy,
  progress,
  onRetry,
  onNameChange,
  onSelectionChange,
  onBack,
  onConfirm,
}: PassagesScreenProps) {
  return (
    <>
      <Title
        title="Choose your passage"
        subtitle={mode === "PDF" ? "Select the extracted passages you want to prepare." : "Select the paragraphs you want to prepare. Your original text stays intact."}
      />
      <SourceNameInput name={name} onChange={onNameChange} />
      {mode === "PDF" && (
        <p className="notice" role="alert">
          PDF extraction can scramble Arabic letters and word order. Compare the text below with the original PDF before continuing. If it is incorrect, paste verified text instead.
        </p>
      )}
      {failedPages.length > 0 && (
        <div className="notice" role="status">
          <p>These pages could not be extracted: {failedPages.map((p) => p.page).join(", ")}. You may continue with the available passages or retry the failed pages.</p>
          <details><summary>Show reasons</summary>{failedPages.map((p) => <p key={p.page}>Page {p.page}: {p.reason}</p>)}</details>
          <button type="button" disabled={busy} onClick={onRetry}>Retry failed pages</button>
          {busy && <p>{progress} Some pages take longer to process; please keep this page open.</p>}
        </div>
      )}
      <>
        <p className="muted">
          {mode === "PDF" ? "Extracted PDF text · " : ""}
          {selected.length} of {segments.length} passages selected
        </p>
        <div className="actions passage-selection-actions">
          <button type="button" disabled={busy || !segments.length || selected.length === segments.length} onClick={() => onSelectionChange(segments.map((segment) => segment.id))}>Select all passages</button>
          <button type="button" disabled={busy || !selected.length} onClick={() => onSelectionChange([])}>Deselect all passages</button>
        </div>
        <div className="passages">
          {segments.map((s, i) => (
            <label
              className={selected.includes(s.id) ? "passage chosen" : "passage"}
              key={s.id}
            >
              <input
                type="checkbox"
                disabled={busy}
                checked={selected.includes(s.id)}
                onChange={() =>
                  onSelectionChange(
                    selected.includes(s.id)
                      ? selected.filter((id) => id !== s.id)
                      : [...selected, s.id],
                  )
                }
              />
              <span>
                <small>
                  Passage {i + 1}
                  {subtitles?.[i]
                    ? ` ? ${(subtitles[i].startMs / 1000).toFixed(1)}?${(subtitles[i].endMs / 1000).toFixed(1)}s`
                    : ""}
                  {pages?.some((p) => p.segmentIds.includes(s.id))
                    ? ` · Page ${pages.find((p) => p.segmentIds.includes(s.id))!.page}`
                    : ""}
                </small>
                <span lang="ar" dir="rtl">
                  {s.text}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="actions">
          <button onClick={onBack} disabled={busy}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            className="primary"
            disabled={busy || !selected.length || !name.trim()}
            onClick={onConfirm}
          >
            Use selected passages
            <ArrowRight size={17} />
          </button>
        </div>
      </>
    </>
  );
}
