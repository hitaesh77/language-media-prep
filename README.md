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

- PDF selection validates extension, MIME type and a nonempty size up to 5 MB. **Extraction is mocked**: file contents are neither read nor uploaded; the UI explicitly previews a fixed sample. PDF binaries are never persisted.
- Generation waits briefly and uses a small multilingual illustrative glossary. Expressions are linked to original selected paragraphs; arbitrary text outside the glossary gets explicit unavailable meanings. It is not AI, a translation service or a proficiency-sensitive ranking system. Level and variety are stored but do not alter mock output. Meanings are unreviewed.
- Paragraph IDs use SHA-256 of the original source plus paragraph index. Characters are preserved; source edits change IDs. Vocabulary IDs include their source reference. Unknown selected IDs are rejected.
- Inputs are limited to 20,000 characters. Browser storage may fail or become corrupted; errors are shown, with an explicit reset option for unreadable saved data. Source text is rendered as text, never HTML.
- Screens use an in-page state flow; creation drafts and practice-session progress are not persisted. Refresh returns home; completed sets and familiar selections remain. Regeneration replaces vocabulary and clears familiar selections.
- Flashcards exclude familiar items. Click or Space reveals; arrow keys navigate and Escape exits. Completion counts cards visited, not recall accuracy. No audio, subtitles or V2 controls are included.

The existing FastAPI backend remains available separately. Its `/api/segments` and `/api/generate` contracts differ from `PrepClient`; the future HTTP adapter should map those contracts and add real PDF extraction and saved-set operations. Keep all provider credentials on the backend. Grounding verifies occurrence, not meaning.

## Existing backend

Python 3.12+:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend provides deterministic parsing, a frequency baseline without meanings, and optional contextual generation via a server-configured chat-completions-compatible endpoint. See `backend/.env.example` and [architecture](docs/architecture.md). Do not put secrets in `NEXT_PUBLIC_` variables. This frontend does not currently call that backend.

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

Frontend contract tests cover source preservation, stable IDs, selected-source grounding, familiar persistence/filtering, regeneration, invalid input and corrupt storage. Backend tests cover API validation and mocked model output. No lint configuration is present. Live AI meanings, PDF extraction, stakeholder review and effectiveness evaluation remain outside this frontend demo.

Proficiency, variety and explanation defaults are provisional. No stakeholder or evaluation outcomes are claimed. Browser storage has no encryption or cross-device sync. Only use bounded, non-sensitive demonstration passages.
