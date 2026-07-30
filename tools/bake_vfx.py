#!/usr/bin/env python3
"""
CRYSTALLINE — bake match-reward VFX clips into runtime sprite sheets.

Source MP4s (assets/) are 10s / 1920×1080 research art. They are not playable
as-is (too long, too heavy, no alpha). This pipeline:

  Match 3, 4  → checkerboard-keyed RGBA sprite sheets  (composite: alpha)
  Match 5, 6+ → near-black treated as transparent-ish, drawn with 'screen'
                (composite: screen) — better for pure light bursts
  Spinning shard → skipped (idle loop, not a match reward)

Each clip is trimmed to its peak action window, downscaled, and subsampled so
in-game playback is ~0.5–1.4s and fits mobile memory.
"""

from __future__ import annotations

import json
import math
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from key_alpha import key_rgb  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ROOT / "public" / "gen"

# (tier, filename substring, composite, start_s, end_s, out_frames, out_size)
# Windows chosen from visual probe of peak action in each 10s source.
CLIPS = [
    (3, "Match 3", "alpha", 0.6, 2.4, 16, 320),
    (4, "Match 4", "alpha", 0.8, 2.6, 18, 384),
    (5, "Match 5", "screen", 0.9, 3.0, 20, 416),
    (6, "Match 6", "screen", 1.2, 3.8, 24, 480),
]


def find_source(fragment: str) -> Path:
    for p in ASSETS.iterdir():
        if p.suffix.lower() == ".mp4" and fragment in p.name:
            return p
    raise FileNotFoundError(f"no mp4 matching {fragment!r} in {ASSETS}")


def extract_frames(src: Path, start: float, end: float, n: int, work: Path) -> list[Path]:
    """Extract n evenly spaced frames from [start, end] into work/."""
    duration = max(0.1, end - start)
    # fps such that n frames span the window
    fps = (n - 1) / duration if n > 1 else 1
    pattern = str(work / "f_%04d.png")
    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}",
        "-i", str(src),
        "-t", f"{duration:.3f}",
        "-vf", f"fps={fps:.4f}",
        "-frames:v", str(n),
        pattern,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    frames = sorted(work.glob("f_*.png"))
    if not frames:
        raise RuntimeError(f"ffmpeg produced no frames for {src.name}")
    return frames[:n]


def key_frame_alpha(path: Path, size: int) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert("RGB"))
    rgba = key_rgb(rgb)
    im = Image.fromarray(rgba, "RGBA")
    return im.resize((size, size), Image.LANCZOS)


def key_frame_screen(path: Path, size: int) -> Image.Image:
    """Black-background burst: lift near-black toward transparent for sheet,
    but keep RGB for screen blend (alpha used only when drawing as fallback)."""
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    # Soft alpha from luminance so dark bg vanishes if drawn normal; screen path
    # ignores alpha and uses RGB only.
    alpha = np.clip((lum - 8.0) / 40.0, 0.0, 1.0)
    # Crush pure black for cleaner screen composite
    rgb = rgb * alpha[..., None]
    out = np.dstack([rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    im = Image.fromarray(out, "RGBA")
    return im.resize((size, size), Image.LANCZOS)


def pack_sheet(frames: list[Image.Image], cols: int | None = None) -> tuple[Image.Image, int, int]:
    n = len(frames)
    if cols is None:
        cols = int(math.ceil(math.sqrt(n)))
    rows = int(math.ceil(n / cols))
    fw, fh = frames[0].size
    sheet = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        x = (i % cols) * fw
        y = (i // cols) * fh
        sheet.paste(fr, (x, y), fr)
    return sheet, cols, rows


def bake_one(
    tier: int,
    fragment: str,
    composite: str,
    start: float,
    end: float,
    n_frames: int,
    size: int,
) -> dict:
    src = find_source(fragment)
    print(f"  tier {tier}: {src.name} [{start:.1f}s–{end:.1f}s] → {n_frames}×{size}px ({composite})")

    with tempfile.TemporaryDirectory(prefix=f"vfx{tier}_") as td:
        work = Path(td)
        raw = extract_frames(src, start, end, n_frames, work)
        keyed: list[Image.Image] = []
        for p in raw:
            if composite == "alpha":
                keyed.append(key_frame_alpha(p, size))
            else:
                keyed.append(key_frame_screen(p, size))

        sheet, cols, _rows = pack_sheet(keyed)
        out_name = f"vfx_match{tier}.webp"
        out_path = OUT / out_name
        sheet.save(out_path, "WEBP", quality=85, method=4)

        duration_ms = int(round((end - start) * 1000 * 0.85))  # slight speedup
        # Cap: match-3 snappy, match-6 still feels big but not 10s
        duration_ms = max(400, min(duration_ms, 1400 if tier < 6 else 1800))
        fps = n_frames / (duration_ms / 1000.0)

        return {
            "tier": tier,
            "composite": composite,
            "sheet": {
                "src": f"gen/{out_name}",
                "frameWidth": size,
                "frameHeight": size,
                "cols": cols,
                "count": n_frames,
                "fps": round(fps, 2),
            },
            "durationMs": duration_ms,
            "source": src.name,
        }


def merge_manifest(vfx: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    man_path = OUT / "manifest.json"
    if man_path.exists():
        manifest = json.loads(man_path.read_text())
    else:
        manifest = {
            "version": 1,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "pages": [],
            "vfx": [],
            "palette": {},
            "sources": {},
        }
    # Strip bake-only fields
    clean = []
    for clip in vfx:
        clean.append({
            "tier": clip["tier"],
            "composite": clip["composite"],
            "sheet": clip["sheet"],
            "durationMs": clip["durationMs"],
        })
        manifest.setdefault("sources", {})[f"vfx.{clip['tier']}"] = clip["source"]

    manifest["vfx"] = clean
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat()
    man_path.write_text(json.dumps(manifest, indent=2))
    print(f"updated {man_path} with {len(clean)} vfx clips")


def main() -> int:
    print("== bake match-reward VFX ==")
    OUT.mkdir(parents=True, exist_ok=True)
    clips = []
    for spec in CLIPS:
        try:
            clips.append(bake_one(*spec))
        except Exception as e:
            print(f"ERROR tier {spec[0]}: {e}", file=sys.stderr)
            return 1
    merge_manifest(clips)
    print("done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
