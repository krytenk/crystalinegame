#!/usr/bin/env python3
"""
Tidepop Display — original casual mobile display face for Lantern Harbor / Crystalline.

NOT a clone of Bon Bons Crush Legend or any commercial candy font.
Genre traits only (scènes à faire for casual match-3):
  - very rounded terminals
  - high visual weight / bold
  - slightly condensed for mobile CTAs
  - soft “puffy” counters

Construction is pure geometry (stadiums, circles, superellipse-ish strokes).
Licence: SIL Open Font License 1.1 (see OFL.txt next to the font).
"""

from __future__ import annotations

import math
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "fonts" / "Tidepop"
UPM = 1000
ASCENT = 800
DESCENT = -200
# Slightly condensed unit width for mobile wordmarks
EM_W = 620


def pen() -> TTGlyphPen:
    return TTGlyphPen(None)


def stadium_h(p: TTGlyphPen, x0, y0, x1, y1):
    """Horizontal capsule (rounded rect) from (x0,y0) to (x1,y1)."""
    r = (y1 - y0) / 2
    cy = (y0 + y1) / 2
    # left semicircle + right + join as rounded box via cubic approx
    p.moveTo((x0 + r, y0))
    p.lineTo((x1 - r, y0))
    # right cap
    _arc(p, x1 - r, cy, r, -90, 90)
    p.lineTo((x0 + r, y1))
    _arc(p, x0 + r, cy, r, 90, 270)
    p.closePath()


def _arc(p: TTGlyphPen, cx, cy, r, a0_deg, a1_deg, steps=8):
    """Approximate circular arc with line segments (TTGlyphPen-friendly)."""
    a0 = math.radians(a0_deg)
    a1 = math.radians(a1_deg)
    if a1 < a0:
        a1 += 2 * math.pi
    for i in range(1, steps + 1):
        t = i / steps
        a = a0 + (a1 - a0) * t
        p.lineTo((cx + r * math.cos(a), cy + r * math.sin(a)))


def circle(p: TTGlyphPen, cx, cy, r):
    p.moveTo((cx + r, cy))
    steps = 24
    for i in range(1, steps + 1):
        a = 2 * math.pi * i / steps
        p.lineTo((cx + r * math.cos(a), cy + r * math.sin(a)))
    p.closePath()


def ring(p: TTGlyphPen, cx, cy, ro, ri):
    circle(p, cx, cy, ro)
    # reverse inner hole
    p.moveTo((cx + ri, cy))
    steps = 24
    for i in range(1, steps + 1):
        a = -2 * math.pi * i / steps
        p.lineTo((cx + ri * math.cos(a), cy + ri * math.sin(a)))
    p.closePath()


def vert_bar(p: TTGlyphPen, cx, y0, y1, thick=140):
    half = thick / 2
    r = half
    x0, x1 = cx - half, cx + half
    p.moveTo((x0 + r, y0))
    p.lineTo((x1 - r, y0))
    _arc(p, x1 - r, y0 + r, r, -90, 0)
    p.lineTo((x1, y1 - r))
    _arc(p, x1 - r, y1 - r, r, 0, 90)
    p.lineTo((x0 + r, y1))
    _arc(p, x0 + r, y1 - r, r, 90, 180)
    p.lineTo((x0, y0 + r))
    _arc(p, x0 + r, y0 + r, r, 180, 270)
    p.closePath()


def horiz_bar(p: TTGlyphPen, y, x0, x1, thick=140):
    half = thick / 2
    r = half
    y0, y1 = y - half, y + half
    p.moveTo((x0 + r, y0))
    p.lineTo((x1 - r, y0))
    _arc(p, x1 - r, y0 + r, r, -90, 0)
    p.lineTo((x1, y1 - r))
    _arc(p, x1 - r, y1 - r, r, 0, 90)
    p.lineTo((x0 + r, y1))
    _arc(p, x0 + r, y1 - r, r, 90, 180)
    p.lineTo((x0, y0 + r))
    _arc(p, x0 + r, y0 + r, r, 180, 270)
    p.closePath()


def round_rect(p: TTGlyphPen, x0, y0, x1, y1, r=80):
    p.moveTo((x0 + r, y0))
    p.lineTo((x1 - r, y0))
    _arc(p, x1 - r, y0 + r, r, -90, 0)
    p.lineTo((x1, y1 - r))
    _arc(p, x1 - r, y1 - r, r, 0, 90)
    p.lineTo((x0 + r, y1))
    _arc(p, x0 + r, y1 - r, r, 90, 180)
    p.lineTo((x0, y0 + r))
    _arc(p, x0 + r, y0 + r, r, 180, 270)
    p.closePath()


def glyph_space():
    return pen().glyph(), EM_W // 2


def glyph_A():
    p = pen()
    # two diagonals as thick rounded bars + crossbar — simplified as trapezoid ring
    # Outer triangle-ish blob
    p.moveTo((60, 80))
    p.lineTo((EM_W // 2 - 30, 780))
    p.lineTo((EM_W // 2 + 30, 780))
    p.lineTo((EM_W - 60, 80))
    p.lineTo((EM_W - 200, 80))
    p.lineTo((EM_W // 2, 560))
    p.lineTo((200, 80))
    p.closePath()
    # crossbar
    horiz_bar(p, 280, 160, EM_W - 160, 100)
    return p.glyph(), EM_W


def glyph_O():
    p = pen()
    cx, cy = EM_W / 2, 400
    ring(p, cx, cy, 300, 160)
    return p.glyph(), EM_W


def glyph_B():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    # upper and lower bowls as rings offset
    ring(p, 340, 540, 170, 85)
    ring(p, 360, 240, 190, 95)
    return p.glyph(), EM_W


def glyph_C():
    p = pen()
    cx, cy = EM_W / 2 + 20, 400
    # open ring: full ring then cut with reverse (approx open C via arc path)
    p.moveTo((cx + 200, cy + 180))
    steps = 20
    for i in range(steps + 1):
        a = math.radians(50 + 260 * i / steps)
        p.lineTo((cx + 280 * math.cos(a), cy + 280 * math.sin(a)))
    for i in range(steps, -1, -1):
        a = math.radians(50 + 260 * i / steps)
        p.lineTo((cx + 150 * math.cos(a), cy + 150 * math.sin(a)))
    p.closePath()
    return p.glyph(), EM_W


def glyph_D():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    # right bowl
    cx, cy = 300, 400
    p.moveTo((180, 720))
    for i in range(0, 17):
        a = math.radians(90 - 180 * i / 16)
        p.lineTo((cx + 280 * math.cos(a), cy + 320 * math.sin(a)))
    p.lineTo((180, 80))
    p.lineTo((180, 200))
    for i in range(16, -1, -1):
        a = math.radians(90 - 180 * i / 16)
        p.lineTo((cx + 150 * math.cos(a), cy + 200 * math.sin(a)))
    p.lineTo((180, 600))
    p.closePath()
    return p.glyph(), EM_W


def glyph_E():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    horiz_bar(p, 720 - 70, 120, EM_W - 80, 120)
    horiz_bar(p, 400, 120, EM_W - 160, 110)
    horiz_bar(p, 80 + 70, 120, EM_W - 80, 120)
    return p.glyph(), EM_W


def glyph_H():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    vert_bar(p, EM_W - 140, 80, 720, 130)
    horiz_bar(p, 400, 140, EM_W - 140, 120)
    return p.glyph(), EM_W


def glyph_I():
    p = pen()
    vert_bar(p, EM_W // 2, 80, 720, 140)
    return p.glyph(), EM_W - 80


def glyph_L():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    horiz_bar(p, 80 + 70, 120, EM_W - 80, 120)
    return p.glyph(), EM_W


def glyph_N():
    p = pen()
    vert_bar(p, 140, 80, 720, 120)
    vert_bar(p, EM_W - 140, 80, 720, 120)
    # diagonal
    p.moveTo((160, 720))
    p.lineTo((280, 720))
    p.lineTo((EM_W - 160, 80))
    p.lineTo((EM_W - 280, 80))
    p.closePath()
    return p.glyph(), EM_W


def glyph_P():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    ring(p, 340, 540, 180, 90)
    return p.glyph(), EM_W


def glyph_R():
    p = pen()
    vert_bar(p, 140, 80, 720, 130)
    ring(p, 340, 540, 170, 85)
    # leg
    p.moveTo((300, 380))
    p.lineTo((EM_W - 80, 80))
    p.lineTo((EM_W - 200, 80))
    p.lineTo((220, 380))
    p.closePath()
    return p.glyph(), EM_W


def glyph_S():
    p = pen()
    # two offset rings suggestion via S curve blob
    # upper bowl
    ring(p, 340, 560, 160, 80)
    # lower bowl
    ring(p, 300, 220, 170, 85)
    # connector bar
    horiz_bar(p, 400, 160, EM_W - 160, 100)
    return p.glyph(), EM_W


def glyph_T():
    p = pen()
    vert_bar(p, EM_W // 2, 80, 600, 140)
    horiz_bar(p, 720 - 70, 80, EM_W - 80, 130)
    return p.glyph(), EM_W


def glyph_U():
    p = pen()
    # U as thick horseshoe
    cx, cy = EM_W / 2, 380
    p.moveTo((120, 720))
    p.lineTo((120, 320))
    for i in range(0, 17):
        a = math.radians(180 + 180 * i / 16)
        p.lineTo((cx + 240 * math.cos(a), cy + 220 * math.sin(a)))
    p.lineTo((EM_W - 120, 720))
    p.lineTo((EM_W - 250, 720))
    p.lineTo((EM_W - 250, 340))
    for i in range(16, -1, -1):
        a = math.radians(180 + 180 * i / 16)
        p.lineTo((cx + 110 * math.cos(a), cy + 100 * math.sin(a)))
    p.lineTo((250, 720))
    p.closePath()
    return p.glyph(), EM_W


def glyph_Y():
    p = pen()
    # V top + stem
    p.moveTo((80, 720))
    p.lineTo((200, 720))
    p.lineTo((EM_W // 2, 400))
    p.lineTo((EM_W - 200, 720))
    p.lineTo((EM_W - 80, 720))
    p.lineTo((EM_W // 2 + 40, 340))
    p.lineTo((EM_W // 2 + 40, 80))
    p.lineTo((EM_W // 2 - 40, 80))
    p.lineTo((EM_W // 2 - 40, 340))
    p.closePath()
    return p.glyph(), EM_W


def glyph_dot():
    p = pen()
    circle(p, EM_W // 2, 160, 70)
    return p.glyph(), EM_W // 2


def glyph_excl():
    p = pen()
    vert_bar(p, EM_W // 2, 280, 720, 120)
    circle(p, EM_W // 2, 140, 70)
    return p.glyph(), EM_W // 2 + 40


def make_digit(n: int):
    """Bold rounded digits — each distinct (old 2–9 shared one blob and looked broken)."""
    p = pen()
    cx = EM_W / 2
    if n == 0:
        ring(p, cx, 400, 280, 145)
    elif n == 1:
        vert_bar(p, int(cx + 20), 100, 720, 150)
        # top serif flag
        p.moveTo((cx - 80, 560))
        p.lineTo((cx + 40, 720))
        p.lineTo((cx + 95, 720))
        p.lineTo((cx - 20, 540))
        p.closePath()
        horiz_bar(p, 140, int(cx - 100), int(cx + 120), 110)
    elif n == 2:
        # top bowl + diagonal + base
        ring(p, cx + 10, 560, 170, 80)
        p.moveTo((EM_W - 120, 480))
        p.lineTo((EM_W - 200, 480))
        p.lineTo((140, 160))
        p.lineTo((240, 160))
        p.closePath()
        horiz_bar(p, 140, 100, EM_W - 100, 120)
    elif n == 3:
        ring(p, cx + 20, 560, 160, 75)
        ring(p, cx + 20, 240, 180, 85)
        vert_bar(p, int(EM_W - 160), 200, 600, 100)
    elif n == 4:
        # open triangle + stem + crossbar
        vert_bar(p, int(EM_W - 160), 80, 720, 140)
        p.moveTo((100, 420))
        p.lineTo((EM_W - 200, 720))
        p.lineTo((EM_W - 320, 720))
        p.lineTo((160, 420))
        p.closePath()
        horiz_bar(p, 360, 100, EM_W - 100, 120)
    elif n == 5:
        horiz_bar(p, 680, 120, EM_W - 100, 120)
        vert_bar(p, 160, 380, 720, 120)
        horiz_bar(p, 420, 140, EM_W - 140, 110)
        ring(p, cx + 10, 240, 180, 90)
    elif n == 6:
        ring(p, cx, 260, 190, 95)
        # upper open
        p.moveTo((140, 720))
        p.lineTo((140, 360))
        for i in range(0, 13):
            a = math.radians(180 + 120 * i / 12)
            p.lineTo((cx + 240 * math.cos(a), 480 + 220 * math.sin(a)))
        p.lineTo((EM_W - 160, 640))
        p.lineTo((EM_W - 280, 640))
        for i in range(12, -1, -1):
            a = math.radians(180 + 120 * i / 12)
            p.lineTo((cx + 120 * math.cos(a), 480 + 100 * math.sin(a)))
        p.lineTo((260, 720))
        p.closePath()
    elif n == 7:
        horiz_bar(p, 680, 100, EM_W - 100, 130)
        p.moveTo((EM_W - 120, 620))
        p.lineTo((EM_W - 220, 620))
        p.lineTo((160, 80))
        p.lineTo((280, 80))
        p.closePath()
    elif n == 8:
        ring(p, cx, 540, 175, 85)
        ring(p, cx, 240, 195, 95)
    elif n == 9:
        ring(p, cx, 540, 190, 95)
        p.moveTo((EM_W - 140, 80))
        p.lineTo((EM_W - 140, 440))
        for i in range(0, 13):
            a = math.radians(0 - 120 * i / 12)
            p.lineTo((cx + 240 * math.cos(a), 320 + 220 * math.sin(a)))
        p.lineTo((160, 160))
        p.lineTo((280, 160))
        for i in range(12, -1, -1):
            a = math.radians(0 - 120 * i / 12)
            p.lineTo((cx + 120 * math.cos(a), 320 + 100 * math.sin(a)))
        p.lineTo((EM_W - 260, 80))
        p.closePath()
    else:
        round_rect(p, 100, 80, EM_W - 100, 720, 120)
    return p.glyph(), EM_W


# Map remaining letters to composites of primitives (readable enough for display)
def simple_letter(kind: str):
    builders = {
        "A": glyph_A,
        "B": glyph_B,
        "C": glyph_C,
        "D": glyph_D,
        "E": glyph_E,
        "F": lambda: (lambda: (vert_bar(pen(), 140, 80, 720, 130) or glyph_E()) )(),  # noqa
        "H": glyph_H,
        "I": glyph_I,
        "L": glyph_L,
        "N": glyph_N,
        "O": glyph_O,
        "P": glyph_P,
        "R": glyph_R,
        "S": glyph_S,
        "T": glyph_T,
        "U": glyph_U,
        "Y": glyph_Y,
    }
    if kind in builders and kind != "F":
        return builders[kind]()
    # F
    if kind == "F":
        p = pen()
        vert_bar(p, 140, 80, 720, 130)
        horiz_bar(p, 720 - 70, 120, EM_W - 80, 120)
        horiz_bar(p, 400, 120, EM_W - 160, 110)
        return p.glyph(), EM_W
    # G
    if kind == "G":
        g, w = glyph_C()
        p = pen()
        # reuse C-like open + spur
        cx, cy = EM_W / 2 + 20, 400
        p.moveTo((cx + 200, cy + 180))
        steps = 20
        for i in range(steps + 1):
            a = math.radians(40 + 280 * i / steps)
            p.lineTo((cx + 280 * math.cos(a), cy + 280 * math.sin(a)))
        for i in range(steps, -1, -1):
            a = math.radians(40 + 280 * i / steps)
            p.lineTo((cx + 150 * math.cos(a), cy + 150 * math.sin(a)))
        p.closePath()
        horiz_bar(p, 400, EM_W // 2, EM_W - 100, 100)
        return p.glyph(), EM_W
    # J
    if kind == "J":
        p = pen()
        vert_bar(p, EM_W // 2 + 40, 280, 720, 130)
        # bottom hook
        cx, cy = EM_W / 2 - 20, 280
        p.moveTo((EM_W // 2 + 100, 320))
        for i in range(0, 13):
            a = math.radians(0 - 180 * i / 12)
            p.lineTo((cx + 200 * math.cos(a), cy + 180 * math.sin(a)))
        for i in range(12, -1, -1):
            a = math.radians(0 - 180 * i / 12)
            p.lineTo((cx + 90 * math.cos(a), cy + 80 * math.sin(a)))
        p.closePath()
        return p.glyph(), EM_W
    # K
    if kind == "K":
        p = pen()
        vert_bar(p, 140, 80, 720, 130)
        p.moveTo((200, 420))
        p.lineTo((EM_W - 80, 720))
        p.lineTo((EM_W - 220, 720))
        p.lineTo((280, 400))
        p.lineTo((EM_W - 80, 80))
        p.lineTo((EM_W - 220, 80))
        p.closePath()
        return p.glyph(), EM_W
    # M
    if kind == "M":
        p = pen()
        vert_bar(p, 120, 80, 720, 110)
        vert_bar(p, EM_W - 120, 80, 720, 110)
        p.moveTo((120, 720))
        p.lineTo((220, 720))
        p.lineTo((EM_W // 2, 280))
        p.lineTo((EM_W - 220, 720))
        p.lineTo((EM_W - 120, 720))
        p.lineTo((EM_W // 2, 160))
        p.closePath()
        return p.glyph(), EM_W + 40
    # Q
    if kind == "Q":
        g, w = glyph_O()
        p = pen()
        ring(p, EM_W / 2, 400, 300, 160)
        p.moveTo((EM_W // 2 + 40, 280))
        p.lineTo((EM_W - 80, 80))
        p.lineTo((EM_W - 200, 80))
        p.lineTo((EM_W // 2 - 40, 300))
        p.closePath()
        return p.glyph(), EM_W
    # V
    if kind == "V":
        p = pen()
        p.moveTo((60, 720))
        p.lineTo((180, 720))
        p.lineTo((EM_W // 2, 120))
        p.lineTo((EM_W - 180, 720))
        p.lineTo((EM_W - 60, 720))
        p.lineTo((EM_W // 2, 80))
        p.closePath()
        return p.glyph(), EM_W
    # W
    if kind == "W":
        p = pen()
        p.moveTo((40, 720))
        p.lineTo((140, 720))
        p.lineTo((EM_W * 0.28, 160))
        p.lineTo((EM_W // 2, 480))
        p.lineTo((EM_W * 0.72, 160))
        p.lineTo((EM_W - 140, 720))
        p.lineTo((EM_W - 40, 720))
        p.lineTo((EM_W * 0.75, 80))
        p.lineTo((EM_W // 2, 400))
        p.lineTo((EM_W * 0.25, 80))
        p.closePath()
        return p.glyph(), EM_W + 60
    # X
    if kind == "X":
        p = pen()
        p.moveTo((80, 720))
        p.lineTo((200, 720))
        p.lineTo((EM_W // 2, 460))
        p.lineTo((EM_W - 200, 720))
        p.lineTo((EM_W - 80, 720))
        p.lineTo((EM_W // 2 + 60, 400))
        p.lineTo((EM_W - 80, 80))
        p.lineTo((EM_W - 200, 80))
        p.lineTo((EM_W // 2, 340))
        p.lineTo((200, 80))
        p.lineTo((80, 80))
        p.lineTo((EM_W // 2 - 60, 400))
        p.closePath()
        return p.glyph(), EM_W
    # Z
    if kind == "Z":
        p = pen()
        horiz_bar(p, 720 - 70, 80, EM_W - 80, 120)
        horiz_bar(p, 80 + 70, 80, EM_W - 80, 120)
        p.moveTo((EM_W - 120, 640))
        p.lineTo((EM_W - 220, 640))
        p.lineTo((180, 160))
        p.lineTo((280, 160))
        p.closePath()
        return p.glyph(), EM_W
    # fallback blob
    p = pen()
    round_rect(p, 80, 80, EM_W - 80, 720, 140)
    return p.glyph(), EM_W


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    glyphs = {".notdef": pen().glyph()}
    advance = {".notdef": EM_W}
    cmap = {}

    # space
    g, w = glyph_space()
    glyphs["space"] = g
    advance["space"] = w
    cmap[0x20] = "space"

    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        g, w = simple_letter(ch)
        name = ch
        glyphs[name] = g
        advance[name] = int(w)
        cmap[ord(ch)] = name
        # map lowercase to same glyph (display face)
        cmap[ord(ch.lower())] = name

    for d in range(10):
        g, w = make_digit(d)
        name = f"digit{d}"
        glyphs[name] = g
        advance[name] = int(w)
        cmap[ord(str(d))] = name

    g, w = glyph_excl()
    glyphs["exclam"] = g
    advance["exclam"] = int(w)
    cmap[ord("!")] = "exclam"

    g, w = glyph_dot()
    glyphs["period"] = g
    advance["period"] = int(w)
    cmap[ord(".")] = "period"

    # hyphen / dashes
    p = pen()
    horiz_bar(p, 400, 100, EM_W - 100, 110)
    glyphs["hyphen"] = p.glyph()
    advance["hyphen"] = EM_W - 40
    for code in (ord("-"), 0x2013, 0x2014):
        cmap[code] = "hyphen"

    def add(name: str, codes, glyph, adv: float):
        glyphs[name] = glyph
        advance[name] = int(adv)
        if isinstance(codes, int):
            codes = [codes]
        for c in codes:
            cmap[c if isinstance(c, int) else ord(c)] = name

    # comma
    p = pen(); circle(p, EM_W / 2, 220, 55); round_rect(p, EM_W / 2 - 25, 40, EM_W / 2 + 55, 200, 28)
    add("comma", ord(","), p.glyph(), EM_W * 0.4)
    # colon
    p = pen(); circle(p, EM_W / 2, 520, 55); circle(p, EM_W / 2, 280, 55)
    add("colon", ord(":"), p.glyph(), EM_W * 0.4)
    # quotes
    p = pen(); round_rect(p, EM_W / 2 - 40, 480, EM_W / 2 + 40, 720, 30)
    add("quotesingle", [ord("'"), 0x2018, 0x2019], p.glyph(), EM_W * 0.35)
    p = pen(); round_rect(p, 160, 480, 260, 720, 30); round_rect(p, 340, 480, 440, 720, 30)
    add("quotedbl", [ord('"'), 0x201C, 0x201D], p.glyph(), EM_W * 0.55)
    # slash
    p = pen(); p.moveTo((140, 80)); p.lineTo((280, 80)); p.lineTo((EM_W - 140, 720)); p.lineTo((EM_W - 280, 720)); p.closePath()
    add("slash", [ord("/"), ord("\\")], p.glyph(), EM_W * 0.5)
    # plus / equal
    p = pen(); horiz_bar(p, 400, 120, EM_W - 120, 120); vert_bar(p, EM_W / 2, 160, 640, 120)
    add("plus", ord("+"), p.glyph(), EM_W * 0.7)
    p = pen(); horiz_bar(p, 480, 120, EM_W - 120, 100); horiz_bar(p, 320, 120, EM_W - 120, 100)
    add("equal", ord("="), p.glyph(), EM_W * 0.7)
    # middle dot (progress separators)
    p = pen(); circle(p, EM_W / 2, 400, 70)
    add("periodcentered", [0xB7, 0x2022], p.glyph(), EM_W * 0.4)
    # percent
    p = pen(); circle(p, 180, 560, 90); circle(p, EM_W - 180, 240, 90)
    p.moveTo((160, 120)); p.lineTo((280, 120)); p.lineTo((EM_W - 160, 680)); p.lineTo((EM_W - 280, 680)); p.closePath()
    add("percent", ord("%"), p.glyph(), EM_W)
    # question
    p = pen()
    cx, cy = EM_W / 2, 520
    p.moveTo((cx + 200, cy + 40))
    for i in range(21):
        a = math.radians(40 + 250 * i / 20)
        p.lineTo((cx + 160 * math.cos(a), cy + 160 * math.sin(a)))
    for i in range(20, -1, -1):
        a = math.radians(40 + 250 * i / 20)
        p.lineTo((cx + 70 * math.cos(a), cy + 70 * math.sin(a)))
    p.closePath()
    vert_bar(p, EM_W / 2, 200, 360, 100)
    circle(p, EM_W / 2, 120, 50)
    add("question", ord("?"), p.glyph(), EM_W)
    # parens
    p = pen()
    cx, cy = EM_W / 2 + 40, 400
    p.moveTo((cx + 80, cy + 280))
    for i in range(17):
        a = math.radians(90 + 180 * i / 16)
        p.lineTo((cx + 200 * math.cos(a), cy + 300 * math.sin(a)))
    for i in range(16, -1, -1):
        a = math.radians(90 + 180 * i / 16)
        p.lineTo((cx + 100 * math.cos(a), cy + 220 * math.sin(a)))
    p.closePath()
    add("parenleft", ord("("), p.glyph(), EM_W * 0.45)
    p = pen()
    cx, cy = EM_W / 2 - 40, 400
    p.moveTo((cx - 80, cy + 280))
    for i in range(17):
        a = math.radians(-90 + 180 * i / 16)
        p.lineTo((cx + 200 * math.cos(a), cy + 300 * math.sin(a)))
    for i in range(16, -1, -1):
        a = math.radians(-90 + 180 * i / 16)
        p.lineTo((cx + 100 * math.cos(a), cy + 220 * math.sin(a)))
    p.closePath()
    add("parenright", ord(")"), p.glyph(), EM_W * 0.45)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder([".notdef"] + [n for n in glyphs if n != ".notdef"])
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    metrics = {}
    for name, g in glyphs.items():
        metrics[name] = (advance.get(name, EM_W), 0)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT)
    fb.setupNameTable(
        {
            "familyName": "Tidepop",
            "styleName": "Bold",
            "uniqueFontIdentifier": "Tidepop Bold:Departure Bay Digital:2026",
            "fullName": "Tidepop Bold",
            "psName": "Tidepop-Bold",
            "version": "Version 1.000",
            "description": (
                "Original casual display face for mobile match-3 UI. "
                "Geometric rounded construction. Not affiliated with Bon Bons Crush Legend "
                "or any third-party candy fonts. OFL 1.1."
            ),
            "manufacturer": "Departure Bay Digital",
            "designer": "Departure Bay Digital (procedural)",
            "licenseDescription": "SIL Open Font License 1.1",
            "licenseInfoURL": "https://scripts.sil.org/OFL",
        }
    )
    fb.setupOS2(
        sTypoAscender=ASCENT,
        sTypoDescender=DESCENT,
        usWinAscent=ASCENT,
        usWinDescent=-DESCENT,
        achVendID="DBDG",
    )
    fb.setupPost()

    ttf_path = OUT_DIR / "Tidepop-Bold.ttf"
    fb.save(str(ttf_path))

    ofl = OUT_DIR / "OFL.txt"
    ofl.write_text(
        """Copyright 2026 Departure Bay Digital

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is available with a FAQ at: https://scripts.sil.org/OFL

Tidepop is an original geometric display face. It is NOT a modification of
Bon Bons Crush Legend or any other commercial candy/match-3 typeface.
""",
        encoding="utf-8",
    )
    print("Wrote", ttf_path)
    return ttf_path


if __name__ == "__main__":
    build()
