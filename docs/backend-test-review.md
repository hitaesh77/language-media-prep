# Backend test review and Vercel plan

Prepared October 29, 2026. Update: the user approved backend implementation. The reviewed contracts and added PDF tests now exercise implemented APIs; see README and the progress log for actual checks. The frontend HTTP adapter, live provider verification and deployment remain pending. Storage services were not provisioned.

## What exists and what we will implement

The frontend has a complete mock learning flow, local saved sets/familiar flags, and five `PrepClient` methods. PDF extraction and glossary generation are illustrative mocks. FastAPI already provides health, canonical text segmentation, baseline generation, optional server-side contextual generation, and occurrence validation. The HTTP adapter still needs implementation. Preserve the accepted design.

Review `backend/tests/test_v1_contract.py` alongside the existing `backend/tests/test_api.py`. New tests exercise the actual FastAPI routes with external LLM HTTP calls stubbed; they do not call a paid provider.

| API | Proposed acceptance behavior |
| --- | --- |
| GET /api/health | Report configuration readiness without calling a provider. |
| POST /api/segments | Preserve Unicode/diacritics and paragraph characters, repeated paragraphs and stable opaque IDs. Keep the 20,000 Python Unicode-code-point limit. |
| POST /api/generate | Forward selected source only and mapped learner settings, including Spanish explanations; attach server context; retain usage, timing and review notice. Reject duplicate selection IDs, malformed or ungrounded output, duplicate expressions and whitespace-only meanings. Return safe 502 on provider failure without automatic retries. |
| POST /api/pdf/extract | New multipart `file` endpoint; return canonical text, matching segments and page-to-segment references. Reject missing/multiple files, wrong types, empty/corrupt/non-Arabic PDFs and oversized files. Extraction-to-generation API flow is tested with a synthetic Unicode PDF. |

The synthetic PDF byte fixture tests Unicode mapping and the HTTP contract. It is deliberately not evidence of realistic Arabic visual order, ligatures or font support. No PDF library has been selected or added yet.

Before implementing the PDF API, extend this review suite with independently verified representative Arabic fixtures: multiple pages and paragraphs, scanned/image-only and mixed text/image pages, encrypted PDFs, blank PDFs, overlong extracted text and page-count limits. Add extraction timeout/resource-boundary tests once the parser/process boundary is chosen. Proposed limits: 20 pages, 10 seconds extraction budget, 20,000 extracted code points, reject image-only content pages (including mixed documents) rather than silently omit them. These are proposals, not approved constants or currently tested guarantees. Test MIME mismatch and exact upload limit as well. Arabic reading order must receive visual/manual verification; nonempty extracted text is insufficient.

Implementation sequence after review: add the remaining PDF fixtures/tests; implement bounded extraction; harden generation validation; add a real HTTP `PrepClient` retaining browser storage; test adapter preference/error/metadata mapping, legacy mock-set migration, atomic regeneration and familiar state; run backend/frontend checks and verify the text/PDF-to-flashcard browser flow. Live Arabic meaning quality remains a separate review step.

## Decisions proposed for approval

Update October 29, 2026: the user approved the 4 MiB limit and assigned persistent cloud sets/PDF originals to V2. The API tests still await review. The recommendations below describe V1; see `requirements.md` for V2 storage scope.

1. Use a **4 MiB** PDF file limit (`4 * 1024 * 1024` bytes) for direct multipart extraction. This changes the current 5 MiB picker/handoff proposal and must be synchronized across backend/frontend/docs after approval. Vercel limits the entire function request to 4.5 MB, so multipart overhead needs headroom. Bound total request size and field count as well; a file-size test alone does not prove transport protection. Platform 413 errors can be non-JSON, so the adapter needs readable transport error handling.
2. Preserve stateless APIs and local browser sets for V1. No saved-set CRUD or database is needed for V1. PDFs are extracted and discarded; store text/cards locally, not PDF bytes. Browser storage is device-specific, unencrypted and user-clearable. V2 requires durable sets and private retained PDF originals.
3. Keep existing generation errors (502 for timeout/provider/bad output, 503 for missing configuration); no silent baseline fallback. Normal UI generation must explicitly request `mode: "llm"`.
4. Count source length in Unicode code points on the server. The frontend currently uses JavaScript UTF-16 length and must align its validation, with supplementary-character coverage in adapter tests.

## Vercel deployment plan

Research checked against official documentation on October 29, 2026; no deployment was performed.

- Import this repository into two Vercel projects, using `frontend/` and `backend/` as their respective root directories. This is a proposed deployment arrangement that keeps framework discovery/dependencies separate, not a tested deployment.
- The [FastAPI guide](https://vercel.com/docs/frameworks/backend/fastapi) recognizes `app/main.py` exporting `app`, matching our backend layout. FastAPI becomes a single Python function using Fluid compute. Configure function duration against `app/main.py`, not individual API route URLs. No continuously running uvicorn server is required on Vercel.
- Proposed backend duration: 90 seconds, leaving room around the current 60-second provider timeout. Keep total work bounded; the client should allow slightly longer than the server budget and must not automatically retry paid generation. [Hobby currently permits up to 300 seconds](https://vercel.com/docs/plans/hobby). This is a ceiling, not a target.
- Set `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL` and explicit `FRONTEND_ORIGINS` on the backend. Set `NEXT_PUBLIC_API_URL` on the frontend to the backend deployment URL. Configure Preview/Production deliberately, redeploy after environment changes, and test exact-origin CORS/preflight. Never expose provider keys through `NEXT_PUBLIC_`.
- Keep parsing, AI client and validation in separate modules during implementation. Avoid OCR/native heavyweight dependencies; check the Python deployment bundle and run an actual preview smoke test. Current [function limits](https://vercel.com/docs/functions/limitations) list a 500 MB uncompressed Python bundle and 4.5 MB request/response payload ceiling.
- Treat local files and process memory as disposable. [Vercel's filesystem](https://vercel.com/docs/functions/runtimes) is read-only except temporary scratch space. SQLite in the function filesystem cannot provide durable shared app storage. In-memory sets, rate counters or locks are not reliable across instances.
- Before exposing paid generation publicly, set provider-side spending limits and choose hosting access/budget controls. CORS does not prevent direct API calls. Do not use a browser-visible shared secret as protection. No authentication prerequisite is added to the local release; a genuinely public anonymous service needs a separate abuse-control decision. Deployment protection must be checked for both projects, since protected backend calls can block browser integration.

## Storage and costs

| Need | Recommended approach | Current free-plan evidence |
| --- | --- | --- |
| V1 saved sets and familiar flags | Existing browser localStorage behind the real adapter | No hosted DB cost; no cross-device sync. |
| Extract a short PDF once | Process in bounded memory/temp storage and discard | No Blob requirement; PDF upload still consumes function resources. |
| Durable relational data later | Neon Postgres through Vercel Marketplace, pooled connection URL for serverless; keep connections bounded | [Neon direct Free pricing](https://neon.com/pricing) currently lists 100 CU-hours/month/project and 1 GB/project. Verify Marketplace's offered plan at provisioning; it need not match direct signup. |
| Retain original PDFs or keep the full 5 MiB upload limit | Private Vercel Blob, token-authorized browser direct upload, server extraction, deletion/retention policy | [Blob Hobby pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) lists 1 GB-month storage, 10,000 simple operations, 2,000 advanced operations and 10 GB transfer included. Other CDN/transfer limits also apply. |
| Contextual generation | Server-configured LLM provider | Provider/model not selected. Vercel hosting does not establish free model usage; no dollar estimate is justified yet. |

[Vercel Postgres](https://vercel.com/docs/postgres) is no longer a first-party product for new projects; use a Marketplace provider such as Neon. If durable sets are added, store structured text/preferences/cards/flags/page references in Postgres and PDF object keys in rows. Store binaries in private Blob only if retention is needed. Define user isolation/access before adding a shared persistent library; do not expose every visitor's sets through unauthenticated CRUD.

[Client uploads](https://vercel.com/docs/vercel-blob/client-upload) bypass the function body limit by uploading directly to Blob, but introduce token authorization, upload validation, retention/cleanup, operation usage and extraction orchestration. A server-to-Blob upload through FastAPI still encounters the body limit. Never let the backend fetch arbitrary client URLs: use server-authorized object references to avoid SSRF. Private files require server-authorized retrieval; keep the Blob read/write token secret.

For this personal coursework prototype, start with Hobby hosting, no DB, no Blob, bounded direct PDF extraction and separately budgeted LLM usage. [Hobby](https://vercel.com/docs/plans/hobby) is for personal/non-commercial use and can pause functionality after limits are reached. Blob also becomes unavailable when its Hobby quota is exceeded. This is a plausible $0 hosting/storage plan within allowances, not a guarantee of a free AI app or unlimited availability.

## What you will need to do after test approval

Choose a chat-completions-compatible provider/model and set a small provider budget. Keep credentials in local backend environment variables and later Vercel's backend environment settings; do not paste keys into chat or Git. After the implementation passes locally, create the two Hobby projects, configure their roots/environment URLs and allowed origins, then validate a preview together. No Postgres or Blob signup is necessary for the recommended first deployment.
