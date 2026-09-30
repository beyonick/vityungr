"""Готовит фото работ для сайта: срезает белую подложку, уменьшает и пишет src/data/catalog.json.

Вход:  works/catalog.json и works/originals|prints/** (результат tools/scrape_tilda.py)
Выход: src/assets/works/**.jpg и src/data/catalog.json

Запуск: python tools/prepare_images.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "works"
OUT_IMG = ROOT / "src" / "assets" / "works"
OUT_DATA = ROOT / "src" / "data" / "catalog.json"

MAX_SIDE = 1600
QUALITY = 84
WHITE = 244  # всё светлее считаем подложкой


def has_white_frame(gray):
    w, h = gray.size
    bands = [
        gray.crop((0, 0, w, max(2, h // 40))),
        gray.crop((0, h - max(2, h // 40), w, h)),
        gray.crop((0, 0, max(2, w // 40), h)),
        gray.crop((w - max(2, w // 40), 0, w, h)),
    ]
    white = 0
    for b in bands:
        s = ImageStat.Stat(b)
        if s.mean[0] > 235 and s.stddev[0] < 8:
            white += 1
    return white >= 2


def content_box(gray):
    """Рамка по строкам и столбцам, где заметная доля пикселей не белая."""
    w, h = gray.size
    mask = gray.point(lambda v: 255 if v < WHITE else 0)
    cols = [0] * w
    rows = [0] * h
    px = mask.load()
    step = 2
    for y in range(0, h, step):
        for x in range(0, w, step):
            if px[x, y]:
                cols[x] += 1
                rows[y] += 1
    col_min = max(3, h // step // 150)
    row_min = max(3, w // step // 150)
    xs = [x for x, c in enumerate(cols) if c >= col_min]
    ys = [y for y, c in enumerate(rows) if c >= row_min]
    if not xs or not ys:
        return None
    return xs[0], ys[0], min(w, xs[-1] + step), min(h, ys[-1] + step)


def process(rel, dest):
    im = Image.open(SRC / rel)
    im = ImageOps.exif_transpose(im).convert("RGB")
    gray = im.convert("L")
    cutout = False
    if has_white_frame(gray):
        box = content_box(gray)
        if box:
            x0, y0, x1, y1 = box
            if (x1 - x0) < im.width * 0.985 or (y1 - y0) < im.height * 0.985:
                im = im.crop(box)
                cutout = True
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return {"w": im.width, "h": im.height, "cutout": cutout}


def main():
    data = json.loads((SRC / "catalog.json").read_text(encoding="utf-8"))
    for group in ("originals", "prints"):
        for item in data[group]:
            images = []
            for rel in item["files"]:
                dest_rel = Path(rel)  # originals/<серия>/<работа>/NN.jpg или prints/<тип>/<принт>/NN.jpg
                meta = process(rel, OUT_IMG / dest_rel)
                images.append({"src": dest_rel.as_posix(), **meta})
            item["images"] = images
            for k in ("files", "folder"):
                item.pop(k, None)
    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUT_DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    n = sum(len(i["images"]) for g in ("originals", "prints") for i in data[g])
    cut = sum(im["cutout"] for g in ("originals", "prints") for i in data[g] for im in i["images"])
    print(f"images: {n}, trimmed: {cut}")


if __name__ == "__main__":
    main()
