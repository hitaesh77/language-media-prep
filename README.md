# Lingo

An Arabic-first vocabulary preparation prototype built with Next.js App Router, TypeScript, Tailwind CSS and Lucide icons. The V1 frontend follows the supplied Sahih mockup: saved sets, text/PDF input, paragraph selection, learner settings, vocabulary management, flashcards and completion.

## Run the frontend

Requires Node.js 20.9+.

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. The frontend runs independently of FastAPI. Three illustrative saved sets are initialized on first use; their source text and vocabulary are the same small demo fixture. Saved sets and familiar selections persist in this browser's localStorage. No account, database or credentials are required.

## Frontend organization

- `frontend/components/prep-app.tsx` coordinates navigation, shared state, and API calls.
- `frontend/components/screens/` contains a component for each step of the learning flow. Screens receive typed data and action callbacks; they do not navigate to one another or call the API directly.
- `frontend/components/app-shell.tsx` owns the header, footer, and step indicator.
- `frontend/components/flow-controls.tsx` contains shared form and heading controls.
- `frontend/components/brand-logo.tsx` displays the supplied transparent Lingo logo in the header and footer. The logo lives in `frontend/public/branding/`; `frontend/app/favicon.ico` supplies the browser icon, with the PNG alternative configured in the root layout metadata.

## Mock API and future integration

`frontend/lib/api/types.ts` defines `PrepClient`, request and response types. UI calls the adapter exported by `frontend/lib/api/client.ts`; replace that export with an HTTP implementation when integrating endpoints. `mock-client.ts` implements asynchronous set loading, source processing, generation/regeneration, familiar updates and set retrieval. Persistence is confined to that module. No fake HTTP endpoints were added.

- PDF selection validates extension, MIME type and a nonempty size up to 4 MiB. **Frontend extraction is still mocked**: file contents are neither read nor uploaded by the current adapter; the UI explicitly previews a fixed sample. PDF binaries are never persisted.
- Generation waits briefly and uses a small multilingual illustrative glossary. Expressions are linked to original selected paragraphs; arbitrary text outside the glossary gets explicit unavailable meanings. It is not AI, a translation service or a proficiency-sensitive ranking system. Level and variety are stored but do not alter mock output. Meanings are unreviewed.
- Paragraph IDs use SHA-256 of the original source plus paragraph index. Characters are preserved; source edits change IDs. Vocabulary IDs include their source reference. Unknown selected IDs are rejected.
- Inputs are limited to 20,000 characters. Browser storage may fail or become corrupted; errors are shown, with an explicit reset option for unreadable saved data. Source text is rendered as text, never HTML.
- Screens use an in-page state flow; creation drafts and practice-session progress are not persisted. Refresh returns home; completed sets and familiar selections remain. Regeneration replaces vocabulary and clears familiar selections.
- Flashcards exclude familiar items. Click or Space reveals; arrow keys navigate and Escape exits. Completion counts cards visited, not recall accuracy. No audio, subtitles or V2 controls are included.

FastAPI is available separately with segmentation, generation and real bounded PDF extraction. Its contracts differ from `PrepClient`; a future HTTP adapter must connect them and retain V1 sets in browser storage. No server saved-set operations are required for V1. Keep all provider credentials on the backend. Grounding verifies occurrence, not meaning.

## Existing backend

Python 3.12+:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend provides deterministic parsing, a frequency baseline without meanings, contextual generation via a server-configured chat-completions-compatible endpoint, and bounded PDF extraction. See `backend/.env.example` and [architecture](docs/architecture.md). Do not put secrets in `NEXT_PUBLIC_` variables. This frontend does not currently call that backend.

| Endpoint | Contract |
| --- | --- |
| `GET /api/health` | Configuration readiness only; makes no provider call. |
| `POST /api/segments` | JSON `{text}` → canonical segment array; 20,000 Unicode code points maximum. |
| `POST /api/pdf/extract` | Multipart `file` → `{text, segments, pages}`; pages contain 1-based `page` and `segmentIds`. |
| `POST /api/generate` | JSON `text`, `segment_ids`, preferences and explicit `mode: "llm"` → grounded cards, timing, token usage and review notice. Defaults to baseline if mode is omitted. |

PDF limits: 4 MiB/file, 32 KiB multipart overhead, one file/no extra fields, 20 pages, 20,000 extracted characters, 2 MiB decoded stream/page and a 10-second worker deadline. On Linux the worker also has a 512 MiB address-space and 8 CPU-second ceiling; these OS limits were not exercised on Windows. Parsing uses pypdf in a disposable subprocess; files are not retained. Blank pages may be skipped with empty page references. Scanned/image/Form-drawing PDFs (including logos), encrypted/corrupt files and unusable Unicode mappings are rejected. No OCR, normalization or automatic word-order repair. Successful extraction still needs user review; broad Arabic PDF/font compatibility is not established.

Errors: 413 oversized input; 415 PDF filename/MIME mismatch; 422 invalid source/selection/PDF; 503 missing model configuration; 502 provider/timeout/invalid model output. Other multipart syntax errors may return 400. JSON requests are capped at 128 KiB. Source text, keys and raw provider errors are not included in generation logs. Cost stays null; logged token counts are not a monetary estimate. Provider calls have a 60-second overall deadline, a 4,000 completion-token ceiling and no automatic retry. GPT-5/6 names receive low reasoning effort. Usage is restricted to nonnegative integer prompt/completion/total token counts.

Local API explorer: `http://127.0.0.1:8000/docs`. The app loads `backend/.env` explicitly at normal startup; tests stub dotenv loading and forbid live model requests. The developer's `.env` was not inspected during implementation. Install dependencies before starting; PDF extraction needs `pypdf` and `python-multipart`.

For Vercel, use a backend project rooted at `backend/` and a Next.js project rooted at `frontend/`. `backend/vercel.json` sets a 90-second function duration for `app/main.py`. Configure backend LLM settings and exact `FRONTEND_ORIGINS`; the future frontend adapter uses `NEXT_PUBLIC_API_URL`. No deployment has been verified. Keep paid generation protected/budgeted before making it public; CORS alone is not access control. Cloud sets/private PDF retention remain V2.

## Verify

```powershell
cd backend
python -m pytest -q
cd ../frontend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

For consistent frontend formatting, run `npm.cmd run format` from `frontend/`.
Use `npm.cmd run format:check` to check formatting without changing files.
The shared rules are in `frontend/.prettierrc.json`. Python files follow Black formatting.

Frontend contract tests cover source preservation, stable IDs, selected-source grounding, familiar persistence/filtering, regeneration, invalid input and corrupt storage. Backend tests cover API validation, mocked model output, bounded real PDF extraction and rejection cases. No lint configuration is present. Live AI meanings, real frontend/backend integration, stakeholder review and effectiveness evaluation remain unverified.

Proficiency, variety and explanation defaults are provisional. No stakeholder or evaluation outcomes are claimed. Browser storage has no encryption or cross-device sync. Only use bounded, non-sensitive demonstration passages.
