"""Fifty-card real-route smoke using credential-free fixture server only."""

from pathlib import Path
import sys
from unittest.mock import patch
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
patch("dotenv.load_dotenv", return_value=False).start()
sys.path.insert(0, str(root / "backend"))
sys.path.insert(0, str(root / "backend/tests"))
from test_v1_contract import TEXT

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route(
        "**/api/**",
        lambda route: route.fulfill(
            response=route.fetch(
                url="http://127.0.0.1:8765" + urlsplit(route.request.url).path
            )
        ),
    )
    page.goto("http://localhost:3100")
    page.get_by_role("button", name="New set").click()
    page.get_by_label("Source name").fill("Fifty-card set")
    page.get_by_label("Arabic source text").fill(
        "\n\n".join([TEXT.split("\n\n")[0]] * 10)
    )
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_role("button", name="Use selected passages").click()
    page.get_by_label("Flashcards per passage").select_option("5")
    expect(page.get_by_label("Flashcards per passage")).to_contain_text("5 per passage")
    page.get_by_role("button", name="Generate vocabulary", exact=True).click()
    expect(page.locator(".vocab-row")).to_have_count(50, timeout=30000)
    expect(page.locator(".passage-label").last).to_contain_text("Passage 10")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(root / "tmp/browser/fifty-cards-mobile.png"))
    page.get_by_role("button", name="Go home", exact=True).click()
    page.reload()
    page.locator(".set-card").filter(has_text="Fifty-card set").click()
    expect(page.locator(".vocab-row")).to_have_count(50)
    page.get_by_role("button", name="Start practice (50 words)").click()
    expect(page.locator(".practice-source")).to_have_text("Passage 1")
    for _ in range(5):
        page.get_by_role("button", name="Next card", exact=True).click()
    expect(page.locator(".practice-source")).to_have_text("Passage 2")
    assert not errors, errors
    browser.close()
print(
    "50-card generation, passage labels, persistence, practice and mobile checks passed; fixture only."
)
