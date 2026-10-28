import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import Card, app, grounded, parse_source

client = TestClient(app)
TEXT = "ذهب الطالب إلى المكتبة لقراءة كتاب جديد.\n\nفي المكتبة وجد الطالب قصة جميلة عن السفر."


def test_segments_preserve_text_and_stable_ids():
    first = parse_source(TEXT)
    assert first == parse_source(TEXT)
    assert first[0].text == TEXT.split("\n\n")[0]
    assert first[0].id != first[1].id
    assert first[0].id != parse_source(TEXT + "!")[0].id


def test_vertical_slice_and_selection():
    segments = client.post("/api/segments", json={"text": TEXT}).json()
    result = client.post("/api/generate", json={"text": TEXT, "segment_ids": [segments[1]["id"]]} )
    assert result.status_code == 200
    data = result.json()
    assert data["mode"] == "baseline" and data["cards"]
    assert len(data["cards"]) <= 15
    for card in data["cards"]:
        assert card["expression"] in segments[1]["text"]
        assert card["context"] == segments[1]["text"]
        assert card["segment_id"] == segments[1]["id"]


@pytest.mark.parametrize("text", [" ", "English only", "ا" * 20001], ids=["blank", "non-arabic", "too-long"])
def test_invalid_input(text):
    assert client.post("/api/segments", json={"text": text}).status_code == 422


def test_invalid_selection():
    assert client.post("/api/generate", json={"text": TEXT, "segment_ids": ["fake"]}).status_code == 422


@pytest.mark.parametrize("expression,reference", [("اختراع", "valid"), ("الطالب", "fake"), ("طالب", "valid")])
def test_reject_ungrounded(expression, reference):
    segment = parse_source(TEXT)[0]
    with pytest.raises(ValueError):
        grounded([Card(expression=expression, meaning="meaning", segment_id=segment.id if reference == "valid" else reference)], [segment])


def test_ai_without_configuration(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    response = client.post("/api/generate", json={"text": TEXT, "segment_ids": [parse_source(TEXT)[0].id], "mode": "llm"})
    assert response.status_code == 503


def test_ai_response_validated(monkeypatch):
    for key in ("LLM_API_URL", "LLM_API_KEY", "LLM_MODEL"):
        monkeypatch.setenv(key, "test")
    segment = parse_source(TEXT)[0]
    async def fake_post(self, url, **kwargs):
        assert "untrusted" in kwargs["json"]["messages"][0]["content"]
        return httpx.Response(200, request=httpx.Request("POST", "https://test.invalid"), json={"choices": [{"message": {"content": '{"cards":[{"expression":"الطالب","meaning":"the student","segment_id":"' + segment.id + '"}]}'}}]})
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    response = client.post("/api/generate", json={"text": TEXT, "segment_ids": [segment.id], "mode": "llm"})
    assert response.status_code == 200
    assert response.json()["cards"][0]["context"] == segment.text


def test_baseline_uses_whole_word_source():
    # A candidate may also be a suffix of a different word in an earlier paragraph.
    text = "\u0645\u0643\u062a\u0627\u0628\u0629\n\n\u0643\u062a\u0627\u0628\u0629"
    segments = parse_source(text)
    result = client.post('/api/generate', json={'text': text, 'segment_ids': [s.id for s in segments]})
    assert result.status_code == 200
    card = next(c for c in result.json()['cards'] if c['expression'] == '\u0643\u062a\u0627\u0628\u0629')
    assert card['segment_id'] == segments[1].id


def test_ai_rejects_invented_source(monkeypatch):
    for key in ('LLM_API_URL', 'LLM_API_KEY', 'LLM_MODEL'):
        monkeypatch.setenv(key, 'test')
    async def fake_post(self, url, **kwargs):
        return httpx.Response(200, request=httpx.Request('POST', 'https://test.invalid'), json={'choices': [{'message': {'content': '{"cards":[{"expression":"invented","meaning":"invented","segment_id":"fake"}]}'}}]})
    monkeypatch.setattr(httpx.AsyncClient, 'post', fake_post)
    result = client.post('/api/generate', json={'text': TEXT, 'segment_ids': [parse_source(TEXT)[0].id], 'mode': 'llm'})
    assert result.status_code == 502
