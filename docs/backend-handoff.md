# Backend implementation handoff

Prepared: 2026-10-29. V1 deadline: Friday, October 30, 2026.

Frontend integration update (2026-10-29): the real `PrepClient` HTTP adapter is now wired to FastAPI with validated browser storage. Text and PDF browser workflows were tested against real backend routes using a fixture LLM, without reading `.env` or paid calls. Source/page references and generation metadata persist; legacy demos remain labeled and reparse/remap before regeneration. README and architecture describe the current implementation; older proposals below are historical context. Next priorities are live provider/Arabic PDF verification and hosted smoke testing, not another adapter implementation.

Implementation update (2026-10-29): the user approved the API tests and implementation. FastAPI now has bounded PDF extraction plus generation hardening; the frontend still uses its mock adapter. See README for current endpoint/limit/error contracts and `docs/progress-log.md` for verification. Both sides enforce the approved 4 MiB limit. PDF images/Form drawings and unusable font mappings are conservatively rejected; broader successful Arabic PDF compatibility remains unverified. The detailed proposals below are the original integration handoff and must be read alongside this update. V2 now includes durable cloud sets and private PDF originals.

The user is happy with the current frontend design. Implement the services behind that experience; preserve the layout and flow. This is an implementation plan derived from the checked-in frontend and backend, not a claim that the proposed APIs already exist. Product scope remains in [requirements.md](requirements.md); current status and verification history are in [progress-log.md](progress-log.md).

## Start here in the next session

Read `AGENTS.md`, `README.md`, `docs/architecture.md`, this document, and the progress log. Use FastAPI in `backend/` and Next.js App Router/TypeScript in `frontend/`. Do not introduce accounts, a database, or permanent vocabulary storage as V1 prerequisites. Keep provider credentials on the server.

Frontend flow: home/saved sets -> content -> passage selection -> preferences -> generation -> vocabulary/familiar marking -> flashcards -> completion. Settings can be edited and vocabulary regenerated for an existing set. Home re-reads saved sets. Flashcards and completion run locally.

Recommended V1 integration: retain browser storage behind a real `PrepClient` adapter, use FastAPI for parsing/extraction/generation, and assemble/save `SavedSet` objects in that adapter. This preserves refresh persistence without inventing a server-side account or shared library. This storage allocation is a proposed implementation choice, not a new stakeholder requirement. No application code is changed by this document.

## Source files and current state

| File | Role / integration work |
| --- | --- |
| `frontend/lib/api/types.ts` | Exact UI types and five-method `PrepClient` interface. Keep this public contract compatible. |
| `frontend/lib/api/client.ts` | Currently exports `mockClient as api`; switch to the real adapter after contract tests pass. |
| `frontend/lib/api/mock-client.ts` | Current validation, seeds, localStorage key `sahih-sets-v1`, glossary generation, and fake PDF extraction. Extract/reuse storage separately from demo generation. |
| `frontend/components/prep-app.tsx` | All API orchestration, drafts, navigation, familiar updates, practice state, and error messages. Also imports `resetDemo` directly. |
| `frontend/components/screens/content-screen.tsx` | Text/PDF choice, sample passage, 20,000-character control, file picker, and fake-extraction notice. Imports `SAMPLE` directly. |
| `frontend/components/screens/customize-screen.tsx` | Exact allowed preference labels; currently says preferences do not affect mock output. |
| `frontend/components/screens/vocabulary-screen.tsx` | Familiar filtering and source context; currently labels output as demo glossary meanings. |
| `backend/app/main.py` | Existing health, text segmentation, baseline, optional LLM adapter, and grounding validation. No PDF endpoint or saved-set service. |
| `backend/tests/test_api.py` | Existing parsing, API validation, baseline, mocked LLM and grounding tests. |
| `frontend/tests/mock-client.test.cjs` | Existing mock contract tests; add meaningful real-adapter coverage rather than relying on this test alone. |

## Frontend data contract

These are the existing UI shapes (camelCase fields). `Preferences` currently uses unrestricted TypeScript strings; validate allowed values at the service boundary.

```ts
type Segment = { id: string; text: string };
type Preferences = { level: string; variety: string; language: string };
type Vocabulary = {
  id: string;
  expression: string;
  meaning: string;
  sourceId: string;
  context: string;
  familiar: boolean;
};
type SavedSet = {
  id: string;
  name: string;
  type: "PDF" | "Pasted text";
  text: string;
  segments: Segment[];
  selected: string[];
  preferences: Preferences;
  vocabulary: Vocabulary[];
  createdAt: string;
};
type GenerateRequest = Omit<SavedSet, "id" | "vocabulary" | "createdAt"> & {
  id?: string;
};
```

`meaning` must contain the contextual meaning and any brief explanation needed by V1; there is no separate explanation field in the current UI. `context` is the original source passage, not a model-authored paraphrase. `selected` contains segment IDs, not indexes. `createdAt` is an ISO timestamp. Set names are required and trimmed; introduce and document a reasonable server limit if names move to the server (none is currently defined).

### All five client methods

| Method | Current caller and expected behavior | Recommended V1 implementation |
| --- | --- | --- |
| `listSets(): Promise<SavedSet[]>` | Home on mount and return home; returns complete sets, not summaries, because clicking a card opens its object directly. | Read validated local browser storage; return `[]` for a genuinely empty real library. Demo seeds must not be presented as real generated content. |
| `processContent(text, file?): Promise<{text: string; segments: Segment[]}>` | Continue from content; a file takes precedence if supplied. All returned segments are initially selected. | Text uses `/api/segments`; PDF uses the new extraction endpoint. Return canonical source text and server-issued IDs. |
| `generateVocabulary(request): Promise<SavedSet>` | New generation and regeneration; optional `id` identifies the set being replaced. | Validate selections, call `/api/generate` explicitly in LLM mode, map cards, construct and save the complete set atomically after success. |
| `updateFamiliar(id, itemIds): Promise<SavedSet>` | Individual and mark-all checkboxes; `itemIds` is the complete desired familiar-ID list, not a toggle or delta. | Replace flags locally. Empty array unmarks all. Reject missing sets and unknown item IDs; return the updated full set. |
| `getSet(id): Promise<SavedSet>` | Defined and mocked but not called by current screen orchestration. | Implement local lookup for interface completeness; reject missing IDs. No mandatory HTTP endpoint. |

New generation: create an opaque unique set ID and current timestamp. Regeneration: preserve set ID and original `createdAt`, replace vocabulary, clear familiar flags, retain the submitted source/selection/preferences. Failure must leave the old set intact. Generate deterministic vocabulary IDs from source reference plus exact expression (or an equivalent documented collision-safe scheme); IDs must be unique within a set and stable for unchanged items. Do not use array positions as IDs.

Browser storage errors must remain actionable; do not silently discard user sets or return success before saving. Do not persist PDF binaries or credentials. Preserve the current localStorage key or explicitly migrate it. Existing seeded sets need a deliberate demo/migration policy; they are illustrative fixtures, not evidence of PDF extraction or AI generation.

## Required HTTP APIs

Base URL: `NEXT_PUBLIC_API_URL`, currently shown as `http://localhost:8000` in `frontend/.env.local.example`. Use JSON except for PDF multipart upload. The table distinguishes existing contracts from additions.

| Method and path | State | Purpose |
| --- | --- | --- |
| `GET /api/health` | Exists | Local diagnostics and LLM configuration readiness. |
| `POST /api/segments` | Exists | Parse pasted or previously extracted canonical text. |
| `POST /api/pdf/extract` | Proposed, must implement | Validate and extract a short text-based Arabic PDF and return reviewable text/segments. |
| `POST /api/generate` | Exists, needs integration/hardening | Generate grounded contextual vocabulary using selected source IDs and learner preferences. |

### GET /api/health

No request body. Existing response:

```json
{"status":"ok","llm_configured":true}
```

`llm_configured` currently only checks that all three LLM environment variables are nonempty; it does not prove connectivity, model availability, or quality. Do not make a paid provider call on every health request. The current UI does not call this endpoint; it is useful for setup diagnostics.

### POST /api/segments

Request: `{"text":"<original Arabic passage>"}`. Existing 200 response: an array of `{ "id": "<source-hash>:<index>", "text": "<original paragraph>" }`.

- Accept 1-20,000 characters, reject whitespace-only or non-Arabic input with 422. Do not trim, normalize, reshape, or reverse accepted source text.
- Split on blank lines; preserve characters within each returned paragraph. Omit empty paragraphs. Same source must yield the same IDs; edits must change source-derived IDs.
- The adapter wraps this array as `{text: originalText, segments: response}` for `processContent`.
- Make the character-count policy explicit: JavaScript counts UTF-16 code units while Python counts Unicode code points. Test supplementary characters near the limit so the API/UI boundary behaves predictably.

**Important ID mismatch:** the frontend mock hashes untouched UTF-8 text with SHA-256, uses the first 16 hex characters and `-index`, and indexes after filtering empty paragraphs. FastAPI uses the same hash prefix but `:index`, indexing before empty-paragraph filtering. Treat real server IDs as opaque and authoritative. Never swap punctuation or reconstruct IDs in the adapter. Reparse old mock sets before regeneration and remap selections by original paragraph position/text, accounting for duplicate paragraphs; reject ambiguous/stale selections rather than guessing. Test leading/trailing blank paragraphs, repeated paragraphs, and CRLF. Local saved sets can still be reviewed without regeneration.

### POST /api/pdf/extract (new)

Proposed request: `multipart/form-data`, exactly one file field named `file`. The adapter sends `FormData`; let the browser set the multipart boundary. A source name is not needed for extraction. Proposed 200 response:

```json
{
  "text": "<canonical extracted Arabic text>",
  "segments": [{"id":"<source-hash>:0","text":"<original extracted paragraph>"}],
  "pages": [{"page":1,"segmentIds":["<source-hash>:0"]}]
}
```

`text` and `segments` are required by the existing UI. `pages` is proposed provenance metadata: retain page references even though the existing UI does not display them. Define page-to-paragraph joining deterministically; returned IDs must exactly match reparsing returned `text` through the canonical parser. Extraction defines the canonical text because PDF layout has no guaranteed original plain-text representation. Preserve that result unchanged through selection and generation; do not silently rewrite Arabic to make extraction look successful.

- Current picker limit is nonempty files up to `5 * 1024 * 1024` bytes (5 MiB). Mirror it server-side; enforce while reading, not only using client headers. Reject over-limit requests with 413.
- Validate filename/type and actual PDF contents; extension or browser MIME alone is insufficient. Unsupported types: 415. Malformed, encrypted/password-protected, empty, scanned/image-only, non-Arabic, or unusable extraction: actionable 422. No OCR or password workflow.
- Enforce 20,000 extracted characters. Do not silently truncate; ask for a shorter document.
- Add bounded page count, parsing time, and resource limits; exact values/library are implementation choices to document, not approved product constants. Mixed image/text pages must not silently omit material: reject unsupported partial extraction or return an explicit warning with a defined handling policy.
- Use a text-PDF extraction library with representative Arabic fixtures; verify reading order and Unicode, not merely nonempty output. Reject unusable output rather than returning the fixed sample.
- Add multipart and extraction dependencies to `backend/requirements.txt` as needed. No such dependencies are currently present.
- Process in memory or bounded temporary storage with cleanup on success and error. Never use the supplied filename as an arbitrary filesystem path. Never save uploads in Git or `frontend/public/`.
- The adapter returns the actual extracted `text` and `segments`. The existing passages screen supplies the review step before generation. Decide how page metadata survives adapter/storage boundaries before implementing it: the current `Segment` and `SavedSet` types have no page field.

### POST /api/generate

Existing request fields, with the values the real adapter must send:

```json
{
  "text":"<entire unchanged canonical source>",
  "segment_ids":["<server-issued selected segment ID>"],
  "proficiency":"intermediate",
  "variety":"Modern Standard Arabic",
  "explanation_language":"English",
  "mode":"llm"
}
```

Do not submit client-supplied `segments` as authority. The backend reparses `text`, validates selected IDs, and supplies only selected passages to the model. Current selection limit: 1-100 IDs. Reject unknown/stale IDs and define duplicate-ID handling explicitly (prefer rejection). Entire-source limit remains 20,000 characters. Handle oversized arrays/fields and unsupported enum values before provider calls.

#### Preference mapping and missing support

| Current frontend label | Backend field/value |
| --- | --- |
| Beginner / Intermediate / Advanced | `proficiency`: `beginner` / `intermediate` / `advanced` |
| Modern Standard Arabic (MSA) | `variety`: `Modern Standard Arabic` |
| Egyptian Arabic | `variety`: `Egyptian` |
| Levantine Arabic | `variety`: `Levantine` |
| English / Arabic | `explanation_language`: same label |
| Spanish | Must extend backend validation/prompt support to accept `Spanish`; currently rejected. |

Backend also accepts `Gulf` and `Unspecified`; the UI does not offer them. No extra UI controls are required. Spanish is an explanation language for Arabic content, not an expansion into non-Arabic source-language support. Unsupported options must fail visibly rather than silently fall back to English. Intermediate/MSA/English remain provisional defaults.

The backend currently defaults `mode` to `baseline`. **Always send `mode: "llm"` for the normal Generate button.** A frequency baseline without contextual meanings cannot satisfy that button's promised behavior. Keep baseline available for comparison/testing; do not silently fall back to it when AI fails.

Existing 200 response shape:

```json
{
  "cards":[{
    "expression":"<exact Arabic expression>",
    "meaning":"<contextual meaning/brief explanation in requested language>",
    "segment_id":"<selected source ID>",
    "context":"<original source passage>"
  }],
  "mode":"llm",
  "elapsed_ms":1200,
  "usage":null,
  "cost":null,
  "notice":"AI meanings need proficient review; occurrence checks do not validate meaning."
}
```

The number above illustrates the field shape, not measured performance. `usage` is currently provider-supplied metadata or null; normalize/validate it if publishing a stable usage schema. Leave `cost` null unless actual pricing and usage support a calculation; define currency/units before returning a non-null cost. Preserve latency, usage, mode, and review notice in a documented metadata path or diagnostics rather than dropping them unnoticed when mapping to `SavedSet` (which currently has no metadata fields).

Map each card to `Vocabulary`: generate `id`, copy `expression` and `meaning`, map `segment_id` to `sourceId`, copy server-attached `context`, set `familiar: false`. Build the complete `SavedSet` using the submitted name/type/preferences and canonical text/segments/selection; the HTTP generation response itself is not a `SavedSet`.

#### Generation service requirements

- Aim for 10-15 useful words and multiword expressions; allow 1-15 when selected text is short. Do not pad with fabricated items. Reject an empty result with an actionable error.
- Use proficiency and target variety for selection and provide contextual meanings/explanations in the requested language. Do not claim reviewer-verified accuracy or rewrite source expressions into a different dialect.
- Treat source text as untrusted data, separate it from instructions, and never execute source/model output. Model output is JSON data, never HTML.
- Validate structure, field lengths, card count, nonblank meanings, exact expression occurrence with Arabic word boundaries, selected-source membership, and duplicates. Current `grounded()` rejects duplicate exact expressions and invalid references and attaches context from source; retain these guarantees. A single invalid card currently rejects the response.
- Do not trust model-provided context or source references without server validation. Output grounding proves occurrence only, not the contextual meaning.
- Keep configured provider URL/model server-controlled, not request-controlled. Existing provider protocol is chat-completions-compatible JSON using `response_format: {type: "json_object"}`; confirm the selected provider supports it. Provider choice remains open.
- Current upstream timeout is 60 seconds. Bound retries, if introduced; do not create unbounded latency/cost or automatic browser retries that trigger duplicate paid calls. Set browser timeout above the documented server budget and restore the settings screen with an actionable error on failure.
- Log timing, provider/model identifier, sanitized outcome, and available token/cost metadata. Do not log API keys, raw uploads, or complete source passages by default.

## Error and transport contract

Existing FastAPI errors use `{"detail":"message"}` for explicit errors and `{"detail":[...]}` for Pydantic validation errors. Implement an adapter error parser for both, plus network failures, non-JSON responses, and timeouts; throw `Error` with a readable actionable message because `PrepApp` displays `error.message`. Do not display raw provider bodies, secrets, tracebacks, or `[object Object]`.

| Status / condition | Current or proposed handling |
| --- | --- |
| 422 | Invalid source, selection, preference, or unsupported/unusable PDF; explain correction. |
| 413 / 415 | Proposed PDF errors for size/type. |
| 503 | Existing unconfigured AI response; explain backend setup is required. |
| 502 | Existing upstream HTTP failure, invalid JSON/schema, or failed grounding; retryable by the user. Current timeout is also folded into this response. |
| 504 | Optional future explicit timeout status; document if distinguishing it from existing 502. |
| Offline / connection refused / client timeout | Adapter-generated readable error; preserve draft or previous saved set. |

Use explicit allowed development origins (`FRONTEND_ORIGINS` currently defaults to `http://localhost:3000`). Existing CORS allows GET/POST and Content-Type, sufficient for recommended V1 endpoints. If optional PATCH routes are added, update CORS and test preflight. Public browser base URL is safe configuration; provider keys are not. Do not expose an unbounded unauthenticated paid-generation endpoint publicly; hosted deployment needs request budgets/access protections planned for that environment.

## Saved-set APIs: optional alternative, not V1 blockers

There are no saved-set HTTP endpoints today. With the recommended browser-storage adapter, no additional backend CRUD is required. If server-owned temporary sets are deliberately chosen instead, implement all equivalent operations together, define isolation/lifetime, and do not use one shared global set list for multiple users:

| Proposed route | Request | Success response / semantics |
| --- | --- | --- |
| `GET /api/sets` | None | `SavedSet[]`; full objects for the current home behavior. |
| `GET /api/sets/{id}` | Path ID | Complete `SavedSet`; 404 if missing/expired. |
| `POST /api/sets` | `GenerateRequest` without ID | Validate source/selection/preferences, generate and store, return complete `SavedSet` (201). |
| `POST /api/sets/{id}/regenerate` | Generation fields; path ID authoritative | Return replaced complete `SavedSet` (200), preserve ID/creation time, clear familiar flags, commit only after generation succeeds. |
| `PATCH /api/sets/{id}/familiar` | `{"itemIds":["<vocabulary ID>"]}` | Full replacement of familiar flags; complete `SavedSet` (200). Unknown item IDs: 422; missing set: 404. |

These paths are proposals, not existing routes or a requirement to introduce a database. Server memory alone loses sets on restart and does not match current browser persistence unless paired with an explicit lifecycle design. No delete, rename, pagination, practice-session, spaced-repetition, or account API is required by the current controls.

## Minimal frontend integration work (keep the accepted design)

1. Add a real `PrepClient` implementation, isolate reusable validated browser storage, and switch the export in `client.ts`. Never call the mock glossary/PDF implementation as a real-service fallback.
2. Send actual file bytes as multipart; use canonical server IDs throughout; map preferences and generation response as above. Validate HTTP response shapes before persisting/rendering.
3. Decouple `resetDemo` from orchestration; the current handler assumes any initial list failure is corrupt local data. Reset should address local-storage corruption only, never an unavailable backend or provider. Keep a separate readable retry path for service failures.
4. Move `SAMPLE` into a neutral fixture module if retaining Try a sample; sample text can be processed by the real service. Do not seed fictional AI/PDF results into a real library without explicit demo labeling.
5. Update only now-inaccurate notices in content/settings/vocabulary screens once the respective features are real. Keep the warning that AI meanings are unreviewed and grounding does not verify meaning. Preserve the current visual design.
6. Handle metadata/provenance intentionally, including PDF page references and generation usage/notice; minimal additive types are acceptable if needed. No redesign is required.

## Implementation order and acceptance checks

1. Establish canonical parsing/ID behavior and preference mappings, including Spanish; add contract tests before replacing the client export.
2. Implement bounded Arabic PDF extraction and provenance; test valid Arabic reading order plus malformed/encrypted/scanned/empty/oversize/non-Arabic cases and cleanup.
3. Harden/configure LLM generation; test request preferences, multiword expressions, malformed/blank/oversize output, duplicate expressions, wrong/nonselected references, substring false positives, injected instructions, missing config, upstream errors/timeouts, and absent usage. Do not invent meaning-accuracy results from mocked tests.
4. Wire the real adapter and local storage; test response mapping, parse/generate ID consistency, legacy mock-ID handling, failed save, corrupt storage, regeneration atomicity, complete familiar-list replacement, missing IDs, and preservation after refresh. Verify no secret appears in browser payloads/bundles/logs.
5. Exercise the real main flow for both pasted Arabic and a short text PDF: select only part of the source, change all preference choices, generate, mark/unmark familiar, practice only unfamiliar cards, complete/restart, return home, refresh, and regenerate. Verify zero-familiar/all-familiar states and failure recovery without losing the draft/old set. Flashcards, filtering, counters, keyboard controls, and completion remain client state; visited-card progress is not a recall score.
6. Run from `backend/`: `python -m pytest -q`. Run from `frontend/`: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`. Manually check RTL/bidirectional rendering, responsive layout, actual PDF text, loading, and actionable errors. Existing mock tests alone do not validate HTTP integration.
7. Document installation/dependencies, provider configuration and data transmission, actual measured usage/latency/cost when available, remaining limitations, and results in README/architecture/progress log. Keep secrets/uploads/private coursework evidence out of Git.

Required backend environment variables already documented in `backend/.env.example`: `LLM_API_URL` (full trusted endpoint), `LLM_API_KEY`, `LLM_MODEL`, `FRONTEND_ORIGINS`. Frontend uses only `NEXT_PUBLIC_API_URL`. Exact provider/model, pricing, PDF library/page budget, and reviewer are unresolved; label chosen implementation defaults honestly. No live provider or extraction validation has been performed for this handoff.

## Semester backend scope (separate from making this frontend real)

The current UI has no subtitle controls. V2 adds bounded SRT/VTT upload/parsing with stable cue references and original timestamps, timestamp-based selection and generation grounding, representative subtitle tests, conditional movie search/Arabic subtitle retrieval, and upload fallback. Provider coverage/access/licensing remain unproven; continue feasibility investigation during V1. Endpoint contracts should be designed when that UI/data flow is implemented, not claimed as current frontend dependencies.

Semester completion also needs proficient Arabic review, relevance/variety improvements, comparison with the existing frequency baseline, stakeholder usability work, a pilot measuring lookup interruptions/time/comprehension/usefulness, reliability/performance work, and a usable hosted deployment with appropriate generation budgets. Record actual evidence and known limitations. No video/audio upload, transcription, OCR, Netflix, integrated playback, authentication/database prerequisites, or planned YouTube integration belong in this V1 backend session.
