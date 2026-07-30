"""
CRYSTALLINE — checkerboard alpha keying.

The source JPEGs (and three of the four VFX clips) carry a *fake* transparency
checkerboard baked into the pixels: two flat neutral greys in a ~41px grid.
JPEG/H.264 have no alpha, so the "transparent" background is literally painted.

This module recovers a real alpha channel from that. It is deliberately free of
any project-specific knowledge so it can be unit-tested on its own:

    from key_alpha import key_rgb
    rgba = key_rgb(np.asarray(Image.open(path).convert("RGB")))

Algorithm
---------
1.  Measure the two background luminance modes from a 6px border ring, *per
    image* — they differ from file to file (~135/191 for the golden gem,
    ~174/224 for most others).
2.  Strict candidate mask: neutral (saturation < 8) and within +/-14 of either
    mode.
3.  Border-connected flood fill (RLE span BFS) over that mask. Connectivity is
    essential: a naive threshold eats grey/white specular highlights *inside*
    the crystal. Only pixels reachable from the image border are background.
4.  From that seed, fit a smooth *per-block* two-class background colour field.
    This models low-frequency contamination — the golden gem's glow spills a
    warm cast over a wide radius of checkerboard, which a global threshold
    cannot see.
5.  Re-flood with the relaxed, field-relative residual, and derive a soft alpha
    from the residual ramp.
6.  Un-premultiply against the fitted background: a boundary pixel is
    `P = a*C + (1-a)*B`, so `C = (P - (1-a)*B) / a`. This removes the grey
    fringe *and* correctly recovers translucent glow colour, instead of just
    eroding it away.

No scipy: the flood fill is a run-length-encoded span BFS implemented here.
"""

from __future__ import annotations

import numpy as np

# --- tuning ---------------------------------------------------------------

BORDER_RING = 6          # px of border sampled to find the background modes
STRICT_SAT = 8           # max chroma for a "definitely neutral grey" pixel
STRICT_LUM_TOL = 14      # +/- around each detected mode
BLOCK = 64               # background field block size (> the ~41px checker cell)
RESID_LO = 8.0           # residual at/below which a pixel is fully background
RESID_HI = 34.0          # residual at/above which a pixel is fully foreground
MIN_BLOCK_SEEDS = 48     # seed pixels needed before a block's fit is trusted


# --------------------------------------------------------------------------
# Flood fill (RLE span BFS) — no scipy, and far faster than iterated dilation.
# --------------------------------------------------------------------------

def _encode_runs(cand: np.ndarray):
    """Run-length encode a boolean mask, row by row.

    Working on spans rather than pixels is what makes the fill fast: a
    2048x2048 frame collapses to a few thousand runs.
    """
    h, w = cand.shape
    starts: list[np.ndarray] = []
    ends: list[np.ndarray] = []
    row_off = np.zeros(h + 1, dtype=np.int64)

    for y in range(h):
        row = cand[y]
        if not row.any():
            starts.append(np.empty(0, np.int32))
            ends.append(np.empty(0, np.int32))
            row_off[y + 1] = row_off[y]
            continue
        d = np.diff(row.astype(np.int8))
        s = np.flatnonzero(d == 1) + 1
        e = np.flatnonzero(d == -1)
        if row[0]:
            s = np.concatenate(([0], s))
        if row[-1]:
            e = np.concatenate((e, [w - 1]))
        starts.append(s.astype(np.int32))
        ends.append(e.astype(np.int32))
        row_off[y + 1] = row_off[y] + len(s)

    total = int(row_off[h])
    run_row = np.zeros(total, dtype=np.int32)
    for y in range(h):
        run_row[row_off[y]:row_off[y + 1]] = y
    return starts, ends, row_off, run_row, total, h, w


def _decode_runs(rt, visited: np.ndarray) -> np.ndarray:
    starts, ends, row_off, _run_row, _total, h, w = rt
    out = np.zeros((h, w), bool)
    for y in range(h):
        base = int(row_off[y])
        s, e = starts[y], ends[y]
        for i in range(len(s)):
            if visited[base + i]:
                out[y, s[i]:e[i] + 1] = True
    return out


def _grow(rt, visited: np.ndarray, stack: list[int]) -> int:
    """4-connected BFS over runs. Returns the pixel area reached this call."""
    starts, ends, row_off, run_row, _total, h, _w = rt
    area = 0
    while stack:
        idx = stack.pop()
        y = int(run_row[idx])
        i = idx - int(row_off[y])
        lo, hi = int(starts[y][i]), int(ends[y][i])
        area += hi - lo + 1
        for ny in (y - 1, y + 1):
            if ny < 0 or ny >= h:
                continue
            s, e = starts[ny], ends[ny]
            if len(s) == 0:
                continue
            j = int(np.searchsorted(s, hi, side="right")) - 1
            base = int(row_off[ny])
            while j >= 0 and e[j] >= lo:
                if not visited[base + j]:
                    visited[base + j] = True
                    stack.append(base + j)
                j -= 1
    return area


def flood_from_border(cand: np.ndarray) -> np.ndarray:
    """Return the subset of ``cand`` that is 4-connected to the image border."""
    rt = _encode_runs(cand)
    starts, ends, row_off, _run_row, total, h, w = rt
    if total == 0:
        return np.zeros_like(cand)
    visited = np.zeros(total, dtype=bool)
    stack: list[int] = []
    for y in range(h):
        s, e = starts[y], ends[y]
        if len(s) == 0:
            continue
        base = int(row_off[y])
        touching = range(len(s)) if (y == 0 or y == h - 1) else (0, len(s) - 1)
        for i in touching:
            if y in (0, h - 1) or s[i] == 0 or e[i] == w - 1:
                if not visited[base + i]:
                    visited[base + i] = True
                    stack.append(base + i)
    _grow(rt, visited, stack)
    return _decode_runs(rt, visited)


def keep_large_components(mask: np.ndarray, min_area: int) -> np.ndarray:
    """Drop 4-connected components of ``mask`` smaller than ``min_area`` px."""
    rt = _encode_runs(mask)
    _starts, _ends, _row_off, _run_row, total, _h, _w = rt
    if total == 0:
        return mask
    seen = np.zeros(total, dtype=bool)
    keep = np.zeros(total, dtype=bool)
    for r in range(total):
        if seen[r]:
            continue
        comp = np.zeros(total, dtype=bool)
        comp[r] = True
        seen[r] = True
        before = seen.copy()
        area = _grow(rt, seen, [r])
        members = seen & ~before
        members[r] = True
        if area >= min_area:
            keep |= members
    return _decode_runs(rt, keep)


# --------------------------------------------------------------------------
# Background analysis
# --------------------------------------------------------------------------

def detect_modes(rgb: np.ndarray, ring: int = BORDER_RING) -> tuple[float, float]:
    """Detect the two checkerboard luminance modes from the border ring."""
    lum = luminance(rgb)
    sat = chroma(rgb)
    mask = np.zeros(rgb.shape[:2], bool)
    mask[:ring] = mask[-ring:] = True
    mask[:, :ring] = mask[:, -ring:] = True
    mask &= sat < STRICT_SAT + 4
    vals = lum[mask]
    if vals.size < 100:
        vals = lum[:ring].ravel()
    hist, _ = np.histogram(vals, bins=256, range=(0, 256))
    # 3-tap smooth so JPEG noise doesn't split a peak
    hist = np.convolve(hist.astype(np.float64), [1, 2, 3, 2, 1], mode="same")
    peaks: list[int] = []
    for i in np.argsort(hist)[::-1]:
        if all(abs(int(i) - p) > 15 for p in peaks):
            peaks.append(int(i))
        if len(peaks) == 2:
            break
    if len(peaks) < 2:
        peaks.append(peaks[0] + 40)
    return tuple(sorted(float(p) for p in peaks))  # type: ignore[return-value]


def luminance(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32)
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def chroma(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.int16)
    return (a.max(2) - a.min(2)).astype(np.float32)


def _fit_field(rgb: np.ndarray, seed: np.ndarray, block: int = BLOCK):
    """Fit per-block dark/light background colours from the seed mask.

    Returns two float32 HxWx3 arrays (dark class, light class) covering the
    whole image, with unseeded blocks filled by neighbour propagation so the
    field stays smooth and defined everywhere.
    """
    h, w = seed.shape
    by, bx = (h + block - 1) // block, (w + block - 1) // block
    dark = np.full((by, bx, 3), np.nan, np.float32)
    light = np.full((by, bx, 3), np.nan, np.float32)
    lum = luminance(rgb)
    rgbf = rgb.astype(np.float32)

    for j in range(by):
        for i in range(bx):
            sl = (slice(j * block, min((j + 1) * block, h)),
                  slice(i * block, min((i + 1) * block, w)))
            m = seed[sl]
            n = int(m.sum())
            if n < MIN_BLOCK_SEEDS:
                continue
            lv = lum[sl][m]
            cv = rgbf[sl][m]
            mid = 0.5 * (lv.min() + lv.max())
            lo, hi = lv < mid, lv >= mid
            if lo.sum() < 8 or hi.sum() < 8:
                # Block sits inside a single checker cell — one class only.
                mean = cv.mean(0)
                if lv.mean() < mid:
                    dark[j, i] = mean
                else:
                    light[j, i] = mean
                continue
            dark[j, i] = cv[lo].mean(0)
            light[j, i] = cv[hi].mean(0)

    dark = _fill_nan(dark)
    light = _fill_nan(light)
    return _upsample(dark, h, w), _upsample(light, h, w)


def _fill_nan(f: np.ndarray) -> np.ndarray:
    """Propagate values into NaN cells by repeated 4-neighbour averaging."""
    f = f.copy()
    if np.isnan(f).all():
        return np.zeros_like(f)
    for _ in range(max(f.shape[:2]) * 2):
        bad = np.isnan(f[..., 0])
        if not bad.any():
            break
        acc = np.zeros_like(f)
        cnt = np.zeros(f.shape[:2], np.float32)
        good = ~bad
        vals = np.where(good[..., None], f, 0.0)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(vals, (dy, dx), (0, 1))
            cnt += np.roll(good.astype(np.float32), (dy, dx), (0, 1))
        upd = bad & (cnt > 0)
        f[upd] = acc[upd] / cnt[upd][:, None]
    return np.nan_to_num(f, nan=float(np.nanmean(f)) if not np.isnan(f).all() else 0.0)


def _upsample(f: np.ndarray, h: int, w: int) -> np.ndarray:
    """Smooth bilinear upsample of a small RGB field to full resolution."""
    from PIL import Image
    by, bx = f.shape[:2]
    if by == 1 and bx == 1:
        return np.broadcast_to(f[0, 0], (h, w, 3)).astype(np.float32).copy()
    im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), "RGB")
    # Blow up with half-block offset so block centres land correctly.
    big = im.resize((bx * BLOCK, by * BLOCK), Image.BICUBIC)
    return np.asarray(big).astype(np.float32)[:h, :w]


# --------------------------------------------------------------------------
# Main entry point
# --------------------------------------------------------------------------

def key_rgb(
    rgb: np.ndarray,
    *,
    resid_lo: float = RESID_LO,
    resid_hi: float = RESID_HI,
    feather: float = 0.7,
    modes: tuple[float, float] | None = None,
    return_debug: bool = False,
):
    """Key a baked checkerboard background out of an RGB array.

    Parameters
    ----------
    rgb : HxWx3 uint8
    modes : optionally reuse modes measured on another frame (video sequences)
    """
    from PIL import Image, ImageFilter

    if rgb.ndim != 3 or rgb.shape[2] != 3:
        raise ValueError("key_rgb expects HxWx3 RGB")
    h, w = rgb.shape[:2]
    lum = luminance(rgb)
    sat = chroma(rgb)

    m_lo, m_hi = modes if modes is not None else detect_modes(rgb)

    strict = (sat < STRICT_SAT) & (
        (np.abs(lum - m_lo) <= STRICT_LUM_TOL) | (np.abs(lum - m_hi) <= STRICT_LUM_TOL)
    )
    seed = flood_from_border(strict)

    if seed.sum() < 0.01 * h * w:
        # Nothing that looks like a checkerboard — leave it fully opaque.
        out = np.dstack([rgb, np.full((h, w), 255, np.uint8)])
        return (out, {"modes": (m_lo, m_hi), "keyed": False}) if return_debug else out

    rgbf = rgb.astype(np.float32)

    def residual(fit_seed: np.ndarray):
        dark_f, light_f = _fit_field(rgb, fit_seed)
        # A background pixel is the dark grey, the light grey, OR any blend of
        # the two — the checker cell edges are 1-2px ramps between them, and
        # treating only the endpoints as background leaves a visible grid of
        # noise. So the residual is the distance to the *segment* D->L.
        seg = light_f - dark_f
        denom = np.maximum((seg * seg).sum(2), 1e-3)
        t = np.clip(((rgbf - dark_f) * seg).sum(2) / denom, 0.0, 1.0)[..., None]
        b = dark_f + t * seg
        return np.abs(rgbf - b).max(2), b

    resid, bg = residual(seed)
    region = flood_from_border((resid < resid_hi) | strict)
    ramp = np.clip((resid - resid_lo) / (resid_hi - resid_lo), 0.0, 1.0)

    # Second pass. Where a coloured glow spills over the checkerboard (the
    # golden and violet gems both do this, over a wide radius) the first fit is
    # biased by uncontaminated blocks elsewhere, so the checker stays faintly
    # visible inside the glow. Refitting on the *found* background — minus the
    # pixels that already read as mostly-foreground — lets each block learn its
    # own local cast and flattens the residue out.
    for _ in range(2):
        seed_n = region & (ramp < 0.6)
        if seed_n.sum() < 0.02 * h * w:
            break
        resid, bg = residual(seed_n)
        region = flood_from_border((resid < resid_hi) | strict)
        ramp = np.clip((resid - resid_lo) / (resid_hi - resid_lo), 0.0, 1.0)

    alpha = np.ones((h, w), np.float32)
    alpha[region] = ramp[region]

    if feather > 0:
        aimg = Image.fromarray((alpha * 255).astype(np.uint8), "L")
        alpha = np.asarray(aimg.filter(ImageFilter.GaussianBlur(feather))).astype(np.float32) / 255.0

    # Un-premultiply against the fitted background to kill the grey fringe.
    a = alpha[..., None]
    safe = np.maximum(a, 1e-3)
    colour = (rgbf - (1.0 - a) * bg) / safe
    colour = np.where(a > 0.004, colour, rgbf)
    colour = np.clip(colour, 0, 255)

    out = np.dstack([colour.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    if return_debug:
        return out, {
            "modes": (m_lo, m_hi),
            "keyed": True,
            "bg_fraction": float(region.mean()),
            "seed_fraction": float(seed.mean()),
        }
    return out


def content_bbox(rgba: np.ndarray, thresh: int = 8) -> tuple[int, int, int, int]:
    """Tight bounding box (l, t, r, b) of pixels with alpha above ``thresh``."""
    a = rgba[..., 3] > thresh
    if not a.any():
        return (0, 0, rgba.shape[1], rgba.shape[0])
    ys = np.flatnonzero(a.any(1))
    xs = np.flatnonzero(a.any(0))
    return (int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1)


def key_image(path: str, trim: bool = True):
    """Convenience: key a file on disk, returning a trimmed RGBA PIL image."""
    from PIL import Image
    rgb = np.asarray(Image.open(path).convert("RGB"))
    rgba, dbg = key_rgb(rgb, return_debug=True)
    if trim:
        l, t, r, b = content_bbox(rgba)
        rgba = rgba[t:b, l:r]
    return Image.fromarray(rgba, "RGBA"), dbg


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    import sys
    from PIL import Image
    for p in sys.argv[1:]:
        im, dbg = key_image(p)
        print(p, im.size, dbg)
        im.save("/tmp/keyed.png")
