from app.candidates import MAX_CANDIDATES, source_candidates
from app.domain import Card, grounded, parse_source


def test_candidates_preserve_clitics_marks_whitespace_and_source():
    text = "وَبِالْمَكْتَبَةِ  قرأ الطالب كتابا.\n\nقرأ الطالب قصة جميلة."
    segments = parse_source(text)
    candidates = source_candidates(segments)
    expressions = [c.expression for c in candidates]
    assert "وَبِالْمَكْتَبَةِ" in expressions
    assert "بِالْمَكْتَبَةِ" not in expressions
    assert "وَبِالْمَكْتَبَةِ  قرأ" in expressions
    assert "كتابا.\n\nقرأ" not in expressions
    assert len(expressions) == len(set(expressions))
    for c in candidates:
        assert grounded(
            [Card(expression=c.expression, meaning="fixture", segment_id=c.segment_id)],
            segments,
        )


def test_large_candidate_pool_is_bounded_deterministic_and_covers_source_positions():
    text = " ".join(
        "كلمة" + chr(0x0621 + i % 40) + chr(0x0621 + i // 40) for i in range(300)
    )
    segments = parse_source(text + "\n\nقرأ الطالب قصة جميلة")
    candidates = source_candidates(segments)
    assert 1 <= len(candidates) <= MAX_CANDIDATES
    assert candidates == source_candidates(segments)
    assert {c.segment_id for c in candidates} == {s.id for s in segments}
    assert any(" " in c.expression for c in candidates)
