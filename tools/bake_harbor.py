#!/usr/bin/env python3
"""
Bake Lantern Harbor art from Grok Imagine session images into public/themes/harbor/.
Produces atlas pages matching Crystalline frame keys so the shared renderer works.
"""

from __future__ import annotations

import json
import math
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SESSION_IMG = Path(
    "/home/chriswinters/.grok/sessions/"
    "%2Fhome%2Fchriswinters%2F3%20in%201%20game/"
    "019fba0f-d8ad-7952-98b9-cc85ef431f5d/images"
)
OUT = ROOT / "public" / "themes" / "harbor"
RAW = ROOT / "assets" / "harbor" / "raw"
CELL = 128
CELL2 = 256

# Manifest frame order matches crystalline gen/manifest.json keys layout
FRAME_KEYS_ORDER = [
    # row0
    "ember", "ember.line-h", "ember.line-v", "ember.burst", "glyph.ember",
    "aurum", "aurum.line-h", "aurum.line-v",
    # row1
    "aurum.burst", "glyph.aurum", "solar", "solar.line-h", "solar.line-v",
    "solar.burst", "glyph.solar", "verdant",
    # row2
    "verdant.line-h", "verdant.line-v", "verdant.burst", "glyph.verdant",
    "tidal", "tidal.line-h", "tidal.line-v", "tidal.burst",
    # row3
    "glyph.tidal", "void", "void.line-h", "void.line-v", "void.burst",
    "glyph.void", "prism", "stone",
    # row4
    "bomb", "relic", "crust1", "crust2", "crust3", "shadow1", "shadow2",
]

PALETTE = {
    "ember": "#e85d4c",
    "aurum": "#c47a2e",
    "solar": "#f0a04b",
    "verdant": "#2a8f6a",
    "tidal": "#2a8f9a",
    "void": "#7b6bb0",
}

ICON_IDS = [
    "s1_lamp", "s1_vein", "s1_cart", "s1_banner",
    "s2_prism", "s2_pool", "s2_arch", "s2_chorus",
    "s3_core", "s3_veins", "s3_altar", "s3_guardian",
    "s4_geode", "s4_throne", "s4_sky",
]


def key_magenta(im: Image.Image, thr: int = 55) -> Image.Image:
    """Remove near-magenta key bg → RGBA."""
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    # Magenta key: high R+B, low G
    mag = (r + b) / 2 - g
    mask = (mag > thr) & (g < 140) & (r > 80) & (b > 80)
    # Also pure-ish #FF00FF
    mask |= (r > 200) & (b > 200) & (g < 80)
    a = np.where(mask, 0, a)
    # Soft edge
    out = arr.copy()
    out[..., 3] = a
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def fit_cell(im: Image.Image, size: int, pad: float = 0.08) -> Image.Image:
    """Center-fit RGBA into size×size cell with padding."""
    im = im.convert("RGBA")
    # Crop to alpha bounds
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        im = im.crop(bbox)
    tw = int(size * (1 - 2 * pad))
    th = tw
    im.thumbnail((tw, th), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - im.width) // 2
    y = (size - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def add_line_variant(base: Image.Image, orientation: str) -> Image.Image:
    im = base.copy()
    d = ImageDraw.Draw(im)
    s = im.width
    col = (255, 240, 180, 220)
    if orientation == "h":
        d.rounded_rectangle([s * 0.12, s * 0.42, s * 0.88, s * 0.58], radius=s * 0.08, fill=col)
    else:
        d.rounded_rectangle([s * 0.42, s * 0.12, s * 0.58, s * 0.88], radius=s * 0.08, fill=col)
    return im


def add_burst_variant(base: Image.Image) -> Image.Image:
    im = base.copy()
    d = ImageDraw.Draw(im)
    s = im.width
    cx = cy = s / 2
    for i, rad in enumerate([0.48, 0.38, 0.28]):
        a = 80 - i * 20
        d.ellipse(
            [cx - s * rad, cy - s * rad, cx + s * rad, cy + s * rad],
            outline=(255, 220, 120, a),
            width=max(2, s // 40),
        )
    return im


def glyph_cell(color_hex: str, size: int, mark: str) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = int(color_hex[1:3], 16)
    g = int(color_hex[3:5], 16)
    b = int(color_hex[5:7], 16)
    pad = size * 0.18
    d.ellipse([pad, pad, size - pad, size - pad], fill=(r, g, b, 230))
    d.ellipse([pad + 4, pad + 4, size - pad - 4, size - pad - 4], outline=(255, 255, 255, 180), width=2)
    return im


def classify_hue(im: Image.Image) -> str:
    arr = np.asarray(im.convert("RGBA")).astype(np.float32)
    a = arr[..., 3]
    mask = a > 40
    if not mask.any():
        return "ember"
    r = arr[..., 0][mask].mean()
    g = arr[..., 1][mask].mean()
    b = arr[..., 2][mask].mean()
    # rough buckets
    if r > 160 and g < 120 and b < 120:
        return "ember"
    if r > 140 and 80 < g < 160 and b < 100:
        return "aurum"
    if r > 160 and g > 120 and b < 100:
        return "solar"
    if g > r and g > b:
        return "verdant"
    if b > r and b >= g:
        return "tidal"
    if b > 100 and r > 80 and g < 120:
        return "void"
    # fallbacks by max channel
    if r >= g and r >= b:
        return "ember" if b < 100 else "void"
    if g >= r and g >= b:
        return "verdant"
    return "tidal"


def load_keyed(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return key_magenta(im)


def make_vfx_sheet(burst: Image.Image, frame: int, cols: int, count: int, out: Path) -> None:
    burst = burst.convert("RGBA")
    # Ensure on black for screen composite
    bg = Image.new("RGB", (frame, frame), (0, 0, 0))
    b = burst.copy()
    b.thumbnail((frame, frame), Image.Resampling.LANCZOS)
    rows = math.ceil(count / cols)
    sheet = Image.new("RGB", (cols * frame, rows * frame), (0, 0, 0))
    for i in range(count):
        t = i / max(1, count - 1)
        scale = 0.35 + 0.65 * (math.sin(t * math.pi) ** 0.7)
        alpha = 0.25 + 0.75 * (math.sin(t * math.pi))
        w = max(8, int(frame * scale))
        frame_im = b.copy().resize((w, w), Image.Resampling.LANCZOS)
        # apply alpha
        fr = Image.new("RGBA", (frame, frame), (0, 0, 0, 0))
        x = (frame - w) // 2
        y = (frame - w) // 2
        fr.paste(frame_im, (x, y), frame_im)
        arr = np.asarray(fr).astype(np.float32)
        arr[..., 3] *= alpha
        fr = Image.fromarray(arr.astype(np.uint8), "RGBA")
        cell = bg.copy().convert("RGBA")
        cell = Image.alpha_composite(cell, fr)
        col = i % cols
        row = i // cols
        sheet.paste(cell.convert("RGB"), (col * frame, row * frame))
    sheet.save(out, "WEBP", quality=88)


def spin_sheet(core: Image.Image, out: Path) -> None:
    """6×2 sheet of 96px frames with slight rotation."""
    fw = fh = 96
    cols, count = 6, 12
    sheet = Image.new("RGBA", (cols * fw, 2 * fh), (0, 0, 0, 0))
    base = fit_cell(core, 88, pad=0.05)
    for i in range(count):
        ang = i * (360 / count)
        rot = base.rotate(ang, resample=Image.Resampling.BICUBIC, expand=False)
        cell = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        cell.paste(rot, ((fw - rot.width) // 2, (fh - rot.height) // 2), rot)
        col = i % cols
        row = i // cols
        sheet.paste(cell, (col * fw, row * fh), cell)
    sheet.save(out, "WEBP", quality=90)


def slice_icon_grid(grid_path: Path, out_dir: Path) -> None:
    im = load_keyed(grid_path)
    # Assume ~3 rows × 5 cols of icons
    w, h = im.size
    cols, rows = 5, 3
    cw, ch = w // cols, h // rows
    out_dir.mkdir(parents=True, exist_ok=True)
    idx = 0
    for row in range(rows):
        for col in range(cols):
            if idx >= len(ICON_IDS):
                return
            cell = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            cell = fit_cell(cell, 256, pad=0.06)
            cell.save(out_dir / f"{ICON_IDS[idx]}.webp", "WEBP", quality=90)
            idx += 1


def main() -> int:
    if not SESSION_IMG.is_dir():
        print("session images missing:", SESSION_IMG, file=sys.stderr)
        return 1

    RAW.mkdir(parents=True, exist_ok=True)
    for sub in ["gen", "bg", "diorama/stages", "diorama/icons", "characters", "ui"]:
        (OUT / sub).mkdir(parents=True, exist_ok=True)

    # --- Copy named sources from session (by size + role map) ---
    # Fixed mapping from generation plan + sizes
    mapping = {
        "1.jpg": "bg_harbor.jpg",
        "2.jpg": "companion.jpg",
        "3.jpg": "lineup.jpg",
        "12.jpg": "stage1.jpg",
        "15.jpg": "stage2.jpg",
        "16.jpg": "stage3.jpg",
        "18.jpg": "stage4.jpg",
        "17.jpg": "map_bg.jpg",
        "19.jpg": "win_banner.jpg",
        "21.jpg": "fail_banner.jpg",
        "26.jpg": "prelevel_banner.jpg",
        "27.jpg": "prelevel_mid.jpg",
        "25.jpg": "prelevel_deep.jpg",
        "20.jpg": "prop_grid.jpg",
        "10.jpg": "prism.jpg",
        "14.jpg": "stone.jpg",
        "13.jpg": "bomb.jpg",
        "11.jpg": "relic.jpg",
        "22.jpg": "crust.jpg",
        "23.jpg": "core.jpg",
        "24.jpg": "vfx_burst.jpg",
    }
    # pieces 4-9 classified by hue
    piece_files = ["4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg"]

    for src, dst in mapping.items():
        p = SESSION_IMG / src
        if p.exists():
            shutil.copy2(p, RAW / dst)

    colors: dict[str, Image.Image] = {}
    for src in piece_files:
        p = SESSION_IMG / src
        if not p.exists():
            continue
        im = load_keyed(p)
        name = classify_hue(im)
        # avoid overwrite if collision
        if name in colors:
            # try next free
            for alt in ["ember", "aurum", "solar", "verdant", "tidal", "void"]:
                if alt not in colors:
                    name = alt
                    break
        colors[name] = im
        im.save(RAW / f"piece_{name}.png")
        print(f"  piece {src} → {name}")

    # Fill missing colors from lineup strip if needed
    if len(colors) < 6 and (RAW / "lineup.jpg").exists():
        lineup = load_keyed(RAW / "lineup.jpg")
        w, h = lineup.size
        for i, cname in enumerate(["ember", "aurum", "solar", "verdant", "tidal", "void"]):
            if cname in colors:
                continue
            x0 = int(i * w / 6)
            x1 = int((i + 1) * w / 6)
            strip = lineup.crop((x0, 0, x1, h))
            colors[cname] = strip
            print(f"  lineup fill → {cname}")

    # Ensure all 6
    for cname, hexcol in PALETTE.items():
        if cname not in colors:
            # solid fallback gem
            im = Image.new("RGBA", (CELL2, CELL2), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            r = int(hexcol[1:3], 16)
            g = int(hexcol[3:5], 16)
            b = int(hexcol[5:7], 16)
            d.ellipse([40, 40, CELL2 - 40, CELL2 - 40], fill=(r, g, b, 255))
            colors[cname] = im
            print(f"  fallback solid → {cname}")

    # Specials
    specials = {}
    for name in ["prism", "stone", "bomb", "relic", "crust", "core"]:
        p = RAW / f"{name}.jpg"
        if p.exists():
            specials[name] = load_keyed(p)

    # --- Build atlas pages ---
    def build_page(scale: int) -> tuple[Image.Image, dict]:
        cell = CELL * scale
        cols = 8
        rows = 5
        page = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
        frames: dict = {}
        for i, key in enumerate(FRAME_KEYS_ORDER):
            col = i % cols
            row = i // cols
            # Build cell
            if key in colors:
                cell_im = fit_cell(colors[key], cell)
            elif key.endswith(".line-h"):
                base = key.split(".")[0]
                cell_im = add_line_variant(fit_cell(colors[base], cell), "h")
            elif key.endswith(".line-v"):
                base = key.split(".")[0]
                cell_im = add_line_variant(fit_cell(colors[base], cell), "v")
            elif key.endswith(".burst"):
                base = key.split(".")[0]
                cell_im = add_burst_variant(fit_cell(colors[base], cell))
            elif key.startswith("glyph."):
                base = key.split(".", 1)[1]
                cell_im = glyph_cell(PALETTE[base], cell, base)
            elif key == "prism":
                cell_im = fit_cell(specials.get("prism") or colors["solar"], cell)
            elif key == "stone":
                cell_im = fit_cell(specials.get("stone") or colors["aurum"], cell)
            elif key == "bomb":
                cell_im = fit_cell(specials.get("bomb") or colors["ember"], cell)
            elif key == "relic":
                cell_im = fit_cell(specials.get("relic") or colors["solar"], cell)
            elif key.startswith("crust"):
                base = specials.get("crust") or colors["aurum"]
                cell_im = fit_cell(base, cell)
                # darken by layer
                layer = int(key[-1])
                arr = np.asarray(cell_im).astype(np.float32)
                arr[..., :3] *= max(0.45, 1.0 - 0.15 * layer)
                cell_im = Image.fromarray(arr.astype(np.uint8), "RGBA")
            elif key.startswith("shadow"):
                cell_im = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
                d = ImageDraw.Draw(cell_im)
                a = 90 if key.endswith("1") else 140
                d.ellipse([cell * 0.15, cell * 0.15, cell * 0.85, cell * 0.85], fill=(20, 30, 50, a))
            else:
                cell_im = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))

            page.paste(cell_im, (col * cell, row * cell), cell_im)
            frames[key] = {
                "x": col * cell,
                "y": row * cell,
                "w": cell,
                "h": cell,
                "anchor": [0.5, 0.5],
            }
        return page, frames

    page1, frames1 = build_page(1)
    page2, frames2 = build_page(2)
    p1 = OUT / "gen" / "crystals@1x.webp"
    p2 = OUT / "gen" / "crystals@2x.webp"
    page1.save(p1, "WEBP", quality=90)
    page2.save(p2, "WEBP", quality=90)
    print("atlas", p1, p2)

    # VFX
    vfx_src = specials.get("core")  # fallback
    if (RAW / "vfx_burst.jpg").exists():
        vfx_src = Image.open(RAW / "vfx_burst.jpg").convert("RGBA")
        # black bg already — keep
    elif "core" in specials:
        vfx_src = specials["core"]
    else:
        vfx_src = colors["solar"]

    vfx_meta = []
    for tier, fw, cols, count, fps, dur in [
        (3, 320, 4, 16, 11.43, 1400),
        (4, 384, 5, 18, 12.86, 1400),
        (5, 416, 5, 20, 14.29, 1400),
        (6, 480, 5, 24, 13.33, 1800),
    ]:
        out = OUT / "gen" / f"vfx_match{tier}.webp"
        make_vfx_sheet(vfx_src, fw, cols, count, out)
        vfx_meta.append({
            "tier": tier,
            "composite": "screen" if tier >= 5 else "alpha",
            "sheet": {
                "src": f"vfx_match{tier}.webp",
                "frameWidth": fw,
                "frameHeight": fw,
                "cols": cols,
                "count": count,
                "fps": fps,
            },
            "durationMs": dur,
        })
        print("vfx", out)

    # Living core
    core_im = specials.get("core") or colors["solar"]
    spin_sheet(core_im, OUT / "gen" / "living_core.webp")

    # Manifest
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pages": [
            {
                "src": "crystals@1x.webp",
                "width": page1.width,
                "height": page1.height,
                "scale": 1,
                "frames": frames1,
            },
            {
                "src": "crystals@2x.webp",
                "width": page2.width,
                "height": page2.height,
                "scale": 2,
                "frames": frames2,
            },
        ],
        "vfx": vfx_meta,
        "palette": PALETTE,
        "sources": {"theme": "lantern-harbor", "pipeline": "bake_harbor.py"},
    }
    (OUT / "gen" / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("manifest written")

    # Backgrounds / UI / stages / companion
    def save_webp(src_name: str, dest: Path, size: tuple[int, int] | None = None) -> None:
        p = RAW / src_name
        if not p.exists():
            print("missing", src_name)
            return
        im = Image.open(p).convert("RGB")
        if size:
            im = im.resize(size, Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, "WEBP", quality=88)
        print("saved", dest)

    save_webp("bg_harbor.jpg", OUT / "bg" / "harbor-docks-720.webp", (720, 1280))
    save_webp("companion.jpg", OUT / "characters" / "captain-lumen.webp", (512, 512))
    save_webp("stage1.jpg", OUT / "diorama" / "stages" / "stage1.webp", (1280, 720))
    save_webp("stage2.jpg", OUT / "diorama" / "stages" / "stage2.webp", (1280, 720))
    save_webp("stage3.jpg", OUT / "diorama" / "stages" / "stage3.webp", (1280, 720))
    save_webp("stage4.jpg", OUT / "diorama" / "stages" / "stage4.webp", (1280, 720))
    save_webp("map_bg.jpg", OUT / "ui" / "map_bg.webp", (720, 1280))
    save_webp("win_banner.jpg", OUT / "ui" / "win_banner.webp", (960, 360))
    save_webp("fail_banner.jpg", OUT / "ui" / "fail_banner.webp", (960, 360))
    save_webp("prelevel_banner.jpg", OUT / "ui" / "prelevel_banner.webp", (960, 360))
    save_webp("prelevel_mid.jpg", OUT / "ui" / "prelevel_mid.webp", (960, 360))
    save_webp("prelevel_deep.jpg", OUT / "ui" / "prelevel_deep.webp", (960, 360))

    if (RAW / "prop_grid.jpg").exists():
        slice_icon_grid(RAW / "prop_grid.jpg", OUT / "diorama" / "icons")
        print("icons sliced")
    else:
        # procedural icons
        icons = OUT / "diorama" / "icons"
        icons.mkdir(parents=True, exist_ok=True)
        for iid in ICON_IDS:
            im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            d.rounded_rectangle([40, 40, 216, 216], radius=28, fill=(42, 143, 154, 230))
            im.save(icons / f"{iid}.webp", "WEBP", quality=85)

    print("Harbor bake complete →", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
