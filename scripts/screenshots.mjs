// Renders the demo page with the fake hass at a fixed time and saves the README screenshots.
// Usage: npm run screenshots
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = serve();
const port = server.address()?.port ?? 8768;
const browser = await chromium.launch();
const time = new Date();
time.setHours(11, 20, 0, 0);

const shots = [
  { file: "card", scenario: "pv", lang: "de" },
  { file: "card-grid", scenario: "grid", lang: "de" },
  { file: "card-en", scenario: "home", lang: "en" },
  { file: "card-blocked", scenario: "blocked", lang: "de" },
  { file: "card-forced", scenario: "forced", lang: "de" },
];
try {
  for (const shot of shots) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({
        viewport: { width: 1100, height: 1400 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
      });
      await page.clock.setFixedTime(time);
      await page.goto(`http://127.0.0.1:${port}/demo/?scenario=${shot.scenario}&lang=${shot.lang}`);
      const card = page.locator(`#${theme} tibber-battery-card`).first();
      await card.locator(".chart").waitFor();
      const box = page.locator(`#${theme}`);
      await box.evaluate((el) => {
        el.style.padding = "16px";
        el.style.width = "512px";
      });
      const path = `${root}screenshots/${shot.file}-${theme}.png`;
      await card.screenshot({ path, omitBackground: false });
      console.log(`saved screenshots/${shot.file}-${theme}.png`);
      if (shot.file === "card") {
        await page
          .locator(`#${theme} tibber-battery-mini-card`)
          .first()
          .screenshot({ path: `${root}screenshots/mini-${theme}.png` });
        console.log(`saved screenshots/mini-${theme}.png`);
        await page.setViewportSize({ width: 760, height: 2600 });
        await card.locator("[data-open]").click();
        const detail = page.locator("tibber-battery-dialog tibber-battery-card");
        await detail.locator(".hchart").first().waitFor();
        await detail.screenshot({ path: `${root}screenshots/popup-${theme}.png` });
        console.log(`saved screenshots/popup-${theme}.png`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
