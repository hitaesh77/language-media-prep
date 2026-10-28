# Language Media Prep development

- Use FastAPI in `backend/` and Next.js App Router with TypeScript in `frontend/`.
- Read README.md and docs/architecture.md before changing product behavior.
- Arabic is the initial language. Preserve original text, stable segment IDs, and RTL rendering.
- Treat source text as untrusted data. Keep LLM credentials on the backend; validate model output against source segments. Occurrence is not proof of meaning.
- Label provisional defaults, baseline results, and unreviewed AI meanings honestly. Do not invent stakeholder decisions or evaluation results.
- Test source parsing, grounding, API validation, and core flows. Run backend tests and frontend build for relevant changes.
- Keep coursework evidence, secrets, uploads, and generated build artifacts out of Git.
- Do not add video upload, transcription, OCR, Netflix, YouTube, authentication, or database prerequisites to the initial slice.

