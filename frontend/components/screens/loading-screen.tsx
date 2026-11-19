export function LoadingScreen() {
  return (
    <div className="loading">
      <h1>Preparing your vocabulary…</h1>
      <p>Generating vocabulary from your selected passages.</p>
      <div
        className="indeterminate"
        role="progressbar"
        aria-label="Vocabulary generation"
      />
      <p className="notice">
        Generating vocabulary from your selected passages. Large selections can take several minutes.
      </p>
    </div>
  );
}
