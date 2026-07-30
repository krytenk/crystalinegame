#!/usr/bin/env python3
"""CRYSTALLINE — orchestrate asset build into public/gen/."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path(__file__).resolve().parent


def main() -> int:
    print("== Crystalline asset build ==")
    # Gems + silhouettes + base manifest
    r = subprocess.run([sys.executable, str(TOOLS / "bake_gems.py")], cwd=str(ROOT))
    if r.returncode != 0:
        return r.returncode

    # Match-reward VFX (3 / 4 / 5 / 6+) — merges into public/gen/manifest.json
    vfx = TOOLS / "bake_vfx.py"
    if vfx.exists():
        r = subprocess.run([sys.executable, str(vfx)], cwd=str(ROOT))
        if r.returncode != 0:
            print("warn: bake_vfx failed; continuing without match VFX", file=sys.stderr)
            return r.returncode

    print("done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
