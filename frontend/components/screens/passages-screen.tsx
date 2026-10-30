import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PageReference, SavedSet, Segment } from "../../lib/api/types";
import { Title, SourceNameInput } from "../flow-controls";

type PassagesScreenProps = {
  name: string;
  mode: SavedSet["type"];
  segments: Segment[];
  pages?: PageReference[];
  selected: string[];
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
  selected,
  onNameChange,
  onSelectionChange,
  onBack,
  onConfirm,
}: PassagesScreenProps) {
  return (
    <>
      <Title
        title="Choose your passage"
        subtitle="Select the paragraphs you want to prepare. Your original text stays intact."
      />
      <SourceNameInput name={name} onChange={onNameChange} />
      <>
        <p className="muted">
          {mode === "PDF" ? "Extracted PDF text · " : ""}
          {selected.length} of {segments.length} passages selected
        </p>
        <div className="passages">
          {segments.map((s, i) => (
            <label
              className={selected.includes(s.id) ? "passage chosen" : "passage"}
              key={s.id}
            >
              <input
                type="checkbox"
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
          <button onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            className="primary"
            disabled={!selected.length || !name.trim()}
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
