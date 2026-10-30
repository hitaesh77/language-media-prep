import { useState } from "react";
import { ArrowRight, Plus, BookOpen, FileText, Trash2 } from "lucide-react";
import type { SavedSet } from "../../lib/api/types";

type HomeScreenProps = {
  sets: SavedSet[];
  storageError: boolean;
  onCreateSet: () => void;
  onOpenSet: (set: SavedSet) => void;
  onDeleteSet: (id: string) => Promise<void>;
};

export function HomeScreen({
  sets,
  storageError,
  onCreateSet,
  onOpenSet,
  onDeleteSet,
}: HomeScreenProps) {
  const [confirmId, setConfirmId] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  async function remove(id: string) {
    setDeleting(true);
    try {
      await onDeleteSet(id);
      setConfirmId(undefined);
    } catch {
      /* The parent displays the storage error; leave confirmation available. */
    } finally {
      setDeleting(false);
    }
  }
  return (
    <>
      <div className="greeting">
        <p className="eyebrow">A LITTLE PREPARATION. A RICHER STORY.</p>
        <h1>Good to see you.</h1>
      </div>
      <div className="section-heading">
        <h2>
          Your saved sets <span className="count">{sets.length}</span>
        </h2>
        <button className="lavender" onClick={onCreateSet}>
          <Plus size={17} />
          New set
        </button>
      </div>
      <div className="set-grid">
        {sets.map((set, i) => (
          <article className="set-entry" key={set.id}>
            <button
              className="set-card"
              onClick={() => onOpenSet(set)}
              disabled={deleting}
            >
              <span className={`set-icon color-${i % 3}`}>
                {set.type === "PDF" ? <BookOpen /> : <FileText />}
              </span>
              <span className="set-info">
                <strong>{set.name}</strong>
                <small>
                  {set.vocabulary.length} words · {set.type}
                  {!set.generation ? " · Legacy demo" : ""}
                </small>
                <span className="set-status">
                  {set.vocabulary.filter((v) => v.familiar).length} familiar · Ready to
                  practice
                </span>
              </span>
              <ArrowRight size={19} />
            </button>
            <div className="set-delete-controls">
              {confirmId === set.id ? (
                <>
                  <span>Delete this saved set?</span>
                  <button
                    className="delete-confirm"
                    disabled={deleting}
                    onClick={() => remove(set.id)}
                  >
                    Delete
                  </button>
                  <button disabled={deleting} onClick={() => setConfirmId(undefined)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  aria-label={`Delete ${set.name}`}
                  onClick={() => setConfirmId(set.id)}
                  disabled={deleting}
                >
                  <Trash2 size={14} /> Delete set
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!sets.length && !storageError && (
        <div className="empty">
          <BookOpen />
          <h3>Your next story starts here.</h3>
          <p>Create a set from a short Arabic passage.</p>
        </div>
      )}
      <div className="home-note">
        <span>
          Saved in this browser only. Clearing site data removes your sets; they do not
          sync across devices.
        </span>
      </div>
    </>
  );
}
