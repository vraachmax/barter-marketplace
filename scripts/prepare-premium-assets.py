#!/usr/bin/env python3
"""Prepare premium Barter images from five original generated PNGs.

Usage:
    python scripts/prepare-premium-assets.py \
      --source /path/to/originals \
      --output apps/web/public/visual-refresh/premium

Requires Pillow >= 10. Never invoke this automatically during a web build.
Review the output before committing. This script does not update application code.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

HERO = [
    ("премиальная_композиция_гаджетов_с_оранжевыми_лента.png", "hero-intro.webp"),
    ("обмен_гаджетами_в_премиум_стиле.png", "hero-exchange.webp"),
    ("премиальный_ноутбук_в_золотом_вихре.png", "hero-one-listing.webp"),
    ("современный_диалог_смартфоны_и_стиль.png", "hero-messages.webp"),
]
GRID = "премиальная_сетка_3d_иконок_категорий.png"
CATEGORIES = [
    ("electronics", "Техника"), ("auto", "Авто"),
    ("realty", "Недвижимость"), ("clothes", "Одежда"),
    ("hobby", "Хобби"), ("special_equipment", "Спецтехника"),
    ("services", "Услуги"), ("parts", "Запчасти"),
    ("furniture", "Мебель"), ("kids", "Детские товары"),
    ("home", "Для дома"), ("sports", "Спорт"),
    ("beauty", "Красота"), ("pets", "Животные"),
    ("photo", "Фото и музыка"), ("all", "Другое"),
]

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_webp(image: Image.Image, dest: Path, quality: int) -> dict:
    dest.parent.mkdir(parents=True, exist_ok=True)
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.save(dest, format="WEBP", quality=quality, method=6)
    return {"bytes": dest.stat().st_size, "sha256": digest(dest),
            "pixels": [image.width, image.height]}

def prepare(source: Path, output: Path) -> None:
    entries, original_sources = [], []
    for src_name, out_name in HERO:
        src = source / src_name
        with Image.open(src) as image:
            if image.width < 1200 or image.height < 500:
                raise ValueError(f"Banner source too small: {src}")
            image = image.copy()
            image.thumbnail((1600, 850), Image.Resampling.LANCZOS)
            dest = output / out_name
            entry = write_webp(image, dest, 87)
            entries.append({"file": out_name, **entry})
        original_sources.append({"file": src_name, "sha256": digest(src)})
    src = source / GRID
    with Image.open(src) as grid:
        grid = grid.convert("RGB")
        width, height = grid.size
        if width < 1000 or height < 1000:
            raise ValueError(f"Category sprite source too small: {src}")
        for index, (slug, category) in enumerate(CATEGORIES):
            row, column = divmod(index, 4)
            box = tuple(round(value) for value in
                (column*width/4, row*height/4, (column+1)*width/4, (row+1)*height/4))
            tile = grid.crop(box).resize((288, 288), Image.Resampling.LANCZOS)
            dest = output / "categories" / f"{slug}.webp"
            entry = write_webp(tile, dest, 88)
            entries.append({"file": f"categories/{slug}.webp",
                            "category": category, **entry})
    original_sources.append({"file": GRID, "sha256": digest(src)})
    manifest = {
        "version": "premium-assets-2026-10-19",
        "status": "assets prepared, React integration pending",
        "original_sources": original_sources,
        "files": entries,
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    print(f"Prepared {len(entries)} images in {output}")

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source, args.output)

if __name__ == "__main__":
    main()
