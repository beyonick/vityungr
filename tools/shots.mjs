// Скриншоты страницы по ходу скролла — для визуальной проверки.
// node tools/shots.mjs [url] [outDir] [--mobile] [--reduced]
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [url = "http://127.0.0.1:4321/", out = "shots"] = args.filter((a) => !a.startsWith("--"));
const mobile = flags.has("--mobile");
const wide = flags.has("--wide");
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport(
  mobile
    ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : wide
      ? { width: 2560, height: 1300, deviceScaleFactor: 1 }
      : { width: 1440, height: 900, deviceScaleFactor: 1 },
);
if (flags.has("--reduced")) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(url, { waitUntil: "networkidle0", timeout: 120000 });
await new Promise((r) => setTimeout(r, 2600));

const vh = page.viewport().height;
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const prefix = mobile ? "m" : wide ? "w" : "d";
let i = 0;
for (let y = 0; y < total; y += Math.round(vh * 0.85)) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: `${out}/${prefix}-${String(i++).padStart(2, "0")}.jpg`, type: "jpeg", quality: 70 });
}
console.log(JSON.stringify({ shots: i, total, errors }));
await browser.close();
