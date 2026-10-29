"""Never load developer credentials or contact a real model during tests."""

import os
from unittest.mock import patch

import httpx
import pytest

# Must run before test modules import app.main (which normally loads local .env).
patch("dotenv.load_dotenv", return_value=False).start()
for name in ("LLM_API_URL", "LLM_API_KEY", "LLM_MODEL"):
    os.environ.pop(name, None)
os.environ["FRONTEND_ORIGINS"] = "http://localhost:3000"


@pytest.fixture(autouse=True)
def block_live_provider(monkeypatch):
    async def blocked(*args, **kwargs):
        raise AssertionError("Live model requests are forbidden in tests.")

    monkeypatch.setattr(httpx.AsyncClient, "post", blocked)
