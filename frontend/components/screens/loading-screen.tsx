export function LoadingScreen({ progress }: { progress: string }) {
  return (
    <div className="loading">
      <h1>Preparing your vocabulary?</h1>
      <p role="status">{progress}</p>
      <div className="indeterminate" role="progressbar" aria-label="Vocabulary generation in progress" />
      <p className="notice">Large selections can take several minutes. Please keep this page open.</p>
    </div>
  );
}
