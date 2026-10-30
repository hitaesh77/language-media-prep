"""Bounded exact-source candidates for model selection, not meaning generation."""

from dataclasses import dataclass
import math
import re

from .domain import Segment

MAX_CANDIDATES = 512
MAX_WORDS = 4
WORD = re.compile(r"[\u0621-\u064a][\u0621-\u065f\u0670-\u06ff]*")


@dataclass(frozen=True)
class Candidate:
    id: str
    expression: str
    segment_id: str


def source_candidates(segments: list[Segment]) -> list[Candidate]:
    # Keep exact characters and whitespace. Do not stem, normalize or detach clitics.
    bins = []
    seen = set()
    for segment in segments:
        words = list(WORD.finditer(segment.text))
        for length in range(1, MAX_WORDS + 1):
            bucket = []
            for start in range(len(words) - length + 1):
                span = words[start : start + length]
                if any(
                    not segment.text[a.end() : b.start()].isspace()
                    for a, b in zip(span, span[1:])
                ):
                    continue
                expression = segment.text[span[0].start() : span[-1].end()]
                if len(expression) > 200 or expression in seen:
                    continue
                seen.add(expression)
                bucket.append((expression, segment.id))
            if bucket:
                bins.append(bucket)
    all_candidates = [item for bucket in bins for item in bucket]
    if len(all_candidates) > MAX_CANDIDATES:
        # Spread the finite budget across passages, phrase lengths and positions.
        # This is provisional candidate coverage, not a proficiency ranking/baseline.
        rounds = max(2, math.ceil(MAX_CANDIDATES / len(bins)))
        spread, used = [], set()
        for i in range(rounds):
            for bucket in bins:
                item = bucket[i * (len(bucket) - 1) // (rounds - 1)]
                if item not in used:
                    spread.append(item)
                    used.add(item)
                if len(spread) == MAX_CANDIDATES:
                    break
            if len(spread) == MAX_CANDIDATES:
                break
        all_candidates = spread
    return [
        Candidate(f"c{i}", expression, segment_id)
        for i, (expression, segment_id) in enumerate(all_candidates)
    ]
