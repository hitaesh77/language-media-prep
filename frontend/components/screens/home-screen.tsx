import { useState } from "react";
import {
  ArrowRight,
  Plus,
  BookOpen,
  FileText,
  Trash2,
  Star,
  FolderOpen,
  HardDrive,
} from "lucide-react";
import type { SavedSet } from "../../lib/api/types";

type HomeScreenProps = {
  sets: SavedSet[];
  storageError: boolean;
  onCreateSet: () => void;
  onOpenSet: (set: SavedSet) => void;
  onDeleteSet: (id: string) => Promise<void>;
  onStarSet: (id: string, starred: boolean) => Promise<void>;
};

export function HomeScreen({
  sets,
  storageError,
  onCreateSet,
  onOpenSet,
  onDeleteSet,
  onStarSet,
}: HomeScreenProps) {
  const [view, setView] = useState<"all" | "starred">("all");
  const [confirmId, setConfirmId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const starred = sets.filter((s) => s.starred);
  const visible = view === "all" ? sets : starred;
  async function remove(id: string) {
    setSaving(true);
    try {
      await onDeleteSet(id);
      setConfirmId(undefined);
    } catch {
      /* The parent displays storage errors. */
    } finally {
      setSaving(false);
    }
  }
  async function star(set: SavedSet) {
    setSaving(true);
    try {
      await onStarSet(set.id, !set.starred);
    } catch {
      /* The parent displays storage errors. */
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="library-layout">
      <section className="library-panel" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <span className="window-caption">LINGO / LIBRARY</span>
            <h1 id="library-title">
              {view === "all" ? "Your saved sets" : "Starred sets"}{" "}
              <span className="count">({visible.length})</span>
            </h1>
          </div>
          <button className="new-set" onClick={onCreateSet}>
            <Plus size={21} /> New set
          </button>
        </div>
        <div className="set-grid">
          {visible.map((set) => (
            <article className="set-entry" key={set.id}>
              <button
                className="set-card"
                onClick={() => onOpenSet(set)}
                disabled={saving}
              >
                <span
                  className={`set-icon ${set.type === "PDF" ? "book-icon" : "document-icon"}`}
                >
                  {set.type === "PDF" ? <BookOpen /> : <FileText />}
                </span>
                <span className="set-info">
                  <strong>{set.name}</strong>
                  <small>
                    {set.vocabulary.length}{" "}
                    {set.vocabulary.length === 1 ? "word" : "words"} &middot; {set.type}
                    {!set.generation ? " / Legacy demo" : ""}
                  </small>
                  <span className="set-status">
                    {set.vocabulary.filter((v) => v.familiar).length} familiar &middot;{" "}
                    {set.vocabulary.filter((v) => !v.familiar).length} to practice
                  </span>
                </span>
                <ArrowRight size={20} />
              </button>
              <div className="set-delete-controls">
                <button
                  className={`star-set ${set.starred ? "is-starred" : ""}`}
                  aria-label={`${set.starred ? "Unstar" : "Star"} ${set.name}`}
                  aria-pressed={!!set.starred}
                  disabled={saving}
                  onClick={() => star(set)}
                >
                  <Star size={15} fill={set.starred ? "currentColor" : "none"} />{" "}
                  {set.starred ? "Starred" : "Star"}
                </button>
                {confirmId === set.id ? (
                  <>
                    <span>Delete this saved set?</span>
                    <button
                      className="delete-confirm"
                      disabled={saving}
                      onClick={() => remove(set.id)}
                    >
                      Delete
                    </button>
                    <button disabled={saving} onClick={() => setConfirmId(undefined)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    aria-label={`Delete ${set.name}`}
                    onClick={() => setConfirmId(set.id)}
                    disabled={saving}
                  >
                    <Trash2 size={14} /> Delete set
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!visible.length && !storageError && (
          <div className="empty">
            {view === "starred" ? <Star /> : <BookOpen />}
            <h3>{view === "starred" ? "No starred sets yet." : "No saved sets yet."}</h3>
            <p>
              {view === "starred"
                ? "Star a set in All sets to keep it close at hand."
                : "Create a set from an Arabic passage or PDF."}
            </p>
            {view === "starred" ? (
              <button onClick={() => setView("all")}>View all sets</button>
            ) : (
              <button onClick={onCreateSet}>
                <Plus size={16} /> Create your first set
              </button>
            )}
          </div>
        )}
        <div className="library-status">
          <HardDrive size={14} />
          <span>Saved in this browser</span>
          <span>
            {sets.length} {sets.length === 1 ? "set" : "sets"}
          </span>
        </div>
      </section>
      <aside className="library-sidebar" aria-label="Library views">
        <h2>Library</h2>
        <nav aria-label="Library filters">
          <button
            aria-pressed={view === "all"}
            onClick={() => {
              setView("all");
              setConfirmId(undefined);
            }}
          >
            <FolderOpen size={24} />
            <span>All sets</span>
            <small>{sets.length}</small>
          </button>
          <button
            aria-pressed={view === "starred"}
            onClick={() => {
              setView("starred");
              setConfirmId(undefined);
            }}
          >
            <Star size={24} />
            <span>Starred</span>
            <small>{starred.length}</small>
          </button>
        </nav>
        <p className="sidebar-note">A shortcut to the sets you want to return to.</p>
        <details className="home-note">
          <summary>About browser storage</summary>
          <p>
            Saved sets include extracted text, passages, settings, vocabulary, familiar
            flags and stars. They survive refresh and closing this browser on this device.
            Clearing site data deletes them; private browsing may delete them when closed.
            Drafts and practice position disappear on refresh or closing. Original PDF
            files are not saved. No cloud sync or cloud PDF storage is used.
          </p>
        </details>
      </aside>
    </div>
  );
}
