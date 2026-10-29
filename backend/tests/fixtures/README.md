# PDF fixture

`arabic-browser.pdf` contains three short Arabic passages written for tests, printed with Chromium/Arial using `../create_arabic_fixture.py`. It contains no private upload or coursework material. Playwright is needed only to recreate it, not to run the backend or tests.

The rendered PDF is legible, but pypdf yields Arabic presentation forms and unreliable word order from its font mappings. It is deliberately a **rejection fixture**: the API must return an actionable encoding error instead of silently reshaping/reversing text. This is not evidence that arbitrary Arabic PDFs extract correctly.

Other tests construct tiny Unicode-map PDFs in memory to test successful decoding, canonical source IDs, page provenance and extraction-to-generation behavior. Wider coverage of representative, successfully decoded Arabic PDFs is still needed. The current conservative parser also rejects all image/Form drawing operations, including logos and some otherwise readable documents; no OCR or automatic text repair is performed.
