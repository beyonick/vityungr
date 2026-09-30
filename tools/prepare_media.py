"""Собирает папки для выкладки в Selectel: каждая папка внутри media/ — содержимое одного бакета.

  media/vityungr-media/     публичный бакет, из него берёт фото сборка сайта
    works/originals/<серия>/<работа>/NN.jpg   веб-версии (до 1600 px), = src/assets/works
    works/prints/<тип>/<принт>/NN.jpg
  media/vityungr-sources/   приватный бакет, исходники
    tilda/originals/...      фото как есть со старого сайта (works/ после npm run scrape)
    tilda/prints/...
    tilda/catalog.json, catalog.csv
    hires/                   сюда складывать исходные фото от Вити

Запуск: python tools/prepare_media.py  (перед этим npm run scrape и npm run images)
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "media"
PUBLIC = OUT / "vityungr-media"
PRIVATE = OUT / "vityungr-sources"


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
    web = ROOT / "src" / "assets" / "works"
    raw = ROOT / "works"
    if not web.exists() or not raw.exists():
        raise SystemExit("Нет src/assets/works или works/: сначала npm run scrape и npm run images")
    shutil.rmtree(OUT, ignore_errors=True)
    n_web = copy_tree(web, PUBLIC / "works")
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
    print(f"{PUBLIC.relative_to(ROOT)}: {n_web} файлов")
    print(f"{PRIVATE.relative_to(ROOT)}: {n_raw} фото + каталог")


if __name__ == "__main__":
    main()
