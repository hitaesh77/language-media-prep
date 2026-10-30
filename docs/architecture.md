# Architecture and product decisions

## Confirmed direction

The user requested FastAPI and Next.js. The supplied brief calls for Arabic-first vocabulary preparation: pasted text, passage selection, learner settings, grounded contextual vocabulary, familiar-word marking, and flashcards. The repository had no implementation or referenced brief documents.

## Implemented local slice

### User-owned home library and navigation (2026-10-29)

Fresh libraries remain empty with no seeded example sets. On reading an old library, only recognizable untouched built-in samples are removed (known ID/name/type/date/source/default preferences, no AI metadata or familiar selections); user-created, regenerated and modified examples are preserved. This migration writes only after validation and surfaces storage failures. Home cards offer an inline Delete/Cancel confirmation; deletion is local, idempotent and does not remove other sets. No server/cloud deletion API is needed for V1.

A visible Home control is available throughout the flow, including during requests. It aborts pending browser fetches and invalidates operation callbacks so stale processing cannot hijack navigation or clear a newer operation's busy state. Provider work already underway is not guaranteed to stop. Source controls remain disabled while their request is active. Mobile header steps wrap below the logo/Home row; the accepted visual design otherwise remains intact.

### Live-generation grounding fix (2026-10-29)

The user's first live request reached FastAPI but failed with a generic 502. Safe diagnostics separated provider errors from response/grounding failures; the user's next log confirmed `output_grounding`. OpenAI requests now offer a backend-derived exact-source candidate pool and use strict JSON schema for `{candidate_id, meaning}` cards. Candidate IDs are bound server-side to preserved expressions/source references, then the existing grounding/duplicate/length validation still applies. This prevents model-authored spelling, clitic or reference changes from entering cards. The user reported a successful live generation after this change; meanings/variety effectiveness were not evaluated.

Candidate coverage is a provisional implementation choice: one-to-four Arabic-word spans, at most 512 candidates, deterministic distribution across selected passages/phrase lengths/positions when needed. Exact source characters/whitespace are preserved. Useful longer/unoffered phrases can be missed; coverage/ranking still needs Arabic review. Generic non-OpenAI compatible endpoints keep JSON-object expression/reference output with the original source checks. Failure diagnostics expose only controlled categories/reasons and allowlisted status/code/parameter metadata; no source/model expression, provider raw body or credential is logged. Refusals and token-limit truncation are distinguished. No automatic retries or grounding relaxation was introduced.

### Frontend HTTP integration (2026-10-29)

`frontend/lib/api/client.ts` now exports `createHttpClient()` from `http-client.ts`; production components do not import the mock adapter. Text and actual multipart PDF bytes go to FastAPI; Generate always sends `mode: "llm"` with mapped level/variety/explanation language. Response schemas, selected references, occurrence/context and duplicate expressions are checked before rendering/persisting. Browser timeouts are 25 seconds for source processing and 100 seconds for generation, without automatic retries. Errors support FastAPI string/validation-array responses, non-JSON platform errors, network failure and timeout.

`storage.ts` validates browser-saved sets using the existing localStorage key. New libraries are empty; existing demo sets remain explicitly labeled and usable. Regeneration reparses the original text and remaps IDs by the full ordered paragraph sequence, including duplicate paragraphs, rather than changing ID punctuation or matching the first occurrence. Inconsistent source/selection fails before model generation. Stable vocabulary IDs encode source ID plus expression. Replacement preserves set ID/creation time, clears familiarity only after success and rejects detected concurrent set changes. Read/save failures are actionable, and the deletion action is offered only for unreadable local data. This is browser persistence, not cross-device sync or a transactional database.

Additive `pages` and `generation` fields preserve PDF provenance, timing, token usage and the review notice. Practice progress stays in memory. PDF binaries and provider keys are never stored in browser sets. UI notices now describe real extraction/generation, provisional defaults and browser-only storage. Source input/counting uses Unicode code points. Navigation/source edits are disabled while processing to avoid racing drafts.

Automated browser verification runs the real frontend and FastAPI on isolated local ports with only the provider boundary stubbed. Text/PDF selection, preference changes, generated vocabulary, familiarity, flashcard completion, refresh and failed/successful regeneration are covered. Live OpenAI meaning quality, broader successful Arabic PDF/font support and Vercel deployment remain unverified. No developer `.env` was opened; the test server disables dotenv loading.

- `backend/app/main.py`: HTTP/CORS and bounded request handling. `domain.py`: source parsing, Pydantic models, baseline and grounding. `generation.py`: server-side LLM calls, safe failures and timing/usage logs. `pdf_service.py` and `pdf_worker.py`: isolated bounded extraction and canonical page provenance.
- `frontend/app/`: Next.js App Router UI using TypeScript, explicit RTL Arabic passages, learner settings, source references, familiar-word filtering, and flippable flashcards.
- Browser calls FastAPI directly using a public backend URL and explicitly allowed development origin. There are no Next.js business API endpoints.
- The API is stateless. The generation request resubmits the original text and chosen segment IDs; the server re-parses and rejects stale/unknown IDs. IDs combine a source SHA-256 prefix and paragraph index. They are stable for identical input, not intended to persist across source edits.
- The first parser splits on blank lines and preserves paragraph characters. No linguistic sentence segmentation or Arabic normalization is claimed. Exact expressions must occur with Arabic word boundaries in a selected source. The backend attaches original context rather than trusting model-provided context.
- Baseline uses surface-form frequency, a small stopword list, and deterministic ties. It intentionally provides no invented translations and does not apply proficiency or variety. It is a comparison tool, not equivalent to contextual AI.
- LLM JSON must contain 1–15 cards. The instruction requests about 10–15 unless the passage is short. A single invalid reference/expression rejects the response. Meanings remain unverified even when occurrence checks pass.
- Input is limited to 20,000 Unicode code points. PDF uploads are processed temporarily with no retention. No server-side user persistence, authentication or database is needed for V1. Do not expose this unauthenticated generation API publicly without request budgets and access controls.

## Provisional defaults and open decisions

### Approved storage scope update (2026-10-29)

The user approved a 4 MiB PDF limit and added cloud-persisted sets and private PDF originals to V2. V1 retains browser-saved text/vocabulary/familiar flags and stateless FastAPI processing, with no DB/Blob prerequisite. Backend and mock frontend validation enforce 4 MiB.

V2 requires reopening saved sets, authorized PDF open/download, deletion, source/page-reference preservation and library access design. Postgres/Neon and Vercel Blob are candidates, not configured integrations. Ownership, recovery, retention and browser-data migration remain open; an embedded viewer is optional. See [requirements](requirements.md). The user approved API implementation; the frontend HTTP adapter is connected.

### Backend API implementation (2026-10-29)

`POST /api/pdf/extract` accepts one multipart PDF and returns canonical extracted text, matching segments and 1-based page references. Limits: 4 MiB/file, 32 KiB multipart overhead, 20 pages, 20,000 extracted code points, 2 MiB decoded content/page, two workers per process and 10 seconds per worker. Linux adds 512 MiB address-space/8 CPU-second limits; Windows verification does not establish those Linux limits or Vercel subprocess compatibility. Blank pages have empty references. pypdf layout output is preserved without automatic normalization/reversal; unusable mappings/presentation forms, encrypted files and all image/Form drawing operations are rejected conservatively. This excludes logos and some readable Arabic documents. A visually checked browser PDF is deliberately rejected for its misleading Unicode mapping. Broad successful Arabic PDF/font compatibility remains unverified.

Generation accepts English and Arabic explanations, rejects duplicate selections/blank meanings, forwards only selected source/settings, and validates all cards before returning. It has a 60-second overall deadline, 4,000 completion-token ceiling, low reasoning effort for GPT-5/6 models, no retries and sanitized usage/logging. Model/endpoint remain server-configured; `cost` is null. The user selected OpenAI and was recommended `gpt-6-luna`; `.env` and live provider output were not inspected/tested. Tests disable dotenv loading and block live HTTP model requests.

`backend/vercel.json` sets 90 seconds on `app/main.py` for a project rooted at `backend/`. This is configuration preparation, not a verified deployment. Frontend integration is verified with a fixture provider; live meaning quality remains outstanding.

Intermediate, Modern Standard Arabic, and English explanations are implementation defaults, not stakeholder-approved preferences. Provider, model, storage, authentication, hosting, representative content, preparation-time target, and proficient Arabic reviewer are unresolved. Provider costs are not guessed. The response includes usage when supplied and leaves monetary cost null.

## Next increments

1. Investigate a subtitle provider early: current access terms, credentials, Arabic coverage, title/edition matching, limits, and licensing. OpenSubtitles is only a candidate; feasibility has not been established. Keep user subtitle upload as fallback.
2. Add validated SRT/VTT parsing with cue IDs and preserved timestamps. Reject oversized/malformed files on the server.
3. Add bounded text-based PDF extraction, page references, and explicit rejection of scanned PDFs. No OCR.
4. Select a provider and compare contextual selections with the frequency baseline on representative passages. Record latency, token usage, actual cost, and proficient review of meanings/variety.
5. Agree a small exploratory pilot comparing ordinary lookup with preview using comparable passages. Measure preparation plus consumption time, interruptions, comprehension, and usefulness. No effectiveness claims or agreed thresholds exist.
## Subtitle-provider feasibility check (2026-10-27)

The provider's [Getting Started guide](https://opensubtitles.tawk.help/article/getting-started) requires an application API key and describes account-dependent download quotas. The [API overview](https://opensubtitles.tawk.help/article/about-the-api) identifies the current REST service and higher-limit VIP options. These public documents support investigating access; they do not establish Arabic coverage or matching quality for our intended content. No credentials, live searches, downloads, or licensing review have been completed. Before integration, test a representative title/edition set, inspect actual quota responses, confirm usage and redistribution terms, and retain subtitle upload as fallback. Do not promise automatic retrieval yet.

Framework references used for setup: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).

## V1 frontend demo (2026-10-28)

The frontend now runs independently through the typed `PrepClient` adapter in `frontend/lib/api/`. The existing FastAPI implementation is preserved; the UI no longer calls it directly. The adapter currently uses browser localStorage for saved sets and familiar selections, SHA-256 paragraph references, a small illustrative glossary and explicitly mocked PDF sample extraction. It does not claim AI generation, real PDF processing or preference-sensitive ranking. The UI follows the supplied Sahih design and supports the full in-page home → content → paragraph selection → preferences → vocabulary → flashcard → completion flow. Replace the client export with an HTTP adapter to integrate real services. No authentication, database or V2 integrations were introduced. This supersedes the earlier description of frontend state as memory-only; drafts and current review progress still remain in memory.


### Upload and card generation controls (2026-10-29)

PDF input supports a clickable/keyboard-accessible Browse files target, drag/drop highlighting, selected-file feedback, replacement/removal and immediate single-file/type/size validation. Invalid replacement preserves the previous selection. Extraction remains authoritative.

English and Arabic are the explanation choices. Older saved meanings remain readable; unsupported older preferences require a supported choice before regeneration. Optional strict integer `cards_per_passage` (1-15) requests the same target for each selected passage, with a maximum of 300 total. Omission preserves automatic generation. The provider receives the target and grounded output is capped per passage. The result notice reports actual counts; short passages or model omissions may yield fewer cards; an empty or failed passage result fails the request. No paid retry or fabricated padding is used. The target persists as `preferences.cardsPerPassage`. Existing grounding/output-token limits remain.


### Expanded per-passage sets (2026-10-30)

Numeric targets now run one generation call per selected passage, at most three concurrently, under a 75-second combined deadline (each call retains its 60-second deadline, 4,000-token and 15-card ceiling). A 5-card target across 10 passages can return 50 cards. The combined set limit is 300, validated before provider calls. Automatic mode remains a single call targeting 10-15 total. More selected passages mean more provider requests/cost. No automatic retries are made. Any failed passage fails the whole request, leaving saved sets unchanged; running sibling tasks are cancelled. Provider work already received may still be billed.

Each passage preserves exact original text and IDs. Repeated expressions from different passages are allowed as separate contextual cards; duplicate expressions within the same passage remain invalid. Vocabulary rows and flashcards show a human-readable passage number and PDF page where available. Per-passage counts use the original source numbering, including unselected paragraphs. Actual counts may be below target; meanings still require review. Successful combined usage sums reported token counts only when all passage usages are present; cost remains null.


**Simplified count selector (2026-10-30):** Customize offers Automatic, 3, 5 or 10 cards per passage, plus Custom with a validated whole-number input. The current calculated total is shown separately. Existing saved targets outside the presets open in Custom; numeric/API limits remain 1-15 per passage and 300 total. Presets exceeding the current passage budget are disabled.
