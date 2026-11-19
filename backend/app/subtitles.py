"""Parse SRT and WebVTT cue text without changing the Arabic characters."""
import hashlib
import logging
import re

TIMING = re.compile(r"^(\d{2,}:\d{2}:\d{2}[,.]\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2,}:\d{2}:\d{2}[,.]\d{3}|\d{2}:\d{2}\.\d{3})(?:\s+.*)?$")


class InvalidCue(ValueError):
    def __init__(self, block, reason, shape=None):
        super().__init__('Invalid subtitle cue.')
        self.block = block
        self.reason = reason
        self.shape = shape


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
    parts = re.split(r'(\n[ \t]*\n)', content.strip())
    digest = hashlib.sha256(content.encode()).hexdigest()[:16]
    cues = []
    separator = ''
    for index in range(0, len(parts), 2):
        block = parts[index]
        if not block:
            separator += parts[index + 1] if index + 1 < len(parts) else ''
            continue
        block_number = index // 2 + 1
        lines = block.split('\n')
        if index == 0 and lines[0].startswith('WEBVTT'):
            separator = parts[index + 1] if index + 1 < len(parts) else ''
            continue
        if (lines[0] == 'NOTE' or lines[0].startswith(('NOTE ', 'STYLE', 'REGION'))):
            separator = parts[index + 1] if index + 1 < len(parts) else ''
            continue
        if cues and not lines[0].strip().isdigit() and '-->' not in block:
            cues[-1]['text'] += separator + block
            separator = parts[index + 1] if index + 1 < len(parts) else ''
            continue
        pos = 0 if '-->' in lines[0] else 1
        if pos >= len(lines):
            raise InvalidCue(block_number, 'missing_timing')
        match = TIMING.fullmatch(lines[pos].strip())
        if not match:
            shape = ''.join('9' if char.isdigit() else char if char in ':,.-> ' else 'x' for char in lines[pos].strip()[:100])
            raise InvalidCue(block_number, 'invalid_timing_format', shape)
        if pos + 1 >= len(lines):
            raise InvalidCue(block_number, 'missing_text')
        start, end = map(milliseconds, match.groups())
        text = '\n'.join(lines[pos + 1:])
        if end <= start:
            raise InvalidCue(block_number, 'invalid_duration')
        if not text.strip():
            raise InvalidCue(block_number, 'empty_text')
        cues.append({'id': f'{digest}:{len(cues)}', 'start_ms': start, 'end_ms': end, 'text': text})
        separator = parts[index + 1] if index + 1 < len(parts) else ''
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

logger = logging.getLogger(__name__)

# shortcut: pacing is per process, use a shared limiter before multi-instance deployment.
_provider_lock = asyncio.Lock()
_last_request = 0.0


async def provider(method: str, url: str, **kwargs):
    global _last_request
    origin = urlsplit(url)
    stage = 'search' if origin.path.endswith('/subtitles') else ('download_request' if method == 'POST' else 'download_file')
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
                        if not target.query:
                            target = target._replace(query=urlsplit(str(response.request.url)).query)
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
    except (httpx.HTTPError, ValueError) as exc:
        status = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
        reason = str(exc) if isinstance(exc, ValueError) and str(exc) in ('unsafe redirect', 'response too large', 'too many redirects') else type(exc).__name__
        logger.warning('subtitle_provider_failure stage=%s reason=%s status=%s', stage, reason, status)
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
    except (KeyError, TypeError, ValueError):
        logger.warning('subtitle_download_failure stage=download_link reason=invalid_response_or_link')
        raise HTTPException(502, 'OpenSubtitles returned an invalid subtitle file. Upload SRT/VTT instead.') from None
    response = await provider('GET', link)
    try:
        return parse_subtitles(response.content.decode('utf-8-sig'))
    except UnicodeError:
        logger.warning('subtitle_download_failure stage=decode reason=invalid_utf8')
        raise HTTPException(502, 'OpenSubtitles returned an invalid subtitle file. Upload SRT/VTT instead.') from None
    except InvalidCue as exc:
        logger.warning('subtitle_download_failure stage=parse reason=%s block=%s timing_shape=%s', exc.reason, exc.block, exc.shape)
        raise HTTPException(502, 'OpenSubtitles returned an invalid subtitle file. Upload SRT/VTT instead.') from None
    except ValueError as exc:
        logger.warning('subtitle_download_failure stage=parse reason=%s', str(exc))
        raise HTTPException(502, 'OpenSubtitles returned an invalid subtitle file. Upload SRT/VTT instead.') from None
