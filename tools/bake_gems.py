#!/usr/bin/env python3
"""
CRYSTALLINE — bake crystal tiles into distinct silhouettes + atlas pages.

Research requirement: each colour must have a distinct outer shape (not just hue).
Source JPEGs all share one geode outline; we key them, then mask into SILHOUETTE shapes.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from key_alpha import key_rgb  # noqa: E402
ASSETS = ROOT / "assets"
OUT = ROOT / "public" / "gen"

# Colour → source filename fragment (matched substring) + silhouette
COLOR_MAP = {
    "ember": {
        "match": "Fiery_crystal",
        "shape": "shard",
        "fallback": "#ff5a44",
    },
    "aurum": {
        "match": "golden_glow",
        "shape": "hexagon",
        "fallback": "#ffb02e",
    },
    "solar": {
        "match": "yellow_glow",
        "shape": "roundsquare",
        "fallback": "#ffe25c",
    },
    "verdant": {
        "match": "Emerald_green",
        "shape": "teardrop",
        "fallback": "#46d67f",
    },
    "tidal": {
        "match": "blue_glow",
        "shape": "diamond",
        "fallback": "#38b0ff",
    },
    "void": {
        "match": "internal_glow",
        "shape": "octagon",
        "fallback": "#a066ff",
    },
}

PRISM_MATCH = "Opalescent"
CELL = 128  # base atlas cell size at 1x (we bake @2x primarily)


def find_source(fragment: str) -> Path:
    for p in ASSETS.iterdir():
        if p.suffix.lower() in {".jpeg", ".jpg", ".png"} and fragment in p.name:
            return p
    raise FileNotFoundError(fragment)


def silhouette_mask(size: int, shape: str) -> Image.Image:
    """White silhouette on black, size x size."""
    im = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(im)
    cx = cy = size / 2
    r = size * 0.42

    def poly(pts):
        d.polygon([(cx + x * r * 2, cy + y * r * 2) for x, y in pts], fill=255)

    if shape == "shard":
        poly([(0, -0.47), (0.27, -0.11), (0.19, 0.46), (-0.19, 0.46), (-0.27, -0.11)])
    elif shape == "hexagon":
        pts = []
        for i in range(6):
            a = -math.pi / 2 + i * math.pi / 3
            pts.append((math.cos(a) * 0.45 / 0.42, math.sin(a) * 0.45 / 0.42))
        poly([(p[0] * 0.42 / 0.42 * 0.5, p[1] * 0.5) for p in [
            (math.cos(-math.pi / 2 + i * math.pi / 3) * 0.95,
             math.sin(-math.pi / 2 + i * math.pi / 3) * 0.95)
            for i in range(6)
        ]])
    elif shape == "roundsquare":
        pad = size * 0.08
        d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=size * 0.14, fill=255)
    elif shape == "teardrop":
        # approximate with ellipse + triangle
        d.ellipse([size * 0.18, size * 0.28, size * 0.82, size * 0.88], fill=255)
        d.polygon(
            [
                (cx, size * 0.08),
                (size * 0.22, size * 0.48),
                (size * 0.78, size * 0.48),
            ],
            fill=255,
        )
    elif shape == "diamond":
        poly([(0, -0.47), (0.41, 0), (0, 0.47), (-0.41, 0)])
    elif shape == "octagon":
        pts = []
        for i in range(8):
            a = math.pi / 8 + i * math.pi / 4
            pts.append((math.cos(a) * 0.48 / 0.42 * 0.5, math.sin(a) * 0.48 / 0.42 * 0.5))
        poly([
            (math.cos(math.pi / 8 + i * math.pi / 4) * 0.5,
             math.sin(math.pi / 8 + i * math.pi / 4) * 0.5)
            for i in range(8)
        ])
    else:
        d.ellipse([size * 0.1, size * 0.1, size * 0.9, size * 0.9], fill=255)

    return im.filter(ImageFilter.GaussianBlur(radius=0.6))


def crop_content(rgba: np.ndarray, pad: int = 8) -> np.ndarray:
    alpha = rgba[..., 3]
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return rgba
    y0, y1 = max(0, ys.min() - pad), min(rgba.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(rgba.shape[1], xs.max() + pad + 1)
    return rgba[y0:y1, x0:x1]


def fit_into(rgba: np.ndarray, size: int) -> Image.Image:
    im = Image.fromarray(rgba, "RGBA")
    im.thumbnail((size - 8, size - 8), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - im.width) // 2
    oy = (size - im.height) // 2
    canvas.paste(im, (ox, oy), im)
    return canvas


def apply_silhouette(src: Image.Image, shape: str) -> Image.Image:
    size = src.size[0]
    mask = silhouette_mask(size, shape)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(src, (0, 0), src)
    # Multiply alpha by silhouette
    r, g, b, a = out.split()
    a = ImageChops_multiply(a, mask)
    return Image.merge("RGBA", (r, g, b, a))


def ImageChops_multiply(a: Image.Image, b: Image.Image) -> Image.Image:
    aa = np.asarray(a).astype(np.float32)
    bb = np.asarray(b).astype(np.float32) / 255.0
    return Image.fromarray(np.clip(aa * bb, 0, 255).astype(np.uint8), "L")


def paint_marks_line(im: Image.Image, vertical: bool) -> Image.Image:
    d = ImageDraw.Draw(im)
    w, h = im.size
    cx, cy = w // 2, h // 2
    color = (255, 255, 255, 230)
    if vertical:
        for dx in (-w // 8, w // 8):
            d.line([(cx + dx, cy - h // 6), (cx + dx, cy + h // 6)], fill=color, width=max(2, w // 28))
    else:
        for dy in (-h // 8, h // 8):
            d.line([(cx - w // 6, cy + dy), (cx + w // 6, cy + dy)], fill=color, width=max(2, w // 28))
    return im


def paint_marks_burst(im: Image.Image) -> Image.Image:
    d = ImageDraw.Draw(im)
    w, h = im.size
    cx, cy = w // 2, h // 2
    r = w // 5
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 230), width=max(2, w // 32))
    for i in range(8):
        a = i * math.pi / 4
        d.line(
            [
                (cx + math.cos(a) * r * 1.2, cy + math.sin(a) * r * 1.2),
                (cx + math.cos(a) * r * 1.7, cy + math.sin(a) * r * 1.7),
            ],
            fill=(255, 255, 255, 220),
            width=max(2, w // 36),
        )
    return im


def procedural(kind: str, size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if kind == "stone":
        d.polygon(
            [
                (size * 0.15, size * 0.3),
                (size * 0.4, size * 0.12),
                (size * 0.75, size * 0.18),
                (size * 0.9, size * 0.45),
                (size * 0.8, size * 0.78),
                (size * 0.45, size * 0.9),
                (size * 0.15, size * 0.7),
            ],
            fill=(100, 108, 130, 255),
            outline=(30, 32, 40, 255),
        )
    elif kind == "bomb":
        d.ellipse([size * 0.18, size * 0.22, size * 0.82, size * 0.86], fill=(50, 55, 80, 255))
        d.line([(size * 0.55, size * 0.22), (size * 0.7, size * 0.08)], fill=(200, 160, 90, 255), width=3)
        d.ellipse([size * 0.66, size * 0.04, size * 0.78, size * 0.16], fill=(255, 200, 80, 255))
    elif kind == "relic":
        d.polygon(
            [
                (size * 0.5, size * 0.1),
                (size * 0.82, size * 0.35),
                (size * 0.72, size * 0.88),
                (size * 0.28, size * 0.88),
                (size * 0.18, size * 0.35),
            ],
            fill=(255, 214, 121, 255),
            outline=(80, 50, 10, 255),
        )
    elif kind.startswith("crust"):
        n = int(kind[-1])
        alpha = 80 + n * 40
        d.rounded_rectangle(
            [size * 0.05, size * 0.05, size * 0.95, size * 0.95],
            radius=size * 0.1,
            fill=(200, 220, 240, alpha),
            outline=(230, 245, 255, 200),
        )
    elif kind.startswith("shadow"):
        n = int(kind[-1])
        alpha = 100 + n * 60
        d.rounded_rectangle(
            [size * 0.04, size * 0.04, size * 0.96, size * 0.96],
            radius=size * 0.12,
            fill=(30, 10, 50, alpha),
        )
    elif kind.startswith("glyph."):
        color = kind.split(".", 1)[1]
        # simple glyph mark
        d.ellipse([size * 0.25, size * 0.25, size * 0.75, size * 0.75], outline=(255, 255, 255, 240), width=4)
        d.text((size * 0.42, size * 0.38), color[0].upper(), fill=(255, 255, 255, 240))
    return im


def dominant_color(rgba: np.ndarray) -> str:
    a = rgba[..., 3] > 40
    if not a.any():
        return "#888888"
    pix = rgba[a][:, :3].astype(np.float32)
    # bias toward more saturated pixels
    sat = pix.max(1) - pix.min(1)
    w = 0.3 + sat / 255.0
    mean = (pix * w[:, None]).sum(0) / w.sum()
    return "#{:02x}{:02x}{:02x}".format(*(int(np.clip(c, 0, 255)) for c in mean))


def bake(scale: int = 2) -> dict:
    size = CELL * scale
    frames: dict[str, dict] = {}
    images: list[tuple[str, Image.Image]] = []
    palette: dict[str, str] = {}
    sources: dict[str, str] = {}

    for color, meta in COLOR_MAP.items():
        src_path = find_source(meta["match"])
        sources[color] = src_path.name
        rgb = np.asarray(Image.open(src_path).convert("RGB"))
        rgba = key_rgb(rgb)
        rgba = crop_content(rgba)
        fitted = fit_into(rgba, size)
        shaped = apply_silhouette(fitted, meta["shape"])
        palette[color] = dominant_color(np.asarray(shaped))
        images.append((color, shaped))

        # specials
        line_h = paint_marks_line(shaped.copy(), vertical=False)
        line_v = paint_marks_line(shaped.copy(), vertical=True)
        burst = paint_marks_burst(shaped.copy())
        images.append((f"{color}.line-h", line_h))
        images.append((f"{color}.line-v", line_v))
        images.append((f"{color}.burst", burst))
        images.append((f"glyph.{color}", procedural(f"glyph.{color}", size)))

    # prism
    prism_path = find_source(PRISM_MATCH)
    sources["prism"] = prism_path.name
    pr = key_rgb(np.asarray(Image.open(prism_path).convert("RGB")))
    pr = fit_into(crop_content(pr), size)
    pr = apply_silhouette(pr, "octagon")
    images.append(("prism", pr))

    for kind in ("stone", "bomb", "relic", "crust1", "crust2", "crust3", "shadow1", "shadow2"):
        images.append((kind, procedural(kind, size)))

    # pack atlas: simple grid
    cols = 8
    rows = math.ceil(len(images) / cols)
    atlas = Image.new("RGBA", (cols * size, rows * size), (0, 0, 0, 0))
    for i, (key, im) in enumerate(images):
        x = (i % cols) * size
        y = (i // cols) * size
        atlas.paste(im, (x, y), im)
        frames[key] = {
            "x": x,
            "y": y,
            "w": size,
            "h": size,
            "anchor": [0.5, 0.5],
        }

    OUT.mkdir(parents=True, exist_ok=True)
    out_name = f"crystals@{scale}x.webp"
    out_path = OUT / out_name
    atlas.save(out_path, "WEBP", quality=90, method=4)

    page = {
        "src": f"gen/{out_name}",
        "width": atlas.width,
        "height": atlas.height,
        "scale": scale,
        "frames": frames,
    }
    return {
        "page": page,
        "palette": palette,
        "sources": sources,
    }


def main() -> None:
    # Bake 1x and 2x
    results = []
    for scale in (1, 2):
        print(f"baking @{scale}x …")
        results.append(bake(scale))

    # Share palette/sources from 2x. Preserve any vfx already baked by bake_vfx.py.
    base = results[-1]
    existing_vfx = []
    man_path = OUT / "manifest.json"
    if man_path.exists():
        try:
            prev = json.loads(man_path.read_text())
            existing_vfx = prev.get("vfx") or []
        except Exception:
            existing_vfx = []
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pages": [r["page"] for r in results],
        "vfx": existing_vfx,
        "palette": base["palette"],
        "sources": base["sources"],
    }
    man_path.write_text(json.dumps(manifest, indent=2))
    print(f"wrote {man_path}")
    print("palette", base["palette"])


if __name__ == "__main__":
    main()
