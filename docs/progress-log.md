# Progress log

Last updated: 2026-10-29.

Use this file as the handoff for the next work session. Read [release requirements](requirements.md), [architecture](architecture.md), and the [README](../README.md) alongside it. Requirements are targets; the status below distinguishes implementation from release completion.

## Current handoff

**Backend implemented after approval (2026-10-29):** `/api/health`, `/api/segments`, `/api/generate` and new `/api/pdf/extract` are implemented with separated domain/generation/PDF modules, bounded requests/workers and Vercel duration configuration. Backend tests stub dotenv before app import and block live model requests: the user's `.env` was not read. The current frontend still uses its mock adapter, with its PDF limit synchronized to 4 MiB. Latest checks: 59 backend tests passed; frontend contract test, typecheck and production build passed. Real generation, frontend HTTP flow and Vercel deployment remain unverified. PDF extraction is conservative: images/Form drawings and unusable font mappings/presentation forms are rejected, including some legible PDFs; successful synthetic Unicode decoding is tested, but broad Arabic PDF/font compatibility is not established. Next: implement/test the real HTTP adapter and verify representative PDFs/live generation without exposing credentials. This supersedes the older pending-approval and missing-PDF statuses below.

**Approved scope update (2026-10-29):** The 4 MiB PDF limit is approved; current frontend validation still permits 5 MiB. V2 now requires cloud-persisted sets and private PDF originals with reopen/open-download/delete behavior, source/page references and ownership/access design. V1 remains browser-backed; no DB/Blob setup is needed now. Embedded PDF viewing is optional. The user plans to add an OpenAI API key to backend `.env`; configuration/connectivity has not been verified. API-test approval remains pending. This supersedes earlier wording describing the limit as proposed and persistent libraries as excluded from V2.

**TDD review reference:** [backend-test-review.md](backend-test-review.md) and `backend/tests/test_v1_contract.py` record the reviewed contracts. The user approved implementation; the prior red tests are now green. Backend remains stateless, V1 sets stay in browser storage and no hosting/storage resources were provisioned. Public deployment budgets/access and live model quality remain unresolved.

The user is happy with the frontend design. For the next backend session, start with [backend-handoff.md](backend-handoff.md): it consolidates every frontend client method, existing/proposed HTTP contracts, integration gaps, validation, and acceptance checks. Keep the accepted layout while replacing mocks with real services.

**V1 is due Friday, October 30, 2026. It is not complete.** The frontend demonstrates the learning flow, and backend extraction/generation APIs exist, but real frontend integration and successful representative Arabic PDF/live generation verification remain outstanding. The semester release includes cloud persistence, subtitles, quality improvements, deployment and validation; its exact deadline is not yet recorded.

| Area | Current evidence / status | Remaining work |
| --- | --- | --- |
| Frontend learning flow | README documents saved sets, text input, paragraph selection, settings, vocabulary, familiar marking, flashcards, and completion through a typed mock adapter. Browser localStorage stores sets and familiar selections. | Verify the real-service flow, responsive layouts, Arabic/English rendering, loading, empty, and failure states. Demo persistence is optional convenience, not a permanent-library requirement. |
| Arabic parsing and grounding | FastAPI implements bounded input validation, preserved paragraph text, stable segment IDs, selected-source validation, and a deterministic frequency baseline. | Preserve these guarantees when integrating the frontend and PDF parser. Occurrence checks do not validate meanings. |
| AI generation | Backend has an optional server-configured LLM adapter and structured-output validation. Frontend uses an illustrative glossary; preferences do not affect mock output. | Connect an HTTP adapter, configure a provider securely, verify preference-sensitive generation, contextual meanings, duplicates, regeneration, errors, and timeouts. Live output quality has not been established. |
| PDF | Backend extraction/provenance/limits and failure tests pass. Frontend still shows a mocked sample and does not upload. | Wire actual uploads/reviewable extraction; broaden successful Arabic font/reading-order coverage. Document image/Form/encoding rejection; no OCR. |
| Testing and measurement | 59 backend tests plus frontend mock-contract test, typecheck and build passed in this session. Provider is mocked; no live effectiveness/quality results. | Add HTTP-adapter/browser workflow coverage and record actual latency/usage/cost and proficient review when available. |
| Semester additions | Architecture records an initial public-document subtitle-provider feasibility check. | SRT/VTT parsing and timestamps, upload fallback, segment selection, conditional discovery, proficient review, baseline comparisons, stakeholder testing, pilot, hosted deployment, and final evidence. No live provider coverage or evaluation results established. |
| Documentation | Setup and architecture exist; release requirements and this log now capture scope and handoff. | Keep API contracts, environment setup, actual verification results, unresolved decisions, and known limitations synchronized with implementation. |

## Next session

API implementation is approved and the reviewed contracts now pass. No V2 storage accounts need provisioning yet. Prioritize the real frontend adapter, broader successful Arabic PDF fixtures and live generation verification next.

1. Broaden successful Arabic PDF/font reading-order coverage beyond synthetic Unicode fixtures; extraction and bounded failure/provenance tests now exist. Keep unsupported encoding/image limitations explicit.
2. Map the frontend `PrepClient` contract to FastAPI through an HTTP adapter; keep credentials exclusively on the backend and verify a complete text/PDF-to-flashcard workflow with real generation.
3. Run backend tests, frontend tests, typecheck, and production build. Manually check Arabic/English rendering and core error paths; record actual results here.
4. Continue subtitle-provider feasibility investigation during V1 without making V1 depend on it. Record the exact semester deadline, provider/model choice, reviewer, and pilot plan when decided.

## Change history

### 2026-10-29 - Implemented approved backend APIs with TDD

- Added PDF rejection/provenance/resource/transport tests before implementation and confirmed the red state (23 failures, 33 passes). Implemented `/api/pdf/extract`: bounded multipart reads, 4 MiB file/32 KiB overhead, 20 pages/20,000 characters/2 MiB decoded page streams, disposable 10-second subprocesses and at most two workers/process. Linux worker adds 512 MiB address-space and 8 CPU-second limits; these Linux limits were not verified on Windows. Blank pages retain empty references; source IDs match reparsing returned canonical text.
- Split HTTP, domain/parsing/grounding, generation and PDF services. Added Spanish explanation validation, duplicate-selection/blank-meaning rejection, selected-only preference-sensitive prompts, 60-second overall provider deadline, 4,000 completion-token ceiling, low reasoning effort for GPT-5/6 names, normalized token metadata, safe errors and logs. No automatic retries or live meaning-quality claims. Added explicit response models and CORS/capacity tests.
- Added pypdf/multipart dependencies, a backend-root Vercel duration configuration (90 seconds), accurate API/setup/limit documentation, and synchronized the mock frontend's PDF limit to 4 MiB. Ignored `/tmp/` rendering scratch files. No frontend HTTP adapter, database/Blob, authentication, subtitle work or deployment was added.
- Added an authored Chromium/Arial PDF fixture and inspected all three rendered pages using the PDF skill and PDFium rendering. Although visually legible, its font mappings produce presentation forms/unreliable extraction, so it is deliberately tested as a rejection case. Successful Unicode PDF extraction/page provenance and PDF-to-generation flow use synthetic fixtures. Images/Form drawings (including logos) are conservatively rejected; no normalization, reversal or OCR masks extraction failures. Broad Arabic PDF support remains a gap.
- Verification: backend suite passed (59 tests); frontend contract test, typecheck and production build passed. Test setup stubs dotenv loading before app import and blocks live HTTP model calls; `.env` was not opened, no paid provider requests were made. Black's formatting API plus explicit before/after AST equivalence checks formatted Python files despite the CLI's Python 3.12.5 refusal. `git diff --check` passed. Installed PDFium only for fixture rendering, not as a backend dependency; upgraded multipart to the declared supported range. No live/provider, browser workflow or hosted smoke test was run.
- Next step: wire/test the frontend HTTP adapter and browser storage, including metadata/page references, legacy mock IDs, failure-safe regeneration and error states; then verify real generation/representative Arabic PDFs and a Vercel preview. V1 remains incomplete until this integration and verification are done.

### 2026-10-29 - Approved V2 persistent storage scope

- Updated requirements with durable cloud sets/text/preferences/vocabulary/familiar flags, private PDF originals, reopen/open-download/delete behavior, stable source/page references, access design, failure/orphan handling and storage tests/documentation. Removed the conflicting persistent-library exclusion. Kept V1 PDF extraction and browser storage intact; an embedded PDF viewer is optional and accounts are not automatically added.
- Recorded the approved 4 MiB upload limit and pending alignment of current 5 MiB mock validation. Synchronized architecture and backend-review scope notes; no production code, credentials or cloud resources changed.
- Verification: reviewed the documentation diff and ran `git diff --check`; no application tests or build rerun for documentation-only changes. Existing backend TDD failures remain unresolved; no storage integration is claimed.
- Next step: user reviews API tests and configures backend LLM environment settings; after approval, extend PDF tests and implement V1 APIs. Decide V2 providers, library ownership/recovery and migration before implementing cloud persistence.

### 2026-10-29 - Backend TDD contracts and Vercel research for approval

- Added `backend/tests/test_v1_contract.py` covering preserved source/IDs, Unicode limits, health without provider calls, selected-source/preference forwarding, Spanish explanations, grounding/schema failures, duplicate selections, blank meanings, safe provider errors without retry, and proposed multipart PDF validation plus synthetic Unicode extraction-to-generation flow. No application code/dependencies changed.
- Added `docs/backend-test-review.md` with frontend/backend findings, API review map, explicitly incomplete PDF fixture/resource coverage, proposed 4 MiB upload limit, stateless storage recommendation, official Vercel/Neon sources, two-project deployment/environment plan, optional Postgres/private Blob upgrade path, current quota evidence and separate LLM costs. Existing 5 MiB product behavior remains unchanged pending approval.
- Verification: existing backend suite passed (13). Full backend suite after test additions: 33 passed, 12 failed as expected (Spanish unsupported, duplicate selections accepted, blank meanings accepted, nine missing PDF-route cases). An initial draft run had Windows overlong pytest parameter IDs; short explicit IDs fixed those test-harness errors. No live model, PDF extractor, deployment, database or Blob integration was exercised. Frontend tests/build were not run because no frontend or production code changed.
- Additional checks: Python compilation and `git diff --check` passed. Black refused to run on the installed Python 3.12.5 (its runtime safety check also rejects `--fast`); automatic Black formatting remains outstanding.
- Remaining gaps: realistic Arabic PDF reading-order fixtures; scanned/mixed/encrypted/blank/page-count/text-length/resource tests; actual extraction and HTTP adapter; live provider configuration/quality; preview deployment and public request budgets. Next step: user reviews the tests/proposals, then extend PDF tests and implement one approved contract at a time.

### 2026-10-29 - Consolidated backend API handoff

- Added `docs/backend-handoff.md` mapping all five `PrepClient` methods to required services, documenting current health/segments/generate contracts and proposed PDF extraction, with optional server-set routes clearly separated from the recommended database-free browser-storage adapter.
- Recorded exact frontend types/preferences, Spanish support gap, baseline default hazard, differing source ID formats/indexing, legacy-set handling, PDF provenance, error/metadata mapping, storage/regeneration semantics, demo dependencies/notices, configuration, implementation order, and acceptance checks. Included semester backend scope separately.
- Verification: cross-checked the handoff against the frontend API types/mock/client, orchestration and content/settings/vocabulary screens, backend routes/models/tests/dependencies, environment examples, and project scope/architecture. Checked local documentation links and whitespace. No application tests or build rerun for this documentation-only change; no runtime integrations are claimed.
- Next step: use the handoff to implement real PDF extraction and contextual generation behind the accepted frontend, preserving canonical source IDs and the current design.

### 2026-10-29 - Pre-push ignore audit

- Expanded `.gitignore` for Python caches/environments/build output, Next.js exports and deployment metadata, coverage/reports/logs, private key files, local AWS credentials, editor/OS files, and dedicated uploads/coursework-evidence/private-evidence directories.
- Kept environment examples, lockfiles, product branding, source, docs, and deliberate test fixtures versionable. Private content must stay in ignored directories; arbitrary PDFs and images are not blanket-ignored because fixtures and product assets belong in Git.
- Verification: 20 representative ignore checks and 8 checks for files that should remain versionable passed. No currently tracked files match ignore rules. Common credential-pattern scan found no matches in tracked or pending non-ignored text files; this is a bounded check, not a guarantee about every possible secret. `git diff --check` passed for `.gitignore`. No application tests rerun for ignore/documentation changes.
- Next step: review and stage the intended changes before pushing. V1 integration gaps and pending browser layout verification remain as documented above.

### 2026-10-29 - Frontend header and home cleanup

- Simplified the header to the logo and a quiet "Your library" label on home; removed the "Frontend demo" badge and retained learning-step navigation on the preparation screens.
- Reduced header and home top padding and the greeting-to-content gap. Replaced the named greeting with "Good to see you." and removed its subtext and decorative flourish.
- Removed the sparkle icon beside the passage note and the "Arabic first. Made for your next story." footer tagline. Kept feature-specific mock disclosures intact.
- Verification: frontend contract test passed; production build passed, including TypeScript checks; backend tests passed (13). Formatted the three changed frontend files. No browser visual check performed. Initial backend attempts used a missing virtual environment and the wrong working directory; rerunning from `backend/` with the installed Python succeeded.
- Remaining gaps and next step: verify the adjusted layout in a browser at desktop/mobile sizes; real PDF extraction and frontend/backend AI integration remain the V1 priorities listed above.

### 2026-10-29 - Release scope and handoff documentation

- Added `docs/requirements.md` from the supplied full product brief, retaining V1 and V2 assignments, exclusions, completion criteria, and conditional subtitle retrieval. Recorded the Friday deadline and clarified the existing FastAPI/Next.js stack.
- Added this progress log with the current mock/integration boundary, remaining V1 work, semester work, and concrete next steps.
- Updated `AGENTS.md` to require reading the scope/handoff and updating this log after meaningful changes.
- Verification: read README, architecture, the supplied brief, backend parsing/validation code, and test-file inventory; reviewed generated requirements and documentation diff. No runtime tests or build run for this documentation-only change. Existing unrelated working-tree changes were preserved.
- Open items: exact semester deadline, configured AI provider/model, real PDF extraction, real frontend/backend integration, and recorded live/manual validation.

## Entry format

Append a dated entry for each meaningful change with: changes made; verification performed and actual results (or explicitly not run); remaining gaps/blockers; and the next concrete step. Update the current handoff and next-session list so a new session can resume without reconstructing history. Keep secrets, uploaded content, and private coursework or stakeholder evidence out of this file and Git; record only appropriate summaries.
