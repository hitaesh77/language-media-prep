import pytest
from app.subtitles import parse_subtitles


def test_srt_and_vtt_preserve_text_timing_and_repeat_ids():
    srt = '1\n00:00:01,250 --> 00:00:02,500\nمرحبا\n\n2\n00:00:02,400 --> 00:00:03,000\nمرحبا'
    cues = parse_subtitles(srt)
    assert [(c['start_ms'], c['end_ms'], c['text']) for c in cues] == [(1250, 2500, 'مرحبا'), (2400, 3000, 'مرحبا')]
    assert cues[0]['id'] != cues[1]['id']
    assert cues == parse_subtitles(srt)
    assert parse_subtitles('WEBVTT\n\n00:01.250 --> 00:02.500 align:start\nمرحبا')[0]['text'] == 'مرحبا'


def test_subtitle_text_with_extra_blank_lines_is_preserved():
    text = '1\n00:00:01,000 --> 00:00:02,000\nمرحبا\n\n\nكيف حالك\n\n\n\n2\n00:00:03,000 --> 00:00:04,000\nوداعا'
    cues = parse_subtitles(text)
    assert len(cues) == 2
    assert cues[0]['text'] == 'مرحبا\n\n\nكيف حالك'
    assert cues[1]['text'] == 'وداعا'


@pytest.mark.parametrize('value', ['1\n00:00:03,000 --> 00:00:02,000\nمرحبا', 'bad', '1\n00:99:00,000 --> 01:00:00,000\nمرحبا'])
def test_invalid_subtitles(value):
    with pytest.raises(ValueError):
        parse_subtitles(value)

from fastapi.testclient import TestClient
from app.main import app
from app import subtitles


def test_subtitle_api_search_download_and_fallback(monkeypatch):
    monkeypatch.setenv('OPENSUBTITLES_API_KEY', 'fixture-key')
    class Response:
        def __init__(self, payload=None, content=b''):
            self.payload, self.content = payload, content
        def json(self): return self.payload
    calls = []
    async def fake(method, url, **kwargs):
        calls.append((method, url))
        if url.endswith('/subtitles'):
            return Response({'data': [{'attributes': {'feature_details': {'title': 'Film', 'year': 2020}, 'release': 'release', 'files': [{'file_id': 9}]}}]})
        if url.endswith('/download'):
            return Response({'link': 'https://www.opensubtitles.com/subfile/test.srt'})
        return Response(content='1\n00:00:01,000 --> 00:00:02,000\nمرحبا'.encode())
    monkeypatch.setattr(subtitles, 'provider', fake)
    client = TestClient(app)
    assert client.post('/api/subtitles/search', json={'query': 'Film'}).json()[0]['id'] == 9
    assert client.post('/api/subtitles/download', json={'file_id': 9}).json()[0]['text'] == 'مرحبا'
    assert client.post('/api/subtitles/parse', json={'text': 'WEBVTT\n\n00:01.000 --> 00:02.000\nمرحبا'}).status_code == 200
    assert client.post('/api/subtitles/download', json={'file_id': -1}).status_code == 422
    assert len(calls) == 3


def test_download_rejects_untrusted_link(monkeypatch, caplog):
    monkeypatch.setenv('OPENSUBTITLES_API_KEY', 'fixture-key')
    class Response:
        def json(self): return {'link': 'https://evil.example/private'}
    async def fake(*args, **kwargs): return Response()
    monkeypatch.setattr(subtitles, 'provider', fake)
    assert TestClient(app).post('/api/subtitles/download', json={'file_id': 1}).status_code == 502
    assert 'stage=download_link reason=invalid_response_or_link' in caplog.text
    assert 'evil.example' not in caplog.text


def test_download_logs_parse_failure_without_content(monkeypatch, caplog):
    monkeypatch.setenv('OPENSUBTITLES_API_KEY', 'fixture-key')
    class Response:
        content = b'secret subtitle text'
        def json(self): return {'link': 'https://www.opensubtitles.com/file'}
    async def fake(*args, **kwargs): return Response()
    monkeypatch.setattr(subtitles, 'provider', fake)
    assert TestClient(app).post('/api/subtitles/download', json={'file_id': 1}).status_code == 502
    assert 'stage=parse reason=missing_timing block=1' in caplog.text
    assert 'secret subtitle text' not in caplog.text


@pytest.mark.parametrize('content, reason', [
    ('1\nnot a timestamp\ntext', 'invalid_timing_format'),
    ('1\n00:00:01,000 --> 00:00:02,000', 'missing_text'),
    ('1\n00:00:02,000 --> 00:00:01,000\ntext', 'invalid_duration'),
])
def test_invalid_cue_diagnostics(content, reason):
    with pytest.raises(subtitles.InvalidCue) as error:
        parse_subtitles(content)
    assert error.value.reason == reason and error.value.block == 1


def test_invalid_timing_shape_masks_subtitle_content():
    with pytest.raises(subtitles.InvalidCue) as error:
        parse_subtitles('1\n00:01:02,34 --> 00:01:03,45 SECRET\ntext')
    assert error.value.shape == '99:99:99,99 --> 99:99:99,99 xxxxxx'


def test_provider_logs_status_without_url_or_credentials(monkeypatch, caplog):
    import asyncio
    from contextlib import asynccontextmanager
    import httpx
    from fastapi import HTTPException

    @asynccontextmanager
    async def stream(self, method, url, **kwargs):
        yield httpx.Response(429, request=httpx.Request(method, url))
    monkeypatch.setattr(httpx.AsyncClient, 'stream', stream)
    with pytest.raises(HTTPException):
        asyncio.run(subtitles.provider('POST', 'https://api.opensubtitles.com/api/v1/download?secret=hidden', headers={'Api-Key': 'fixture-key'}))
    assert 'stage=download_request reason=HTTPStatusError status=429' in caplog.text
    assert 'hidden' not in caplog.text and 'fixture-key' not in caplog.text

@pytest.mark.parametrize('location, expected', [('/api/v1/subtitles?languages=ar&query=film', 200), ('https://evil.example/steal', 502)])
def test_provider_follows_only_same_host_redirect(monkeypatch, location, expected):
    import asyncio
    from contextlib import asynccontextmanager
    import httpx
    from fastapi import HTTPException

    calls = []
    @asynccontextmanager
    async def stream(self, method, url, **kwargs):
        calls.append((url, kwargs))
        request = httpx.Request(method, url, params=kwargs.get('params'))
        if len(calls) == 1:
            yield httpx.Response(301, headers={'location': location}, request=request)
        else:
            yield httpx.Response(200, content=b'{"data":[]}', request=request)
    monkeypatch.setattr(httpx.AsyncClient, 'stream', stream)
    try:
        result = asyncio.run(subtitles.provider('GET', 'https://api.opensubtitles.com/api/v1/subtitles', params={'query': 'Film'}, headers={'Api-Key': 'fixture-key'}))
        assert expected == 200 and result.json() == {'data': []}
        assert len(calls) == 2 and 'params' not in calls[1][1]
    except HTTPException as exc:
        assert expected == exc.status_code and len(calls) == 1


def test_search_redirect_preserves_original_query(monkeypatch):
    import asyncio
    from contextlib import asynccontextmanager
    import httpx

    requests = []
    @asynccontextmanager
    async def stream(self, method, url, **kwargs):
        request = httpx.Request(method, url, params=kwargs.get('params'))
        requests.append(request)
        if len(requests) == 1:
            yield httpx.Response(301, headers={'location': '/api/v1/subtitles/'}, request=request)
        else:
            yield httpx.Response(200, content=b'{}', request=request)
    monkeypatch.setattr(httpx.AsyncClient, 'stream', stream)
    asyncio.run(subtitles.provider('GET', 'https://api.opensubtitles.com/api/v1/subtitles', params={'query': 'Capernaum', 'languages': 'ar', 'type': 'movie'}))
    assert dict(requests[1].url.params) == {'query': 'Capernaum', 'languages': 'ar', 'type': 'movie'}
