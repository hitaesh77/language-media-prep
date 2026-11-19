# Lingo

An Arabic-first vocabulary preparation prototype built with Next.js App Router, TypeScript, Tailwind CSS and Lucide icons. The frontend uses a stakeholder-confirmed Frutiger Aero direction and provides: saved sets, text/PDF input, paragraph selection, learner settings, vocabulary management, flashcards and completion.

## Run the frontend

Requires Node.js 20.9+.

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000 and run FastAPI on port 8000 in a second terminal (instructions below). The frontend defaults to `http://localhost:8000`; set public `NEXT_PUBLIC_API_URL` before starting/building if the backend uses another URL. The backend must explicitly allow the frontend origin through `FRONTEND_ORIGINS`. Saved sets and familiar selections persist in this browser only. No account or database is required; contextual generation needs backend LLM settings.

## Frontend organization

- `frontend/components/prep-app.tsx` coordinates navigation, shared state, and API calls.
- `frontend/components/screens/` contains a component for each step of the learning flow. Screens receive typed data and action callbacks; they do not navigate to one another or call the API directly.
- `frontend/components/app-shell.tsx` owns the header, footer, and step indicator.
- `frontend/components/flow-controls.tsx` contains shared form and heading controls.
- `frontend/components/brand-logo.tsx` displays the user-supplied white dragon/Lingo PNG in the header and footer, stored in `frontend/public/branding/`; `frontend/app/favicon.ico` supplies the browser icon, with the PNG alternative configured in the root layout metadata.

## Frontend and backend integration

`frontend/lib/api/client.ts` exports the real HTTP adapter in `http-client.ts`. FastAPI handles text parsing, PDF extraction and contextual vocabulary generation. `storage.ts` handles validated localStorage persistence under the existing `sahih-sets-v1` key. `mock-client.ts` remains a historical test fixture and is not imported by the application.

- A fresh library starts empty; no example sets are seeded. Recognizable untouched built-in samples are removed from older libraries, while user-created sets and modified examples remain. Each home card has a confirmed Delete action that persists in this browser. Regeneration sends stored source text to the real APIs; an old mock PDF sample is not an extracted original PDF.
- PDF import accepts a nonempty file up to 20 MiB and automatically extracts all pages, one page per request, with at most two requests at once. Progress is shown. Failed pages are listed and can be retried without reprocessing successful pages during the current import; available passages can still be used. A copied page and its shared resources over 4 MiB cannot be processed. Review extracted Arabic carefully; incorrect font mappings and word order are not repaired. Only selected passages are sent to generation and saved; the original PDF and unselected imported text are not retained after the draft. PDF selections are generated in batches of up to 10 passages and 20,000 characters each, then combined into one saved set. Automatic mode chooses up to 15 cards per batch and may omit passages; numeric targets can trigger a model call per passage. Large selections increase time and potential cost. Completed batches remain in memory for retry in the same tab; the set is saved only after all batches succeed. Refreshing or returning Home discards that draft. PDF import is not tested for arbitrary books or OCR.
- Numeric card choices set an overall goal: the first pass aims for that number per selected passage, then one bounded fill request per passage group can add distinct grounded cards from other passages. The result shows actual versus requested; unsuitable text, the one-pass limit, or provider failure can leave a shortfall. Additional calls increase time and cost; a failed fill keeps first-pass cards. Fill results are not retained if the browser save fails.
- Generation maps all UI preferences, with English or Arabic explanations, and explicitly sends `mode: "llm"`. Responses are checked for structure, selected-source/context consistency, occurrence and duplicate expressions before storage. Backend grounding remains authoritative; occurrence does not verify a meaning. There is no glossary or baseline fallback on errors.
- Regeneration reparses the entire untouched source through FastAPI, maps old IDs by the complete ordered paragraph sequence (including repeated paragraphs), and rejects inconsistent selections. Successful replacement preserves set ID/creation time and clears familiar flags. Failed requests or saves leave the previous saved set intact. A detected concurrent change to the same set rejects replacement; browser storage is not a transactional cloud database.
- Source limits/counts use Unicode code points, matching Python. JSON requests, PDF validation failures, Pydantic error arrays, non-JSON platform errors, unavailable services and timeouts receive readable messages. Batched generation retries a malformed vocabulary-format response once; generation timeout is 100 seconds, parsing requests 25 seconds and PDF requests 75 seconds.
- Saved sets contain generation timing/token metadata and the review notice. Cost remains null. Browser storage is unencrypted, device/browser/domain-specific and user-clearable. Unreadable data is not silently replaced; an explicitly labeled deletion action is offered only for corrupt local data.
- Drafts and practice progress remain in memory. Flashcards exclude familiar items. Click/Space reveals, arrows navigate, Escape exits. Completion counts cards visited, not recall accuracy.
- A visible Home button is available on every screen, including loading. Home aborts outstanding browser requests and ignores stale callbacks so late responses cannot navigate back into the abandoned flow. Aborting a browser request does not guarantee that provider processing already in progress is stopped.

No credentials go in the frontend. The user-configured backend `.env` was not inspected during implementation or automated tests. Live OpenAI output quality and Vercel deployment remain unverified; browser integration checks use real FastAPI routes with a fixture model.

## Existing backend

Python 3.12+:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend provides deterministic parsing, a frequency baseline without meanings, contextual generation via a server-configured chat-completions-compatible endpoint, and bounded PDF extraction. See `backend/.env.example` and [architecture](docs/architecture.md). Do not put secrets in `NEXT_PUBLIC_` variables. The frontend calls these APIs directly from the browser.

| Endpoint | Contract |
| --- | --- |
| `GET /api/health` | Configuration readiness only; makes no provider call. |
| `POST /api/segments` | JSON `{text}` → canonical segment array; 20,000 Unicode code points maximum. |
| `POST /api/pdf/extract` | Multipart `file` → `{text, segments, pages}`; pages contain 1-based `page` and `segmentIds`. |
| `POST /api/generate` | JSON `text`, `segment_ids`, preferences and explicit `mode: "llm"` → grounded cards, timing, token usage and review notice. Defaults to baseline if mode is omitted. |

Backend extraction limits: 4 MiB per chunk, 32 KiB multipart overhead, one file/no extra fields, 20 pages, 20,000 extracted characters, 2 MiB decoded stream/page and a 60-second worker deadline. On Linux the worker also has a 512 MiB address-space and 50 CPU-second ceiling; these OS limits were not exercised on Windows. Parsing uses pypdf in a disposable subprocess; files are not retained. Blank pages may be skipped with empty page references. Scanned/image/Form-drawing PDFs (including logos), encrypted/corrupt files and text containing replacement or null characters are rejected. Presentation forms are returned unchanged and may be garbled or out of order. No OCR, normalization or automatic word-order repair. Successful extraction still needs user review; broad Arabic PDF/font compatibility is not established.

PDF diagnostics: failed page numbers and reasons appear in the passage screen. Backend warnings beginning `pdf_extract` report controlled request or extraction failure reasons; `chunk_page` is relative to that uploaded chunk, not the original PDF. The messages do not contain filenames, extracted text, PDF bytes, or credentials. Browser logs are separate from the Uvicorn terminal; some failures occur before any backend request.

Errors: 413 oversized input; 415 PDF filename/MIME mismatch; 422 invalid source/selection/PDF; 503 missing model configuration; 502 provider/timeout/invalid model output. Other multipart syntax errors may return 400. JSON requests are capped at 128 KiB. Generation logs exclude source text and raw provider responses by default (`ENVIRONMENT=prod`). Set `ENVIRONMENT=dev` in the backend to log full LLM request payloads and provider response bodies, including source text and model output; protect and remove these logs appropriately. Authorization headers are not logged. Cost stays null; logged token counts are not a monetary estimate. Provider calls have a 60-second overall deadline, a 4,000 completion-token ceiling and no automatic retry. GPT-5/6 names receive low reasoning effort. Usage is restricted to nonnegative integer prompt/completion/total token counts.

OpenAI requests now use strict structured output to select server-derived candidate IDs and generate meanings. The backend binds those IDs to exact source expressions/references, then applies the same grounding checks. Candidates preserve attached prefixes, diacritics and whitespace; the provisional pool offers single words and phrases up to four words, capped at 512 with deterministic spread across passages/phrase lengths/positions for longer input. This bounds request/schema size and may omit useful candidates; it is not a validated Arabic ranking system. Other chat-compatible providers retain the original expression/reference JSON contract and grounding checks.

Generation failures now report specific, safe causes. Backend warnings include `category=...` (authentication, permissions, model/endpoint access, quota/rate limit, request compatibility, provider availability/network/timeout, JSON/schema/envelope, refusal, truncation or grounding) plus allowlisted HTTP/error/parameter metadata. Grounding logs add a static `reason` such as `expression_not_found`, `duplicate_expression` or `unknown_candidate`. Raw provider bodies, keys, source passages and model expressions are excluded. If a request fails, share only this diagnostic line, not `.env`. A user retry after the candidate change succeeded; live meaning accuracy has not been reviewed.

Local API explorer: `http://127.0.0.1:8000/docs`. The app loads `backend/.env` explicitly at normal startup; tests stub dotenv loading and forbid live model requests. The developer's `.env` was not inspected during implementation. Install dependencies before starting; PDF extraction needs `pypdf` and `python-multipart`.

For Vercel, use a backend project rooted at `backend/` and a Next.js project rooted at `frontend/`. `backend/vercel.json` sets a 90-second function duration for `app/main.py`. Configure backend LLM settings and exact `FRONTEND_ORIGINS`; the frontend adapter uses `NEXT_PUBLIC_API_URL`. No deployment has been verified. Keep paid generation protected/budgeted before making it public; CORS alone is not access control. Durable saved sets remain earlier V2 scope; private PDF retention is optional following the October 30 review.

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

Frontend contract tests cover source preservation, stable IDs, selected-source grounding, familiar persistence/filtering, regeneration, invalid input and corrupt storage. Backend tests cover API validation, mocked model output, bounded real PDF extraction and rejection cases. No lint configuration is present. Real HTTP integration is browser-tested with a fixture provider. Live AI meanings, representative successful Arabic PDF coverage, broader stakeholder validation and effectiveness evaluation remain unverified.

Variety and explanation defaults are provisional. The October 30 review supports perceived usefulness to one stakeholder; learning outcomes remain unmeasured. Browser storage has no encryption or cross-device sync. Only use bounded, non-sensitive demonstration passages.

## Optional browser integration check

The committed browser smoke test uses a deliberately fake LLM boundary and never loads backend `.env`. It exercises real FastAPI parsing/extraction/generation validation, the frontend adapter, saved sets, familiar filtering, flashcards, refresh, failure recovery and mobile layout. It needs Python Playwright with Chromium (test tooling only, not runtime dependencies).

Start `python tests/serve_integration.py` from `backend/` (port 8765), then build the frontend normally and run `npm.cmd run start -- --port 3100`. Run `python frontend/tests/browser-flow.py` from the repository root. Use an isolated test instance; do not redirect the test to a paid production provider. The smoke script redirects all API traffic to the fixture server regardless of the built frontend URL. Stop the fixture servers afterward. Screenshots go to ignored `tmp/browser/`.


### Upload and card generation controls (2026-10-29)

PDF input supports a clickable/keyboard-accessible Browse files target, drag/drop highlighting, selected-file feedback, replacement/removal and immediate single-file/type/size validation. Invalid replacement preserves the previous selection. Extraction remains authoritative.

English and Arabic are the explanation choices. Older saved meanings remain readable; unsupported older preferences require a supported choice before regeneration. Optional strict integer `cards_per_passage` (1-15) requests the same target for each selected passage, with a maximum of 300 total. Omission preserves automatic generation. The provider receives the target and grounded output is capped per passage. The result notice reports actual counts; short passages or model omissions may yield fewer cards. For numeric targets, passages with no usable cards are skipped and reported; a completely empty result fails. No paid retry or fabricated padding is used. The target persists as `preferences.cardsPerPassage`. Existing grounding/output-token limits remain.


### Expanded per-passage sets (2026-10-30)

Numeric targets now run one generation call per selected passage, at most three concurrently, under a 75-second combined deadline (each call retains its 60-second deadline, 4,000-token and 15-card ceiling). A 5-card target across 10 passages can return 50 cards. The combined set limit is 300, validated before provider calls. Automatic mode remains a single call targeting 10-15 total. More selected passages mean more provider requests/cost. A failed first-pass passage fails its request and cancels sibling tasks; the frontend retries a vocabulary-format failure once for batched generation. A failed fill preserves first-pass cards. Provider work already received may still be billed.

Each passage preserves exact original text and IDs. Repeated expressions from different passages are allowed as separate contextual cards; duplicate expressions within the same passage remain invalid. Vocabulary rows and flashcards show a human-readable passage number and PDF page where available. Per-passage counts use the original source numbering, including unselected paragraphs. Actual counts may be below target; meanings still require review. Successful combined usage sums reported token counts only when all passage usages are present; cost remains null.


**Simplified count selector (2026-10-30):** Customize offers Automatic, 3, 5 or 10 cards per passage, plus Custom with a validated whole-number input. The current calculated total is shown separately. Existing saved targets outside the presets open in Custom; numeric/API limits remain 1-15 per passage and 300 total. Presets exceeding the current passage budget are disabled.


### October 30 review updates (implemented November 16)

Customize replaces proficiency controls with nouns, verbs, adjectives, optional prepositions and roots. New sets default to the first three. Categories are saved and forwarded to generation; OpenAI candidates are restricted to individual exact-source words, and phrase output is rejected for categorized requests. Attached Arabic prefixes/diacritics are preserved. Optional roots appear as AI notes attached to attested words, not invented source expressions. Category/root accuracy and meanings still require proficient review. Legacy API proficiency and uncategorized phrase cards remain compatible.

Flashcards display the containing sentence; sentences over 24 whitespace-separated words use about four words either side of the expression, preserving the displayed substring. Original full context/source/IDs stay unchanged. Practice groups unfamiliar cards in source-passage order into batches of at most ten, with an explicit Next batch action after each batch. Counts describe visited cards in the current batch, not recall or learning outcomes.

Saved extracted text, selections, preferences, vocabulary and familiar flags survive refresh/closing in the same browser/device/domain. Drafts and practice position disappear on refresh/closing; original PDFs are never retained. Site-data clearing deletes saved sets; private browsing may clear them when closed. No cloud sync is provided or required for this same-device flow.

The user confirmed Frutiger Aero before the glass/blue/green styling update. A provisional vector dragon mark accompanies Lingo; final branding remains flexible. Generic greetings and marketing taglines were removed. The review supports usefulness to one stakeholder, not improved learning outcomes.

The 18 MB book has not been tested. See [larger-book investigation](docs/larger-books.md) for the new browser-side page-range flow and its limits. Cloud PDF retention is optional, superseding its earlier firm V2 wording; the prior V2 saved-set scope is retained.


Review-specific browser regression: with the same isolated fixture/backend and frontend servers described above, run `python frontend/tests/browser-review.py`. It verifies categories, sentence excerpts, passage/batch boundaries, persistence and mobile overflow; it does not assess AI linguistic quality.


### Rectangular desktop visual revision

The supplied hill-and-sky wallpaper backs translucent rectangular panels inspired by the bottom-left design reference. Library filters offer All sets and Starred (top filters on phones), with stars saved in this browser and preserved through regeneration. Existing sets need no migration. Expand About browser storage for persistence details. No cloud service is required. The supplied wallpaper is the original 3840 x 2160 WebP (about 538 KiB), used without resizing or recompression.

Run `python frontend/tests/browser-library.py` against the isolated frontend on port 3100 to check library styling, stars, persistence, deletion and mobile layout. This script seeds only its isolated test browser and blocks API calls; it does not alter the production library or claim AI integration results.


## Movie subtitles

Add content ? From movie searches OpenSubtitles.com for Arabic movie releases. Select a release to download it, or upload an SRT/VTT file as a fallback, then choose a time range in seconds and review the selected cues. Large movie selections are generated in batches of up to 10 passages and 20,000 characters, then combined in one set; automatic mode may omit passages, and numeric targets can make one AI request per passage. Large selections take longer and may cost more; completed batches remain in memory for retry in the same tab; refresh or Home discards them. A malformed vocabulary-format response is retried once and can incur additional charges. A single passage must still fit within 20,000 characters. Timestamps and cue IDs are saved with the browser set and shown during passage selection and practice. Configure `OPENSUBTITLES_API_KEY` in `backend/.env`; the key stays server-side. Each chosen release requests one subtitle download; there are no automatic retries. Provider requests are spaced at least 260 ms apart per backend process; this is not a global limit across hosted instances. Provider quotas, live coverage and hosted behavior have not been verified. Uploaded or downloaded text is sent to the configured LLM only when generation is requested.
