# Language Media Prep

A local Arabic vocabulary preview application with a **FastAPI backend** and **Next.js / TypeScript frontend**.

Paste Arabic text, select paragraphs, set proficiency and target variety, generate up to 15 source-linked items, mark familiar words, and review the rest as flashcards. Arabic text uses RTL layout. The frequency baseline runs without credentials; it does not generate meanings. Optional contextual AI provides meanings and learner-specific prioritization using a configured chat-completions-compatible endpoint.

## Run locally

Prerequisites: Python 3.12+ and Node.js 20.9+.

Backend, from the repository root (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, in another terminal from the repository root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. The API and interactive documentation are at http://localhost:8000/docs. Use **Try a sample**, choose passages, then prepare vocabulary. No database or account is required. All browser state is in memory and clears on refresh.

## Configuration

Backend reads `backend/.env` when started from `backend/`. Optional `LLM_API_URL` (full trusted endpoint URL), `LLM_API_KEY`, and `LLM_MODEL` enable contextual AI. The provider must accept `messages` and `response_format: {type: json_object}` and return `choices[0].message.content` containing JSON. Only selected passages and learner settings are transmitted. Keys stay on the backend. Never put credentials in a `NEXT_PUBLIC_` variable.

`FRONTEND_ORIGINS` defaults to `http://localhost:3000` (comma-separated exact origins). The frontend defaults to `http://localhost:8000`; copy `frontend/.env.local.example` to `frontend/.env.local` to change `NEXT_PUBLIC_API_URL`. Restart processes after changing environment files.

## Verify

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
cd ../frontend
npm.cmd run typecheck
npm.cmd run build
```

Tests cover deterministic parsing, original text preservation, paragraph selection, request validation, source grounding, and mocked AI responses. Live provider behavior and Arabic meanings require separate review. Generation responses report elapsed milliseconds and available provider token usage; monetary cost is unknown until a provider and pricing are chosen.

## Scope and decisions

See [architecture and remaining decisions](docs/architecture.md). The pasted brief is the input proposal; `docs/milestone-1-brief.md` and `docs/proposed-scope.md` were absent in this empty repository. No stakeholder evidence or evaluation results have been invented. Defaults are intermediate proficiency, Modern Standard Arabic, and English explanations, all provisional and editable.

SRT/VTT upload, short text PDF extraction, and subtitle-provider lookup are follow-up work. Video upload, transcription, OCR, full books, Netflix, and YouTube are excluded from this slice. This is a local development application; public deployment needs a separate access-control and request-budget decision.
