import type { CSSProperties } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

type CompletionScreenProps = {
  sourceName: string;
  reviewedCount: number;
  total: number;
  familiarCount: number;
  unfamiliarCount: number;
  onReviewAgain: () => void;
  onBackToSet: () => void;
  onHome: () => void;
};

export function CompletionScreen({
  sourceName,
  reviewedCount,
  total,
  familiarCount,
  unfamiliarCount,
  onReviewAgain,
  onBackToSet,
  onHome,
}: CompletionScreenProps) {
  return (
    <div className="completion">
      <div className="celebrate">✧　✦　✧</div>
      <h1>Nice work!</h1>
      <p>
        You’ve reviewed {reviewedCount} words from
        <br />
        <strong>“{sourceName}”</strong>.
      </p>
      <div className="summary-card">
        <div
          className="donut"
          style={
            {
              "--progress": `${(reviewedCount / Math.max(total, 1)) * 100}%`,
            } as CSSProperties
          }
        >
          <div>
            <strong>{reviewedCount}</strong>
            <small>/ {total}</small>
          </div>
        </div>
        <div>
          <p>
            <i className="dot green" />
            {reviewedCount} cards reviewed
          </p>
          <p>
            <i className="dot" />
            {familiarCount} familiar in this set
          </p>
          <p>
            <i className="dot gray" />
            {unfamiliarCount} unfamiliar in this set
          </p>
        </div>
      </div>
      <p className="notice">Review counts reflect cards visited, not a test of recall.</p>
      <div className="completion-actions">
        <button className="primary" onClick={onReviewAgain}>
          <RotateCcw size={16} />
          Review again
        </button>
        <button onClick={onBackToSet}>Back to set</button>
      </div>
      <button className="text-button back-home" onClick={onHome}>
        Return home
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
