"""Собирает исходники для архива в Selectel: media/vityungr/ заливается папкой vityungr/ в бакет websites-media,
как у nicktmsh (папка на сайт, отдельный бакет не нужен).

  media/vityungr/
    tilda/originals/...      фото как есть со старого сайта (works/ после npm run scrape)
    tilda/prints/...
    tilda/catalog.json, catalog.csv
    hires/                   сюда складывать исходные фото от Вити

Веб-версии для сайта лежат в git (src/assets/works) и сюда не входят.
Запуск: python tools/prepare_media.py  (перед этим npm run scrape)
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "media"
PRIVATE = OUT / "vityungr"


def copy_tree(src: Path, dest: Path) -> int:
    n = 0
    for f in src.rglob("*"):
        if f.is_file():
            target = dest / f.relative_to(src)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, target)
            n += 1
    return n


def main():
    raw = ROOT / "works"
    if not raw.exists():
        raise SystemExit("Нет works/: сначала npm run scrape")
    shutil.rmtree(OUT, ignore_errors=True)
    n_raw = 0
    for group in ("originals", "prints"):
        n_raw += copy_tree(raw / group, PRIVATE / "tilda" / group)
    for name in ("catalog.json", "catalog.csv"):
        shutil.copy2(raw / name, PRIVATE / "tilda" / name)
    (PRIVATE / "hires").mkdir(parents=True, exist_ok=True)
    (PRIVATE / "hires" / "README.txt").write_text(
        "Исходники в полном размере: hires/<серия>/<работа>/NN.jpg, имена как в works/originals.\n",
        encoding="utf-8",
    )
    print(f"{PRIVATE.relative_to(ROOT)}: {n_raw} фото + каталог")


if __name__ == "__main__":
    main()
