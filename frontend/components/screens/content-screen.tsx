import { useRef, useState } from "react";
import { ArrowRight, FileText, Film, Upload } from "lucide-react";
import type { SavedSet } from "../../lib/api/types";
import { SAMPLE } from "../../lib/sample";
import { Title, SourceNameInput } from "../flow-controls";

type ContentScreenProps = {
  name: string;
  text: string;
  mode: SavedSet["type"];
  file?: File;
  progress: string;
  busy: boolean;
  onNameChange: (name: string) => void;
  onTextChange: (text: string) => void;
  onModeChange: (mode: SavedSet["type"]) => void;
  onFileChange: (file: File | undefined) => void;
  onClearError: () => void;
  onHome: () => void;
  onMovie: () => void;
  onProcess: () => void;
};

export function ContentScreen({
  name,
  text,
  mode,
  file,
  progress,
  busy,
  onNameChange,
  onTextChange,
  onModeChange,
  onFileChange,
  onClearError,
  onHome,
  onMovie,
  onProcess,
}: ContentScreenProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  function choose(files: File[]) {
    if (busy || !files.length) return;
    onClearError();
    const candidate = files[0];
    if (
      files.length !== 1 ||
      !candidate.name.toLowerCase().endsWith(".pdf") ||
      (candidate.type &&
        !["application/pdf", "application/octet-stream"].includes(candidate.type))
    ) {
      setFileError("Choose one PDF file.");
      return;
    }
    if (!candidate.size || candidate.size > 20 * 1024 * 1024) {
      setFileError("Choose a nonempty PDF no larger than 20 MiB.");
      return;
    }
    setFileError("");
    onFileChange(candidate);
  }
  return (
    <>
      <Title
        title="Add your content"
        subtitle="Choose how to add your Arabic content."
      />
      <>
        <div className="tabs">
          <button
            className={mode === "Pasted text" ? "selected" : ""}
            disabled={busy}
            onClick={() => {
              onModeChange("Pasted text");
              onClearError();
            }}
          >
            <FileText size={17} />
            Paste text
          </button>
          <button
            className={mode === "PDF" ? "selected" : ""}
            disabled={busy}
            onClick={() => {
              onModeChange("PDF");
              onClearError();
            }}
          >
            <Upload size={17} />
            Upload PDF
          </button>
          <button type="button" disabled={busy} onClick={onMovie}>
            <Film size={17} />
            From movie
          </button>
        </div>
        <SourceNameInput name={name} onChange={onNameChange} disabled={busy} />
        {mode === "Pasted text" ? (
          <div className="text-box">
            <textarea
              aria-label="Arabic source text"
              disabled={busy}
              lang="ar"
              dir="rtl"
              placeholder="الصق النص العربي هنا…"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
            <div>
              <span>{[...text].length.toLocaleString()} / 20,000 characters</span>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  onTextChange(SAMPLE);
                  if (!name) onNameChange("A morning in the old city");
                }}
              >
                Try a sample
              </button>
            </div>
          </div>
        ) : (
          <div className="upload">
            <input
              ref={input}
              type="file"
              hidden
              disabled={busy}
              accept=".pdf,application/pdf"
              aria-label="Choose PDF"
              onChange={(e) => {
                choose(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className={`upload-target${dragging ? " dragging" : ""}`}
              disabled={busy}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = busy ? "none" : "copy";
                if (!busy) setDragging(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choose(Array.from(e.dataTransfer.files));
              }}
            >
              <FileText size={24} aria-hidden="true" />
              <strong>
                {dragging
                  ? "Drop your PDF here"
                  : file
                    ? "Replace your PDF"
                    : "Drag a PDF here"}
              </strong>
              <span className="upload-browse">
                {file ? "Choose another PDF" : "Browse files"}
              </span>
            </button>
            {file && (
              <div className="upload-selection" role="status">
                <FileText size={20} aria-hidden="true" />
                <span className="file-name">
                  {file.name} - {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onFileChange(undefined);
                    setFileError("");
                    onClearError();
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            <p className="upload-help">Text-based Arabic PDF, up to 20 MiB.</p>
            {busy && (
              <div role="status">
                <p>{progress || "Opening your PDF..."}</p>
                <p>Some pages take longer to process. The last page may take a minute; please keep this page open.</p>
              </div>
            )}
            {fileError && (
              <p className="error" role="alert">
                {fileError}
              </p>
            )}
            <p className="notice">
              The PDF is processed page by page on the server and then
              discarded. Review the extracted Arabic before continuing. Scans, images and
              some font encodings may produce incorrect text.
            </p>
          </div>
        )}
        <div className="actions">
          <button onClick={onHome} disabled={busy}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              !name.trim() ||
              (mode === "Pasted text" ? !text.trim() || [...text].length > 20000 : !file)
            }
            onClick={onProcess}
          >
            {busy ? "Preparing…" : "Continue"}
            <ArrowRight size={17} />
          </button>
        </div>
      </>
    </>
  );
}
