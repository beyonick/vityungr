"""Собирает каталог работ со старого сайта vityungr.website (Tilda) и скачивает фото.

Запуск: python tools/scrape_tilda.py
Результат: works/catalog.json, works/catalog.csv, works/originals/<серия>/<работа>/NN.jpg, works/prints/<принт>/NN.jpg
"""
import csv
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://vityungr.website"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
ROOT = Path(__file__).resolve().parent.parent / "works"

# slug серии -> адрес страницы на старом сайте
SERIES = {
    "montenegro": "/page88064756.html",
    "serbia": "/serbia",
    "bosnia": "/page88388866.html",
    "turkey": "/turkey",
    "tempera": "/page88950146.html",
    "altay": "/altay",
    "dacha": "/dacha",
    "moscow": "/urban",
    "random": "/random",
}
SALE = "/sale"
PRINTS = "/prints"

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def classes(self):
        return (self.attrs.get("class") or "").split()

    def iter(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.iter()

    def find_all(self, pred):
        return [n for n in self.iter() if pred(n)]

    def find(self, pred):
        return next((n for n in self.iter() if pred(n)), None)

    def text(self):
        out = []
        for c in self.children:
            out.append(c.text() if isinstance(c, Node) else c)
        return "".join(out)

    def lines(self):
        """Текст, разбитый по <br>."""
        out, cur = [], []
        for c in self.children:
            if isinstance(c, Node) and c.tag == "br":
                out.append("".join(cur)); cur = []
            else:
                cur.append(c.text() if isinstance(c, Node) else c)
        out.append("".join(cur))
        return [clean_text(s) for s in out if clean_text(s)]


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node("root", {})

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def clean_text(s):
    return re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def parse(html):
    b = TreeBuilder()
    b.feed(html)
    return b.root


def img_id(url):
    """https://static.tildacdn.pro/tildXXXX/name.jpg?x -> tildXXXX/name.jpg"""
    m = re.search(r"(tild[0-9a-f-]+/[^?#\"'\s]+)", url or "")
    return m.group(1) if m else None


def node_images(node):
    ids = []
    for n in node.iter():
        for key in ("data-original", "data-img-zoom-url", "content"):
            v = n.attrs.get(key)
            if v and "tildacdn" in v and re.search(r"\.(jpe?g|png|webp)(\?|$)", v, re.I):
                i = img_id(v)
                if i and i not in ids:
                    ids.append(i)
    return ids


def parse_page(path):
    root = parse(fetch(path))
    is_product = lambda n: "js-product" in n.classes
    cards = [n for n in root.find_all(is_product) if "t754__product-full" not in n.classes]
    popups = {n.attrs.get("data-product-lid"): n for n in root.find_all(is_product) if "t754__product-full" in n.classes}

    items = []
    for c in cards:
        name = c.find(lambda n: "t-name" in n.classes)
        descr = c.find(lambda n: "t-descr" in n.classes)
        prices = [clean_text(n.text()) for n in c.find_all(lambda n: "t754__price-value" in n.classes)]
        prices = [p for p in prices if p]
        mark = c.find(lambda n: any("mark" in k for k in n.classes))
        popup = popups.get(c.attrs.get("data-product-lid"))
        popup_descr = popup.find(lambda n: "t-descr" in n.classes) if popup else None
        items.append({
            "title": clean_text(name.text()) if name else "",
            "lines": descr.lines() if descr else [],
            "popup_text": popup_descr.lines() if popup_descr else [],
            "price": prices[0] if prices else "",
            "old_price": prices[1] if len(prices) > 1 else "",
            "mark": clean_text(mark.text()) if mark else "",
            "card_imgs": node_images(c),
            "popup_imgs": node_images(popup) if popup else [],
        })

    # Во всплывающих галереях старых страниц попадаются фото соседних работ —
    # выкидываем картинки, которые являются обложкой другой карточки.
    covers = [it["card_imgs"][0] for it in items if it["card_imgs"]]
    for it in items:
        own = it["card_imgs"][:1]
        gallery = list(it["card_imgs"])
        for i in it["popup_imgs"]:
            if i in gallery:
                continue
            if i in covers and i not in own:
                continue
            gallery.append(i)
        it["images"] = gallery
    return items


MEDIUM_RE = re.compile(r"(oil|tempera|gouache|watercolou?r|acrylic|printed)", re.I)
SIZE_RE = re.compile(r"(\d+)\s*[xх×]\s*(\d+)\s*(cm|in)?", re.I)


def describe(it):
    medium = size = ""
    exhibition = False
    status = None
    notes = []
    for ln in it["lines"]:
        up = ln.upper()
        if up in ("SOLD", "SOLD OUT"):
            status = "sold"
        elif up == "BOOKED":
            status = "reserved"
        elif ln.lower() == "exhibition work":
            exhibition = True
        elif MEDIUM_RE.search(ln) and not medium:
            medium = ln.rstrip(".")
            m = SIZE_RE.search(ln)
            if m and not size:
                size = f"{m.group(1)} x {m.group(2)} {m.group(3) or 'cm'}"
        elif SIZE_RE.search(ln) and not size:
            m = SIZE_RE.search(ln)
            size = f"{m.group(1)} x {m.group(2)} {m.group(3) or 'cm'}"
        else:
            notes.append(ln)
    if status is None:
        status = "available" if it["price"] else "archive"
    year = None
    m = re.search(r"\b(20\d\d)\b", it["title"])
    if m:
        year = int(m.group(1))
    title = re.sub(r"[.\s]*\b20\d\d\b\.?\s*$", "", it["title"]).strip(" .") or it["title"]
    return {
        "title": title if title != "-" else "Untitled",
        "year": year,
        "medium": medium,
        "size": size,
        "exhibition_work": exhibition,
        "status": status,  # available / reserved / sold / archive (не продаётся или без цены)
        "price_eur": int(it["price"]) if it["price"].isdigit() else None,
        "old_price_eur": int(it["old_price"]) if it["old_price"].isdigit() else None,
        "label": it["mark"] or None,  # NEW / SALE / RESTOCK
        "notes": notes,
        "images": it["images"],
    }


def slugify(s):
    s = s.lower()
    s = (s.replace("ç", "c").replace("ş", "s").replace("ı", "i").replace("ö", "o").replace("ü", "u")
         .replace("ğ", "g").replace("é", "e").replace("ć", "c").replace("č", "c").replace("š", "s").replace("ž", "z"))
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "untitled"


def main():
    works = {}  # ключ — обложка (id первой картинки)
    order = []

    for series, path in SERIES.items():
        print("page", series, file=sys.stderr)
        for it in parse_page(path):
            w = describe(it)
            if not w["images"]:
                continue
            key = w["images"][0]
            if key in works:
                continue
            w["series"] = series
            works[key] = w
            order.append(key)

    # На странице «Available works» у той же работы бывает другая обложка —
    # тогда ищем её по названию и размеру.
    def norm(s):
        return re.sub(r"[^a-z0-9]+", "", s.lower())

    def match(w):
        key = w["images"][0]
        if key in works:
            return key
        cands = [k for k, v in works.items() if norm(v["title"]) == norm(w["title"])]
        if w["size"]:
            sized = [k for k in cands if norm(works[k]["size"]) == norm(w["size"])]
            if len(sized) == 1:
                return sized[0]
            if sized:
                same = [k for k in sized if (works[k]["status"] == "available") == (w["status"] == "available")]
                cands = same or sized
            elif all(works[k]["size"] for k in cands):
                return None
        return cands[0] if len(cands) == 1 else None

    # Страница «Available works» — самые свежие цены и статусы, плюс новые работы без серии.
    print("page sale", file=sys.stderr)
    for it in parse_page(SALE):
        w = describe(it)
        if not w["images"]:
            continue
        key = match(w)
        if key:
            old = works[key]
            for f in ("status", "price_eur", "old_price_eur", "label"):
                if w[f] is not None or f == "label":
                    old[f] = w[f] if w[f] is not None else old[f]
            for i in w["images"]:
                if i not in old["images"]:
                    old["images"].append(i)
            old["on_sale_page"] = True
        else:
            w["series"] = "new"
            w["on_sale_page"] = True
            works[w["images"][0]] = w
            order.append(w["images"][0])

    print("page prints", file=sys.stderr)
    prints = []
    for it in parse_page(PRINTS):
        w = describe(it)
        title = w["title"]
        kind = "open"
        if title.lower().startswith("one-of-a-kind animation print"):
            kind = "animation"
            title = title[len("One-of-a-kind animation print"):].strip()
        elif title.lower().startswith("print club"):
            kind = "print-club"
            title = "Print Club: Monthly Best Work Print"
        if any("limited" in n.lower() or "back in stock" in n.lower() for n in w["notes"]):
            kind = "limited" if kind == "open" else kind
        left = None
        for n in w["notes"]:
            m = re.search(r"(\d+)\s+left", n)
            if m:
                left = int(m.group(1))
        prints.append({
            "title": title,
            "kind": kind,
            "paper": w["medium"],
            "edition_note": "; ".join(w["notes"]) or None,
            "left": left,
            "status": "sold out" if w["status"] == "sold" else ("available" if w["price_eur"] else "info"),
            "price_eur": w["price_eur"],
            "label": w["label"],
            "images": w["images"],
        })

    # Раскладываем по папкам
    used = set()
    jobs = []

    def place(base, slug, images):
        folder = slug
        n = 2
        while f"{base}/{folder}" in used:
            folder = f"{slug}-{n}"; n += 1
        used.add(f"{base}/{folder}")
        files = []
        for idx, i in enumerate(images, 1):
            ext = Path(i).suffix.lower().replace(".jpeg", ".jpg")
            rel = f"{base}/{folder}/{idx:02d}{ext}"
            files.append(rel)
            jobs.append((i, ROOT / rel))
        return f"{base}/{folder}", files

    catalog_works = []
    for key in order:
        w = works[key]
        folder, files = place(f"originals/{w['series']}", slugify(w["title"]), w["images"])
        w["folder"] = folder
        w["files"] = files
        w["source_images"] = [f"https://static.tildacdn.pro/{i}" for i in w.pop("images")]
        catalog_works.append(w)

    for p in prints:
        folder, files = place(f"prints/{p['kind']}", slugify(p["title"]), p["images"])
        p["folder"] = folder
        p["files"] = files
        p["source_images"] = [f"https://static.tildacdn.pro/{i}" for i in p.pop("images")]

    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / "catalog.json").write_text(
        json.dumps({"source": BASE, "originals": catalog_works, "prints": prints}, ensure_ascii=False, indent=2),
        encoding="utf-8")

    with open(ROOT / "catalog.csv", "w", newline="", encoding="utf-8-sig") as f:
        wr = csv.writer(f)
        wr.writerow(["type", "series", "title", "year", "medium", "size", "status", "price_eur", "old_price_eur", "label", "photos", "folder"])
        for w in catalog_works:
            wr.writerow(["original", w["series"], w["title"], w["year"] or "", w["medium"], w["size"], w["status"],
                         w["price_eur"] or "", w["old_price_eur"] or "", w["label"] or "", len(w["files"]), w["folder"]])
        for p in prints:
            wr.writerow(["print-" + p["kind"], "", p["title"], "", p["paper"], "", p["status"], p["price_eur"] or "", "",
                         p["label"] or "", len(p["files"]), p["folder"]])

    def download(job):
        i, dest = job
        if dest.exists() and dest.stat().st_size > 0:
            return 0
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(f"https://static.tildacdn.pro/{i}", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            dest.write_bytes(r.read())
        return dest.stat().st_size

    total = 0
    errors = []
    with ThreadPoolExecutor(8) as ex:
        for job, res in zip(jobs, ex.map(lambda j: _safe(download, j), jobs)):
            if isinstance(res, Exception):
                errors.append(f"{job[0]}: {res}")
            else:
                total += res
    print(f"originals: {len(catalog_works)}, prints: {len(prints)}, files: {len(jobs)}, "
          f"downloaded: {total / 1e6:.1f} MB, errors: {len(errors)}")
    for e in errors:
        print("  ", e)


def _safe(fn, arg):
    try:
        return fn(arg)
    except Exception as e:  # noqa: BLE001
        return e


if __name__ == "__main__":
    main()
