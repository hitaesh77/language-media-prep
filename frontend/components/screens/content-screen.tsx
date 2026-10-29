import { ArrowRight, FileText, Upload } from "lucide-react";
import type { SavedSet } from "../../lib/api/types";
import { SAMPLE } from "../../lib/api/mock-client";
import { Title, SourceNameInput } from "../flow-controls";

type ContentScreenProps = {
  name: string;
  text: string;
  mode: SavedSet["type"];
  file?: File;
  busy: boolean;
  onNameChange: (name: string) => void;
  onTextChange: (text: string) => void;
  onModeChange: (mode: SavedSet["type"]) => void;
  onFileChange: (file: File | undefined) => void;
  onClearError: () => void;
  onHome: () => void;
  onProcess: () => void;
};

export function ContentScreen({
  name,
  text,
  mode,
  file,
  busy,
  onNameChange,
  onTextChange,
  onModeChange,
  onFileChange,
  onClearError,
  onHome,
  onProcess,
}: ContentScreenProps) {
  return (
    <>
      <Title
        title="Add your content"
        subtitle="A story, an article, a little curiosity. Bring the Arabic you want to understand."
      />
      <SourceNameInput name={name} onChange={onNameChange} />
      <>
        <div className="tabs">
          <button
            className={mode === "Pasted text" ? "selected" : ""}
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
            onClick={() => {
              onModeChange("PDF");
              onClearError();
            }}
          >
            <Upload size={17} />
            Upload PDF
          </button>
        </div>
        {mode === "Pasted text" ? (
          <div className="text-box">
            <textarea
              aria-label="Arabic source text"
              lang="ar"
              dir="rtl"
              maxLength={20000}
              placeholder="الصق النص العربي هنا…"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
            <div>
              <span>{text.length.toLocaleString()} / 20,000 characters</span>
              <button
                className="text-button"
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
            <Upload size={30} />
            <h3>Choose a short Arabic PDF</h3>
            <p>Text-based PDF · up to 4 MiB</p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              aria-label="Choose PDF"
              onChange={(e) => {
                onFileChange(e.target.files?.[0]);
                onClearError();
              }}
            />
            {file && (
              <p className="file-name">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            <p className="notice">
              Demo extraction: your file is not uploaded or read. The next screen shows a
              fixed Arabic sample.
            </p>
          </div>
        )}
        <div className="actions">
          <button onClick={onHome}>Cancel</button>
          <button
            className="primary"
            disabled={
              busy || !name.trim() || (mode === "Pasted text" ? !text.trim() : !file)
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
