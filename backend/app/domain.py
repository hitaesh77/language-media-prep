import hashlib
import re
from collections import Counter
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SourceInput(BaseModel):
    text: str = Field(min_length=1, max_length=20000)

    @field_validator("text")
    @classmethod
    def meaningful(cls, value: str) -> str:
        if not value.strip() or not re.search(r"[\u0621-\u064a]", value):
            raise ValueError("Supply a passage containing Arabic text.")
        return value


class Segment(BaseModel):
    id: str
    text: str


def parse_source(text: str) -> list[Segment]:
    # Keep source characters intact; only split at paragraph boundaries.
    digest = hashlib.sha256(text.encode()).hexdigest()[:16]
    return [
        Segment(id=f"{digest}:{i}", text=part)
        for i, part in enumerate(re.split(r"\r?\n\s*\r?\n", text))
        if part.strip()
    ]


class GenerateInput(SourceInput):
    segment_ids: list[str] = Field(min_length=1, max_length=100)
    proficiency: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    variety: Literal[
        "Modern Standard Arabic", "Egyptian", "Levantine", "Gulf", "Unspecified"
    ] = "Modern Standard Arabic"
    explanation_language: Literal["English", "Arabic", "Spanish"] = "English"
    mode: Literal["baseline", "llm"] = "baseline"

    @field_validator("segment_ids")
    @classmethod
    def unique_references(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)) or any(len(v) > 100 for v in values):
            raise ValueError("Supply unique, valid passage references.")
        return values


class Card(BaseModel):
    expression: str = Field(min_length=1, max_length=200)
    meaning: str = Field(min_length=1, max_length=1500)
    segment_id: str
    context: str = ""

    @field_validator("expression", "meaning")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Expressions and meanings must not be blank.")
        return value


class ModelOutput(BaseModel):
    cards: list[Card] = Field(min_length=1, max_length=15)


class PageReference(BaseModel):
    page: int = Field(ge=1, le=20)
    segmentIds: list[str]


class PDFResult(SourceInput):
    segments: list[Segment]
    pages: list[PageReference]


class GenerationResult(BaseModel):
    cards: list[Card] = Field(min_length=1, max_length=15)
    mode: Literal["baseline", "llm"]
    elapsed_ms: int = Field(ge=0)
    usage: dict[str, int] | None
    cost: None = None
    notice: str


def grounded(cards: list[Card], segments: list[Segment]) -> list[Card]:
    lookup = {segment.id: segment.text for segment in segments}
    seen = set()
    result = []
    for card in cards:
        source = lookup.get(card.segment_id)
        expression = card.expression.strip()
        # Arabic letter/mark boundaries prevent substring matches inside other words.
        pattern = (
            r"(?<![\u0621-\u065f\u0670-\u06ff])"
            + re.escape(expression)
            + r"(?![\u0621-\u065f\u0670-\u06ff])"
        )
        if (
            not source
            or not expression
            or not re.search(pattern, source)
            or expression in seen
        ):
            raise ValueError(
                "Generated cards contain an invalid source reference or expression."
            )
        seen.add(expression)
        result.append(
            card.model_copy(update={"expression": expression, "context": source})
        )
    return result


def baseline(segments: list[Segment], language: str) -> list[Card]:
    tokens = re.findall(
        r"[\u0621-\u064a][\u0621-\u065f\u0670-\u06ff]*",
        " ".join(s.text for s in segments),
    )
    stopwords = {
        "في",
        "من",
        "إلى",
        "على",
        "عن",
        "هذا",
        "هذه",
        "هو",
        "هي",
        "أن",
        "و",
        "ما",
        "لا",
        "كان",
    }
    ranked = Counter(word for word in tokens if len(word) > 2 and word not in stopwords)
    meaning = {
        "English": "Frequency baseline — meaning unavailable. Use contextual AI or look this up.",
        "Arabic": "اختيار حسب التكرار — المعنى غير متوفر.",
        "Spanish": "Selección por frecuencia: significado no disponible. Consulta un diccionario.",
    }[language]
    cards = []
    for word, _ in ranked.most_common(15):
        segment = next(
            s
            for s in segments
            if word
            in re.findall(r"[\u0621-\u064a][\u0621-\u065f\u0670-\u06ff]*", s.text)
        )
        cards.append(Card(expression=word, meaning=meaning, segment_id=segment.id))
    return grounded(cards, segments)
