"""Bounded PDF worker orchestration and canonical page provenance."""

import json
import logging
from pathlib import Path
import subprocess
import sys
from threading import BoundedSemaphore

from fastapi import HTTPException

from .domain import SourceInput, parse_source

MAX_PDF_BYTES = 4 * 1024 * 1024
EXTRACTION_SECONDS = 60
_worker_slots = BoundedSemaphore(2)
logger = logging.getLogger(__name__)


def extract_pdf(data: bytes) -> dict:
    if not _worker_slots.acquire(blocking=False):
        logger.warning("pdf_extract outcome=failure stage=worker reason=busy")
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
            reason = output.get("reason")
            if reason not in {"encrypted", "page_count", "stream_limit", "drawing", "encoding", "text_limit", "no_arabic", "worker_error"}:
                reason = "unknown"
            page = output.get("page")
            if type(page) is not int or not 1 <= page <= 20:
                page = None
            logger.warning("pdf_extract outcome=failure stage=worker reason=%s chunk_page=%s", reason, page)
            detail = output["error"]
            if page is not None:
                detail = f"Page {page} of this PDF chunk: {detail}"
            raise HTTPException(422, detail)
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
        logger.info("pdf_extract outcome=success bytes=%d pages=%d characters=%d segments=%d", len(data), len(pages), len(text), len(segments))
        return {"text": text, "segments": segments, "pages": pages}
    except subprocess.TimeoutExpired:
        logger.warning("pdf_extract outcome=failure stage=worker reason=timeout")
        raise HTTPException(
            422,
            "PDF extraction exceeded its time limit. Choose a shorter or simpler PDF.",
        ) from None
    except (ValueError, KeyError, OSError, TypeError):
        logger.warning("pdf_extract outcome=failure stage=worker reason=invalid_result")
        raise HTTPException(
            422, "Cannot extract this PDF. Choose a short text-based Arabic PDF."
        ) from None
