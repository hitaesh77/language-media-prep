"""Approved V1 API acceptance contracts.

No live provider calls. Run from backend/: python -m pytest -q
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app

TEXT = "ذهب الطالب إلى المكتبة لقراءة كتاب جديد.\n\nوجد الطالب قصة جميلة عن السفر."
client = TestClient(app)
MAX_PDF_BYTES = 4 * 1024 * 1024  # Approved Vercel-safe limit.


def request_body(**overrides):
    segments = client.post("/api/segments", json={"text": TEXT}).json()
    return dict(
        text=TEXT,
        segment_ids=[segments[0]["id"]],
        mode="llm",
        **overrides,
    )


@pytest.fixture
def provider(monkeypatch):
    """Stub the external HTTP boundary, retaining actual API/model validation."""
    for name, value in {
        "LLM_API_URL": "https://provider.invalid/chat/completions",
        "LLM_API_KEY": "test-secret-never-return",
        "LLM_MODEL": "test-model",
    }.items():
        monkeypatch.setenv(name, value)
    state = {"calls": [], "content": None, "status": 200, "error": None}

    async def post(self, url, **kwargs):
        state["calls"].append(kwargs["json"])
        if state["error"]:
            raise state["error"]
        return httpx.Response(
            state["status"],
            request=httpx.Request("POST", url),
            json={
                "choices": [{"message": {"content": state["content"]}}],
                "usage": {
                    "prompt_tokens": 40,
                    "completion_tokens": 20,
                    "total_tokens": 60,
                },
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    return state


def card(**changes):
    return {
        "expression": "الطالب",
        "meaning": "the student",
        "segment_id": request_body()["segment_ids"][0],
        **changes,
    }


def test_health_is_configuration_only(provider):
    assert client.get("/api/health").json() == {"status": "ok", "llm_configured": True}
    assert provider["calls"] == []


def test_segments_preserve_diacritics_crlf_and_repeated_paragraphs():
    text = "\r\n\r\n  قَرَأَ الطالب كتابًا.  \r\n\r\n  قَرَأَ الطالب كتابًا.  "
    response = client.post("/api/segments", json={"text": text})
    assert response.status_code == 200
    segments = response.json()
    assert [s["text"] for s in segments] == ["  قَرَأَ الطالب كتابًا.  "] * 2
    assert len({s["id"] for s in segments}) == 2
    assert client.post("/api/segments", json={"text": text}).json() == segments
    edited = client.post("/api/segments", json={"text": text + "!"}).json()
    assert not {s["id"] for s in segments} & {s["id"] for s in edited}


@pytest.mark.parametrize(
    "text,status",
    [("ا" * 19999 + "😀", 200), ("ا" * 20000 + "😀", 422)],
    ids=["at-limit", "over-limit"],
)
def test_text_limit_counts_unicode_code_points(text, status):
    assert client.post("/api/segments", json={"text": text}).status_code == status


@pytest.mark.parametrize("language", ["English", "Arabic", "Spanish"])
def test_generation_forwards_preferences_and_only_selected_source(provider, language):
    provider["content"] = json.dumps({"cards": [card(context="forged context")]})
    body = request_body(
        proficiency="advanced", variety="Egyptian", explanation_language=language
    )
    response = client.post("/api/generate", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["cards"] == [card(context=TEXT.split("\n\n")[0])]
    assert data["mode"] == "llm"
    assert isinstance(data["elapsed_ms"], (int, float)) and data["elapsed_ms"] >= 0
    assert data["usage"]["total_tokens"] == 60
    assert data["cost"] is None and "review" in data["notice"].lower()
    payload = provider["calls"][0]
    source = json.loads(payload["messages"][1]["content"])
    assert source["settings"] == {
        "proficiency": "advanced",
        "variety": "Egyptian",
        "explanation_language": language,
    }
    assert source["source_data"] == [
        {"id": body["segment_ids"][0], "text": TEXT.split("\n\n")[0]}
    ]
    assert "untrusted" in payload["messages"][0]["content"].lower()


@pytest.mark.parametrize(
    "change",
    [
        {"segment_ids": []},
        {"segment_ids": ["stale"]},
        {"proficiency": "expert"},
        {"variety": "invented"},
        {"explanation_language": "unsupported"},
        {"mode": "invented"},
    ],
)
def test_invalid_generation_never_calls_provider(provider, change):
    body = request_body()
    body.update(change)
    assert client.post("/api/generate", json=body).status_code == 422
    assert provider["calls"] == []


def test_duplicate_selected_ids_rejected_before_provider(provider):
    body = request_body()
    body["segment_ids"] *= 2
    assert client.post("/api/generate", json=body).status_code == 422
    assert provider["calls"] == []


@pytest.mark.parametrize(
    "case",
    [
        "blank-meaning",
        "duplicate",
        "unselected",
        "substring",
        "empty",
        "too-many",
        "malformed",
    ],
)
def test_invalid_model_output_rejects_entire_response(provider, case):
    cards = [card()]
    if case == "blank-meaning":
        cards = [card(meaning=" \n ")]
    elif case == "duplicate":
        cards *= 2
    elif case == "unselected":
        segments = client.post("/api/segments", json={"text": TEXT}).json()
        cards = [card(expression="السفر", segment_id=segments[1]["id"])]
    elif case == "substring":
        cards = [card(expression="طالب")]
    elif case == "empty":
        cards = []
    elif case == "too-many":
        cards *= 16
    provider["content"] = (
        "not json" if case == "malformed" else json.dumps({"cards": cards})
    )
    response = client.post("/api/generate", json=request_body())
    assert response.status_code == 502
    assert "cards" not in response.json()
    assert "test-secret" not in response.text


@pytest.mark.parametrize("failure", ["timeout", "http-error"])
def test_provider_failure_has_safe_error_and_no_automatic_retry(provider, failure):
    if failure == "timeout":
        provider["error"] = httpx.ReadTimeout("private upstream details test-secret")
    else:
        provider["status"] = 429
    response = client.post("/api/generate", json=request_body())
    assert response.status_code == 502  # Preserve existing timeout contract.
    assert isinstance(response.json()["detail"], str)
    assert "test-secret" not in response.text
    assert len(provider["calls"]) == 1


def upload(data, name="source.pdf", mime="application/pdf"):
    return client.post("/api/pdf/extract", files={"file": (name, data, mime)})


@pytest.mark.parametrize(
    "data,name,mime,status",
    [
        (b"not a PDF", "source.txt", "text/plain", 415),
        (b"not a PDF", "source.pdf", "application/pdf", 422),
        (b"", "source.pdf", "application/pdf", 422),
        (b"%PDF-1.7\nbroken", "source.pdf", "application/pdf", 422),
        (b"%PDF-1.7\n" + b" " * MAX_PDF_BYTES, "source.pdf", "application/pdf", 413),
    ],
    ids=["wrong-type", "disguised", "empty", "malformed", "oversized"],
)
def test_pdf_rejects_invalid_uploads(data, name, mime, status):
    response = upload(data, name, mime)
    assert response.status_code == status
    assert isinstance(response.json()["detail"], str)


def test_pdf_requires_file():
    assert client.post("/api/pdf/extract").status_code == 422


def test_pdf_rejects_multiple_files():
    response = client.post(
        "/api/pdf/extract",
        files=[
            ("file", ("one.pdf", b"%PDF-1.7", "application/pdf")),
            ("file", ("two.pdf", b"%PDF-1.7", "application/pdf")),
        ],
    )
    assert response.status_code == 422


def synthetic_pdf(text):
    """Minimal extraction fixture with a Unicode map; not Arabic layout evidence.

    Uses standard PDF objects/xref, no extraction library or production helper.
    Representative, visually verified Arabic PDFs remain an implementation gate.
    """
    chars = list(dict.fromkeys(text))
    codes = {char: i + 1 for i, char in enumerate(chars)}
    cmap = (
        "/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n"
        "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n"
        "/CMapName /TestMap def /CMapType 2 def\n"
        "1 begincodespacerange <00> <FF> endcodespacerange\n"
        f"{len(chars)} beginbfchar\n"
        + "\n".join(f"<{codes[c]:02X}> <{c.encode('utf-16-be').hex()}>" for c in chars)
        + "\nendbfchar endcmap CMapName currentdict /CMap defineresource pop end end"
    ).encode()
    content = (
        "BT /F1 12 Tf 20 100 Td <"
        + "".join(f"{codes[c]:02X}" for c in text)
        + "> Tj ET"
    ).encode()

    def stream(data):
        return f"<< /Length {len(data)} >>\nstream\n".encode() + data + b"\nendstream"

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding /ToUnicode 6 0 R >>",
        stream(content),
        stream(cmap),
    ]
    result = b"%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    start = len(result)
    result += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
    result += b"".join(f"{offset:010} 00000 n \n".encode() for offset in offsets[1:])
    return (
        result
        + f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode()
    )


def test_pdf_returns_actual_unicode_text_canonical_ids_and_page_reference(provider):
    text = "قرأ الطالب كتابا"
    response = upload(synthetic_pdf(text))
    assert response.status_code == 200
    data = response.json()
    assert data["text"].strip() == text
    canonical = client.post("/api/segments", json={"text": data["text"]}).json()
    assert data["segments"] == canonical
    assert data["pages"] == [{"page": 1, "segmentIds": [s["id"] for s in canonical]}]
    # Continue from extracted source into the real generation validation boundary.
    provider["content"] = json.dumps({"cards": [card(segment_id=canonical[0]["id"])]})
    generated = client.post(
        "/api/generate",
        json={"text": data["text"], "segment_ids": [canonical[0]["id"]], "mode": "llm"},
    )
    assert generated.status_code == 200
    assert generated.json()["cards"][0]["context"] == canonical[0]["text"]


def test_pdf_rejects_readable_non_arabic_document():
    assert upload(synthetic_pdf("English only")).status_code == 422
