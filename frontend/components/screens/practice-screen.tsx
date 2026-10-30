import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import type { Vocabulary } from "../../lib/api/types";

type PracticeScreenProps = {
  card: Vocabulary;
  passageLabel: string;
  index: number;
  total: number;
  reviewedCount: number;
  flipped: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
  onExit: () => void;
};

export function PracticeScreen({
  card,
  passageLabel,
  index,
  total,
  reviewedCount,
  flipped,
  onPrevious,
  onNext,
  onFlip,
  onExit,
}: PracticeScreenProps) {
  return (
    <>
      <div className="practice-progress">
        <span>
          {index + 1} / {total}
        </span>
        <div className="progress">
          <i style={{ width: `${(reviewedCount / total) * 100}%` }} />
        </div>
      </div>
      <p className="practice-source">{passageLabel}</p>
      <div className="flash-stage">
        <button
          className="round"
          aria-label="Previous card"
          disabled={!index}
          onClick={onPrevious}
        >
          <ArrowLeft size={19} />
        </button>
        <button
          className={`flashcard ${flipped ? "revealed" : ""}`}
          onClick={onFlip}
          aria-label={flipped ? "Hide meaning" : "Reveal meaning"}
        >
          <span className="card-kicker">
            {flipped ? "A LITTLE CONTEXT" : "TAKE YOUR TIME. WHAT DOES IT MEAN?"}
          </span>
          <strong lang="ar" dir="rtl">
            {card.expression}
          </strong>
          {flipped ? (
            <>
              <span className="card-meaning" dir="auto">
                {card.meaning}
              </span>
              <span className="card-source" lang="ar" dir="rtl">
                {card.context}
              </span>
            </>
          ) : (
            <span className="card-hint">Click to reveal</span>
          )}
        </button>
        <button
          className="round"
          aria-label={index === total - 1 ? "Finish review" : "Next card"}
          onClick={onNext}
        >
          <ArrowRight size={19} />
        </button>
      </div>
      <div className="practice-controls">
        <button className="primary" onClick={onFlip}>
          {flipped ? "Hide meaning" : "Reveal meaning"}
          <RotateCcw size={16} />
        </button>
        {flipped && (
          <button onClick={onNext}>
            {index === total - 1 ? "Finish review" : "Next card"}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
      <div className="practice-footer">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={15} />
          Exit practice
        </button>
        <span>Space to flip · ← → to navigate · Esc to exit</span>
      </div>
    </>
  );
}
