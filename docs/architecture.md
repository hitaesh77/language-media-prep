# Architecture and product decisions

## Confirmed direction

The user requested FastAPI and Next.js. The supplied brief calls for Arabic-first vocabulary preparation: pasted text, passage selection, learner settings, grounded contextual vocabulary, familiar-word marking, and flashcards. The repository had no implementation or referenced brief documents.

## Implemented local slice

- `backend/app/main.py`: Pydantic request validation, deterministic paragraph segmentation, selection validation, frequency baseline, optional server-side LLM adapter, output grounding, latency and token usage metadata.
- `frontend/app/`: Next.js App Router UI using TypeScript, explicit RTL Arabic passages, learner settings, source references, familiar-word filtering, and flippable flashcards.
- Browser calls FastAPI directly using a public backend URL and explicitly allowed development origin. There are no Next.js business API endpoints.
- The API is stateless. The generation request resubmits the original text and chosen segment IDs; the server re-parses and rejects stale/unknown IDs. IDs combine a source SHA-256 prefix and paragraph index. They are stable for identical input, not intended to persist across source edits.
- The first parser splits on blank lines and preserves paragraph characters. No linguistic sentence segmentation or Arabic normalization is claimed. Exact expressions must occur with Arabic word boundaries in a selected source. The backend attaches original context rather than trusting model-provided context.
- Baseline uses surface-form frequency, a small stopword list, and deterministic ties. It intentionally provides no invented translations and does not apply proficiency or variety. It is a comparison tool, not equivalent to contextual AI.
- LLM JSON must contain 1–15 cards. The instruction requests about 10–15 unless the passage is short. A single invalid reference/expression rejects the response. Meanings remain unverified even when occurrence checks pass.
- Input is limited to 20,000 characters. No uploads, server-side user persistence, authentication, or database are needed for local use. Do not expose this unauthenticated generation API publicly without request budgets and access controls.

## Provisional defaults and open decisions

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
