"""Bounded PDF worker orchestration and canonical page provenance."""

import json
from pathlib import Path
import subprocess
import sys
from threading import BoundedSemaphore

from fastapi import HTTPException

from .domain import SourceInput, parse_source

MAX_PDF_BYTES = 4 * 1024 * 1024
EXTRACTION_SECONDS = 10
_worker_slots = BoundedSemaphore(2)


def extract_pdf(data: bytes) -> dict:
    if not _worker_slots.acquire(blocking=False):
        raise HTTPException(503, "PDF extraction is busy. Please try again shortly.")
    try:
        return _extract_pdf(data)
    finally:
        _worker_slots.release()


def _extract_pdf(data: bytes) -> dict:
    try:
        result = subprocess.run(
            [sys.executable, "-m", "app.pdf_worker"],
            input=data,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            cwd=Path(__file__).resolve().parents[1],
            timeout=EXTRACTION_SECONDS,
            check=False,
            **(
                {"creationflags": subprocess.CREATE_NO_WINDOW}
                if sys.platform == "win32"
                else {}
            ),
        )
        if result.returncode:
            raise ValueError("worker failed")
        output = json.loads(result.stdout)
        if "error" in output:
            raise HTTPException(422, output["error"])
        page_texts = output["pages"]
        text = "\n\n".join(p for p in page_texts if p.strip())
        SourceInput(text=text)
        segments = parse_source(text)
        pages = []
        cursor = 0
        for number, page_text in enumerate(page_texts, 1):
            count = len(parse_source(page_text)) if page_text.strip() else 0
            pages.append(
                {
                    "page": number,
                    "segmentIds": [s.id for s in segments[cursor : cursor + count]],
                }
            )
            cursor += count
        return {"text": text, "segments": segments, "pages": pages}
    except subprocess.TimeoutExpired:
        raise HTTPException(
            422,
            "PDF extraction exceeded its time limit. Choose a shorter or simpler PDF.",
        ) from None
    except (ValueError, KeyError, OSError, TypeError):
        raise HTTPException(
            422, "Cannot extract this PDF. Choose a short text-based Arabic PDF."
        ) from None
