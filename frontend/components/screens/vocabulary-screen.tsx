import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import type { SavedSet } from "../../lib/api/types";
import { Title } from "../flow-controls";

type VocabularyScreenProps = {
  vocabularySet: SavedSet;
  filter: string;
  busy: boolean;
  onFilterChange: (filter: string) => void;
  onFamiliarChange: (ids: string[]) => void;
  onEditSettings: () => void;
  onPractice: () => void;
  onHome: () => void;
};

export function VocabularyScreen({
  vocabularySet,
  filter,
  busy,
  onFilterChange,
  onFamiliarChange,
  onEditSettings,
  onPractice,
  onHome,
}: VocabularyScreenProps) {
  const unfamiliar = vocabularySet.vocabulary.filter((item) => !item.familiar);
  const known = vocabularySet.vocabulary
    .filter((item) => item.familiar)
    .map((item) => item.id);

  return (
    <>
      <Title
        title="Your vocabulary"
        subtitle={`${vocabularySet.vocabulary.length} words and phrases from “${vocabularySet.name}”. Mark what you know, then start practicing.`}
      />
      <p className="notice">
        Demo vocabulary · glossary meanings are illustrative and unreviewed. Occurrence in
        the source does not verify a meaning.
      </p>
      <div className="vocab-toolbar">
        <div className="filters">
          {["All", "New", "Familiar"].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              onClick={() => onFilterChange(f)}
            >
              {f}{" "}
              {f === "All"
                ? vocabularySet.vocabulary.length
                : f === "New"
                  ? unfamiliar.length
                  : known.length}
            </button>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            disabled={busy}
            checked={known.length === vocabularySet.vocabulary.length}
            onChange={(e) =>
              onFamiliarChange(
                e.target.checked ? vocabularySet.vocabulary.map((v) => v.id) : [],
              )
            }
          />
          Mark all as familiar
        </label>
      </div>
      <div className="vocab-list">
        {vocabularySet.vocabulary
          .filter(
            (v) => filter === "All" || (filter === "Familiar" ? v.familiar : !v.familiar),
          )
          .map((v) => (
            <article
              className={v.familiar ? "vocab-row familiar" : "vocab-row"}
              key={v.id}
            >
              <input
                type="checkbox"
                aria-label={`Mark ${v.expression} as familiar`}
                disabled={busy}
                checked={v.familiar}
                onChange={() =>
                  onFamiliarChange(
                    v.familiar ? known.filter((id) => id !== v.id) : [...known, v.id],
                  )
                }
              />
              <details>
                <summary>
                  <strong lang="ar" dir="rtl">
                    {v.expression}
                  </strong>
                  <span dir="auto">{v.meaning}</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="context">
                  <p lang="ar" dir="rtl">
                    {v.context}
                  </p>
                  <small>Source passage: {v.sourceId}</small>
                </div>
              </details>
            </article>
          ))}
      </div>
      {!unfamiliar.length && (
        <div className="empty">
          <Check />
          <h3>All familiar. Ready for the story.</h3>
          <p>Unmark a word above to include it in practice.</p>
        </div>
      )}
      <div className="actions">
        <button onClick={onEditSettings}>
          <ArrowLeft size={16} />
          Edit settings
        </button>
        <button
          className="primary"
          disabled={!unfamiliar.length || busy}
          onClick={onPractice}
        >
          Start practice ({unfamiliar.length} words)
          <ArrowRight size={17} />
        </button>
      </div>
      <button className="text-button back-home" onClick={onHome}>
        Return home
      </button>
    </>
  );
}
