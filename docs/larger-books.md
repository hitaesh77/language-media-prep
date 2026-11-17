# Larger-book investigation - November 16, 2026

## Implementation update - November 17, 2026

The browser accepts original PDFs up to 50 MiB and selects a contiguous range of at most 20 pages. It copies valid sub-PDFs, splitting further if necessary to stay within 4 MiB per request, and runs at most two extraction requests concurrently. Results are validated, merged in original page order and reparsed to obtain canonical IDs. Repeated passages are preserved; failed chunks fail the whole operation. A single page larger than 4 MiB is rejected. The combined 20,000-character source limit remains; select a shorter range if exceeded. Chunks without usable Arabic are rejected by the existing backend. Original PDFs are not retained. Real 50 MiB books, memory use, Arabic font fidelity and hosted behavior have not been benchmarked. The sections below describe the previous investigation.


Khanh Tran's October 30 review reported that a roughly 18 MB book was blocked. This is a requested capability investigation, not evidence of successful full-book processing.

## Current independent limits

- Upload: 4 MiB plus 32 KiB multipart overhead, enforced by frontend, HTTP middleware, route and subprocess input.
- PDF extraction: 20 pages, 20,000 extracted Unicode code points (including paragraph separators), 2 MiB decoded stream per page, 10-second worker deadline, two workers per process. Linux additionally limits address space to 512 MiB and CPU to 8 seconds. Image/Form drawings, encryption and unusable font encodings remain unsupported.
- Source/API/browser contracts: 20,000 code points, 128 KiB JSON request, at most 100 selected passages, at most 300 generated cards. Generation remains bounded by candidate pool, tokens, concurrency and deadlines.

Raising file/page limits alone would hit the other limits. A compressed 18 MB file says little about decoded memory or extracted text size. Browser localStorage is also limited and may reject large saves; the current failure leaves previous sets intact.

## Hosting finding

Vercel's [function limitations](https://vercel.com/docs/functions/limitations) and [payload error documentation](https://vercel.com/docs/errors/function_payload_too_large), consulted November 16, document a 4.5 MB request/response payload cap. An 18 MB multipart upload cannot use that route merely by changing Python constants. Hosted behavior has not been tested.

## Alternative: local or separately hosted extraction

For same-device use, a separately hosted or local FastAPI upload endpoint can avoid the Vercel function payload path without requiring permanent cloud PDF storage. Proposed provisional bounds: 25 MiB PDF, 500 document pages, and an explicit page range of at most 20 pages per extraction, retaining the 20,000-character result cap and current stream/time/worker limits. Those proposed numbers are not measured capacity or stakeholder decisions.

The parser must validate the total page count, reject out-of-range requests, and extract only the chosen range. Return original page numbers and preserve canonical segment IDs, including through regeneration and saving. Current frontend page validation assumes pages start at one, so that contract needs updating together. Avoid decoding the whole book or sending all its text to the model/browser storage. A difficult book may still fail the bounded parser; report that honestly.

Before implementation, add synthetic boundary tests for large byte payloads, many pages, non-first page ranges/provenance, decoded-stream expansion, timeout/concurrent capacity, oversized text, save failures and unchanged generation budgets. Then test a permitted representative Arabic book and measure memory, extraction time, reading order and save size. No stakeholder book was opened or benchmarked in this investigation. Current production limits remain unchanged; users can export a short text-only page range or paste a passage today.

A temporary direct-to-object-storage upload with expiry could serve a Vercel-only deployment, but introduces access/retention/cleanup work. It is an alternative, not a requirement for this stakeholder. Durable PDF storage is not necessary for reopening browser-saved extracted text and vocabulary.


## Browser-side PDF splitting idea (logged November 16)

The user proposed keeping the selected original PDF in the browser, splitting it into smaller PDFs, uploading those through multiple extraction requests, and consolidating the responses. This is an implementation candidate, not a completed feature or a verified solution for the 18 MB book. It can avoid sending the whole original through one function request without requiring cloud PDF retention.

Proposed first slice:

1. Keep the original file in browser memory for the current session and let the learner select a chapter/page range. Refresh or closing would require selecting the original again; persistent original-file storage is not included.
2. Parse and copy pages into independently valid sub-PDFs, not arbitrary byte slices. Check actual serialized size under the current 4 MiB/file cap, with at most 20 pages per chunk. Shared fonts/resources can increase output size; a single oversized page must produce an actionable error.
3. Extract sequentially initially, with progress, cancellation and explicit retry of failed chunks. Do not silently accept missing chunks or duplicate successful responses on retry. Keep all existing backend validation/resource limits; browser splitting is not a trust boundary.
4. Consolidate results in original page order, carrying original page numbers and chunk identity. Define canonical source/segment IDs that remain stable across consolidation, saving, reopening and regeneration; chunk-local IDs cannot simply be concatenated without checking collisions or rewriting provenance consistently. Preserve exact extracted Arabic and RTL behavior.
5. Review extracted text and choose passages before generation. Keep the first slice's combined source within 20,000 code points and current selected-passage/card budgets. Larger combined sources require coordinated changes to parsing, API validation, browser storage and regeneration; splitting transport alone does not implement full-book preparation.

Next technical step: prototype browser page copying on synthetic PDFs, measure actual chunk sizes and browser memory, and test successful Arabic extraction without changing source text. Cover original page offsets, blank/repeated pages, shared resources, single-page oversize, corrupt/encrypted/image PDFs, failed chunks, cancellation/retry, ID collisions and unchanged generation budgets. Benchmark a permitted representative book before claiming support. Choose a browser PDF dependency only after checking existing dependencies and fidelity; none is selected or added by this note.

The local/separate-backend approach above remains an alternative if browser parsing proves too memory-heavy or unreliable. Proposed byte/page bounds there are provisional, not accepted capacity targets.
