/**
 * CRYSTALLINE — match-reward VFX playback.
 *
 * Strategic play (4 / 5 / 6+) is rewarded with escalating burst clips baked from
 * the research art in assets/. Match-3 gets a light crack; match-6+ is the
 * scroll-stopping supernova (screen-blended full-board flash).
 */

import type { Coord, MatchShape } from '@engine/types';
import { assetUrl } from './assetUrl';
import type { VfxClip } from './manifest';

export type VfxTier = 3 | 4 | 5 | 6;

/** Map a match group to a reward tier. Larger groups = bigger spectacle. */
export function tierFromMatch(shape: MatchShape, cellCount: number): VfxTier {
  if (cellCount >= 6) return 6;
  if (shape === 'five' || cellCount >= 5) return 5;
  if (shape === 'four' || shape === 'L' || shape === 'T' || cellCount >= 4) return 4;
  return 3;
}

interface ActiveFx {
  clip: VfxClip;
  sheet: HTMLImageElement;
  startedAt: number;
  /** Logical canvas centre of the effect. */
  x: number;
  y: number;
  /** Draw size in logical pixels. */
  size: number;
  /** Full-viewport screen flash for high tiers. */
  flash: number;
}

export class VfxPlayer {
  private clips = new Map<VfxTier, { clip: VfxClip; sheet: HTMLImageElement }>();
  private active: ActiveFx[] = [];
  private ready = false;

  get isReady(): boolean {
    return this.ready;
  }

  async load(clips: readonly VfxClip[]): Promise<void> {
    this.clips.clear();
    await Promise.all(
      clips.map(async (clip) => {
        if (!clip.sheet) return;
        const img = await loadImage(clip.sheet.src);
        this.clips.set(clip.tier, { clip, sheet: img });
      }),
    );
    this.ready = true;
  }

  /**
   * Queue a burst at a board position.
   * @param size logical diameter of the effect
   */
  play(tier: VfxTier, x: number, y: number, size: number): void {
    const entry = this.clips.get(tier) ?? this.clips.get(bestAvailable(this.clips, tier));
    if (!entry) {
      // Procedural fallback flash only.
      this.active.push({
        clip: {
          tier,
          composite: 'screen',
          durationMs: tier >= 6 ? 700 : 350,
        },
        sheet: document.createElement('img'),
        startedAt: performance.now(),
        x,
        y,
        size,
        flash: tier >= 5 ? 0.55 : tier >= 4 ? 0.28 : 0.12,
      });
      return;
    }

    // Higher tiers escalate screen presence.
    const flash =
      tier >= 6 ? 0.75 : tier === 5 ? 0.4 : tier === 4 ? 0.22 : 0.1;

    this.active.push({
      clip: entry.clip,
      sheet: entry.sheet,
      startedAt: performance.now(),
      x,
      y,
      size: size * (tier >= 6 ? 1.35 : tier === 5 ? 1.15 : 1),
      flash,
    });

    // Cap concurrent FX so mobile doesn't thrash.
    if (this.active.length > 6) this.active.shift();
  }

  /** Play at the centroid of matched cells (board → logical via mapper). */
  playAtCells(
    tier: VfxTier,
    cells: readonly Coord[],
    cellToLogical: (c: Coord) => { x: number; y: number; cell: number },
  ): void {
    if (cells.length === 0) return;
    let sx = 0;
    let sy = 0;
    let cell = 64;
    for (const c of cells) {
      const p = cellToLogical(c);
      sx += p.x;
      sy += p.y;
      cell = p.cell;
    }
    const n = cells.length;
    const scale =
      tier >= 6 ? cell * 5.5 : tier === 5 ? cell * 3.6 : tier === 4 ? cell * 2.6 : cell * 1.8;
    this.play(tier, sx / n, sy / n, scale);
  }

  draw(ctx: CanvasRenderingContext2D, now: number, viewW: number, viewH: number): void {
    const next: ActiveFx[] = [];
    for (const fx of this.active) {
      const elapsed = now - fx.startedAt;
      const dur = fx.clip.durationMs;
      if (elapsed >= dur) continue;
      next.push(fx);

      const t = elapsed / dur;
      // Ease out so the peak reads early (reward timing).
      const life = 1 - t * t;

      // Full-board flash for strategic / supernova tiers.
      if (fx.flash > 0) {
        const flashA = fx.flash * life * (t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85));
        if (flashA > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle =
            fx.clip.tier >= 6
              ? `rgba(220, 200, 255, ${flashA})`
              : fx.clip.tier === 5
                ? `rgba(180, 220, 255, ${flashA * 0.85})`
                : `rgba(255, 240, 180, ${flashA * 0.7})`;
          ctx.fillRect(0, 0, viewW, viewH);
          ctx.restore();
        }
      }

      const sheetMeta = fx.clip.sheet;
      if (!sheetMeta || !fx.sheet.complete || fx.sheet.naturalWidth === 0) {
        // Soft procedural burst ring.
        drawFallbackBurst(ctx, fx.x, fx.y, fx.size * life, fx.clip.tier, life);
        continue;
      }

      const { frameWidth, frameHeight, cols, count, fps } = sheetMeta;
      const frame = Math.min(count - 1, Math.floor((elapsed / 1000) * fps));
      const col = frame % cols;
      const row = Math.floor(frame / cols);
      const sx = col * frameWidth;
      const sy = row * frameHeight;

      // Scale up slightly at peak mid-clip.
      const pop = 0.85 + 0.25 * Math.sin(Math.min(1, t * 1.4) * Math.PI);
      const drawSize = fx.size * pop;
      const dx = fx.x - drawSize / 2;
      const dy = fx.y - drawSize / 2;

      ctx.save();
      ctx.globalAlpha = Math.min(1, life * 1.15);
      if (fx.clip.composite === 'screen') {
        ctx.globalCompositeOperation = 'screen';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(
        fx.sheet,
        sx,
        sy,
        frameWidth,
        frameHeight,
        dx,
        dy,
        drawSize,
        drawSize,
      );
      ctx.restore();
    }
    this.active = next;
  }

  get busy(): boolean {
    return this.active.length > 0;
  }
}

function bestAvailable(map: Map<VfxTier, unknown>, want: VfxTier): VfxTier {
  const order: VfxTier[] = [want, 5, 4, 6, 3];
  for (const t of order) {
    if (map.has(t)) return t;
  }
  return 3;
}

function drawFallbackBurst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tier: VfxTier,
  life: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const r = size / 2;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  if (tier >= 6) {
    g.addColorStop(0, `rgba(255,255,255,${0.95 * life})`);
    g.addColorStop(0.25, `rgba(200,160,255,${0.7 * life})`);
    g.addColorStop(0.6, `rgba(80,180,255,${0.35 * life})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (tier >= 4) {
    g.addColorStop(0, `rgba(255,250,220,${0.8 * life})`);
    g.addColorStop(0.4, `rgba(140,210,255,${0.45 * life})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    g.addColorStop(0, `rgba(200,230,255,${0.5 * life})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`vfx image ${src}`));
    img.src = assetUrl(src);
  });
