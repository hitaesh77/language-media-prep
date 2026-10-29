"""One-time fixture authoring helper; requires Playwright/Chromium, not runtime.

Public-domain text written for this test. No uploaded/private source material.
"""

from pathlib import Path
from playwright.sync_api import sync_playwright

PARAGRAPHS = [
    "ذَهَبَ الطالب إلى المكتبة لقراءة كتاب جديد.",
    "في المكتبة وجد الطالب قصة جميلة عن السفر.",
    "قرأ الطالب ثلاث صفحات، ثم كتب ملاحظات قصيرة.",
]


if __name__ == "__main__":
    destination = Path(__file__).parent / "fixtures"
    destination.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 800, "height": 700}, device_scale_factor=1
        )
        page.set_content(
            '<html lang="ar" dir="rtl"><meta charset="utf-8"><style>'
            "@page {size:A5; margin:20mm} body {font-family:Arial; font-size:22px;line-height:2}"
            "section {break-before:page} section:first-child {break-before:auto}"
            "</style><body>"
            + "".join("<section><p>" + text + "</p></section>" for text in PARAGRAPHS)
            + "</body></html>"
        )
        page.evaluate("document.fonts.ready")
        page.pdf(
            path=str(destination / "arabic-browser.pdf"), prefer_css_page_size=True
        )
        browser.close()
