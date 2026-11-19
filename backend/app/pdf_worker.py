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

    def __init__(self, message, reason="unsupported", page=None):
        super().__init__(message)
        self.reason = reason
        self.page = page


def extract(data: bytes) -> list[str]:
    # pypdf enforces this limit while decompressing supported stream filters.
    filters.ZLIB_MAX_OUTPUT_LENGTH = MAX_STREAM
    reader = PdfReader(io.BytesIO(data), strict=True)
    if reader.is_encrypted:
        raise UnsupportedPDF(
            "Password-protected PDFs are unsupported. Upload an unencrypted copy.", "encrypted"
        )
    if not 1 <= len(reader.pages) <= MAX_PAGES:
        raise UnsupportedPDF("Choose a PDF with 1–20 pages.", "page_count")
    pages = []
    total = 0
    for page_number, page in enumerate(reader.pages, 1):
        content = page.get_contents()
        if content is not None:
            raw = content.get_data()
            if len(raw) > MAX_STREAM:
                raise UnsupportedPDF("PDF page is too complex. Choose a simpler PDF.", "stream_limit", page_number)
            # Conservative policy: image and Form drawing may contain unread text.
            # Reject rather than silently drop scanned material or recurse unboundedly.
            ops = content.operations
            if any(op in {b"INLINE IMAGE", b"Do"} for _, op in ops):
                raise UnsupportedPDF(
                    "PDF contains images or embedded drawings. Use a text-only PDF; OCR is unsupported.", "drawing", page_number
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
        ):
            raise UnsupportedPDF(
                "PDF text encoding is unusable. Paste the original Arabic text instead.", "encoding", page_number
            )
        pages.append(text)
        total += len(text)
        if total + 2 * max(0, sum(bool(p.strip()) for p in pages) - 1) > MAX_TEXT:
            raise UnsupportedPDF(
                "Extracted text exceeds 20,000 characters. Choose a shorter PDF.", "text_limit", page_number
            )
    if not re.search(r"[\u0621-\u064a]", "".join(pages)):
        raise UnsupportedPDF(
            "No usable Arabic text found. Scanned PDFs require OCR, which is unsupported.", "no_arabic"
        )
    return pages


def main():
    # Limit parser warnings; raw PDF data must not appear in logs or responses.
    logging.disable(logging.CRITICAL)
    try:
        if sys.platform != "win32":
            import resource

            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024,) * 2)
            resource.setrlimit(resource.RLIMIT_CPU, (50, 50))
        data = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
        if not data.startswith(b"%PDF-") or len(data) > 4 * 1024 * 1024:
            raise ValueError("Invalid PDF file.")
        result = {"pages": extract(data)}
    except UnsupportedPDF as exc:
        result = {"error": str(exc), "reason": exc.reason, "page": exc.page}
    except Exception:
        result = {
            "error": "Cannot extract this PDF. Choose a valid, short text-based Arabic PDF.", "reason": "worker_error"
        }
    sys.stdout.write(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
