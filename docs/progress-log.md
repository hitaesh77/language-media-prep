# Progress log


## Current handoff - November 16, 2026 (supersedes historical summaries below)

**Generation and upload UI (November 19):** Centered the loading view, report completed generation batches and the optional fill stage, label subtitle sets on the home page, and provide matching file picker and dashed drag/drop targets for PDF and subtitle files. Individual model requests do not expose incremental progress. Browser visual and drag/drop verification remain outstanding.

**Set-wide numeric target fill (November 19):** Numeric generation aims for the selected count per passage, then makes up to one extra fill request per passage group toward the overall target, excluding existing source/expression pairs. Cards can be unevenly distributed; the result reports actual versus target and retains first-pass cards on fill failure. Additional provider calls cost time and money. Live provider quality and actual improvement remain unverified.

**Credit passage generation fix (November 19):** Logs showed the provider returned whitespace-only meanings for a credit/name passage twice; one invalid passage aborted the numeric-target batch. Numeric generation now skips blank meanings tied to known candidate IDs and accepts zero cards for individual passages, while validating and grounding all retained cards. A completely empty request still fails; combined batch notices report how many selected passages lack cards. Live provider and browser recovery remain unverified.

**Batch failure recovery (November 19):** Completed PDF/movie batches are retained in tab memory after failure; retry with unchanged inputs resumes at the failed batch. A vocabulary-format failure is retried once automatically, which can incur additional provider charges. The complete set is saved only when all batches succeed; Home or refresh discards the draft. Existing saved sets stay unchanged during regeneration. Live provider and browser recovery remain unverified.

**LLM development logs (November 19):** `ENVIRONMENT=dev` logs full provider request payloads and response bodies, including source text; default `prod` excludes them. Authorization headers are not logged. Protect development logs and avoid sensitive source material.

**Movie presentation (November 19):** Generation uses a progress bar without the animated star; subtitle previews, passage selection and practice show concise movie positions while retaining precise timing data. Browser visual review remains outstanding.

**PDF generation batching (November 19):** Large PDF passage selections are split into sequential requests of at most 10 passages and 20,000 characters, then combined into one locally saved set with original passage/page IDs. The old 100-passage/20,000-character limit no longer applies to the combined PDF selection. Automatic mode can omit passages; numeric targets can trigger one AI call per passage. Failure saves no partial set; unchanged requests can resume completed batches in the same tab.

**PDF progress and selection (November 19):** The upload and retry screens now explain that individual pages, including the last one, may take longer. The passage screen offers Select all and Deselect all; the existing 100-passage/20,000-character generation-set limits still apply.

**Automatic PDF import (November 19):** Users can upload a PDF up to 20 MiB without choosing pages. The app processes pages individually with progress, retains successful pages in memory, and lists failed pages with retry. The user selects passages for a set; only those passages are reparsed, generated and saved, under the existing 20,000-character/100-passage set limits. The import preview is temporary. The supplied book still has known incorrect Arabic extraction; no OCR or font repair was added.

**PDF timeout adjustment (November 19):** The PDF worker deadline is now 60 seconds (50 CPU seconds on Linux) and the browser PDF request deadline is 75 seconds. Leaving the page end blank selects five pages, with up to 50 still selectable. The 20,000-character downstream limit remains. The supplied book still has visibly incorrect extracted text.

**Best-effort PDF extraction (November 19):** Presentation-form characters now pass through unchanged and the passage screen warns users to compare extracted text with the PDF. The user-supplied book still produces garbled Arabic; a direct worker check extracted pages 5?14, while pages 15?24 exceeded the existing text limit. Use shorter ranges and verified text where extraction is wrong.

**Independent PDF extraction check (November 19):** PDFium extraction of the user's 80-page book also produced unrelated Unicode characters on sampled pages 5, 6, 15 and 16. Switching extractors or normalizing presentation forms alone is not a demonstrated fix. The book remains unsupported; use a verified text source or a separately reviewed OCR transcript. Next: obtain a reliable source or investigate a validated font-specific recovery approach.

**PDF error page reporting (November 19):** Backend extraction errors with a known chunk page now identify that page; the frontend maps it to the original PDF page. The user's second book remains unsupported because its extracted Arabic contains unrelated Unicode characters; this change does not repair its text.

**November 19 second Arabic PDF:** User-provided 80-page book triggers `reason=encoding`. Sampled pages contain Arabic presentation forms mixed with unrelated Unicode characters; simply accepting or normalizing presentation forms cannot establish faithful extraction. Embedded font mappings exist but their correctness has not been established. No PDF parser change was made.

**PDF diagnostics (November 19):** Browser console logs show PDF preparation stages, chunk sizes and original page ranges; backend warnings identify upload, worker, timeout and controlled extraction failures with chunk-relative page numbers. Logs omit filenames, PDF bytes and extracted text. These diagnostics do not fix the representative book's encoding or size limitations.

**November 19 representative PDF inspection:** The user's 424-page Arabic book has a cover that copies to about 10.6 MB and contains an embedded drawing. Sampled later pages 10, 20 and 50 are individually under 4 MiB but the existing extractor rejects their encoding. Raising page selection alone does not make this book usable; investigate text fidelity and resource handling without OCR or silently changing Arabic text.

**November 19 PDF selection:** The browser now permits 50 selected pages (default and explicit range) in the existing bounded chunks, and accepts 50-page saved references. The 20,000-character combined source cap and 4 MiB per request remain; a copied single page plus resources can still exceed the request limit. The user's failing PDF was not available for diagnosis. Earlier 20-page selection descriptions are historical; per-request backend limits remain unchanged.

**Generation schema failure (November 18):** The user reported repeated live `output_schema` 502s during subtitle flashcard generation. Added allowlisted validation reason logging; the specific cause and fix are not yet known. A numeric per-passage target sends a separate model request for each passage; use a small selection and automatic mode for diagnosis.

**Subtitle passage mapping fix (November 18):** A cue containing blank lines can yield multiple source passages. Each resulting passage now retains that cue's original ID and timestamps; over 100 resulting passages produces a shorter-range message. The supplied Capernaum first-ten-minute range maps 91 cues to 92 passages successfully. Complete browser flow still needs verification.

**Subtitle time rounding (November 18):** Selected end times now round forward to the next cue end, including across silence, with the actual selected end shown. Existing limits and the cue-to-segment bug below remain.

**Latest movie range controls (November 18):** Subtitle selection now displays the last subtitle time and offers first 10 minutes, first 30 minutes, first half, full subtitles and custom minute ranges, with explicit current limits. Full/half choices can exceed those limits. The supplied Capernaum file exposes an unresolved integration bug: its first 10 minutes contain 91 cues but paragraph processing creates 92 segments due to blank lines within a cue, so proceeding fails. Fix cue-to-segment preservation before claiming the full flow works.

**Latest Arabic subtitle fix (November 18):** A live Capernaum Arabic result contained dialogue separated from its timed cue by extra blank lines. The parser now preserves such continuation text with the previous cue. The same live result parsed into 1,019 cues; linguistic quality, timing fidelity across the complete film and hosted behavior remain unverified.

**November 18 subtitle diagnostics:** Added sanitized failure logs to distinguish provider request, file retrieval, link validation, decoding and parsing failures. A user-reported live download 502 remains unresolved; retry and inspect the backend warning to identify the failing stage.

**November 18 parser follow-up:** The user's retry reached parsing and was rejected as an invalid cue. Diagnostics now distinguish missing or malformed timing, missing or empty text, and invalid duration, with a block number; the actual file format issue is still unknown.

**Latest subtitle retry:** The user reported `invalid_timing_format` in block 3. Logging now masks the rejected line into a bounded timing shape to distinguish structural variants without exposing subtitle text; a real retry is needed before changing accepted formats.

**Arabic subtitle search follow-up:** A same-host redirect with no query could drop the movie title and Arabic language filter; the client now preserves them in that case. The user-supplied Capernaum XpoZ SRT is English and parses successfully, so it does not reproduce the downloaded Arabic result's parser failure. Live search and download after this change remain unverified.

**Movie search fix:** OpenSubtitles normalized search URLs with a same-host 301 that the original client rejected. The provider now follows a bounded number of same-host HTTPS GET redirects with request pacing; a live search returned 30 results without a download. Live subtitle download remains unverified.

**November 17 movie update:** OpenSubtitles search and download, SRT/VTT upload, time-range selection and saved cue timing are implemented with fixture-only tests. Live subtitle downloads, representative Arabic files, browser flow and hosted rate limits remain unverified. Provider calls are paced per process; parallel hosted instances require shared rate limiting.

**November 17 book update:** PDF originals up to 50 MiB can be opened in the browser; select up to 20 pages and 20,000 extracted characters per preparation. The browser makes bounded valid sub-PDFs, sends up to two concurrently, validates and merges in page order, and remaps to canonical source IDs. A single page over 4 MiB and chunks without usable Arabic fail. Large-book benchmarks, real Arabic fidelity and hosting remain unverified. Subtitle support is described in the movie update above. Earlier book plans below are historical.

**Latest branding:** Replaced the provisional vector with the supplied white dragon/Lingo PNG in both shared logo placements; replaced the ICO and PNG favicons with the supplied matching blue-dragon assets. Originals were copied without image edits; responsive sizing preserves the logo aspect ratio. Earlier provisional-brand descriptions below are historical.


**Latest wallpaper:** Replaced the initial 618 x 497 JPEG with the user-supplied original 3840 x 2160 WebP (550,722 bytes), without resizing/recompression. The CSS uses a new asset URL so cached copies of the old JPEG are not reused. See the latest entry for verification.

**Latest visual revision:** The user's hill/sky wallpaper and bottom-left reference now guide the site: a rectangular translucent library panel, right-hand Library filters (All sets/Starred), compact glossy controls and white dragon identity. On mobile the filters move above the set list. Stars persist in the existing browser library and survive regeneration; older sets remain compatible. Storage details are expandable in the sidebar. This supersedes the earlier near-white rounded Aero styling; there are no copied greeting/taglines or decorative window controls. Validation for this revision is recorded in the latest entry below; earlier verification paragraphs describe the previous revision.

Implemented the October 30 stakeholder review refinements: persisted category controls replace proficiency UI; categorized generation offers individual source words, optional AI root notes, and rejects phrase output. Source text, full stored context, stable IDs, passage selection and familiar exclusion remain. Flashcards show sentence/excerpt context; practice pauses between passage-based batches of at most ten. User confirmed Frutiger Aero before styling changes; a provisional vector dragon accompanies the name. Generic greetings/taglines are removed. Home explains browser persistence, transient drafts/practice, site-data deletion and lack of original-PDF retention/cloud sync.

Larger-book page-range handling is implemented as described above; the 18 MB book has not been tested. See [bounded page-range proposal and hosting findings](larger-books.md). Cloud PDF retention is an optional proposal, not a firm stakeholder requirement. Ranking/morphology/rare-word/gamification ideas remain later work. No incomplete V1 requirement has been silently moved to V2.

Review evidence: Khanh Tran described the MVP as usable/promising and valued relevant vocabulary, passage choice and familiar filtering. This is perceived usefulness for one stakeholder, not a measured learning outcome. No live category/root/meaning accuracy or book benchmark was performed. No credentials/evidence files were read or committed.

Earlier review verification (before the latest visual revision): 92 backend tests passed; 24 frontend tests passed; production build including TypeScript passed; both fixture-backed browser scripts passed against the final build. The review script covers category defaults/empty selection/persistence, shortened context, 10/5/4-card passage batches and mobile overflow; the full smoke covers text/PDF processing, familiar filtering, regeneration/error recovery, refresh, deletion and Home during loading. Desktop/mobile screenshots were inspected. Changed frontend files passed Prettier and git diff --check passed. Earlier PDF deadline failures during concurrent build/tests and the initial PDF browser failure cleared in isolated reruns; limits were not relaxed. No paid model calls or deployed checks were made. Isolated QA servers were stopped.

**Movie batching (November 19):** Movie selections no longer stop at 100 passages or 20,000 characters or a 300-card set budget. The browser batches generation using the existing PDF path and retains subtitle timestamps and IDs across saving and regeneration. Automatic mode selects up to 15 cards per batch and may omit passages; numeric targets still allow 1-15 per passage, and each selected passage can trigger a model call. Large selections may take substantial time and cost; a failed batch saves no partial set and retry repeats completed batches. A single passage remains limited to 20,000 characters; subtitle file and parser limits remain. Removed contradictory 10-15-card prompt instructions for numeric targets, but the cause of the reported live schema failures is not established and this change is not a verified fix. Next: reproduce a live failure using the sanitized output_schema reason and address that specific validation cause; test a representative full movie and browser storage capacity. Frontend fixture tests (38) and production build passed; backend suite passed (112 tests). No live provider or browser movie test was run.

## Current next steps (planning only)

1. Review representative Arabic category selections, meanings and optional roots with a proficient reviewer. Record errors, real latency and reported usage; stakeholder usefulness is not evidence of learning improvement.
2. Validate the browser-side PDF splitting flow with a representative permitted Arabic book, including memory use, page fidelity, extraction limits and hosted behavior. See [larger-book investigation](larger-books.md).
3. Validate OpenSubtitles search, one selected download, Arabic subtitle quality, upload fallback and the complete subtitle-to-practice flow on a representative title. No live download has been made during implementation. Verify provider quotas and use a shared limiter before deploying multiple instances.
4. Verify a hosted preview with the real deployment configuration and request budgets; keep model credentials on the backend. Preserve browser persistence/error handling and existing limits until replacements are tested. Earlier V2 saved-set scope remains recorded; cloud PDF storage is optional and is not needed for this prototype.
5. Later backlog: essential versus nice-to-have ranking; optional verb forms/brief conjugation notes; refine AI root notes; exploratory rare-word collection/gamification. Final dragon branding remains flexible. These are unimplemented ideas, not additions to the initial slice. Plan a small evaluation of preparation time, interruptions and comprehension before claiming learning outcomes.

No incomplete V1 requirement is reassigned by this planning list. Hosted deployment, larger-book capacity and learning effectiveness remain unverified.


Historical summary last updated: 2026-10-30.

Use this file as the handoff for the next work session. Read [release requirements](requirements.md), [architecture](architecture.md), and the [README](../README.md) alongside it. Requirements are targets; the status below distinguishes implementation from release completion.

## Historical handoff (October 30)

**Count selector refinement (2026-10-30):** Customize now offers Automatic, 3, 5, 10 and Custom. Custom uses a validated whole-number input and shows the calculated total; saved non-preset values reopen as Custom. Existing API and generation limits remain unchanged.

**Expanded per-passage generation (2026-10-30):** Numeric targets now generate independently for each selected passage: 10 passages at 5 cards can produce 50. Combined sets allow 300 cards; calls are bounded to three concurrent tasks and a 75-second combined deadline, with no retries. Vocabulary and flashcards show original passage/PDF page labels; identical expressions in different passages remain separate contextual cards. Backend 85 tests, frontend 20 tests, build/TypeScript and a real-route 50-card fixture browser test passed. No .env was read or paid request made. See the latest entry for limits.

**Earlier UI/generation controls (2026-10-30, superseded total limit):** PDF browsing/drag/drop/replace/remove and feedback are implemented. English/Arabic are the supported explanation choices. Customize supports a uniform flashcard target per selected passage (15 total maximum), persisted with honest actual-count notices. Backend 83 tests, frontend 19 tests, typecheck/build and fixture-backed browser checks passed; no secrets read or paid calls. See the latest history entry for limitations.

**Home/library improvements (2026-10-29):** New libraries start empty, with no sample sets seeded. Recognizable untouched built-in samples are cleaned from old storage; user-created/regenerated/modified sets are preserved. Home cards now support confirmed local deletion. Every screen has a visible Home button; leaving loading aborts browser requests and ignores stale operation callbacks. Frontend tests (17), typecheck and build passed; fixture-backed browser smoke covers confirmed/cancelled deletion, persistence, empty home and Home during loading. Updated mobile home/vocabulary screenshots were inspected. No `.env` was read or paid provider call initiated. Broader Arabic PDF/meaning review and hosted verification remain outstanding.

**Live generation fix (2026-10-29):** The user encountered a real 502 after integration. New sanitized diagnostics identified `output_grounding`; OpenAI now selects strict-schema IDs from a server-derived exact-source word/phrase pool, and the backend binds expressions/references before applying unchanged grounding checks. The user confirmed a successful live generation after this change. No `.env` was read and no paid provider call was made by the agent. Candidate coverage is provisional (1â€“4 words, up to 512 exact spans); live meaning quality and broader coverage are not evaluated. Authentication/quota/model/network/schema/refusal/truncation/grounding failures now have actionable messages and safe log categories. Current test results are recorded in the new history entry below; this supersedes earlier notes saying live connectivity was wholly unverified.

**Frontend connected (2026-10-29):** The real HTTP `PrepClient` is now the application default. Pasted text and PDF bytes go to FastAPI; generation explicitly requests LLM mode and maps all UI preferences. Validated browser storage retains sets/familiar flags, page references and generation metadata under the existing key. New libraries start empty; legacy demos remain labeled and reparsed/remapped before regeneration. API/storage failures preserve the previous set and never fall back to mock meanings. No `.env` was read or paid model call made. Checks: 14 frontend tests and typecheck pass; 59 backend tests pass; production build and real-browser text/PDF-to-flashcard flow pass with a fixture provider. Desktop/mobile screenshots were inspected. Live OpenAI quality, broader Arabic PDF compatibility and Vercel deployment remain unverified. This supersedes the older adapter-pending notes below.

**Backend implemented after approval (2026-10-29):** `/api/health`, `/api/segments`, `/api/generate` and new `/api/pdf/extract` are implemented with separated domain/generation/PDF modules, bounded requests/workers and Vercel duration configuration. Backend tests stub dotenv before app import and block live model requests: the user's `.env` was not read. The current frontend still uses its mock adapter, with its PDF limit synchronized to 4 MiB. Latest checks: 59 backend tests passed; frontend contract test, typecheck and production build passed. Real generation, frontend HTTP flow and Vercel deployment remain unverified. PDF extraction is conservative: images/Form drawings and unusable font mappings/presentation forms are rejected, including some legible PDFs; successful synthetic Unicode decoding is tested, but broad Arabic PDF/font compatibility is not established. Next: implement/test the real HTTP adapter and verify representative PDFs/live generation without exposing credentials. This supersedes the older pending-approval and missing-PDF statuses below.

**Approved scope update (2026-10-29):** The 4 MiB PDF limit is approved; current frontend validation still permits 5 MiB. V2 now requires cloud-persisted sets and private PDF originals with reopen/open-download/delete behavior, source/page references and ownership/access design. V1 remains browser-backed; no DB/Blob setup is needed now. Embedded PDF viewing is optional. The user plans to add an OpenAI API key to backend `.env`; configuration/connectivity has not been verified. API-test approval remains pending. This supersedes earlier wording describing the limit as proposed and persistent libraries as excluded from V2.

**TDD review reference:** [backend-test-review.md](backend-test-review.md) and `backend/tests/test_v1_contract.py` record the reviewed contracts. The user approved implementation; the prior red tests are now green. Backend remains stateless, V1 sets stay in browser storage and no hosting/storage resources were provisioned. Public deployment budgets/access and live model quality remain unresolved.

The user is happy with the frontend design. For the next backend session, start with [backend-handoff.md](backend-handoff.md): it consolidates every frontend client method, existing/proposed HTTP contracts, integration gaps, validation, and acceptance checks. Keep the accepted layout while replacing mocks with real services.

**V1 is due Friday, October 30, 2026. It is not complete.** Frontend/FastAPI integration now passes automated browser checks with a fixture provider. Live contextual generation and successful representative Arabic PDF verification remain outstanding. The semester release includes cloud persistence, subtitles, quality improvements, deployment and validation; its exact deadline is not yet recorded.

| Area | Current evidence / status | Remaining work |
| --- | --- | --- |
| Frontend learning flow | Real HTTP adapter/browser storage connected. Browser test covers selection/preferences, vocabulary, familiar marking, flashcards/completion, refresh and regeneration failures with a fixture provider. Desktop/mobile vocabulary rendering inspected. | Verify live model quality and a broader representative Arabic PDF set. Cloud persistence remains V2. |
| Arabic parsing and grounding | FastAPI implements bounded input validation, preserved paragraph text, stable segment IDs, selected-source validation, and a deterministic frequency baseline. | Preserve these guarantees when integrating the frontend and PDF parser. Occurrence checks do not validate meanings. |
| AI generation | Frontend maps level/variety/language to server generation and preserves validated metadata/review notice; no glossary fallback. Backend validation and fixture-provider browser flow pass. | Live provider connectivity, contextual/dialect accuracy, proficiency-sensitive quality and actual latency/usage/cost remain unverified. |
| PDF | Frontend uploads actual multipart bytes, shows extracted paragraphs/page references and preserves provenance in browser sets. Real route browser test uses a synthetic Unicode PDF. | Broaden successful Arabic font/reading-order coverage. Conservative image/Form/encoding rejection remains; no OCR. |
| Testing and measurement | 59 backend tests; 14 frontend tests; typecheck/build; real-route browser workflow with fixture provider passed. No live effectiveness/quality results. | Record live provider latency/usage/cost and proficient review; verify hosted deployment and broader PDF support. |
| Semester additions | Architecture records an initial public-document subtitle-provider feasibility check. | SRT/VTT parsing and timestamps, upload fallback, segment selection, conditional discovery, proficient review, baseline comparisons, stakeholder testing, pilot, hosted deployment, and final evidence. No live provider coverage or evaluation results established. |
| Documentation | Setup and architecture exist; release requirements and this log now capture scope and handoff. | Keep API contracts, environment setup, actual verification results, unresolved decisions, and known limitations synchronized with implementation. |

## Historical next-session notes

APIs and frontend HTTP integration are implemented and tested with fixture generation. No V2 storage accounts need provisioning yet. Prioritize live generation review, broader successful Arabic PDF fixtures and hosted verification next.

1. Broaden successful Arabic PDF/font reading-order coverage beyond synthetic Unicode fixtures; extraction and bounded failure/provenance tests now exist. Keep unsupported encoding/image limitations explicit.
2. Run both normal local servers and verify a short text/PDF-to-flashcard flow with the configured real provider. Keep credentials exclusively on the backend; meaning quality and actual cost are not established by fixture tests.
3. Run backend tests, frontend tests, typecheck, and production build. Manually check Arabic/English rendering and core error paths; record actual results here.
4. Continue subtitle-provider feasibility investigation during V1 without making V1 depend on it. Record the exact semester deadline, provider/model choice, reviewer, and pilot plan when decided.

## Change history

### 2026-10-29 - User-owned library, visible Home and set deletion

- Kept new libraries empty and added narrowly identified cleanup for untouched built-in samples. Preserved user-created sets, AI-regenerated samples and examples with modified preferences/familiarity. Added idempotent local `deleteSet` to the client interface/adapters, independent card actions and inline Delete/Cancel confirmation. Save failures leave storage intact and are displayed without an unhandled UI rejection.
- Added a visible Home control to the shared header on every screen, including loading. Pending fetches can be aborted without retry; operation IDs stop stale callbacks from navigating into an abandoned flow or clearing a newer busy state. Source input stays protected while processing. Provider processing already started may continue after browser cancellation. Adjusted mobile header wrapping and kept card styling consistent.
- Added focused tests for deletion/persistence/write failure, seed cleanup with user/edited-demo preservation, and request cancellation. Extended browser smoke for visible Home, confirmed/cancelled deletion, removal after refresh, empty library and Home while generation is held. All API traffic in this browser harness is redirected to the credential-free fixture backend, preventing accidental use of a normal paid backend.
- Verification: 17 frontend tests, TypeScript and production build passed. Fixture-backed browser smoke passed, with mobile overflow checks and inspected Home/vocabulary screenshots. The first smoke needed a card-specific selector because Delete now includes the source name; a held-route cleanup warning was addressed in the harness. Changed frontend files were formatted with Prettier. Backend production code was unchanged, so its tests were not rerun for this UI/browser-storage change. No `.env` was opened, no paid calls or cloud persistence were introduced.
- Final checks: production build passed again after cleanup; `git diff --check` passed. Python smoke harness was formatted with AST equivalence checks. Isolated test servers were stopped; existing user servers were left alone.
- Next step: use the updated library controls in the normal local app; continue Arabic PDF/meaning review and Vercel preview verification.

### 2026-10-29 - Diagnosed and corrected live-generation grounding failure

- Added failing regression cases for authentication/permissions/model/quota/rate/request/upstream errors, malformed JSON/schema/envelopes, refusal, truncation and output grounding. Replaced the combined 502 message with actionable category-specific errors and safe log metadata; provider bodies/messages, source text, expressions and keys stay out of diagnostics. The user's retry identified the actual live category as `output_grounding` (not a frontend transport error).
- Changed OpenAI generation to strict candidate-ID selection plus contextual meanings. Backend candidates preserve exact source spelling, attached prefixes, diacritics and whitespace; selected IDs bind to original segment/expression before the existing all-or-nothing grounding/duplicate validation. Generic compatible providers retain the prior JSON-object protocol. Added source-candidate/cap/coverage/immutability tests; no automatic retries, silent baseline fallback or validation relaxation was added.
- Candidate defaults are provisional: one-to-four-word spans, up to 512, spread deterministically across passages, lengths and positions. This bounds cost/schema size but does not guarantee complete vocabulary/phrase coverage or reviewed prioritization; the limitation is documented. Source text and API response shapes remain unchanged.
- Verification so far: 18 candidate/diagnostic tests passed; the earlier generation/API subset passed (59) before candidate binding, and frontend production build passed. Full post-fix backend regression suite passed: 77 tests. `git diff --check` passed. Python files were formatted through Black's API with before/after AST equivalence checks. No `.env` was opened or live provider call initiated by the agent. The user independently retried and reported success; this establishes user-reported live flow success, not reviewed meaning quality or a measured evaluation.
- Next step: review representative Arabic meanings/varieties and candidate coverage; the regression run is complete. Hosted deployment and broader successful Arabic PDF verification remain outstanding.

### 2026-10-29 - Connected frontend to FastAPI with browser-storage adapter

- Added HTTP-adapter tests first (red because the module did not yet exist), then implemented the real `PrepClient` and switched the application export. Text uses canonical server segmentation, PDFs send actual multipart bytes, and generation maps all UI preferences with explicit LLM mode. Responses and stored sets are validated; transport errors handle FastAPI strings/arrays, HTML/platform responses, offline and timeout cases without automatic retry/fallback.
- Added a browser library behind the existing localStorage key, fresh empty libraries, labeled legacy demo review and ordered-source ID remapping (including repeated paragraphs). Regeneration preserves ID/creation time and commits only after successful validated generation; familiarity resets on success. Failed save/provider calls keep the previous set. Missing/unknown familiar IDs fail visibly; detected concurrent set changes reject regeneration. Corrupt-data deletion is separate from unavailable storage/service errors.
- Added page/generation metadata to client types/state/storage; page references appear in passage/vocabulary context. Removed active mock imports, separated the sample source, updated upload/AI/loading/storage notices, aligned text counting with Unicode code points, and disabled navigation/source editing while processing. Accepted layout remains intact; cloud persistence and retained PDFs remain V2.
- Added fixture-only FastAPI server and browser smoke script. It uses real HTTP parsing/PDF extraction/generation validation with a fake provider boundary, bypasses dotenv loading and makes no paid calls. Browser flow verified text/PDF input, paragraph selection, preference changes, familiar exclusion, flashcard completion, refresh persistence, failed regeneration recovery and successful regeneration reset. Inspected desktop/mobile vocabulary screenshots; mobile overflow assertion passed. Screenshots remain ignored under `tmp/browser/`.
- Verification: 14 frontend tests, TypeScript check, production build and 59 backend tests passed; browser smoke passed. Initial smoke attempts hit an existing dev-server lock (left running), a Next route-announcer selector collision, and an assertion that did not wait for PDF storage commit; the test harness was corrected and passed. Python harness formatting used Black's API with AST equivalence checks. Changed frontend files passed Prettier checks; `git diff --check` passed. A bounded scan of production chunks found no LLM key-variable/test-key markers or mock vocabulary builder; this is not a general secret audit. No `.env` was opened, no live meaning-quality/effectiveness result or deployed integration is claimed.
- Updated README, architecture and handoffs for actual setup and integration behavior. Isolated fixture services were stopped; the normal public API URL is restored by rebuilding without the fixture override. Next: user starts normal FastAPI/frontend and checks a short real generation, then review representative Arabic PDFs/meanings and verify Vercel preview configuration/budgets.

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


### 2026-10-30 - PDF upload feedback, explanation choices and card targets

- Added native-button PDF browsing with hover/focus feedback, drag/drop highlighting, selected filename/size, replacement/removal and immediate validation. A failed replacement keeps the previous valid file. Preserved backend extraction limits and original source text.
- Removed Spanish from generation UI/API support, retaining readable existing saved cards. Older unsupported preferences require English or Arabic before regeneration. Historical mock selection no longer selects Spanish.
- Added optional flashcards-per-passage target in Customize: same target for every selected passage, strict 1-15 integer and 15 total maximum. Automatic mode preserves existing behavior. Targets are sent to the provider, persisted through browser storage and regeneration, and capped server-side after grounding. Notices report actual returned counts and explain possible shortfalls; no invented padding, grounding relaxation or automatic paid retry. This implements the user's clarification about generation counts, not practice-passage filtering.
- Verification: new API tests were run red before implementation; final full backend suite passed (83). Frontend tests passed (19), TypeScript and production build passed. Fixture-backed browser smoke passed with numeric target selection and absence of Spanish; separate browser checks passed for actual file-chooser opening, removal, valid/invalid drops, retained valid selection and mobile overflow. Inspected the mobile upload screenshot. An initial browser selector matched Next's route-announcer alert; the targeted alert check passed. A test fixture's shell-encoded Arabic literal was corrected to derive from the existing Arabic source; final backend run passed. Python formatting preserved ASTs. No .env was opened and no paid calls were made.
- Remaining gaps: live count/meaning quality and broader Arabic PDF compatibility remain unreviewed; the model can return fewer valid expressions, including none for a passage. The per-passage target is uniform across selected passages; independent targets per individual passage are not implemented. Existing 15-card and 4,000-output-token limits remain.
- Next step: try a short multi-passage source with a numeric target and review the returned per-passage counts and meanings using the normal local app.

- Final housekeeping: inspected mobile upload screenshot; git diff --check passed. Isolated browser-test servers were stopped; existing user servers were left alone.


### 2026-10-30 - Expanded generation beyond 15 total cards

- Corrected the previous interpretation of a per-passage target: numeric targets now generate each selected passage separately, with a combined maximum of 300 cards (1-15 requested per passage). Automatic mode retains the original single-call 10-15 total target. Ten passages at five cards can return fifty cards. At most three calls run concurrently under a 75-second aggregate deadline; each retains the existing 60-second/provider output limits. Failed passage calls cancel siblings and return no partial set. No automatic paid retry or fabricated padding is added; more passages mean more provider requests/cost.
- Extended response/browser validation and saved-set limits to 300, preserving existing sets. Duplicate expressions remain invalid within a passage; repeated expressions across different source passages are separate contextual cards. Usage is summed when all child usage reports are present; unknown cost remains null. Actual-count notices retain original source passage numbering.
- Added visible human-readable passage numbers and PDF page labels to vocabulary rows and flashcards. Numeric options show the calculated total. Preserved original source, stable IDs, exact-source grounding, familiar flags and atomic regeneration behavior.
- Verification: full backend suite passed (85); frontend tests passed (20); production build and TypeScript passed; git diff --check passed. New API tests cover 10 passages/50 grounded cards, per-passage references, concurrency bound, usage aggregation, over-budget rejection before provider calls and failed-call atomicity. New frontend test saves/reopens 50 cards with repeated expressions across passages. A committed fixture-backed browser check passed for selecting 5 per passage across 10 passages, 50 rows, refresh/reopen, passage labels during practice and mobile overflow. Mobile vocabulary screenshot inspected. The first targeted API command used the repository root and failed to import app; the full suite from backend passed. No .env was opened and no paid provider calls were initiated.
- Remaining gaps: live quality, real latency/cost for many passages, hosted 75-second behavior and broader Arabic PDF coverage remain unverified. Short passages may yield fewer valid expressions; a failed or empty passage result fails the entire request. Target is uniform across selected passages, not individually different counts. Provider work already received may still be billed after cancellation.
- Next step: try a representative PDF, select passages and choose 5 per passage; review actual counts and meanings before hosted verification.

- Final verification: existing fixture browser regression also passed. Isolated QA servers were stopped; existing user servers were left alone.


### 2026-10-30 - Shorter count dropdown with Custom

- Replaced the 1-15 dropdown list with Automatic, 3, 5, 10 and Custom. Custom displays a whole-number field, range feedback and calculated total. Invalid/empty/fractional/over-budget counts disable generation; out-of-budget presets are disabled. Saved non-preset counts open in Custom. The API, per-passage generation and 300-card total limit are unchanged.
- Updated browser harness selection to use Custom for a target of 2; the 50-card preset check uses the shorter label. README, architecture and requirements record the selector behavior.
- Verification so far: 20 frontend tests passed. Backend code unchanged, so backend tests were not rerun. Final build/browser checks recorded below. No .env was read or paid provider call made.
- Next step: use presets or Custom in Customize; live meaning/latency and hosted verification remain outstanding.

- Final checks: production build including TypeScript passed; browser checks passed for exactly five dropdown options, preset selection, custom 7, empty/zero/fractional/over-limit rejection, back-navigation restoration, switching back to Automatic and mobile overflow. API parsing was fixture-routed and no generation request was made. git diff --check passed. Stopped the isolated frontend QA server; user servers were untouched.


### 2026-11-16 - October 30 stakeholder review implementation

- Replaced learner-level controls with multi-select nouns/verbs/adjectives/prepositions/roots, defaulting to the first three. Added API/browser boundary validation and persisted categories without changing old saved sets. Legacy proficiency/uncategorized API clients remain compatible. OpenAI categorized requests offer only single-word candidates; generic provider phrase output fails validation. Optional roots are unreviewed meaning notes tied to attested words; semantic classification is not independently proven.
- Added display-only sentence/excerpt context and passage-ordered unfamiliar-card batches of at most ten, with explicit continuation and per-batch visited-card counts. Kept original source/context/IDs and familiar flags intact. Added unit/API tests and a fixture-only browser regression for the revised controls and batch boundaries; updated the existing smoke for changed UI.
- Confirmed Frutiger Aero with the user before updating CSS surfaces/buttons/header and adding a provisional vector dragon mark. Removed generic greeting/taglines and explained same-browser storage lifecycle on Home. No permanent PDF retention, database, authentication, subtitles or exploratory ranking/gamification feature was added.
- Documented current independent PDF/source/storage/generation limits, Vercel's published payload constraint, and a provisional bounded larger-book/page-range approach in larger-books.md. Current limits remain unchanged; no 18 MB upload or book benchmark is claimed. Updated README, architecture and requirements, preserving incomplete V1 obligations and clarifying optional cloud storage.
- Verification: final results pending below. Initial frontend suite passed 23 tests and production build/typecheck passed after installing already-declared dependencies; no dependency declaration/lockfile changed. Initial backend run: 89 passed, two PDF deadline failures under concurrent build; initial full smoke failed at PDF extraction. New fixture-only browser review passed with inspected desktop/mobile screenshots. No .env was opened or paid provider request made.
- Remaining gaps: live semantic category/root/meaning quality, representative Arabic PDF compatibility, larger-book implementation/benchmark, hosting and effectiveness evaluation. Next step: complete isolated reruns, then review real Arabic output and prioritize bounded book support without cloud-storage prerequisites.


- Final verification for November 16: 92 backend tests passed in 147.13 seconds; 24 frontend tests passed. Final production build/TypeScript passed. Both browser-flow.py and browser-review.py passed on the final build using only the fixture backend. Final desktop practice screenshot inspected, including corrected ellipsis/separator rendering; mobile screenshot inspected and overflow assertion passed. Prettier and git diff --check passed. Earlier concurrent-run PDF deadline failures and the first full-smoke PDF failure cleared on isolated reruns without changing limits. QA servers were stopped; no user servers were changed. Larger-book processing, live semantic quality, hosted verification and learning outcomes remain unverified. Next: proficient review of real categorized output, then bounded page-range extraction/benchmark if larger-book implementation is prioritized.


### 2026-11-16 - Logged browser PDF splitting and next media steps

- Recorded the user's browser-held original / valid sub-PDF uploads / consolidated extraction idea in larger-books.md and the current handoff. Included actual byte-size checks, bounded page ranges, sequential requests, retry/cancellation, original page order, stable source IDs and the separate combined-source/storage limits. Kept local/separately hosted extraction as an alternative; no dependency or capacity target is approved by this note.
- Added concrete next steps for subtitle-based movie/video preparation using SRT/VTT, preserved cue timestamps/IDs, time-range selection and the existing vocabulary/practice flow. Automatic discovery remains conditional; video/audio upload, transcription, playback, OCR and platform integrations are not added. Recorded quality review, deployment/evaluation work and lower-priority ranking/morphology/branding/gamification ideas separately.
- Verification: cross-checked these notes against README, architecture, requirements and the current handoff; git diff --check passed. Documentation only: backend/frontend tests and build were not rerun; prior implementation results above are unchanged. No book/subtitle processing, cloud storage or live provider integration was implemented or tested in this update.
- Remaining gaps: browser PDF fidelity/memory and chunk provenance, larger-source persistence, representative Arabic book compatibility, subtitle implementation, live linguistic quality and hosted/effectiveness verification. Next concrete step: prototype valid browser-side page-range splitting with synthetic PDFs and test exact-source extraction/merge behavior before adding it to the product flow.


### 2026-11-16 - Hill-and-sky rectangular desktop styling and starred sets

- Used the user-supplied frutiger_aero.jpg unchanged as the product wallpaper in frontend/public/branding/hills-wallpaper.jpg; the four-screen image served only as a visual reference, not as instructions or a shipped screenshot. Followed the bottom-left composition with boxy glass panels, blue highlights, compact controls, a right sidebar and responsive top filters. Preserved the no-greetings/taglines decision and the preparation/practice flow. Existing Arabic text/RTL and stable source references remain unchanged.
- Made the sidebar functional with All sets and Starred views rather than duplicate Home/Saved sets destinations. Added an optional validated browser-saved starred flag, star/unstar actions, counts and empty state; preserved stars through regeneration and kept write failures from changing saved data. Updated the historical mock client to satisfy the interface. No cloud storage, account, database, API generation or PDF limits changed.
- Added unit coverage for persistence, regeneration, invalid star values, missing sets and failed saves. Added an isolated browser-library.py regression covering desktop/mobile layout, star/refresh/unstar/filtering, deletion/cancel, storage explanation and New set. Fixture sets exist only in isolated browser tests, never as production seeds. Updated the earlier browser review to expand storage details.
- Final verification: 26 frontend tests passed; 92 backend tests passed (182.65 seconds). Production build/TypeScript passed after final spacing/rectangular-control polish. All three browser scripts (library, review and full flow) passed against the final build; desktop/mobile screenshots were inspected and overflow checks passed. The full flow uses real text/PDF APIs with a fixture model; library tests block API calls. Changed frontend files passed Prettier; git diff --check passed. No .env or stakeholder evidence was read, and no paid generation call was made. Isolated QA servers were stopped; user servers were untouched.
- Remaining gaps: wallpaper is the supplied 618 x 497 image and softens when enlarged; broader real-browser/device visual review and live linguistic/hosted validation remain outstanding. Next: user reviews the rectangular desktop direction, then refine styling from that feedback. Larger-book and subtitle ideas remain planning items above.


### 2026-11-16 - Replaced fuzzy wallpaper with supplied 4K WebP

- Copied windows_xp.webp unchanged to frontend/public/branding/hills-wallpaper.webp and removed the superseded low-resolution JPEG. Updated CSS and the library browser assertion to the new URL; retained the existing cover positioning and glass layout. Updated README and current handoff to reflect the actual image dimensions/size.
- Verification: Pillow confirmed 3840 x 2160; original file is 550,722 bytes. Source/destination SHA-256 hashes match. Production build/TypeScript and the desktop/mobile library browser regression passed; desktop screenshot inspected. git diff --check passed. Isolated preview server was stopped. No application logic or backend changed, so unit/backend tests were not rerun.
- Remaining gaps: physical 4K/high-DPI device review is not performed. Next: check the rebuilt desktop/mobile library uses the replacement image and preserves layout.


### 2026-11-16 - Adopted supplied white logo and matching favicons

- Replaced the provisional vector/logo text with the uploaded white dragon/Lingo PNG through the shared BrandLogo component. Updated desktop/mobile/footer sizing to preserve its 2172 x 724 aspect ratio and transparency. Copied the supplied ICO (16-256 px variants) and 512 x 512 PNG to the existing favicon assets; versioned the PNG metadata URL to avoid reusing the old cached image. Updated the browser review's image accessibility assertion and README.
- Verification: inspected image metadata (RGBA logo/PNG, ICO sizes); source/destination logo SHA-256 hashes match. Production build/TypeScript and desktop/mobile library browser regression passed. Inspected desktop header and mobile content/footer screenshots. Browser confirmed the logo decoded, favicon metadata points to the new PNG URL, and ICO/PNG endpoints both return HTTP 200 with expected MIME types and byte-identical content to the installed assets. git diff --check passed. Preview server stopped. No image generation, crop or recompression was performed. Backend/unit tests were not rerun for this asset/display-only change.
- Remaining gaps: physical browser-tab favicon cache behavior and real-device review remain unverified. Next: inspect logo layout at desktop/mobile sizes and check both favicon endpoints in the built app.

### 2026-11-17 - Bounded larger-book page extraction

- Added 50 MiB browser PDF input and page-range controls (up to 20 pages). pdf-lib copies valid sub-PDFs, recursively splits oversized chunks, and limits requests to two concurrently. Validated responses merge by chunk order; combined text is reparsed for canonical IDs and original page references are retained. Repeated text is preserved and errors discard partial results. Existing 4 MiB backend request and 20,000-character combined-source limits remain.
- Verification: 27 frontend tests passed, including a synthetic 11-page, two-request out-of-order merge with repeated text and non-first page numbers; production build and TypeScript passed. Backend isolated rerun passed 92 tests; a concurrent run had two PDF worker failures under load (90 passed). git diff --check passed. No real book, browser end-to-end, hosted deployment or live model was tested.
- Remaining gaps: 50 MiB memory/fidelity and representative Arabic PDFs are unmeasured. All-blank/non-Arabic chunks fail existing backend validation; a single page exceeding 4 MiB cannot be processed. No whole-book source beyond 20,000 characters, per-chunk retry/progress or subtitle support. Next: try a permitted representative Arabic book and validate output/page ordering, browser resource use and hosted limits.

### 2026-11-17 - Subtitle parser groundwork

- Added an initial bounded SRT/WebVTT cue parser that retains text, millisecond timing, overlapping cues and stable IDs, plus focused tests. It is not connected to any endpoint or UI and does not implement movie lookup or upload yet.
- Verification: four targeted parser tests passed from backend/. An initial command from the repository root used the wrong test path and ran no tests. Full backend suite and frontend build were not run for this isolated groundwork. No credentials were read and no provider requests were made.
- Remaining: integrate and harden parsing for representative subtitle files, implement OpenSubtitles search/download, upload fallback, time-range selection, source/timestamp persistence and end-to-end verification. Next: implement the provider boundary and subtitle API with mocked provider tests.

### 2026-11-17 - Movie lookup and subtitle preparation

- Added OpenSubtitles Arabic movie-release search and selected-file download using the backend API key; SRT/VTT upload is the fallback. Provider requests are paced 260 ms apart per process, without retries. Download links are restricted to HTTPS OpenSubtitles hosts and response sizes are bounded. Search/download errors offer upload fallback. No key is sent to the browser.
- Added timestamp-range selection, cue review, canonical passage mapping and saved cue ID/timestamp provenance through regeneration and practice. Existing 100-passage and 20,000-character limits remain. A selected subtitle stays in the page while moving between screens, avoiding another download when going back.
- Verification: 98 backend tests passed, including six targeted parser/API fixture checks; after the response streaming change the six targeted checks passed again. Frontend 28 tests passed including subtitle timing persistence/regeneration. Production build and TypeScript passed. git diff --check passed. No live API calls, subtitle downloads, provider credentials inspection or paid model requests were made; browser end-to-end was not run.
- Remaining gaps: real API quota/authentication, hosted operation, Arabic subtitle quality and representative file parsing are unverified. Request pacing is per process rather than shared across deployments; the existing five-download allowance can be exhausted by users. A movie range is limited to 100 cues and 20,000 characters. Next: restart the backend with the configured key, try one movie search and at most one download, then review timing and generation with an Arabic-proficient person.

### 2026-11-17 - Fixed OpenSubtitles search redirect

- Fixed search failures caused by OpenSubtitles returning a 301 to its normalized query URL. Follow up to three redirects only for GET requests to the same HTTPS host, without forwarding query parameters twice; apply the existing per-process request pacing to each hop. Reject cross-host redirects so credentials cannot be forwarded elsewhere. Existing download safeguards remain.
- Verification: targeted subtitle tests passed (8), including same-host normalization and cross-host rejection; full backend suite passed (100). A live direct search and the running local backend search each returned 30 results. git diff --check passed. No subtitle was downloaded and no key was printed. Frontend build was not rerun for this backend-only fix.
- Remaining gaps: real subtitle download and Arabic subtitle quality remain unverified; multi-instance rate limits require shared coordination. Next: user can retry movie search and choose a subtitle when ready.

### 2026-11-17 - Movie subtitle spacing

- Grouped and spaced movie search, release results, upload, time range and cue preview; added narrow-screen wrapping and spacing for the movie entry button. Existing subtitle behavior and Arabic text are unchanged.
- Verification: frontend production build and TypeScript passed. Visual browser review was not performed; backend tests were not rerun for this presentation-only change.
- Remaining: verify the movie flow on desktop and mobile with representative results and subtitle files. Next: review the layout in a browser and adjust from feedback.

### 2026-11-17 - Grouped content source choices

- Moved the movie action beside Paste text and Upload PDF, labeled it From movie, and placed the source name below those choices. Allowed choices to wrap on narrow screens and updated the README label.
- Verification: frontend production build and TypeScript passed. Browser visual review and backend tests were not run for this UI-only change.
- Remaining: visually review the choices on desktop and mobile. Next: check the complete movie subtitle flow with a representative file.

### 2026-11-17 - Content field and PDF picker polish

- Added spacing after the source name, labeled it required and added native required semantics; existing continue controls already reject blank names. Restyled PDF selection and page range as compact rectangular controls while preserving browsing, drag/drop and validation.
- Verification: frontend production build and TypeScript passed. Browser visual review and backend tests were not run for this presentation change.
- Remaining: visually review the PDF picker and its selected-file state on desktop and mobile. Next: test with a representative Arabic PDF.

### 2026-11-17 - PDF drag-and-drop indication

- Made the compact PDF picker explicitly invite dragging, with a dashed drop boundary and a stronger highlight while dragging; retained the existing browse and drop behavior.
- Verification: frontend production build and TypeScript passed. Browser drag-and-drop and visual review were not performed; backend tests were not rerun for this display change.
- Remaining: check drag feedback and file selection in desktop and mobile browsers. Next: test the complete PDF flow with a representative Arabic file.

### 2026-11-18 - Subtitle download diagnostics

- Added stage, controlled failure reason and provider HTTP status logging for subtitle failures without logging credentials, URLs or subtitle content; existing API errors and safeguards remain.
- Verification: 101 backend tests passed; the separately run subtitle suite passed 10 tests, including a new simulated 429 and log privacy checks. The full suite began before the final provider-status test was added. No live download or frontend build was run.
- Remaining: the reported live 502 and real subtitle quality are unresolved. Next: retry the download and inspect the backend warning to identify the failure stage.

### 2026-11-18 - Narrowed subtitle parser diagnostics

- The user reported a live download reaching the parser but receiving a generic invalid-cue error. Added controlled cue failure categories and block numbers without logging subtitle content; parsing acceptance is unchanged.
- Verification: 13 subtitle tests passed, including individual failure categories and log privacy; all 105 backend tests passed. No live provider download or frontend build was run.
- Remaining: the cause in the actual subtitle is unknown. Next: retry and use the new reason and block number to guide a targeted fix.

### 2026-11-18 - Subtitle timing shape diagnostic

- The user's retry identified an unrecognized timing format in block 3. Added a bounded, character-masked timing shape to the diagnostic; cue acceptance is unchanged.
- Verification: all 106 backend tests passed, including masking of subtitle text in the timing shape. No live subtitle download or frontend build was performed.
- Remaining: the rejected timing format is unknown. Next: retry the same subtitle and inspect the masked timing shape before fixing parsing.

### 2026-11-18 - Preserve subtitle search filters on redirects

- Preserved original query parameters on same-host GET redirects that omit a query, so a normalized search does not silently lose the title or Arabic filter. Redirects with their own query remain authoritative. The supplied Capernaum XpoZ file contains English text and parses into 1,172 cues; its contents do not establish the cause of the separate live parse failure.
- Verification: all 107 backend tests passed, including a regression checking title, language and movie type after a queryless redirect. No live provider call or frontend build was performed for this change.
- Remaining: whether the real provider redirect caused the reported search results, Arabic download fidelity and the earlier parsing error remain unverified. Next: retry search, inspect provider language metadata and test the chosen Arabic download.

### 2026-11-18 - Parse subtitle cue continuations

- Investigated the first live Capernaum search result: it contains Arabic dialogue separated from a preceding cue by multiple blank lines. The parser now retains untimed text blocks as continuations of the preceding cue, preserving the intervening line breaks. Blocks with timing arrows or numeric cue identifiers still undergo validation.
- Verification: retrieved the live subtitle for diagnosis and again for verification; the parser returned 1,019 cues containing Arabic. All 108 backend tests passed, including a regression for preserved blank lines. No frontend build or complete movie-flow review was performed.
- Remaining: continuation association is inferred for untimed blocks, and timing and linguistic accuracy were not reviewed. Next: retry the movie flow and review representative cues and timing.

### 2026-11-18 - Movie portion controls

- Added subtitle end-time estimate, minute-based custom ranges, first 10/30 minutes, first half and full-subtitle presets, and visible passage/character counts with existing limits enforced.
- Verification: 28 frontend tests and production build/TypeScript passed. Checked the supplied Capernaum file: first 10 minutes have 91 cues but parse into 92 source segments because a cue contains blank lines; this will fail the existing exact cue-to-segment check. No browser review or backend test rerun was performed.
- Remaining: full/half selections above 100 passages or 20,000 characters are not processable; blank-line cue mapping breaks this representative file; subtitle last time is only an estimated available duration. Next: fix exact cue-to-segment mapping and design bounded larger movie processing before claiming those flows work.

### 2026-11-18 - Round movie portions to subtitle boundaries

- Round requested end times forward to the next complete cue and show the actual selected end, including when the requested time falls between subtitles. Existing limits remain enforced.
- Verification: subtitle range regression passed for inside-cue, exact-boundary, silent-gap and end-of-file cases; frontend production build and TypeScript passed. Browser and backend tests were not rerun.
- Remaining: the reported blank-line cue-to-segment mapping bug and larger movie preparation limits remain. Next: fix cue-to-segment mapping and verify the complete movie flow.

### 2026-11-18 - Map subtitle cues to split passages

- Mapped each canonical source passage back to its containing subtitle cue using source offsets. Cues containing blank lines may become multiple passages sharing the original cue ID and timing; source text and segment IDs remain unchanged. Reject more than 100 resulting passages with a shorter-range instruction.
- Verification: all 30 frontend tests and the production build/TypeScript passed. The supplied Capernaum file's first ten minutes produced 91 cues and 92 correctly mapped passages. No live provider download, paid model call, browser flow or backend test rerun was made.
- Remaining: verify local upload through passage selection and practice in a browser; ranges over the current passage and character limits still require smaller sections. Next: retry the selected range and inspect any UI error.

### 2026-11-18 - Diagnose generation schema failures

- The user reported repeated live output-schema failures after subtitle selection. Added allowlisted Pydantic validation reason codes without logging source text, provider output or credentials. Existing validation and error responses remain unchanged; the underlying live failure has not been fixed.
- Verification: all 111 backend tests passed, including empty-card, blank-meaning and missing-field diagnostics; no paid model call, browser flow or frontend build was performed.
- Remaining: identify the actual failure reason and fix its cause. Next: retry with a small passage selection and automatic count, then inspect the sanitized reason; numeric per-passage counts can trigger multiple paid model calls.

### 2026-11-19 - Allow 50-page PDF ranges

- Raised the selected PDF range and saved page-reference limit to 50, retaining 10-page browser chunks, two concurrent requests, the 4 MiB chunk cap and 20,000-character combined cap. Clarified that a single page plus shared resources can exceed the chunk limit. Updated current README, architecture, requirements and larger-book notes.
- Verification: 30 frontend tests, 111 backend tests and the production frontend build passed. A 50-page synthetic fixture checks ordering, references and the 51-page rejection; the updated targeted HTTP suite passed 24 tests. No representative large Arabic PDF or hosted deployment was tested.
- Remaining: the user's 4 MiB failure is not resolved without inspecting the PDF; dense 50-page selections can exceed the combined text cap. Next: inspect the failing PDF's page resources and consider a measured larger-source design.

### 2026-11-19 - Inspected the user's failing Arabic book

- Read the user-identified PDF in Downloads without modifying it. It has 424 pages; copied page 1 is 10,604,863 bytes and contains an embedded Form. Sampled copied pages 10, 20 and 50 are each below 4 MiB, but the current extractor rejects their text encoding. Page 2 has no extracted Arabic, and page 3 contains embedded drawing operations. No source text was logged or copied into the repository.
- Verification: inspected sampled single-page copies using the existing PDF library and extractor; no application code changed and test suites were not rerun.
- Remaining: this book cannot yet be processed reliably; the 20,000-character cap also limits long selections. Next: investigate whether an existing text extraction approach can recover faithful Arabic, and separately handle the oversized cover without OCR or silent content loss.

### 2026-11-19 - PDF processing diagnostics

- Added controlled browser diagnostics for PDF opening, page selection, chunking, extraction and merging, and backend diagnostics for upload validation, worker capacity, timeout and extraction categories, including chunk-relative page numbers. No PDF contents, filenames or credentials are logged. Documented how to find the two sets of logs.
- Verification: 112 backend tests passed, including encoding reason and log privacy; 30 frontend tests passed; production build passed before the final range warning and TypeScript passed after it. No live PDF browser flow was performed for the logging change.
- Remaining: the representative book still fails on its oversized cover and unsupported text encoding; logs do not alter extraction behavior. Next: retry and compare browser chunk location with backend reason, then investigate faithful extraction.

### 2026-11-19 - Investigated second Arabic PDF encoding failure

- Inspected the user-provided 80-page PDF with pypdf without modifying it. Sampled extracted pages contain Arabic presentation forms mixed with unrelated Unicode code points; sampled embedded fonts provide ToUnicode mappings, but correctness was not verified. This is not established as safe to repair by normalizing presentation forms alone.
- Verification: inspected extraction character classes and font metadata on sample pages. No application code changed, visual comparison or tests were performed, and no document content was saved to the repository.
- Remaining: faithful text recovery and reading order are unverified. Next: compare a suitable independent text extractor with the rendered source, then decide whether safe support is possible; preserve rejection until verified.

### 2026-11-19 - Identify PDF pages on extraction failure

- PDF extraction errors now include the chunk-relative page when known; the frontend translates it to the original page number. Examined sampled embedded subset fonts in the user's second PDF: those inspected have no cmap table, so reliable character recovery was not established. Source extraction safeguards remain unchanged.
- Verification: 112 backend and 31 frontend tests passed; the targeted frontend HTTP suite passed 25 tests after a TypeScript-compatible regex fix, and the production build passed. The first build exposed an unsupported regex flag and the subsequent build passed. No browser or live Arabic PDF extraction success was claimed.
- Remaining: this is a reporting fix, not a repair of the book's encoding. Next: investigate independent extraction and compare output to rendered Arabic before changing fidelity checks.

### 2026-11-19 - Compared independent PDF extraction

- Compared pypdf and locally available PDFium on pages 5, 6, 15 and 16 of the user-provided book. Both produced unrelated Unicode code points within Arabic words; PDFium also produced out-of-line characters. No PDF text was saved to the repository and extraction safeguards were unchanged.
- Verification: inspected output from both extractors on those four pages. No application code changed and test suites were not rerun.
- Remaining: faithful text recovery and complete reading order are unverified. Next: obtain a reliable text source or investigate a validated font-specific recovery approach; an independently reviewed OCR transcript is a workaround outside the application.

### 2026-11-19 - Permit best-effort PDF text

- At the user's request, stopped rejecting Arabic presentation forms and added a warning to review extracted text before generation. Output is not normalized or repaired; null/replacement character rejection and resource limits remain. Updated PDF documentation and fixture expectations.
- Verification: direct extraction of the supplied book's pages 5?14 returned ten pages and 15,027 characters; pages 15?24 hit the text limit on chunk page 9. All 31 frontend tests and the production build passed. All 112 backend tests passed. A redundant parallel PDF-only run was interrupted after failures while the full suite and build were running; the full suite passed.
- Remaining: the supplied book's extracted Arabic is known to contain incorrect characters and ordering, and was not tested through the browser. Next: try a short page range in the UI and compare it with the original; use verified pasted text if incorrect.

### 2026-11-19 - Address PDF extraction timeouts

- Increased the PDF worker deadline from 10 to 60 seconds and Linux CPU allowance from 8 to 50 seconds, with a 75-second browser deadline. A blank ending page now defaults to five pages instead of 50; users can explicitly choose up to 50. The source and generation character limits are unchanged. Updated current documentation.
- Verification: rendered page 6 of the user's book and compared the printed Arabic greeting with extraction; the extractor inserts non-Arabic characters in that word. A direct concurrent worker check under load completed pages 5?14 in 28.27 seconds and pages 15?24 reached the existing text limit at chunk page 9 in 27.68 seconds, both with an interim 30-second deadline. Frontend tests passed 31 tests and the final production build passed. All 112 backend tests passed; the suite began before the deadline changed from 30 to 60 seconds. After that change, the PDF timeout and ambiguous-encoding tests passed separately (2 tests).
- Remaining: browser upload and final deadline have not been verified end to end, extracted text from this PDF is not faithful, and longer inputs still hit downstream limits. Next: restart backend and frontend, retry a short range and review extracted text; plan coordinated larger-source support separately.

### 2026-11-19 - Automatic PDF import and passage selection

- Replaced the user-facing PDF page range with automatic per-page extraction for PDFs up to 20 MiB. Shows progress, lists failed pages and permits retry without repeating successful pages; users can continue with available passages. Imported text is temporary; only selected passages and their page references are sent for generation and saved. The existing selected-source, provider, PDF resource and grounding limits remain; selected text over 20,000 characters is not automatically batched for generation. Updated docs and the browser fixture flow.
- Verification: 112 backend tests passed. Frontend tests passed 35 tests, including imports exceeding 50 pages and 20,000 total characters, retry of failed pages and selected-page mapping; the production build passed. A fixture-backed browser flow passed through PDF selection, generation and saved sets. Against the real FastAPI extraction route, all 80 pages of the supplied book were attempted: 77 returned text, and pages 1, 2 and 66 reported drawing failures. The combined returned text was 135,321 characters. No PDF content was committed; a successful response does not establish text fidelity.
- Remaining: browser import of the full book, hosted behavior, large-book memory usage and Arabic linguistic fidelity have not been verified. The known incorrect font mapping remains unfixed; image/Form pages remain unsupported. Next: test the full book in the browser and investigate faithful Arabic recovery with visual comparison before claiming reliable extraction.

### 2026-11-19 - PDF progress and bulk selection

- Added a visible message while opening and processing PDFs, including retries, explaining that a slow page can take a minute. Added Select all and Deselect all passage controls; selecting beyond existing set limits shows an actionable warning and requires a smaller selection.
- Verification: 35 frontend tests, 112 backend tests and production frontend build passed. The fixture-backed browser flow passed with select-all and deselect-all checks. Its first run failed because the test locator matched both button labels; an exact locator fixed the test and the rerun passed.
- Remaining: automatic batching of selections beyond the existing limits and accurate extraction of the supplied book's font mapping remain unresolved; this change does not measure the cause of an individual slow page. Next: design multi-batch generation and investigate faithful Arabic extraction.

### 2026-11-19 - Batch large PDF generation

- Removed the combined PDF selection size/passage cap and added bounded sequential generation batches, preserving passage/page IDs and validating each response before saving one combined set. Expanded PDF saved-set validation and count controls to support the combined results, with AI cost/retry warnings. Kept existing limits per backend request and for non-PDF sources. Added space below passage selection buttons.
- Verification: 37 frontend tests and the production frontend build passed; all 112 backend tests passed. New tests cover 101 passages exceeding 20,000 characters, result/page mapping, reopen and failure without replacing the prior set. A real FastAPI route with a fixture model generated and reopened a 12-passage PDF set across two batches. The fixture browser flow verified select/deselect and the spacing before the final wording/error-message adjustments; no paid model calls were made.
- Remaining: live provider quality, cost, large-set storage capacity and actual book generation remain unverified. Automatic mode may omit passages; numeric counts can make one paid call per passage. A failed run has no partial save, and retry repeats completed batches. The existing Arabic PDF font-mapping problem remains. Next: try a modest representative selection and review meanings and source fidelity before larger paid runs.

### 2026-11-19 ? Movie generation batching

**Movie batching (November 19):** Movie selections no longer stop at 100 passages or 20,000 characters or a 300-card set budget. The browser batches generation using the existing PDF path and retains subtitle timestamps and IDs across saving and regeneration. Automatic mode selects up to 15 cards per batch and may omit passages; numeric targets still allow 1-15 per passage, and each selected passage can trigger a model call. Large selections may take substantial time and cost; a failed batch saves no partial set and retry repeats completed batches. A single passage remains limited to 20,000 characters; subtitle file and parser limits remain. Removed contradictory 10-15-card prompt instructions for numeric targets, but the cause of the reported live schema failures is not established and this change is not a verified fix. Next: reproduce a live failure using the sanitized output_schema reason and address that specific validation cause; test a representative full movie and browser storage capacity. Frontend fixture tests (38) and production build passed; backend suite passed (112 tests). No live provider or browser movie test was run.

### 2026-11-19 - Simplify generation and movie passage presentation

- Removed the animated star from generation and replaced detailed subtitle cue ranges with concise minute-and-second movie positions in preview, selection and practice; precise stored timing remains unchanged.
- Verification: 39 frontend tests passed, including position formatting. The frontend production build and TypeScript passed. No backend tests or browser visual review were performed for this display change.
- Remaining: visually review the movie flow at desktop and mobile sizes. Next: inspect the loading and subtitle screens in a browser.

### 2026-11-19 - Development LLM logging

- Added opt-in `ENVIRONMENT=dev` logging of LLM request payloads and provider response bodies; default `prod` excludes them. Documented that development logs contain source and model output and do not include authorization headers.
- Verification: all 116 backend tests passed; the targeted diagnostics suite passed 24 tests, including default/prod privacy and development error-response logging. Initial test collection from the repository root failed because the backend package was not on the path; rerunning from backend succeeded. No live provider call or frontend build was performed.
- Remaining: development logs can include sensitive source text or provider-supplied data. Next: use `ENVIRONMENT=dev` only in a controlled environment and remove logs when finished.

### 2026-11-19 - Batch generation failure recovery

- Retained validated completed batches in memory for same-tab retry, and added one automatic retry for the reported vocabulary-format failure. Existing sets remain unchanged until complete generation succeeds. The log identifies an empty required model-output string but not its field.
- Verification: 40 frontend tests and the production build passed; the new tests cover resuming after a later failure and retrying malformed output. The first test run exposed a missing storage fixture, fixed before the successful rerun. All 116 backend tests passed (one dependency deprecation warning).
- Remaining: a refresh or Home discards the unsaved draft; retries can incur provider charges, including repeated calls inside a numeric-target batch. No live provider or browser recovery test was performed. Next: exercise a representative movie with a controlled provider failure and assess durable recovery.


### 2026-11-19 - Handle credit passages with no useful vocabulary

- Investigated supplied provider logs: a credit/name passage returned whitespace-only meanings on both attempts, causing schema failures and aborting the batch. Numeric-target prompts permit empty results, and validated empty/blank-only individual passages no longer discard other passages. Whole empty batches are skipped during larger runs; no-card totals are shown, and completely empty selections still fail. Invalid nonblank output and grounding remain checked.
- Verification: 41 frontend tests and the production build passed. The backend suite passed 117 tests before the final no-candidate handling and additional tests; afterward, the targeted passage suite passed 5 tests and diagnostics suite passed 26 tests. Backend tests reported one dependency deprecation warning.
- Remaining: no live paid provider or browser end-to-end retry was run. Counts can be low where passages contain names or no suitable expressions; occurrence does not prove meaning. The provider may still return other malformed output or fail. Next: retry a representative subtitle range and review the resulting vocabulary.

### 2026-11-19 - Set-wide card target fill

- Strengthened the numeric first-pass prompt and added a bounded fill API and client pass to redistribute shortfalls across groups, preserve source grounding and prevent duplicates. Added actual/target and partial-fill failure notices and updated count guidance. Existing first-pass cards survive fill errors; a failed final storage write retains only first-pass batch drafts.
- Verification: 45 frontend tests and the production build passed. The complete backend suite passed 122 tests before the final candidate-exclusion adjustment; afterward, 32 candidate and diagnostics tests passed. Backend tests reported one dependency deprecation warning. Tests cover fill exclusion, duplicate rejection, cross-batch redistribution, target reporting and preservation on fill failure.
- Remaining: no live paid-provider or browser end-to-end generation was run. One fill call per group can leave a shortfall; fill adds time/cost and AI meanings/categories still require review. Next: try a representative movie selection, compare actual/target and review meanings.

### 2026-11-19 - Generation progress and file upload UI

- Centered the generation loading view and display completed batch counts and the additional generation stage. Existing subtitle sets display Movie subtitles in the library. Subtitle upload now matches the PDF file picker and dashed drop target, with file validation.
- Verification: all 45 frontend tests passed, including batch progress and fill-stage reporting; the frontend production build passed before the final CSS positioning adjustment. No backend changes or paid calls were made.
- Remaining: no browser visual or drag/drop test was performed, and individual model requests cannot report incremental progress. Next: visually check desktop and mobile loading and both upload targets in a browser.
