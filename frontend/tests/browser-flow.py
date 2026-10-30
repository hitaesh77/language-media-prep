"""Browser smoke test: real frontend/FastAPI, fixture model only.

Start backend/tests/serve_integration.py and Next dev on port 3100 with
NEXT_PUBLIC_API_URL=http://127.0.0.1:8765. Requires Python Playwright/Chromium.
No .env is loaded by this script; it must only target the fixture backend.
"""

from pathlib import Path
import json
import sys
from unittest.mock import patch
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
patch("dotenv.load_dotenv", return_value=False).start()
sys.path.insert(0, str(root / "backend"))
sys.path.insert(0, str(root / "backend/tests"))
from test_v1_contract import synthetic_pdf

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        # Route every API call to the credential-free fixture server, even when
        # the production build uses the normal localhost:8000 API default.
        page.route(
            "**/api/**",
            lambda route: route.fulfill(
                response=route.fetch(
                    url="http://127.0.0.1:8765" + urlsplit(route.request.url).path
                )
            ),
        )
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://localhost:3100")
        expect(page.get_by_text("Your next story starts here.")).to_be_visible()
        page.get_by_role("button", name="New set").click()
        expect(page.get_by_role("button", name="Go home", exact=True)).to_be_visible()
        page.get_by_label("Source name").fill("Browser text test")
        page.get_by_role("button", name="Try a sample").click()
        page.get_by_role("button", name="Continue").click()
        expect(page.get_by_role("heading", name="Choose your passage")).to_be_visible()
        expect(page.get_by_role("button", name="Go home", exact=True)).to_be_visible()
        page.locator(".passages input").nth(1).uncheck()
        page.get_by_role("button", name="Use selected passages").click()
        expect(page.get_by_role("button", name="Go home", exact=True)).to_be_visible()
        page.get_by_role("button", name="Advanced", exact=True).click()
        page.get_by_role("button", name="Egyptian Arabic", exact=True).click()
        page.get_by_role("button", name="Arabic", exact=True).click()
        expect(page.get_by_role("button", name="Spanish", exact=True)).to_have_count(0)
        page.get_by_label("Flashcards per passage").select_option("custom")
        page.get_by_label("Your number per passage").fill("2")
        page.get_by_role("button", name="Generate vocabulary", exact=True).click()
        expect(page.get_by_role("heading", name="Your vocabulary")).to_be_visible(
            timeout=20000
        )
        page.locator(".vocab-row input").first.check()
        page.get_by_role("button", name="Start practice (1 words)").click()
        expect(page.get_by_role("button", name="Go home", exact=True)).to_be_visible()
        page.get_by_role("button", name="Reveal meaning", exact=True).first.click()
        page.get_by_role("button", name="Finish review", exact=True).first.click()
        expect(page.locator(".completion")).to_be_visible()
        expect(page.get_by_role("button", name="Go home", exact=True)).to_be_visible()
        page.get_by_role("button", name="Lingo home").click()
        page.reload()
        page.locator(".set-card").filter(has_text="Browser text test").click()
        expect(page.locator(".vocab-row input").first).to_be_checked()
        page.get_by_role("button", name="Edit settings").click()
        # Provider error must preserve the saved set and give a path back.
        page.route(
            "**/api/generate",
            lambda route: route.fulfill(
                status=502,
                content_type="application/json",
                body=json.dumps({"detail": "Fixture provider failure"}),
            ),
        )
        page.get_by_role("button", name="Regenerate vocabulary").click()
        expect(page.locator('.error[role="alert"]')).to_contain_text(
            "Fixture provider failure"
        )
        page.unroute("**/api/generate")
        page.get_by_role("button", name="Regenerate vocabulary").click()
        expect(page.get_by_role("heading", name="Your vocabulary")).to_be_visible(
            timeout=20000
        )
        expect(page.locator(".vocab-row input").first).not_to_be_checked()
        page.get_by_role("button", name="Lingo home").click()
        page.get_by_role("button", name="New set").click()
        page.get_by_label("Source name").fill("Browser PDF test")
        page.get_by_role("button", name="Upload PDF", exact=True).click()
        pdf = synthetic_pdf("قرأ الطالب كتابا")
        page.get_by_label("Choose PDF").set_input_files(
            {"name": "source.pdf", "mimeType": "application/pdf", "buffer": pdf}
        )
        page.get_by_role("button", name="Continue").click()
        expect(page.get_by_role("heading", name="Choose your passage")).to_be_visible(
            timeout=25000
        )
        expect(page.get_by_text("Passage 1 · Page 1")).to_be_visible()
        page.get_by_role("button", name="Use selected passages").click()
        page.get_by_role("button", name="Generate vocabulary", exact=True).click()
        expect(page.get_by_role("heading", name="Your vocabulary")).to_be_visible(
            timeout=20000
        )
        try:
            page.wait_for_function(
                "JSON.parse(localStorage.getItem('sahih-sets-v1') || '[]').some(s => s.name === 'Browser PDF test')",
                timeout=15000,
            )
        except Exception:
            print(page.locator("main").inner_text())
            raise
        data = page.evaluate("JSON.parse(localStorage.getItem('sahih-sets-v1'))")
        assert len(data) == 2 and all(
            s.get("generation", {}).get("mode") == "llm" for s in data
        ), [(s["name"], s["type"], s.get("generation")) for s in data]
        assert data[-1]["pages"][0]["page"] == 1
        out = root / "tmp/browser"
        out.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(out / "desktop-vocabulary.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth"
        )
        page.screenshot(path=str(out / "mobile-vocabulary.png"), full_page=True)
        page.get_by_role("button", name="Go home", exact=True).click()
        page.get_by_role("button", name="Delete Browser PDF test", exact=True).click()
        page.get_by_role("button", name="Cancel", exact=True).click()
        expect(
            page.get_by_role("button", name="Delete Browser PDF test", exact=True)
        ).to_be_visible()
        page.get_by_role("button", name="Delete Browser PDF test", exact=True).click()
        page.get_by_role("button", name="Delete", exact=True).click()
        expect(
            page.get_by_role("button", name="Delete Browser PDF test", exact=True)
        ).to_have_count(0)
        page.reload()
        expect(
            page.get_by_role("button", name="Delete Browser PDF test", exact=True)
        ).to_have_count(0)
        page.get_by_role("button", name="Delete Browser text test", exact=True).click()
        page.get_by_role("button", name="Delete", exact=True).click()
        expect(page.get_by_text("Your next story starts here.")).to_be_visible()
        page.screenshot(path=str(out / "mobile-empty-home.png"), full_page=True)
        page.get_by_role("button", name="New set").click()
        page.get_by_role("button", name="Try a sample").click()
        page.get_by_role("button", name="Continue").click()
        page.get_by_role("button", name="Use selected passages").click()
        held = []
        page.route("**/api/generate", lambda route: held.append(route))
        page.get_by_role("button", name="Generate vocabulary", exact=True).click()
        expect(page.locator(".loading")).to_be_visible()
        page.get_by_role("button", name="Go home", exact=True).click()
        expect(page.get_by_text("Your next story starts here.")).to_be_visible()
        expect(page.locator(".loading")).to_have_count(0)
        for route in held:
            try:
                route.fulfill(status=499, body="Cancelled fixture request")
            except Exception:
                pass
        page.unroute_all(behavior="ignoreErrors")
        assert not errors, errors
        print(
            "Browser flow passed: fixture-backed text/PDF APIs, flashcards, persistence, regeneration, visible Home, confirmed/cancelled deletion, empty home and Home during loading. No paid calls."
        )
        browser.close()
