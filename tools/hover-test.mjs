// Проверка картин: навести — картина выезжает снизу экрана; клик — просмотр на весь экран; Esc — закрыть.
// Скриншоты каждого шага. node tools/hover-test.mjs <url> <outDir> [scrollY]
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const [url = "http://127.0.0.1:4321/", out = "shots", y = "0"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.evaluate((y) => window.scrollTo(0, Number(y)), y);
await new Promise((r) => setTimeout(r, 3500));
const shot = (name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 75 });
const state = () =>
  page.evaluate(() => ({
    peek: getComputedStyle(document.querySelector("[data-peek]")).visibility,
    viewer: !document.querySelector("[data-viewer]").hidden,
  }));

// первая картина, целиком видимая на экране
const box = await page.evaluate(() => {
  const img = [...document.querySelectorAll("img[data-art]")].find((i) => {
    const r = i.getBoundingClientRect();
    return r.top > 60 && r.bottom < innerHeight - 60 && r.width > 150;
  });
  const r = img.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: img.dataset.artTitle };
});
await page.mouse.move(box.x - 300, box.y - 200);
await page.mouse.move(box.x, box.y, { steps: 8 });
await new Promise((r) => setTimeout(r, 1000));
await shot("1-hover-peek");
const s1 = await state();
await page.mouse.click(box.x, box.y);
await new Promise((r) => setTimeout(r, 1200));
await shot("2-viewer");
const s2 = await state();
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 1000));
const s3 = await state();
console.log(JSON.stringify({ target: box.t, hover: s1, click: s2, escape: s3, errors }));
await browser.close();
