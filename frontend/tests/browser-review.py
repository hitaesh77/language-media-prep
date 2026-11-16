"""October 30 review regression; uses only the isolated fixture backend."""

from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
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
        page.get_by_text("About browser storage", exact=True).click()
        expect(
            page.get_by_text("Original PDF files are not saved.", exact=False)
        ).to_be_visible()
        expect(page.get_by_role("img", name="Lingo", exact=True).first).to_be_visible()
        page.get_by_role("button", name="New set").click()
        page.get_by_label("Source name").fill("Review batches")
        words = ["\u0643\u0644\u0645\u0629" + chr(0x0621 + i) for i in range(40)]
        text = " ".join(words) + "." + "\n\n" + " ".join(words[:4]) + "."
        page.locator("textarea").fill(text)
        page.get_by_role("button", name="Continue").click()
        page.get_by_role("button", name="Use selected passages").click()
        expect(page.get_by_label("Nouns", exact=True)).to_be_checked()
        expect(page.get_by_label("Verbs", exact=True)).to_be_checked()
        expect(page.get_by_label("Adjectives", exact=True)).to_be_checked()
        expect(page.get_by_label("Roots", exact=True)).not_to_be_checked()
        expect(page.get_by_label("Prepositions", exact=True)).not_to_be_checked()
        for label in ["Nouns", "Verbs", "Adjectives"]:
            page.get_by_label(label, exact=True).uncheck()
        expect(
            page.get_by_role("button", name="Generate vocabulary", exact=True)
        ).to_be_disabled()
        page.get_by_label("Nouns", exact=True).check()
        page.get_by_label("Roots", exact=True).check()
        page.get_by_label("Flashcards per passage").select_option("custom")
        page.get_by_label("Your number per passage").fill("15")
        out = Path("tmp/browser")
        out.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(out / "review-customize.png"), full_page=True)
        page.get_by_role("button", name="Generate vocabulary", exact=True).click()
        expect(page.locator(".vocab-row")).to_have_count(19, timeout=30000)
        page.get_by_role("button", name="Start practice (19 words)").click()
        expect(page.locator(".practice-progress")).to_contain_text("1 / 10")
        expect(page.locator(".practice-source")).to_contain_text("Passage 1")
        page.get_by_role("button", name="Reveal meaning", exact=True).first.click()
        assert len(page.locator(".card-source").inner_text().split()) < 15
        page.screenshot(path=str(out / "review-practice.png"), full_page=True)
        for _ in range(10):
            page.locator(".flash-stage > button").last.click()
        expect(
            page.get_by_role("heading", name="Batch 1 of 3 complete")
        ).to_be_visible()
        page.get_by_role("button", name="Next batch", exact=True).click()
        expect(page.locator(".practice-progress")).to_contain_text("1 / 5")
        for _ in range(5):
            page.locator(".flash-stage > button").last.click()
        page.get_by_role("button", name="Next batch", exact=True).click()
        expect(page.locator(".practice-source")).to_contain_text("Passage 2")
        expect(page.locator(".practice-progress")).to_contain_text("1 / 4")
        for _ in range(4):
            page.locator(".flash-stage > button").last.click()
        expect(page.get_by_role("button", name="Next batch", exact=True)).to_have_count(
            0
        )
        page.get_by_role("button", name="Back to set", exact=True).click()
        page.get_by_role("button", name="Edit settings", exact=True).click()
        expect(page.get_by_label("Roots", exact=True)).to_be_checked()
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth"
        )
        page.screenshot(path=str(out / "review-mobile.png"), full_page=True)
        page.get_by_role("button", name="Go home", exact=True).click()
        page.reload()
        page.locator(".set-card").filter(has_text="Review batches").click()
        page.get_by_role("button", name="Edit settings", exact=True).click()
        expect(page.get_by_label("Roots", exact=True)).to_be_checked()
        assert not errors, errors
        browser.close()
        print(
            "Review categories, context, batch boundaries, persistence and mobile checks passed"
        )
