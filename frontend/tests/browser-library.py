"""Local-only library styling/star regression; fixtures are not application seeds."""

from pathlib import Path
from playwright.sync_api import sync_playwright, expect

if __name__ == "__main__":
    text = "\u0642\u0631\u0623 \u0627\u0644\u0637\u0627\u0644\u0628 \u0643\u062a\u0627\u0628\u0627."
    sets = []
    for i, name in enumerate(
        ["The Old Library", "A passage from Cairo", "The Journey"]
    ):
        sets.append(
            {
                "id": f"visual-{i}",
                "name": name,
                "type": "Pasted text" if i == 1 else "PDF",
                "text": text,
                "segments": [{"id": "source:0", "text": text}],
                "selected": ["source:0"],
                "preferences": {
                    "level": "Intermediate",
                    "variety": "Modern Standard Arabic (MSA)",
                    "language": "English",
                },
                "vocabulary": [
                    {
                        "id": "word:0",
                        "expression": text.split()[1],
                        "meaning": "Fixture meaning",
                        "sourceId": "source:0",
                        "context": text,
                        "familiar": False,
                    }
                ],
                "createdAt": "2026-11-16T12:00:00Z",
                "starred": i == 2,
                "generation": {
                    "mode": "llm",
                    "elapsedMs": 1,
                    "usage": None,
                    "cost": None,
                    "notice": "Fixture-only vocabulary for visual testing.",
                },
            }
        )
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 1440, "height": 1000}, device_scale_factor=1
        )
        page.route("**/api/**", lambda route: route.abort())
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://localhost:3100")
        page.evaluate(
            "sets => localStorage.setItem('sahih-sets-v1', JSON.stringify(sets))", sets
        )
        page.reload()
        expect(page.locator(".set-entry")).to_have_count(3)
        assert page.locator("body").evaluate(
            "el => getComputedStyle(el).backgroundImage.includes('hills-wallpaper.webp')"
        )
        assert page.locator(".library-panel").evaluate(
            "el => parseFloat(getComputedStyle(el).borderRadius) <= 2"
        )
        assert (
            page.locator(".library-sidebar").bounding_box()["x"]
            > page.locator(".library-panel").bounding_box()["x"]
        )
        out = Path("tmp/browser")
        out.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(out / "library-desktop.png"), full_page=True)
        page.get_by_role("button", name="Star The Old Library", exact=True).click()
        expect(
            page.get_by_role("button", name="Unstar The Old Library", exact=True)
        ).to_have_attribute("aria-pressed", "true")
        page.reload()
        page.get_by_role("button", name="Starred 2", exact=True).click()
        expect(page.locator(".set-entry")).to_have_count(2)
        page.get_by_role("button", name="Unstar The Old Library", exact=True).click()
        expect(page.locator(".set-entry")).to_have_count(1)
        page.get_by_role("button", name="Delete The Journey", exact=True).click()
        page.get_by_role("button", name="Cancel", exact=True).click()
        expect(page.locator(".set-entry")).to_have_count(1)
        page.get_by_role("button", name="Delete The Journey", exact=True).click()
        page.get_by_role("button", name="Delete", exact=True).click()
        expect(page.get_by_text("No starred sets yet.", exact=True)).to_be_visible()
        page.get_by_role("button", name="View all sets", exact=True).click()
        expect(page.locator(".set-entry")).to_have_count(2)
        page.get_by_role("button", name="Star The Old Library", exact=True).click()
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth"
        )
        page.screenshot(path=str(out / "library-mobile.png"), full_page=True)
        page.get_by_text("About browser storage", exact=True).click()
        expect(
            page.get_by_text("Original PDF files are not saved.", exact=False)
        ).to_be_visible()
        page.get_by_role("button", name="New set", exact=True).click()
        expect(page.get_by_label("Arabic source text", exact=True)).to_be_visible()
        assert page.evaluate(
            "document.documentElement.scrollWidth <= window.innerWidth"
        )
        page.screenshot(path=str(out / "library-content-mobile.png"), full_page=True)
        assert not errors, errors
        browser.close()
        print(
            "Library desktop/mobile, stars, refresh, unstar, deletion, storage and New set passed"
        )
