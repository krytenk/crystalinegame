/**
 * CRYSTALLINE — asset manifest contract.
 *
 * FROZEN CONTRACT between the Python asset pipeline (`tools/`) and the renderer.
 *
 * `tools/build_assets.py` WRITES `public/gen/manifest.json` in exactly this shape.
 * `src/render/atlas.ts` READS it. Neither side may drift without the other.
 *
 * Source art lives in `assets/` and is treated as strictly read-only input; every
 * runtime asset is a generated derivative under `public/gen/`.
 */

import type { CrystalColor } from '@engine/types';

/** A sub-rectangle within an atlas page, in pixels. */
export interface AtlasFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /**
   * Where the piece's visual centre sits inside the frame, normalised 0..1.
   * Lets the renderer align silhouettes of differing bulk on one grid centre.
   */
  readonly anchor: readonly [number, number];
}

export interface AtlasPage {
  /** Path relative to the site root, e.g. `gen/crystals@2x.webp`. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Device-pixel-ratio bucket this page serves: 1, 2 or 4. */
  readonly scale: number;
  readonly frames: Readonly<Record<string, AtlasFrame>>;
}

/**
 * Frame keys are `<color>` for a plain crystal and `<color>.<variant>` for its
 * special forms, plus `prism`, `stone`, `bomb`, `relic`, `crust1..3`, `shadow1..2`,
 * and `glyph.<color>` for the accessibility overlay.
 */
export type FrameKey = string;

export const frameKey = {
  crystal: (c: CrystalColor): FrameKey => c,
  line: (c: CrystalColor, o: 'h' | 'v'): FrameKey => `${c}.line-${o}`,
  burst: (c: CrystalColor): FrameKey => `${c}.burst`,
  glyph: (c: CrystalColor): FrameKey => `glyph.${c}`,
  crust: (layers: 1 | 2 | 3): FrameKey => `crust${layers}`,
  shadow: (level: 1 | 2): FrameKey => `shadow${level}`,
} as const;

/** A baked match-burst effect. */
export interface VfxClip {
  /** Match size this clip is used for: 3, 4, 5, or 6 for "6 or more". */
  readonly tier: 3 | 4 | 5 | 6;
  /**
   * How the renderer composites it.
   * - `alpha`  — a VP9 WebM carrying a real alpha channel (keyed from checkerboard).
   * - `screen` — an opaque clip on black, drawn with `globalCompositeOperation`
   *              set to `'screen'`. Cheaper and better-looking for a pure burst.
   */
  readonly composite: 'alpha' | 'screen';
  /** WebM (VP9) source, preferred when the browser supports alpha video. */
  readonly webm?: string;
  /** Sprite-sheet fallback for browsers without alpha-WebM support. */
  readonly sheet?: {
    readonly src: string;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly cols: number;
    readonly count: number;
    readonly fps: number;
  };
  readonly durationMs: number;
}

export interface AssetManifest {
  /** Bumped by the pipeline whenever the output format changes. */
  readonly version: number;
  readonly generatedAt: string;
  /** Atlas pages, one per DPR bucket. The renderer picks by `devicePixelRatio`. */
  readonly pages: readonly AtlasPage[];
  readonly vfx: readonly VfxClip[];
  /**
   * Dominant colour per crystal, as `#rrggbb`, sampled from the keyed art.
   * Used for particles, trails and UI accents so procedural effects match the art.
   */
  readonly palette: Readonly<Record<CrystalColor, string>>;
  /** Provenance: which source file each colour was derived from. */
  readonly sources: Readonly<Record<string, string>>;
}

export const MANIFEST_URL = 'gen/manifest.json';
export const MANIFEST_VERSION = 1;
