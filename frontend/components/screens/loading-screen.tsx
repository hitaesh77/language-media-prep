import { Sparkles } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="loading">
      <div className="orb">
        <Sparkles size={36} />
      </div>
      <h1>Preparing your vocabulary…</h1>
      <p>Finding a few words for your next story.</p>
      <div
        className="indeterminate"
        role="progressbar"
        aria-label="Mock vocabulary generation"
      />
      <p className="notice">Loading a demo result. No AI service is being called.</p>
    </div>
  );
}
