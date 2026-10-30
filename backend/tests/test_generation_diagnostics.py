"""Regression tests for real-provider failure diagnosis; no developer credentials."""

import json
import logging

import httpx
import pytest

from test_v1_contract import client, request_body


@pytest.fixture
def upstream(monkeypatch):
    for key, value in {
        "LLM_API_URL": "https://api.openai.com/v1/chat/completions",
        "LLM_API_KEY": "private-test-key",
        "LLM_MODEL": "gpt-6-luna",
    }.items():
        monkeypatch.setenv(key, value)
    state = {
        "status": 200,
        "body": {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": json.dumps(
                            {
                                "cards": [
                                    {"candidate_id": "c0", "meaning": "fixture meaning"}
                                ]
                            }
                        )
                    },
                }
            ]
        },
        "calls": [],
    }

    async def post(self, url, **kwargs):
        state["calls"].append(kwargs["json"])
        return httpx.Response(
            state["status"], request=httpx.Request("POST", url), json=state["body"]
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    return state


@pytest.mark.parametrize(
    "status,code,category,hint",
    [
        (401, "invalid_api_key", "provider_auth", "key"),
        (403, "permission_denied", "provider_permission", "access"),
        (404, "model_not_found", "provider_model", "model"),
        (429, "insufficient_quota", "provider_quota", "billing"),
        (429, "rate_limit_exceeded", "provider_rate_limit", "rate"),
        (400, "unsupported_parameter", "provider_request", "request"),
        (503, "unknown-private-error", "provider_unavailable", "unavailable"),
    ],
)
def test_http_failure_is_actionable_and_sanitized(
    upstream, caplog, status, code, category, hint
):
    upstream["status"] = status
    upstream["body"] = {
        "error": {
            "code": code,
            "param": "reasoning_effort",
            "message": "private-source private-test-key",
        }
    }
    with caplog.at_level(logging.WARNING):
        response = client.post("/api/generate", json=request_body())
    assert response.status_code == 502
    assert hint in response.json()["detail"].lower()
    assert f"category={category}" in caplog.text
    assert f"http_status={status}" in caplog.text
    assert len(upstream["calls"]) == 1
    for marker in ("private-source", "private-test-key", "unknown-private-error"):
        assert marker not in response.text + caplog.text


@pytest.mark.parametrize(
    "case,category",
    [
        ("schema", "output_schema"),
        ("json", "output_json"),
        ("grounding", "output_grounding"),
        ("envelope", "output_envelope"),
        ("truncated", "output_truncated"),
        ("refusal", "output_refusal"),
    ],
)
def test_response_failure_has_safe_category(upstream, caplog, case, category):
    message = upstream["body"]["choices"][0]["message"]
    if case == "schema":
        message["content"] = json.dumps(
            {"cards": [{"candidate_id": "c0", "meaning": " "}]}
        )
    elif case == "json":
        message["content"] = "private-source not json"
    elif case == "grounding":
        message["content"] = json.dumps(
            {
                "cards": [
                    {"candidate_id": "private-source", "meaning": "fixture meaning"}
                ]
            }
        )
    elif case == "envelope":
        upstream["body"] = {"choices": []}
    elif case == "truncated":
        upstream["body"]["choices"][0]["finish_reason"] = "length"
    else:
        message["refusal"] = "private-source refusal body"
    with caplog.at_level(logging.WARNING):
        response = client.post("/api/generate", json=request_body())
    assert response.status_code == 502
    assert f"category={category}" in caplog.text
    assert "private-source" not in caplog.text + response.text


def test_openai_uses_strict_schema_with_selected_reference_enum(upstream):
    response = client.post("/api/generate", json=request_body())
    assert response.status_code == 200
    fmt = upstream["calls"][0]["response_format"]
    assert fmt["type"] == "json_schema"
    assert fmt["json_schema"]["strict"] is True
    schema = fmt["json_schema"]["schema"]
    assert schema["additionalProperties"] is False
    item = schema["properties"]["cards"]["items"]
    assert set(item["required"]) == {"candidate_id", "meaning"}
    offered = json.loads(upstream["calls"][0]["messages"][1]["content"])[
        "source_candidates"
    ]
    assert item["properties"]["candidate_id"]["enum"] == [c["id"] for c in offered]
    first = response.json()["cards"][0]
    assert first["expression"] == offered[0]["expression"]
    assert first["segment_id"] == offered[0]["segment_id"]


def test_duplicate_candidate_still_rejects_entire_response(upstream, caplog):
    content = {"cards": [{"candidate_id": "c0", "meaning": "fixture"}] * 2}
    upstream["body"]["choices"][0]["message"]["content"] = json.dumps(content)
    with caplog.at_level(logging.WARNING):
        assert client.post("/api/generate", json=request_body()).status_code == 502
    assert "reason=duplicate_expression" in caplog.text


def test_model_cannot_override_bound_expression_or_source(upstream):
    content = {
        "cards": [
            {
                "candidate_id": "c0",
                "meaning": "fixture",
                "expression": "invented",
                "segment_id": "fake",
            }
        ]
    }
    upstream["body"]["choices"][0]["message"]["content"] = json.dumps(content)
    assert client.post("/api/generate", json=request_body()).status_code == 502
