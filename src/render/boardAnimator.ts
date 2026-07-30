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
import { easeFall, easeOutCubic, easeOutQuad } from './easing';
import { newVis, Tweener, type Vis } from './tween';
import type { BoardLayout } from './boardView';

export interface AnimPiece {
  readonly piece: Piece;
  readonly vis: Vis;
  dying: boolean;
}

const CLEAR_MS = 150;
const FALL_MS_PER_ROW = 72;
const FALL_BASE_MS = 100;
const SPAWN_STAGGER_MS = 24;
const MAX_FALL_MS = 400;
const SWAP_MS = 100;

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
        case 'clear': {
          this.applyClear(ev.cells, t);
          t += CLEAR_MS * 0.85;
          anyMotion = true;
          break;
        }
        case 'fall': {
          maxRowsInWave = Math.max(maxRowsInWave, this.applyFalls(ev.moves, t));
          break;
        }
        case 'spawn': {
          const above = this.applySpawns(ev.spawns, t);
          maxRowsInWave = Math.max(maxRowsInWave, above);
          // One gravity wave: fall + spawn share the same time window.
          const dur = Math.min(MAX_FALL_MS, FALL_BASE_MS + maxRowsInWave * FALL_MS_PER_ROW);
          t += dur + 30;
          maxRowsInWave = 0;
          anyMotion = true;
          break;
        }
        case 'spawnSpecial': {
          this.applySpawnSpecial(ev.piece, ev.at, t);
          t += 90;
          anyMotion = true;
          break;
        }
        case 'specialTriggered': {
          t += 40;
          break;
        }
        default:
          break;
      }
    }

    // If we had falls without a following spawn in the stream, advance time.
    if (maxRowsInWave > 0) {
      t += Math.min(MAX_FALL_MS, FALL_BASE_MS + maxRowsInWave * FALL_MS_PER_ROW);
      anyMotion = true;
    }

    if (anyMotion) {
      this.animUntil = t + 30;
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
    if (this.pendingSnap && now >= this.pendingSnapAt && !this.tweens.busy) {
      this.sync(this.pendingSnap);
      this.pendingSnap = null;
    }
  }

  visiblePieces(): readonly AnimPiece[] {
    return [...this.pieces.values()].filter((p) => p.vis.alpha > 0.02);
  }

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

  private applyClear(cells: readonly Coord[], t: number): void {
    for (const c of cells) {
      const id = this.idAt(c);
      if (id === null) continue;
      const ap = this.pieces.get(id);
      if (!ap) continue;
      ap.dying = true;
      this.logic.delete(id);
      this.tweens.cancel(ap.vis);
      this.tweens.to(ap.vis, 'scale', 0.12, {
        start: t,
        dur: CLEAR_MS,
        ease: easeOutQuad,
        from: ap.vis.scale || 1,
      });
      this.tweens.to(ap.vis, 'alpha', 0, {
        start: t,
        dur: CLEAR_MS,
        ease: easeOutQuad,
        from: 1,
      });
    }
  }

  private applyFalls(
    moves: readonly { pieceId: number; from: Coord; to: Coord }[],
    t: number,
  ): number {
    let maxRows = 0;
    for (const m of moves) {
      const ap = this.pieces.get(m.pieceId);
      if (!ap || ap.dying) continue;
      const rows = Math.abs(m.to.y - m.from.y);
      maxRows = Math.max(maxRows, rows);
      const dur = Math.min(MAX_FALL_MS, FALL_BASE_MS + rows * FALL_MS_PER_ROW);

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
  ): number {
    let maxAbove = 0;
    const colCount = new Map<number, number>();
    for (const s of spawns) {
      maxAbove = Math.max(maxAbove, s.fromAbove);
      const n = colCount.get(s.to.x) ?? 0;
      colCount.set(s.to.x, n + 1);
      const delay = n * SPAWN_STAGGER_MS;
      const fromY = s.to.y - Math.max(1, s.fromAbove);
      const rows = Math.max(1, s.fromAbove);
      const dur = Math.min(MAX_FALL_MS, FALL_BASE_MS + rows * FALL_MS_PER_ROW);

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

  private applySpawnSpecial(piece: Piece, at: Coord, t: number): void {
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
      dur: 200,
      ease: easeOutCubic,
      from: 0.15,
    });
  }
}
