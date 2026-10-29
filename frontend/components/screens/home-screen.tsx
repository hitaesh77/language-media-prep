import { ArrowRight, Plus, BookOpen, FileText } from "lucide-react";
import type { SavedSet } from "../../lib/api/types";

type HomeScreenProps = {
  sets: SavedSet[];
  storageError: boolean;
  onCreateSet: () => void;
  onOpenSet: (set: SavedSet) => void;
};

export function HomeScreen({
  sets,
  storageError,
  onCreateSet,
  onOpenSet,
}: HomeScreenProps) {
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
          <button className="set-card" key={set.id} onClick={() => onOpenSet(set)}>
            <span className={`set-icon color-${i % 3}`}>
              {set.type === "PDF" ? <BookOpen /> : <FileText />}
            </span>
            <span className="set-info">
              <strong>{set.name}</strong>
              <small>
                {set.vocabulary.length} words · {set.type}
              </small>
              <span className="set-status">
                {set.vocabulary.filter((v) => v.familiar).length} familiar · Ready to
                practice
              </span>
            </span>
            <ArrowRight size={19} />
          </button>
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
          Bring a passage. Find your unfamiliar words. Read with a little more confidence.
        </span>
      </div>
    </>
  );
}
