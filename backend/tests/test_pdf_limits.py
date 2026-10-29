"""PDF failures and page provenance at the HTTP boundary, before implementation."""

from io import BytesIO
from pathlib import Path
import subprocess

import pytest
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, NameObject

from test_v1_contract import client, synthetic_pdf, upload, MAX_PDF_BYTES


def document(pages, password=None):
    writer = PdfWriter()
    for text in pages:
        if text is None:
            writer.add_blank_page(width=300, height=200)
        else:
            writer.add_page(PdfReader(BytesIO(synthetic_pdf(text))).pages[0])
    if password:
        writer.encrypt(password)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.mark.parametrize(
    "pages,password",
    [
        ([None], None),
        (["قرأ الطالب كتابا"], "secret"),
        (["قرأ الطالب كتابا"] * 21, None),
        (["ا" * 20001], None),
    ],
    ids=["blank", "encrypted", "too-many-pages", "too-long"],
)
def test_unusable_pdf(pages, password):
    response = upload(document(pages, password))
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_page_references_for_repeated_text_and_blank_page():
    response = upload(document(["قرأ الطالب كتابا", None, "قرأ الطالب كتابا"]))
    assert response.status_code == 200
    data = response.json()
    canonical = client.post("/api/segments", json={"text": data["text"]}).json()
    assert data["segments"] == canonical
    assert len(canonical) == 2 and canonical[0]["id"] != canonical[1]["id"]
    assert data["pages"] == [
        {"page": 1, "segmentIds": [canonical[0]["id"]]},
        {"page": 2, "segmentIds": []},
        {"page": 3, "segmentIds": [canonical[1]["id"]]},
    ]


@pytest.mark.parametrize("with_text", [False, True], ids=["scan", "mixed"])
def test_reject_image_content_without_ocr(with_text):
    writer = PdfWriter()
    if with_text:
        writer.add_page(PdfReader(BytesIO(synthetic_pdf("قرأ الطالب كتابا"))).pages[0])
    page = writer.add_blank_page(width=300, height=200)
    # Inline image avoids dependency on an image codec and represents actual ink.
    stream = DecodedStreamObject()
    stream.set_data(
        b"q 100 0 0 100 0 0 cm BI /W 1 /H 1 /CS /RGB /BPC 8 ID \xff\x00\x00 EI Q"
    )
    page[NameObject("/Contents")] = writer._add_object(stream)
    out = BytesIO()
    writer.write(out)
    response = upload(out.getvalue())
    assert response.status_code == 422
    assert "images" in response.json()["detail"]


def test_mime_mismatch():
    assert upload(synthetic_pdf("قرأ الطالب"), mime="image/png").status_code == 415


def test_file_at_exact_limit():
    pdf = synthetic_pdf("قرأ الطالب كتابا")
    assert upload(pdf + b" " * (MAX_PDF_BYTES - len(pdf))).status_code == 200


def test_oversized_chunked_request():
    response = client.post(
        "/api/pdf/extract",
        content=iter([b"x" * 65536] * 66),
        headers={"Content-Type": "multipart/form-data; boundary=test"},
    )
    assert response.status_code == 413


def test_extraction_deadline(monkeypatch):
    def expired(*args, **kwargs):
        raise subprocess.TimeoutExpired("pdf-worker", 10)

    monkeypatch.setattr(subprocess, "run", expired)
    response = upload(synthetic_pdf("قرأ الطالب كتابا"))
    assert response.status_code == 422
    assert "time" in response.json()["detail"].lower()


def test_browser_pdf_with_ambiguous_font_mapping_is_not_silently_rewritten():
    # Visually legible Arabic can have invalid/misleading Unicode font mappings.
    data = (Path(__file__).parent / "fixtures/arabic-browser.pdf").read_bytes()
    response = upload(data)
    assert response.status_code == 422
    assert "encoding" in response.json()["detail"]


def test_pdf_worker_capacity_returns_actionable_error(monkeypatch):
    from threading import BoundedSemaphore
    from app import pdf_service

    monkeypatch.setattr(pdf_service, "_worker_slots", BoundedSemaphore(0))
    response = upload(synthetic_pdf("قرأ الطالب"))
    assert response.status_code == 503
    assert "busy" in response.json()["detail"]


def test_cors_preflight_allows_configured_development_origin():
    response = client.options(
        "/api/pdf/extract",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    denied = client.options(
        "/api/pdf/extract",
        headers={
            "Origin": "https://untrusted.invalid",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in denied.headers
