"""Local browser-test server using real FastAPI routes and a fake LLM boundary.

Never reads .env or sends a paid provider request. Not a deployment entrypoint.
Run from backend/: python tests/serve_integration.py
"""

import json
import os
from pathlib import Path
import re
import sys
from unittest.mock import patch

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
patch("dotenv.load_dotenv", return_value=False).start()
os.environ.update(
    {
        "LLM_API_URL": "https://fixture.invalid/chat/completions",
        "LLM_API_KEY": "fixture-only-not-a-real-key",
        "LLM_MODEL": "fixture-model",
        "FRONTEND_ORIGINS": "http://localhost:3100",
    }
)


async def fake_post(self, url, **kwargs):
    data = json.loads(kwargs["json"]["messages"][1]["content"])
    source = data["source_data"][0]
    words = list(dict.fromkeys(re.findall(r"[\u0621-\u065f]+", source["text"])))[
        : data["settings"].get("cards_per_passage", 2)
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
                                        "expression": word,
                                        "meaning": f"Fixture meaning {i+1}",
                                        "segment_id": source["id"],
                                    }
                                    for i, word in enumerate(words)
                                ]
                            },
                            ensure_ascii=False,
                        )
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150,
            },
        },
    )


if __name__ == "__main__":
    with patch.object(httpx.AsyncClient, "post", fake_post):
        from app.main import app

        uvicorn.run(app, host="127.0.0.1", port=8765)
