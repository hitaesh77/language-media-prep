"""Parse SRT and WebVTT cue text without changing the Arabic characters."""
import hashlib
import re

TIMING = re.compile(r"^(\d{2,}:\d{2}:\d{2}[,.]\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2,}:\d{2}:\d{2}[,.]\d{3}|\d{2}:\d{2}\.\d{3})(?:\s+.*)?$")


def milliseconds(value: str) -> int:
    parts = value.replace(',', '.').split(':')
    seconds, fraction = parts[-1].split('.')
    minutes = int(parts[-2])
    hours = int(parts[-3]) if len(parts) == 3 else 0
    if minutes >= 60 or int(seconds) >= 60:
        raise ValueError('Invalid subtitle timestamp.')
    return ((hours * 60 + minutes) * 60 + int(seconds)) * 1000 + int(fraction)


def parse_subtitles(content: str) -> list[dict]:
    if not content or len(content) > 500_000:
        raise ValueError('Subtitle file must contain at most 500,000 characters.')
    content = content.lstrip('\ufeff').replace('\r\n', '\n').replace('\r', '\n')
    blocks = re.split(r'\n[ \t]*\n', content.strip())
    if blocks and blocks[0].startswith('WEBVTT'):
        blocks.pop(0)
    digest = hashlib.sha256(content.encode()).hexdigest()[:16]
    cues = []
    for block in blocks:
        lines = block.split('\n')
        if (lines[0] == 'NOTE' or lines[0].startswith(('NOTE ', 'STYLE', 'REGION'))):
            continue
        pos = 0 if '-->' in lines[0] else 1
        if pos >= len(lines):
            raise ValueError('Invalid subtitle cue.')
        match = TIMING.fullmatch(lines[pos].strip())
        if not match or pos + 1 >= len(lines):
            raise ValueError('Invalid subtitle cue.')
        start, end = map(milliseconds, match.groups())
        text = '\n'.join(lines[pos + 1:])
        if end <= start or not text.strip():
            raise ValueError('Invalid subtitle cue.')
        cues.append({'id': f'{digest}:{len(cues)}', 'start_ms': start, 'end_ms': end, 'text': text})
        if len(cues) > 10000:
            raise ValueError('Subtitle file has too many cues.')
    if not cues:
        raise ValueError('Subtitle file contains no cues.')
    return cues

import asyncio
import os
import time
from urllib.parse import urljoin, urlsplit

import httpx
from fastapi import HTTPException

# shortcut: pacing is per process, use a shared limiter before multi-instance deployment.
_provider_lock = asyncio.Lock()
_last_request = 0.0


async def provider(method: str, url: str, **kwargs):
    global _last_request
    origin = urlsplit(url)
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            for _ in range(4):
                async with _provider_lock:
                    await asyncio.sleep(max(0, .26 - (time.monotonic() - _last_request)))
                    _last_request = time.monotonic()
                async with client.stream(method, url, **kwargs) as response:
                    if method == 'GET' and response.status_code in (301, 302, 303, 307, 308):
                        target = urlsplit(urljoin(str(response.request.url), response.headers.get('location', '')))
                        if (not response.headers.get('location') or target.scheme != 'https'
                            or target.hostname != origin.hostname or target.port not in (None, 443)
                            or target.username or target.password):
                            raise ValueError('unsafe redirect')
                        url = target.geturl()
                        kwargs.pop('params', None)
                        continue
                    response.raise_for_status()
                    content = bytearray()
                    async for chunk in response.aiter_bytes():
                        content.extend(chunk)
                        if len(content) > 1_000_000:
                            raise ValueError('response too large')
                    return httpx.Response(response.status_code, content=bytes(content))
            raise ValueError('too many redirects')
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, 'OpenSubtitles is unavailable or its download limit was reached. Upload an SRT/VTT file instead.') from None


def provider_headers():
    key = os.getenv('OPENSUBTITLES_API_KEY')
    if not key:
        raise HTTPException(503, 'OpenSubtitles is not configured. Upload an SRT/VTT file instead.')
    return {'Api-Key': key, 'User-Agent': 'Lingo v1.0'}


async def search_subtitles(query: str):
    response = await provider('GET', 'https://api.opensubtitles.com/api/v1/subtitles', headers=provider_headers(), params={'query': query, 'languages': 'ar', 'type': 'movie'})
    try:
        results = []
        for item in response.json()['data'][:30]:
            attributes = item['attributes']
            feature = attributes.get('feature_details') or {}
            for file in attributes.get('files', []):
                if isinstance(file.get('file_id'), int) and file['file_id'] > 0:
                    results.append({'id': file['file_id'], 'title': str(feature.get('title') or query)[:200], 'year': feature.get('year') if isinstance(feature.get('year'), int) else None, 'release': str(attributes.get('release') or file.get('file_name') or '')[:300]})
        return results[:30]
    except (ValueError, KeyError, TypeError):
        raise HTTPException(502, 'OpenSubtitles returned an invalid response.') from None


async def download_subtitles(file_id: int):
    response = await provider('POST', 'https://api.opensubtitles.com/api/v1/download', headers=provider_headers(), json={'file_id': file_id, 'sub_format': 'srt'})
    try:
        link = response.json()['link']
        parts = urlsplit(link)
        if parts.scheme != 'https' or not parts.hostname or not (parts.hostname == 'opensubtitles.com' or parts.hostname.endswith('.opensubtitles.com')) or parts.username or parts.password or parts.port not in (None, 443):
            raise ValueError('invalid download link')
        response = await provider('GET', link)
        return parse_subtitles(response.content.decode('utf-8-sig'))
    except (KeyError, TypeError, ValueError, UnicodeError):
        raise HTTPException(502, 'OpenSubtitles returned an invalid subtitle file. Upload SRT/VTT instead.') from None
