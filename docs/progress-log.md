# Progress log

Last updated: 2026-10-29.

Use this file as the handoff for the next work session. Read [release requirements](requirements.md), [architecture](architecture.md), and the [README](../README.md) alongside it. Requirements are targets; the status below distinguishes implementation from release completion.

## Current handoff

**V1 is due Friday, October 30, 2026. It is not complete.** The frontend demonstrates the learning flow, but real PDF extraction and the frontend-to-backend AI integration remain outstanding. The semester release includes V1 plus subtitles, quality improvements, deployment, and validation; its exact deadline is not yet recorded.

| Area | Current evidence / status | Remaining work |
| --- | --- | --- |
| Frontend learning flow | README documents saved sets, text input, paragraph selection, settings, vocabulary, familiar marking, flashcards, and completion through a typed mock adapter. Browser localStorage stores sets and familiar selections. | Verify the real-service flow, responsive layouts, Arabic/English rendering, loading, empty, and failure states. Demo persistence is optional convenience, not a permanent-library requirement. |
| Arabic parsing and grounding | FastAPI implements bounded input validation, preserved paragraph text, stable segment IDs, selected-source validation, and a deterministic frequency baseline. | Preserve these guarantees when integrating the frontend and PDF parser. Occurrence checks do not validate meanings. |
| AI generation | Backend has an optional server-configured LLM adapter and structured-output validation. Frontend uses an illustrative glossary; preferences do not affect mock output. | Connect an HTTP adapter, configure a provider securely, verify preference-sensitive generation, contextual meanings, duplicates, regeneration, errors, and timeouts. Live output quality has not been established. |
| PDF | Frontend validates selection and shows an explicitly mocked fixed sample; file contents are not extracted or uploaded. | Implement bounded server-side text-PDF extraction, reviewable extracted text and source references, failure handling, and tests. Reject scanned PDFs; no OCR. |
| Testing and measurement | Backend API tests and frontend mock-contract tests exist. README lists test, typecheck, and build commands. | Run checks on implementation changes; add PDF and real-integration coverage, verify the main workflow, and record actual latency/usage/cost when available. No fresh test results are claimed here. |
| Semester additions | Architecture records an initial public-document subtitle-provider feasibility check. | SRT/VTT parsing and timestamps, upload fallback, segment selection, conditional discovery, proficient review, baseline comparisons, stakeholder testing, pilot, hosted deployment, and final evidence. No live provider coverage or evaluation results established. |
| Documentation | Setup and architecture exist; release requirements and this log now capture scope and handoff. | Keep API contracts, environment setup, actual verification results, unresolved decisions, and known limitations synchronized with implementation. |

## Next session

1. Implement and test real bounded text-based PDF extraction in FastAPI, preserving Arabic text and source references.
2. Map the frontend `PrepClient` contract to FastAPI through an HTTP adapter; keep credentials exclusively on the backend and verify a complete text/PDF-to-flashcard workflow with real generation.
3. Run backend tests, frontend tests, typecheck, and production build. Manually check Arabic/English rendering and core error paths; record actual results here.
4. Continue subtitle-provider feasibility investigation during V1 without making V1 depend on it. Record the exact semester deadline, provider/model choice, reviewer, and pilot plan when decided.

## Change history

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
