// Скачивает веб-версии фото работ из публичного бакета Selectel в src/assets/works.
// Список файлов берётся из src/data/catalog.json; уже скачанные пропускаются.
// Адрес бакета — переменная MEDIA_URL, например https://<id>.selstorage.ru
// Запускается сам перед npm run build (prebuild).
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "assets", "works");
const base = (process.env.MEDIA_URL || "").replace(/\/+$/, "");

const catalog = JSON.parse(await readFile(join(root, "src", "data", "catalog.json"), "utf8"));
const files = [...catalog.originals, ...catalog.prints].flatMap((item) => item.images.map((im) => im.src));

const exists = (p) => stat(p).then(() => true, () => false);
const missing = [];
for (const src of files) if (!(await exists(join(outDir, src)))) missing.push(src);

if (!missing.length) {
  console.log(`media: все ${files.length} фото на месте`);
  process.exit(0);
}
if (!base) {
  console.error(`media: не хватает ${missing.length} фото, а MEDIA_URL не задан`);
  process.exit(1);
}

let done = 0;
async function worker() {
  while (missing.length) {
    const src = missing.shift();
    const res = await fetch(`${base}/works/${src}`);
    if (!res.ok) throw new Error(`${res.status} ${base}/works/${src}`);
    const dest = join(outDir, src);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    done++;
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`media: скачано ${done}, всего ${files.length}`);
