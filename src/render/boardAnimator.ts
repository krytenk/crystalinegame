/**
 * CRYSTALLINE — drop-in / fall choreography for the board view.
 *
 * Model gravity + top-refill are instant (unprotectable match-3 procedure).
 * This layer plays `fall` / `spawn` / `clear` so crystals visibly drop from above.
 *
 * Logical positions update immediately as events are applied (so clear/fall/spawn
 * chain correctly). Visual positions tween on a staggered timeline.
 */

import type { GameEvent } from '@engine/events';
import type { BoardSnapshot, Coord, Piece } from '@engine/types';
import { easeFall, easeInBack, easeInQuad, easeOutBack, easeOutCubic, easeOutQuad } from './easing';
import { newVis, Tweener, type Vis } from './tween';
import type { BoardLayout } from './boardView';

export interface AnimPiece {
  readonly piece: Piece;
  readonly vis: Vis;
  dying: boolean;
}

/**
 * Research-aligned juice timing (see docs/COGNITIVE_UX.md):
 *  0–100ms squeeze, 50–150ms fade, ~200ms gravity, ~300ms spawns.
 * Victory flourish uses slower “spectacle” timings so leftover-move chains put on a show.
 */
const CLEAR_SQUEEZE_MS = 100;
const CLEAR_FADE_MS = 150;
const CLEAR_HOLD_MS = 160;
const FALL_MS_PER_ROW = 68;
const FALL_BASE_MS = 110;
const SPAWN_STAGGER_MS = 22;
const MAX_FALL_MS = 380;
const SWAP_MS = 95;
/** Delay after clear before falls read as “weight” (industry ~0.2s). */
const POST_CLEAR_FALL_GAP_MS = 40;
/** Dramatic board shuffle: spin-out then cascade-in. */
const SHUFFLE_OUT_MS = 520;
const SHUFFLE_HOLD_MS = 180;
const SHUFFLE_IN_MS = 640;
const SHUFFLE_STAGGER = 28;

/** Post-win sugar-crush: slower clears, falls, and staged power detonations. */
const SPECTACLE = {
  clearHold: 300,
  postClearGap: 90,
  fallBase: 160,
  fallPerRow: 95,
  maxFall: 560,
  spawnStagger: 36,
  spawnSpecial: 220,
  /** Super Chest limbs need a longer beat so the pull reads before cascade UI. */
  specialTriggered: 560,
  flourishBeat: 420,
  waveGap: 70,
} as const;

export class BoardAnimator {
  private readonly tweens = new Tweener();
  private pieces = new Map<number, AnimPiece>();
  /** Immediate logical board positions (updated as events are applied). */
  private logic = new Map<number, Coord>();
  private animUntil = 0;
  private pendingSnap: BoardSnapshot | null = null;
  private pendingSnapAt = 0;

  get busy(): boolean {
    return performance.now() < this.animUntil || this.tweens.busy;
  }

  setLayout(_layout: BoardLayout): void {
    // Layout is applied by BoardView when converting board → screen coords.
  }

  sync(snap: BoardSnapshot): void {
    this.tweens.clear();
    this.pieces.clear();
    this.logic.clear();
    this.animUntil = 0;
    this.pendingSnap = null;
    for (let y = 0; y < snap.height; y++) {
      for (let x = 0; x < snap.width; x++) {
        const cell = snap.cells[y * snap.width + x];
        if (!cell?.playable || !cell.piece) continue;
        const p = cell.piece;
        this.pieces.set(p.id, { piece: p, vis: newVis(x, y), dying: false });
        this.logic.set(p.id, { x, y });
      }
    }
  }

  play(events: readonly GameEvent[], snapAfter: BoardSnapshot, now = performance.now()): void {
    let t = now;
    let anyMotion = false;
    let maxRowsInWave = 0;
    // Once winFlourish fires, the rest of the stream is victory spectacle.
    let spectacle = false;

    const fallBase = () => (spectacle ? SPECTACLE.fallBase : FALL_BASE_MS);
    const fallPerRow = () => (spectacle ? SPECTACLE.fallPerRow : FALL_MS_PER_ROW);
    const maxFall = () => (spectacle ? SPECTACLE.maxFall : MAX_FALL_MS);
    const clearHold = () =>
      spectacle ? SPECTACLE.clearHold + SPECTACLE.postClearGap : CLEAR_HOLD_MS + POST_CLEAR_FALL_GAP_MS;

    for (const ev of events) {
      switch (ev.t) {
        case 'swap': {
          this.applySwap(ev.a, ev.b, t);
          t += SWAP_MS;
          anyMotion = true;
          break;
        }
        case 'swapRejected': {
          this.applyReject(ev.a, ev.b, t);
          t += 260;
          anyMotion = true;
          break;
        }
        case 'winFlourish': {
          spectacle = true;
          // Beat so the banner / BONUS line lands before free specials pop in.
          t += SPECTACLE.flourishBeat;
          anyMotion = true;
          break;
        }
        case 'clear': {
          this.applyClear(ev.cells, t, spectacle);
          t += clearHold();
          anyMotion = true;
          break;
        }
        case 'fall': {
          maxRowsInWave = Math.max(
            maxRowsInWave,
            this.applyFalls(ev.moves, t, spectacle),
          );
          break;
        }
        case 'spawn': {
          const above = this.applySpawns(ev.spawns, t, spectacle);
          maxRowsInWave = Math.max(maxRowsInWave, above);
          // One gravity wave: fall + spawn share the same time window.
          const dur = Math.min(maxFall(), fallBase() + maxRowsInWave * fallPerRow());
          t += dur + (spectacle ? SPECTACLE.waveGap : 30);
          maxRowsInWave = 0;
          anyMotion = true;
          break;
        }
        case 'spawnSpecial': {
          this.applySpawnSpecial(ev.piece, ev.at, t, spectacle);
          t += spectacle ? SPECTACLE.spawnSpecial : 90;
          anyMotion = true;
          break;
        }
        case 'specialTriggered': {
          // Stage each auto-detonation so the flourish reads as a chain, not a blur.
          t += spectacle ? SPECTACLE.specialTriggered : 40;
          anyMotion = true;
          break;
        }
        case 'reshuffle': {
          // Handled via playReshuffle() for full before→after drama.
          t += SHUFFLE_OUT_MS + SHUFFLE_HOLD_MS + SHUFFLE_IN_MS;
          anyMotion = true;
          break;
        }
        default:
          break;
      }
    }

    // If we had falls without a following spawn in the stream, advance time.
    if (maxRowsInWave > 0) {
      t += Math.min(maxFall(), fallBase() + maxRowsInWave * fallPerRow());
      anyMotion = true;
    }

    if (anyMotion) {
      this.animUntil = t + (spectacle ? 120 : 30);
      this.pendingSnap = snapAfter;
      this.pendingSnapAt = this.animUntil;
    } else {
      this.sync(snapAfter);
    }
  }

  update(now: number): void {
    this.tweens.update(now);
    for (const [id, ap] of this.pieces) {
      if (ap.dying && ap.vis.alpha <= 0.02) {
        this.pieces.delete(id);
        this.logic.delete(id);
      }
    }
    // Reshuffle phase 2: drop in the new layout with staggered spin-in
    if (this.reshuffleAfter && now >= this.reshuffleInAt) {
      const snap = this.reshuffleAfter;
      this.reshuffleAfter = null;
      this.sync(snap);
      const list = [...this.pieces.values()];
      const cx = (snap.width - 1) / 2;
      const cy = (snap.height - 1) / 2;
      list.sort((a, b) => {
        const da = (a.vis.x - cx) ** 2 + (a.vis.y - cy) ** 2;
        const db = (b.vis.x - cx) ** 2 + (b.vis.y - cy) ** 2;
        return da - db;
      });
      list.forEach((ap, i) => {
        const start = now + i * (SHUFFLE_STAGGER * 0.85);
        const dir = i % 2 === 0 ? -1 : 1;
        const tx = ap.vis.x;
        const ty = ap.vis.y;
        ap.vis.alpha = 0;
        ap.vis.scale = 0.2;
        ap.vis.rot = dir * Math.PI * 1.2;
        ap.vis.x = cx + (tx - cx) * 1.4;
        ap.vis.y = cy - 0.8;
        ap.vis.glow = 0.8;
        this.tweens.to(ap.vis, 'alpha', 1, { start, dur: SHUFFLE_IN_MS * 0.75, ease: easeOutCubic });
        this.tweens.to(ap.vis, 'scale', 1, { start, dur: SHUFFLE_IN_MS, ease: easeOutBack });
        this.tweens.to(ap.vis, 'rot', 0, { start, dur: SHUFFLE_IN_MS, ease: easeOutCubic });
        this.tweens.to(ap.vis, 'x', tx, { start, dur: SHUFFLE_IN_MS, ease: easeOutCubic });
        this.tweens.to(ap.vis, 'y', ty, { start, dur: SHUFFLE_IN_MS, ease: easeOutCubic });
        this.tweens.to(ap.vis, 'glow', 0, {
          start: start + SHUFFLE_IN_MS * 0.5,
          dur: SHUFFLE_IN_MS * 0.5,
          ease: easeOutQuad,
        });
      });
      this.animUntil = Math.max(
        this.animUntil,
        now + SHUFFLE_IN_MS + list.length * SHUFFLE_STAGGER * 0.85 + 80,
      );
    }
    if (this.pendingSnap && now >= this.pendingSnapAt && !this.tweens.busy) {
      this.sync(this.pendingSnap);
      this.pendingSnap = null;
    }
  }

  visiblePieces(): readonly AnimPiece[] {
    return [...this.pieces.values()].filter((p) => p.vis.alpha > 0.02);
  }

  /**
   * Dramatic reshuffle: current gems spiral out, brief pause, new layout cascades in.
   * Caller must sync() the pre-reshuffle board first, then mutate the engine, then call this with snapAfter.
   */
  playReshuffle(snapAfter: BoardSnapshot, now = performance.now()): void {
    const list = [...this.pieces.values()].filter((p) => !p.dying);
    // Deterministic spiral order: center-out by board distance
    const cx = (snapAfter.width - 1) / 2;
    const cy = (snapAfter.height - 1) / 2;
    list.sort((a, b) => {
      const da = (a.vis.x - cx) ** 2 + (a.vis.y - cy) ** 2;
      const db = (b.vis.x - cx) ** 2 + (b.vis.y - cy) ** 2;
      return da - db;
    });

    list.forEach((ap, i) => {
      const start = now + i * SHUFFLE_STAGGER;
      const dir = i % 2 === 0 ? 1 : -1;
      this.tweens.cancel(ap.vis);
      ap.dying = true;
      // Spiral outward + spin + shrink + fade
      this.tweens.to(ap.vis, 'rot', dir * (Math.PI * 1.6 + (i % 5) * 0.15), {
        start,
        dur: SHUFFLE_OUT_MS,
        ease: easeInQuad,
      });
      this.tweens.to(ap.vis, 'scale', 0.15, {
        start,
        dur: SHUFFLE_OUT_MS,
        ease: easeInBack,
      });
      this.tweens.to(ap.vis, 'alpha', 0, {
        start,
        dur: SHUFFLE_OUT_MS,
        ease: easeInQuad,
      });
      this.tweens.to(ap.vis, 'x', ap.vis.x + dir * (0.35 + (i % 3) * 0.12), {
        start,
        dur: SHUFFLE_OUT_MS,
        ease: easeInQuad,
      });
      this.tweens.to(ap.vis, 'y', ap.vis.y - 0.25 - (i % 4) * 0.08, {
        start,
        dur: SHUFFLE_OUT_MS,
        ease: easeOutQuad,
      });
      this.tweens.to(ap.vis, 'glow', 1, {
        start,
        dur: SHUFFLE_OUT_MS * 0.4,
        ease: easeOutQuad,
      });
    });

    const outEnd = now + SHUFFLE_OUT_MS + list.length * SHUFFLE_STAGGER * 0.35;
    const inStart = outEnd + SHUFFLE_HOLD_MS;

    // After hold, load new board and cascade-in
    this.pendingSnap = null;
    this.animUntil = inStart + SHUFFLE_IN_MS + snapAfter.width * snapAfter.height * 4;
    // Manual delayed sync + in-anim via pending reshuffle payload
    this.reshuffleAfter = snapAfter;
    this.reshuffleInAt = inStart;
  }

  private reshuffleAfter: BoardSnapshot | null = null;
  private reshuffleInAt = 0;

  // ---------------------------------------------------------------------------

  private idAt(c: Coord): number | null {
    for (const [id, pos] of this.logic) {
      if (pos.x === c.x && pos.y === c.y) {
        const ap = this.pieces.get(id);
        if (ap && !ap.dying) return id;
      }
    }
    return null;
  }

  private applySwap(a: Coord, b: Coord, t: number): void {
    const idA = this.idAt(a);
    const idB = this.idAt(b);
    if (idA === null || idB === null) return;
    const pa = this.pieces.get(idA);
    const pb = this.pieces.get(idB);
    if (!pa || !pb) return;

    this.logic.set(idA, { x: b.x, y: b.y });
    this.logic.set(idB, { x: a.x, y: a.y });

    this.tweens.cancel(pa.vis);
    this.tweens.cancel(pb.vis);
    this.tweens.to(pa.vis, 'x', b.x, { start: t, dur: SWAP_MS, ease: easeOutQuad, from: a.x });
    this.tweens.to(pa.vis, 'y', b.y, { start: t, dur: SWAP_MS, ease: easeOutQuad, from: a.y });
    this.tweens.to(pb.vis, 'x', a.x, { start: t, dur: SWAP_MS, ease: easeOutQuad, from: b.x });
    this.tweens.to(pb.vis, 'y', a.y, { start: t, dur: SWAP_MS, ease: easeOutQuad, from: b.y });
  }

  private applyReject(a: Coord, b: Coord, t: number): void {
    const idA = this.idAt(a);
    const idB = this.idAt(b);
    if (idA === null || idB === null) return;
    const pa = this.pieces.get(idA);
    const pb = this.pieces.get(idB);
    if (!pa || !pb) return;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    this.tweens.to(pa.vis, 'x', a.x * 0.55 + mx * 0.45, { start: t, dur: 70, from: a.x });
    this.tweens.to(pa.vis, 'y', a.y * 0.55 + my * 0.45, { start: t, dur: 70, from: a.y });
    this.tweens.to(pa.vis, 'x', a.x, { start: t + 70, dur: 170, ease: easeOutCubic });
    this.tweens.to(pa.vis, 'y', a.y, { start: t + 70, dur: 170, ease: easeOutCubic });
    this.tweens.to(pb.vis, 'x', b.x * 0.55 + mx * 0.45, { start: t, dur: 70, from: b.x });
    this.tweens.to(pb.vis, 'y', b.y * 0.55 + my * 0.45, { start: t, dur: 70, from: b.y });
    this.tweens.to(pb.vis, 'x', b.x, { start: t + 70, dur: 170, ease: easeOutCubic });
    this.tweens.to(pb.vis, 'y', b.y, { start: t + 70, dur: 170, ease: easeOutCubic });
  }

  private applyClear(cells: readonly Coord[], t: number, spectacle = false): void {
    const squeeze = spectacle ? CLEAR_SQUEEZE_MS * 1.45 : CLEAR_SQUEEZE_MS;
    const fade = spectacle ? CLEAR_FADE_MS * 1.5 : CLEAR_FADE_MS;
    for (const c of cells) {
      const id = this.idAt(c);
      if (id === null) continue;
      const ap = this.pieces.get(id);
      if (!ap) continue;
      ap.dying = true;
      this.logic.delete(id);
      this.tweens.cancel(ap.vis);
      const fromScale = ap.vis.scale || 1;
      // Squeeze (ease-in) then vanish — tactile “crush” before gravity.
      this.tweens.to(ap.vis, 'scale', 0.72, {
        start: t,
        dur: squeeze * 0.45,
        ease: easeInQuad,
        from: fromScale,
      });
      this.tweens.to(ap.vis, 'scale', 0.08, {
        start: t + squeeze * 0.45,
        dur: squeeze * 0.55,
        ease: easeOutQuad,
        from: 0.72,
      });
      this.tweens.to(ap.vis, 'alpha', 0, {
        start: t + (spectacle ? 60 : 40),
        dur: fade,
        ease: easeOutQuad,
        from: 1,
      });
    }
  }

  private applyFalls(
    moves: readonly { pieceId: number; from: Coord; to: Coord }[],
    t: number,
    spectacle = false,
  ): number {
    const fallBase = spectacle ? SPECTACLE.fallBase : FALL_BASE_MS;
    const fallPerRow = spectacle ? SPECTACLE.fallPerRow : FALL_MS_PER_ROW;
    const maxFall = spectacle ? SPECTACLE.maxFall : MAX_FALL_MS;
    let maxRows = 0;
    for (const m of moves) {
      const ap = this.pieces.get(m.pieceId);
      if (!ap || ap.dying) continue;
      const rows = Math.abs(m.to.y - m.from.y);
      maxRows = Math.max(maxRows, rows);
      const dur = Math.min(maxFall, fallBase + rows * fallPerRow);

      this.logic.set(m.pieceId, { x: m.to.x, y: m.to.y });
      this.tweens.cancel(ap.vis, 'x');
      this.tweens.cancel(ap.vis, 'y');
      // Start from reported origin so multi-cascade waves chain cleanly.
      ap.vis.x = m.from.x;
      ap.vis.y = m.from.y;
      this.tweens.to(ap.vis, 'x', m.to.x, { start: t, dur, from: m.from.x });
      this.tweens.to(ap.vis, 'y', m.to.y, {
        start: t,
        dur,
        ease: easeFall,
        from: m.from.y,
      });
    }
    return maxRows;
  }

  private applySpawns(
    spawns: readonly { piece: Piece; to: Coord; fromAbove: number }[],
    t: number,
    spectacle = false,
  ): number {
    const fallBase = spectacle ? SPECTACLE.fallBase : FALL_BASE_MS;
    const fallPerRow = spectacle ? SPECTACLE.fallPerRow : FALL_MS_PER_ROW;
    const maxFall = spectacle ? SPECTACLE.maxFall : MAX_FALL_MS;
    const stagger = spectacle ? SPECTACLE.spawnStagger : SPAWN_STAGGER_MS;
    let maxAbove = 0;
    const colCount = new Map<number, number>();
    for (const s of spawns) {
      maxAbove = Math.max(maxAbove, s.fromAbove);
      const n = colCount.get(s.to.x) ?? 0;
      colCount.set(s.to.x, n + 1);
      const delay = n * stagger;
      const fromY = s.to.y - Math.max(1, s.fromAbove);
      const rows = Math.max(1, s.fromAbove);
      const dur = Math.min(maxFall, fallBase + rows * fallPerRow);

      const vis = newVis(s.to.x, fromY);
      this.pieces.set(s.piece.id, { piece: s.piece, vis, dying: false });
      this.logic.set(s.piece.id, { x: s.to.x, y: s.to.y });
      this.tweens.to(vis, 'y', s.to.y, {
        start: t + delay,
        dur,
        ease: easeFall,
        from: fromY,
      });
    }
    return maxAbove;
  }

  private applySpawnSpecial(piece: Piece, at: Coord, t: number, spectacle = false): void {
    // Clear logical occupant of this cell if any.
    const old = this.idAt(at);
    if (old !== null) {
      const prev = this.pieces.get(old);
      if (prev) {
        prev.dying = true;
        this.logic.delete(old);
      }
    }
    const vis = newVis(at.x, at.y);
    vis.scale = 0.15;
    this.pieces.set(piece.id, { piece, vis, dying: false });
    this.logic.set(piece.id, { x: at.x, y: at.y });
    this.tweens.to(vis, 'scale', 1, {
      start: t,
      dur: spectacle ? 340 : 200,
      ease: easeOutCubic,
      from: 0.15,
    });
  }
}
