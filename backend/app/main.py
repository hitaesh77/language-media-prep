"""Stateless FastAPI endpoints for Arabic vocabulary preparation."""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.responses import JSONResponse

# Explicit path works from repository root and Vercel's backend root alike.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Re-export existing helpers for backwards compatibility with original tests.
from .domain import (
    Card,
    GenerateInput,
    GenerationResult,
    PDFResult,
    Segment,
    SourceInput,
    grounded,
    parse_source,
)
from .generation import generate
from .pdf_service import MAX_PDF_BYTES, extract_pdf


class RequestLimit:
    """Count actual bytes before parsing multipart/JSON, including chunked bodies."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        limit = (
            MAX_PDF_BYTES + 32768 if scope["path"] == "/api/pdf/extract" else 128 * 1024
        )
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > limit:
                return await JSONResponse(
                    {
                        "detail": "Request is too large. PDFs must be at most 4 MiB; text at most 20,000 characters."
                    },
                    status_code=413,
                )(scope, receive, send)
            if not message.get("more_body", False):
                break
        consumed = False

        async def replay():
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


app = FastAPI(title="Lingo", version="0.2.0")
app.add_middleware(RequestLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "llm_configured": all(
            os.getenv(k) for k in ("LLM_API_URL", "LLM_API_KEY", "LLM_MODEL")
        ),
    }


@app.post("/api/segments", response_model=list[Segment])
def segments(body: SourceInput):
    return parse_source(body.text)


app.post("/api/generate", response_model=GenerationResult)(generate)


@app.post("/api/pdf/extract", response_model=PDFResult)
async def pdf_extract(request: Request):
    if (
        not request.headers.get("content-type", "")
        .lower()
        .startswith("multipart/form-data")
    ):
        raise HTTPException(422, "Upload one PDF using the multipart file field.")
    async with request.form(max_files=2, max_fields=1, max_part_size=32768) as form:
        items = form.multi_items()
        if (
            len(items) != 1
            or items[0][0] != "file"
            or not isinstance(items[0][1], UploadFile)
        ):
            raise HTTPException(422, "Upload exactly one PDF in the file field.")
        file = items[0][1]
        if not (file.filename or "").lower().endswith(
            ".pdf"
        ) or file.content_type not in {"application/pdf", "application/octet-stream"}:
            raise HTTPException(415, "Choose a PDF file with a PDF content type.")
        data = await file.read(MAX_PDF_BYTES + 1)
        if len(data) > MAX_PDF_BYTES:
            raise HTTPException(413, "Choose a PDF no larger than 4 MiB.")
        if not data or not data.startswith(b"%PDF-"):
            raise HTTPException(422, "File is empty or is not a valid PDF.")
        return await run_in_threadpool(extract_pdf, data)
