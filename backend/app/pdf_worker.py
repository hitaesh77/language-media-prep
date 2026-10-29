"""Isolated PDF parser: bytes on stdin, bounded JSON on stdout. No app/env imports."""

import io
import json
import logging
import re
import sys

from pypdf import PdfReader, filters

MAX_PAGES = 20
MAX_TEXT = 20000
MAX_STREAM = 2 * 1024 * 1024


class UnsupportedPDF(ValueError):
    """Controlled, user-facing parser failure."""


def extract(data: bytes) -> list[str]:
    # pypdf enforces this limit while decompressing supported stream filters.
    filters.ZLIB_MAX_OUTPUT_LENGTH = MAX_STREAM
    reader = PdfReader(io.BytesIO(data), strict=True)
    if reader.is_encrypted:
        raise UnsupportedPDF(
            "Password-protected PDFs are unsupported. Upload an unencrypted copy."
        )
    if not 1 <= len(reader.pages) <= MAX_PAGES:
        raise UnsupportedPDF("Choose a PDF with 1–20 pages.")
    pages = []
    total = 0
    for page in reader.pages:
        content = page.get_contents()
        if content is not None:
            raw = content.get_data()
            if len(raw) > MAX_STREAM:
                raise UnsupportedPDF("PDF page is too complex. Choose a simpler PDF.")
            # Conservative policy: image and Form drawing may contain unread text.
            # Reject rather than silently drop scanned material or recurse unboundedly.
            ops = content.operations
            if any(op in {b"INLINE IMAGE", b"Do"} for _, op in ops):
                raise UnsupportedPDF(
                    "PDF contains images or embedded drawings. Use a text-only PDF; OCR is unsupported."
                )
        text = (
            page.extract_text(
                extraction_mode="layout", layout_mode_space_vertically=False
            )
            if content is not None
            else ""
        )
        if (
            "\ufffd" in text
            or "\x00" in text
            or re.search(r"[\ufb50-\ufdff\ufe70-\ufeff]", text)
        ):
            raise UnsupportedPDF(
                "PDF text encoding is unusable. Paste the original Arabic text instead."
            )
        pages.append(text)
        total += len(text)
        if total + 2 * max(0, sum(bool(p.strip()) for p in pages) - 1) > MAX_TEXT:
            raise UnsupportedPDF(
                "Extracted text exceeds 20,000 characters. Choose a shorter PDF."
            )
    if not re.search(r"[\u0621-\u064a]", "".join(pages)):
        raise UnsupportedPDF(
            "No usable Arabic text found. Scanned PDFs require OCR, which is unsupported."
        )
    return pages


def main():
    # Limit parser warnings; raw PDF data must not appear in logs or responses.
    logging.disable(logging.CRITICAL)
    try:
        if sys.platform != "win32":
            import resource

            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024,) * 2)
            resource.setrlimit(resource.RLIMIT_CPU, (8, 8))
        data = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
        if not data.startswith(b"%PDF-") or len(data) > 4 * 1024 * 1024:
            raise ValueError("Invalid PDF file.")
        result = {"pages": extract(data)}
    except UnsupportedPDF as exc:
        result = {"error": str(exc)}
    except Exception:
        result = {
            "error": "Cannot extract this PDF. Choose a valid, short text-based Arabic PDF."
        }
    sys.stdout.write(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
