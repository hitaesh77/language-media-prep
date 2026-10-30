"""Per-passage generation contracts; no credentials or paid requests."""

import asyncio
import json
import httpx
import pytest
from test_v1_contract import client, TEXT


@pytest.fixture
def passages_provider(monkeypatch):
    for key, value in {
        "LLM_API_URL": "https://api.openai.com/v1/chat/completions",
        "LLM_API_KEY": "fixture",
        "LLM_MODEL": "fixture",
    }.items():
        monkeypatch.setenv(key, value)
    state = {"calls": [], "active": 0, "peak": 0, "fail": False}

    async def post(self, url, **kwargs):
        data = json.loads(kwargs["json"]["messages"][1]["content"])
        state["calls"].append(data)
        state["active"] += 1
        state["peak"] = max(state["peak"], state["active"])
        try:
            await asyncio.sleep(0.001)
            if state["fail"]:
                return httpx.Response(500, request=httpx.Request("POST", url))
            candidates = data["source_candidates"][
                : data["settings"]["cards_per_passage"]
            ]
            return httpx.Response(
                200,
                request=httpx.Request("POST", url),
                json={
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "cards": [
                                            {
                                                "candidate_id": c["id"],
                                                "meaning": "fixture meaning",
                                            }
                                            for c in candidates
                                        ]
                                    }
                                )
                            }
                        }
                    ],
                    "usage": {"total_tokens": 7},
                },
            )
        finally:
            state["active"] -= 1

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    return state


def body(n=10, count=5):
    text = "\n\n".join([TEXT.split("\n\n")[0]] * n)
    segments = client.post("/api/segments", json={"text": text}).json()
    return {
        "text": text,
        "segment_ids": [s["id"] for s in segments],
        "mode": "llm",
        "cards_per_passage": count,
    }


def test_ten_passages_five_each_returns_fifty_grounded_cards(passages_provider):
    request = body()
    response = client.post("/api/generate", json=request)
    assert response.status_code == 200
    result = response.json()
    assert len(result["cards"]) == 50
    for source_id in request["segment_ids"]:
        cards = [c for c in result["cards"] if c["segment_id"] == source_id]
        assert len(cards) == 5
        assert len({c["expression"] for c in cards}) == 5
        assert all(c["context"] == request["text"].split("\n\n")[0] for c in cards)
    assert len(passages_provider["calls"]) == 10
    assert all(len(c["source_data"]) == 1 for c in passages_provider["calls"])
    assert passages_provider["peak"] <= 3
    assert result["usage"]["total_tokens"] == 70
    assert "Passage 10: 5 of 5" in result["notice"]


def test_large_budget_rejected_before_provider(passages_provider):
    assert client.post("/api/generate", json=body(21, 15)).status_code == 422
    assert not passages_provider["calls"]


def test_passage_failure_returns_no_partial_set(passages_provider):
    passages_provider["fail"] = True
    response = client.post("/api/generate", json=body(4, 5))
    assert response.status_code == 502
    assert "cards" not in response.json()
