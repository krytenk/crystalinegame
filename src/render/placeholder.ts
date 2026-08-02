/**
 * CRYSTALLINE — procedural placeholder art.
 *
 * The Python asset pipeline in `tools/` generates `public/gen/*` concurrently with
 * this workstream, and may not have run at all. Rather than rendering a broken
 * board, `atlas.ts` falls back to this module, which draws every frame key as a
 * vector crystal: the colour's own silhouette (SILHOUETTE in engine/types.ts), a
 * faceted gradient fill, a specular highlight and a dark rim.
 *
 * It is intended to look *deliberate*. High-contrast borders and one distinct
 * silhouette per colour are exactly what the design doc asks for, so the game is
 * genuinely playable and legible before any art lands.
 *
 * Each key is rasterised ONCE into a small cache canvas and thereafter blitted, so
 * there is no gradient or path construction in the per-frame hot path.
 */

import { CRYSTAL_COLORS, SILHOUETTE, type CrystalColor } from '@engine/types';

/** Fallback palette used when no manifest palette is available. */
export const DEFAULT_PALETTE: Readonly<Record<CrystalColor, string>> = {
  ember: '#ff5a44',
  aurum: '#ffb02e',
  solar: '#ffe25c',
  verdant: '#46d67f',
  tidal: '#38b0ff',
  void: '#a066ff',
} as const;

export const NEUTRAL = {
  prism: '#f2f4ff',
  stone: '#7c8399',
  bomb: '#39405a',
  relic: '#ffd679',
  crust: '#cfe4f5',
  shadow: '#150a24',
} as const;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

export const parseHex = (hex: string): Rgb => {
  const m6 = HEX6.exec(hex);
  if (m6 !== null) {
    return {
      r: parseInt(m6[1] ?? '00', 16),
      g: parseInt(m6[2] ?? '00', 16),
      b: parseInt(m6[3] ?? '00', 16),
    };
  }
  const m3 = HEX3.exec(hex);
  if (m3 !== null) {
    const d = (s: string): number => parseInt(s + s, 16);
    return { r: d(m3[1] ?? '0'), g: d(m3[2] ?? '0'), b: d(m3[3] ?? '0') };
  }
  return { r: 200, g: 200, b: 200 };
};

const clampByte = (n: number): number => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n));

/** `k` > 0 lightens toward white, `k` < 0 darkens toward black. */
export const shade = (hex: string, k: number): string => {
  const c = parseHex(hex);
  const t = k < 0 ? 0 : 255;
  const a = Math.abs(k);
  const r = clampByte(c.r + (t - c.r) * a);
  const g = clampByte(c.g + (t - c.g) * a);
  const b = clampByte(c.b + (t - c.b) * a);
  return `rgb(${r},${g},${b})`;
};

export const rgba = (hex: string, alpha: number): string => {
  const c = parseHex(hex);
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
};

// ---------------------------------------------------------------------------
// Silhouette paths, in unit space centred on (0,0), extent roughly +/- 0.46
// ---------------------------------------------------------------------------

type PathBuilder = (p: Path2D) => void;

const poly = (p: Path2D, pts: readonly (readonly [number, number])[]): void => {
  const first = pts[0];
  if (first === undefined) return;
  p.moveTo(first[0], first[1]);
  for (let i = 1; i < pts.length; i++) {
    const q = pts[i];
    if (q === undefined) continue;
    p.lineTo(q[0], q[1]);
  }
  p.closePath();
};

const ngon = (p: Path2D, sides: number, radius: number, rot: number): void => {
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
};

const roundRectPath = (p: Path2D, half: number, r: number): void => {
  const a = -half;
  const b = half;
  p.moveTo(a + r, a);
  p.lineTo(b - r, a);
  p.quadraticCurveTo(b, a, b, a + r);
  p.lineTo(b, b - r);
  p.quadraticCurveTo(b, b, b - r, b);
  p.lineTo(a + r, b);
  p.quadraticCurveTo(a, b, a, b - r);
  p.lineTo(a, a + r);
  p.quadraticCurveTo(a, a, a + r, a);
  p.closePath();
};

const BUILDERS: Readonly<Record<string, PathBuilder>> = {
  shard: (p) =>
    poly(p, [
      [0, -0.47],
      [0.27, -0.11],
      [0.19, 0.46],
      [-0.19, 0.46],
      [-0.27, -0.11],
    ]),
  hexagon: (p) => ngon(p, 6, 0.45, -Math.PI / 2),
  roundsquare: (p) => roundRectPath(p, 0.4, 0.13),
  teardrop: (p) => {
    p.moveTo(0, -0.47);
    p.bezierCurveTo(0.2, -0.24, 0.37, -0.05, 0.37, 0.11);
    p.arc(0, 0.11, 0.37, 0, Math.PI, false);
    p.bezierCurveTo(-0.37, -0.05, -0.2, -0.24, 0, -0.47);
    p.closePath();
  },
  diamond: (p) =>
    poly(p, [
      [0, -0.47],
      [0.41, 0],
      [0, 0.47],
      [-0.41, 0],
    ]),
  octagon: (p) => ngon(p, 8, 0.45, Math.PI / 8),
};

const pathCache = new Map<string, Path2D>();

const silhouettePath = (name: string): Path2D => {
  const hit = pathCache.get(name);
  if (hit !== undefined) return hit;
  const p = new Path2D();
  const build = BUILDERS[name] ?? BUILDERS['hexagon'];
  if (build !== undefined) build(p);
  pathCache.set(name, p);
  return p;
};

// ---------------------------------------------------------------------------
// Glyph paths (accessibility overlay), unit space, extent +/- 0.30
// ---------------------------------------------------------------------------

const GLYPH_BUILDERS: Readonly<Record<string, PathBuilder>> = {
  flame: (p) => {
    p.moveTo(0, -0.3);
    p.bezierCurveTo(0.2, -0.08, 0.26, 0.06, 0.16, 0.18);
    p.bezierCurveTo(0.08, 0.28, -0.08, 0.28, -0.16, 0.18);
    p.bezierCurveTo(-0.26, 0.06, -0.16, -0.04, -0.05, -0.12);
    p.bezierCurveTo(-0.03, -0.02, 0.02, 0.02, 0.06, -0.02);
    p.bezierCurveTo(0.08, -0.12, 0.02, -0.2, 0, -0.3);
    p.closePath();
  },
  ring: (p) => {
    p.arc(0, 0, 0.27, 0, Math.PI * 2);
    p.moveTo(0.15, 0);
    p.arc(0, 0, 0.15, 0, Math.PI * 2, true);
  },
  star: (p) => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.3 : 0.13;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
  },
  leaf: (p) => {
    p.moveTo(-0.26, 0.26);
    p.bezierCurveTo(-0.3, -0.1, -0.05, -0.3, 0.27, -0.27);
    p.bezierCurveTo(0.3, 0.05, 0.1, 0.3, -0.26, 0.26);
    p.closePath();
  },
  drop: (p) => {
    p.moveTo(0, -0.3);
    p.bezierCurveTo(0.16, -0.1, 0.24, 0.0, 0.24, 0.08);
    p.arc(0, 0.08, 0.24, 0, Math.PI, false);
    p.bezierCurveTo(-0.24, 0.0, -0.16, -0.1, 0, -0.3);
    p.closePath();
  },
  moon: (p) => {
    p.arc(0, 0, 0.28, Math.PI * 0.35, Math.PI * 1.65, false);
    p.bezierCurveTo(0.02, 0.16, 0.02, -0.16, -0.23, -0.16);
    p.closePath();
  },
};

const glyphPath = (name: string): Path2D => {
  const key = `glyph:${name}`;
  const hit = pathCache.get(key);
  if (hit !== undefined) return hit;
  const p = new Path2D();
  const build = GLYPH_BUILDERS[name] ?? GLYPH_BUILDERS['ring'];
  if (build !== undefined) build(p);
  pathCache.set(key, p);
  return p;
};

// ---------------------------------------------------------------------------
// Rasteriser
// ---------------------------------------------------------------------------

const canCanvas = (): boolean =>
  typeof document !== 'undefined' && typeof document.createElement === 'function';

interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const makeSurface = (px: number): Surface | null => {
  if (!canCanvas()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  // Unit space centred, 1 unit == the cell.
  ctx.translate(px / 2, px / 2);
  ctx.scale(px, px);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { canvas, ctx };
};

export class PlaceholderAtlas {
  private readonly cache = new Map<string, HTMLCanvasElement | null>();
  private palette: Record<CrystalColor, string> = { ...DEFAULT_PALETTE };
  private px = 128;

  constructor(px?: number) {
    if (px !== undefined) this.px = px;
  }

  /** Adopt the manifest palette (if one loaded) so procedural bits match the art. */
  setPalette(p: Partial<Record<CrystalColor, string>> | undefined): void {
    if (p === undefined) return;
    let changed = false;
    for (const c of CRYSTAL_COLORS) {
      const v = p[c];
      if (typeof v === 'string' && v !== this.palette[c]) {
        this.palette[c] = v;
        changed = true;
      }
    }
    if (changed) this.cache.clear();
  }

  colorOf(c: CrystalColor): string {
    return this.palette[c];
  }

  /** Raise the raster resolution for high-DPR screens. */
  setPixelSize(px: number): void {
    const next = Math.max(48, Math.min(512, Math.round(px)));
    if (next === this.px) return;
    this.px = next;
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  get(key: string): HTMLCanvasElement | null {
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const made = this.render(key);
    this.cache.set(key, made);
    return made;
  }

  /** Blit a cached frame centred on (cx, cy) at `size` logical units. */
  draw(ctx: CanvasRenderingContext2D, key: string, cx: number, cy: number, size: number): boolean {
    const img = this.get(key);
    if (img === null) return false;
    const h = size / 2;
    ctx.drawImage(img, cx - h, cy - h, size, size);
    return true;
  }

  // -------------------------------------------------------------------------

  private render(key: string): HTMLCanvasElement | null {
    const s = makeSurface(this.px);
    if (s === null) return null;
    const { ctx, canvas } = s;

    if (key.startsWith('glyph.')) {
      this.paintGlyph(ctx, key.slice(6));
      return canvas;
    }
    if (key.startsWith('crust')) {
      const n = Number(key.slice(5));
      if (!Number.isFinite(n) || n < 1 || n > 3) return null;
      this.paintCrust(ctx, n);
      return canvas;
    }
    if (key.startsWith('shadow')) {
      const n = Number(key.slice(6));
      if (!Number.isFinite(n) || n < 1 || n > 2) return null;
      this.paintShadow(ctx, n);
      return canvas;
    }
    if (key === 'prism') {
      this.paintPrism(ctx);
      return canvas;
    }
    if (key === 'stone') {
      this.paintStone(ctx);
      return canvas;
    }
    if (key === 'bomb') {
      this.paintBomb(ctx);
      return canvas;
    }
    if (key === 'relic') {
      this.paintRelic(ctx);
      return canvas;
    }

    const dot = key.indexOf('.');
    const colorName = (dot < 0 ? key : key.slice(0, dot)) as CrystalColor;
    if (!CRYSTAL_COLORS.includes(colorName)) return null;
    const variant = dot < 0 ? '' : key.slice(dot + 1);

    const hex = this.palette[colorName];
    const shape = SILHOUETTE[colorName];
    this.paintCrystal(ctx, shape, hex);
    if (variant === 'line-h') this.paintLineMarks(ctx, hex, false);
    else if (variant === 'line-v') this.paintLineMarks(ctx, hex, true);
    else if (variant === 'burst') this.paintBurstMarks(ctx, hex);
    else if (variant !== '') return null;
    return canvas;
  }

  private paintCrystal(ctx: CanvasRenderingContext2D, shape: string, hex: string): void {
    const path = silhouettePath(shape);

    // Contact shadow so pieces sit on the board rather than float over it.
    ctx.save();
    ctx.translate(0, 0.035);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fill(path);
    ctx.restore();

    const grad = ctx.createLinearGradient(-0.3, -0.42, 0.26, 0.44);
    grad.addColorStop(0, shade(hex, 0.42));
    grad.addColorStop(0.45, hex);
    grad.addColorStop(1, shade(hex, -0.42));
    ctx.fillStyle = grad;
    ctx.fill(path);

    // Facet: a lighter wedge across the upper-left, clipped to the silhouette.
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = rgba('#ffffff', 0.2);
    ctx.beginPath();
    ctx.moveTo(-0.5, -0.5);
    ctx.lineTo(0.5, -0.5);
    ctx.lineTo(-0.5, 0.34);
    ctx.closePath();
    ctx.fill();

    // Deep inner shadow at the base for volume.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.moveTo(-0.5, 0.5);
    ctx.lineTo(0.5, 0.5);
    ctx.lineTo(0.5, 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Specular glint.
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.ellipse(-0.14, -0.22, 0.1, 0.055, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // High-contrast rim: the doc calls this out explicitly for rapid comprehension.
    ctx.lineWidth = 0.055;
    ctx.strokeStyle = 'rgba(6,8,18,0.92)';
    ctx.stroke(path);
    ctx.lineWidth = 0.018;
    ctx.strokeStyle = rgba(shade(hex, 0.6), 0.55);
    ctx.stroke(path);
  }

  private paintLineMarks(ctx: CanvasRenderingContext2D, hex: string, vertical: boolean): void {
    ctx.save();
    if (vertical) ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.045;
    for (const dx of [-0.13, 0.13]) {
      ctx.beginPath();
      ctx.moveTo(dx - 0.07, -0.11);
      ctx.lineTo(dx + 0.07, 0);
      ctx.lineTo(dx - 0.07, 0.11);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(shade(hex, -0.6), 0.7);
    ctx.lineWidth = 0.012;
    ctx.restore();
  }

  private paintBurstMarks(ctx: CanvasRenderingContext2D, hex: string): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.arc(0, 0, 0.19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(shade(hex, 0.7), 0.95);
    ctx.lineWidth = 0.032;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.25, Math.sin(a) * 0.25);
      ctx.lineTo(Math.cos(a) * 0.35, Math.sin(a) * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  private paintPrism(ctx: CanvasRenderingContext2D): void {
    const path = silhouettePath('octagon');
    ctx.save();
    ctx.translate(0, 0.035);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fill(path);
    ctx.restore();

    ctx.save();
    ctx.clip(path);
    // Opalescent wedges — the wildcard reads as "every colour at once".
    const wedge = Math.PI / 3;
    for (let i = 0; i < 6; i++) {
      const c = CRYSTAL_COLORS[i];
      if (c === undefined) continue;
      ctx.fillStyle = shade(this.palette[c], 0.28);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 0.7, i * wedge - Math.PI / 2, (i + 1) * wedge - Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    }
    const gloss = ctx.createRadialGradient(-0.1, -0.16, 0.02, 0, 0, 0.5);
    gloss.addColorStop(0, 'rgba(255,255,255,0.95)');
    gloss.addColorStop(0.45, 'rgba(255,255,255,0.28)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(-0.5, -0.5, 1, 1);
    ctx.restore();

    ctx.lineWidth = 0.055;
    ctx.strokeStyle = 'rgba(6,8,18,0.92)';
    ctx.stroke(path);
  }

  private paintStone(ctx: CanvasRenderingContext2D): void {
    const p = new Path2D();
    poly(p, [
      [-0.42, -0.3],
      [-0.16, -0.45],
      [0.24, -0.42],
      [0.44, -0.12],
      [0.38, 0.3],
      [0.06, 0.45],
      [-0.3, 0.38],
      [-0.45, 0.06],
    ]);
    const g = ctx.createLinearGradient(-0.3, -0.4, 0.3, 0.42);
    g.addColorStop(0, shade(NEUTRAL.stone, 0.3));
    g.addColorStop(1, shade(NEUTRAL.stone, -0.45));
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.1);
    ctx.lineTo(-0.02, 0.02);
    ctx.lineTo(0.1, 0.3);
    ctx.moveTo(-0.02, 0.02);
    ctx.lineTo(0.3, -0.16);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = 'rgba(6,8,18,0.9)';
    ctx.stroke(p);
  }

  /** Classic black bomb with brass cap + spark fuse (fallback if atlas fails). */
  private paintBomb(ctx: CanvasRenderingContext2D): void {
    // Soft ground glow
    const glow = ctx.createRadialGradient(0, 0.12, 0.02, 0, 0.12, 0.48);
    glow.addColorStop(0, 'rgba(255, 120, 40, 0.28)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0.28, 0.36, 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sphere body
    const body = new Path2D();
    body.arc(0, 0.06, 0.36, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(-0.12, -0.1, 0.02, 0.04, 0.1, 0.42);
    g.addColorStop(0, '#6a7088');
    g.addColorStop(0.35, '#2a3048');
    g.addColorStop(0.75, '#12161f');
    g.addColorStop(1, '#05070c');
    ctx.fillStyle = g;
    ctx.fill(body);
    // Specular
    const spec = ctx.createRadialGradient(-0.12, -0.08, 0, -0.1, -0.06, 0.18);
    spec.addColorStop(0, 'rgba(255,255,255,0.55)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(-0.1, -0.06, 0.12, 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 0.045;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.stroke(body);

    // Brass fuse collar
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.ellipse(0, -0.28, 0.1, 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6010';
    ctx.lineWidth = 0.025;
    ctx.stroke();

    // Fuse cord + spark (countdown digit drawn by boardView)
    ctx.strokeStyle = '#d4a86a';
    ctx.lineWidth = 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.02, -0.32);
    ctx.quadraticCurveTo(0.18, -0.42, 0.2, -0.5);
    ctx.stroke();
    const spark = ctx.createRadialGradient(0.2, -0.5, 0, 0.2, -0.5, 0.1);
    spark.addColorStop(0, '#fff6c8');
    spark.addColorStop(0.4, '#ff9020');
    spark.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(0.2, -0.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Gold crystal artifact — matches gem facet language (fallback only). */
  private paintRelic(ctx: CanvasRenderingContext2D): void {
    // Soft ground pedestal (same language as painted gems)
    ctx.save();
    ctx.translate(0, 0.28);
    const ped = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.42);
    ped.addColorStop(0, 'rgba(255, 210, 100, 0.35)');
    ped.addColorStop(0.55, 'rgba(120, 70, 20, 0.45)');
    ped.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ped;
    ctx.beginPath();
    ctx.ellipse(0, 0.06, 0.38, 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer glow
    const glow = ctx.createRadialGradient(0, -0.05, 0.02, 0, 0, 0.55);
    glow.addColorStop(0, 'rgba(255, 240, 180, 0.55)');
    glow.addColorStop(0.45, 'rgba(255, 180, 60, 0.22)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Main crystal body — tall multi-facet cluster
    const body = new Path2D();
    poly(body, [
      [0, -0.48],
      [0.16, -0.28],
      [0.34, -0.12],
      [0.28, 0.22],
      [0.12, 0.38],
      [-0.12, 0.38],
      [-0.28, 0.22],
      [-0.34, -0.12],
      [-0.16, -0.28],
    ]);
    const g = ctx.createLinearGradient(-0.2, -0.5, 0.28, 0.4);
    g.addColorStop(0, '#fff8dc');
    g.addColorStop(0.22, '#ffe08a');
    g.addColorStop(0.5, '#ffc040');
    g.addColorStop(0.78, '#e09020');
    g.addColorStop(1, '#8a4a10');
    ctx.fillStyle = g;
    ctx.fill(body);

    // Facet cuts
    ctx.save();
    ctx.clip(body);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(0, -0.48);
    ctx.lineTo(0, 0.38);
    ctx.moveTo(-0.28, -0.08);
    ctx.lineTo(0.28, -0.08);
    ctx.moveTo(-0.18, 0.18);
    ctx.lineTo(0.18, 0.18);
    ctx.moveTo(-0.12, -0.3);
    ctx.lineTo(0.12, 0.1);
    ctx.moveTo(0.12, -0.3);
    ctx.lineTo(-0.12, 0.1);
    ctx.stroke();
    // Specular
    const spec = ctx.createRadialGradient(-0.08, -0.28, 0, -0.08, -0.28, 0.2);
    spec.addColorStop(0, 'rgba(255,255,255,0.85)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(-0.06, -0.26, 0.12, 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Side crystal shards
    const shard = (pts: [number, number][], light: string, dark: string) => {
      const s = new Path2D();
      poly(s, pts);
      const sg = ctx.createLinearGradient(pts[0]![0], pts[0]![1], pts[2]![0], pts[2]![1]);
      sg.addColorStop(0, light);
      sg.addColorStop(1, dark);
      ctx.fillStyle = sg;
      ctx.fill(s);
      ctx.lineWidth = 0.03;
      ctx.strokeStyle = 'rgba(60, 30, 5, 0.75)';
      ctx.stroke(s);
    };
    shard(
      [
        [-0.22, -0.2],
        [-0.42, -0.02],
        [-0.3, 0.18],
        [-0.14, 0.06],
      ],
      '#ffe9a8',
      '#c07018',
    );
    shard(
      [
        [0.22, -0.2],
        [0.42, -0.02],
        [0.3, 0.18],
        [0.14, 0.06],
      ],
      '#fff0c0',
      '#b86814',
    );

    ctx.lineWidth = 0.045;
    ctx.strokeStyle = 'rgba(50, 28, 6, 0.9)';
    ctx.stroke(body);
  }

  private paintCrust(ctx: CanvasRenderingContext2D, layers: number): void {
    const alpha = 0.34 + layers * 0.16;
    const p = new Path2D();
    roundRectPath(p, 0.48, 0.09);
    const g = ctx.createLinearGradient(-0.4, -0.48, 0.4, 0.48);
    g.addColorStop(0, rgba(NEUTRAL.crust, alpha));
    g.addColorStop(1, rgba('#7fa8c9', alpha));
    ctx.fillStyle = g;
    ctx.fill(p);

    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + layers * 0.1})`;
    ctx.lineWidth = 0.024;
    // Fewer cracks at 3 layers, more as it breaks down — legible damage state.
    const cracks = 4 - layers;
    for (let i = 0; i <= cracks; i++) {
      const o = -0.4 + (i / (cracks + 1)) * 0.9;
      ctx.beginPath();
      ctx.moveTo(-0.5, o);
      ctx.lineTo(-0.1, o + 0.12);
      ctx.lineTo(0.16, o - 0.08);
      ctx.lineTo(0.5, o + 0.05);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 0.04;
    ctx.strokeStyle = 'rgba(226,244,255,0.75)';
    ctx.stroke(p);
  }

  private paintShadow(ctx: CanvasRenderingContext2D, level: number): void {
    const p = new Path2D();
    roundRectPath(p, 0.49, 0.11);
    const a = level === 1 ? 0.42 : 0.74;
    const g = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.62);
    g.addColorStop(0, rgba(NEUTRAL.shadow, a));
    g.addColorStop(1, rgba('#2a0f45', a * 0.55));
    ctx.fillStyle = g;
    ctx.fill(p);

    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = `rgba(150,90,220,${0.25 + level * 0.2})`;
    ctx.lineWidth = 0.03;
    for (let i = 0; i < 3 + level; i++) {
      const a0 = (i / (3 + level)) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * 0.5, Math.sin(a0) * 0.5);
      ctx.quadraticCurveTo(Math.cos(a0) * 0.16, Math.sin(a0) * 0.16, 0, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  private paintGlyph(ctx: CanvasRenderingContext2D, colorName: string): void {
    const c = colorName as CrystalColor;
    if (!CRYSTAL_COLORS.includes(c)) return;
    const g = glyphPath(
      // GLYPH is imported indirectly through the caller; keep a local mapping stable.
      GLYPH_FOR[c],
    );
    ctx.lineWidth = 0.09;
    ctx.strokeStyle = 'rgba(6,8,18,0.75)';
    ctx.stroke(g);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill(g);
  }
}

/** Local mirror of engine GLYPH, kept here so the raster path has no import cycle. */
const GLYPH_FOR: Readonly<Record<CrystalColor, string>> = {
  ember: 'flame',
  aurum: 'ring',
  solar: 'star',
  verdant: 'leaf',
  tidal: 'drop',
  void: 'moon',
} as const;
