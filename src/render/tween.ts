/**
 * CRYSTALLINE — minimal pooled tween system.
 *
 * Tweens write directly into plain numeric records. The renderer keys one `Vis`
 * record per `Piece.id`, so a piece animates continuously across swaps, clears,
 * falls and respawns without the choreographer ever rebuilding its state.
 *
 * Everything is pooled: `add()` reuses a dead slot, and `update()` never allocates.
 */

import { clamp01, linear, type EaseFn } from './easing';

/** Any object whose numeric fields a tween may drive. */
export type NumRecord = { [k: string]: number };

/**
 * Per-piece visual state. All fields are numbers so tweens can address them by
 * name without a switch. `z` is the draw-order key (higher draws later).
 */
export type Vis = {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  rot: number;
  /** 0..1 additive white flash used on match highlight and bomb ticks. */
  flash: number;
  /** 0..1 glow ring strength, used for specials and charged pieces. */
  glow: number;
  z: number;
};

export const newVis = (x: number, y: number): Vis => ({
  x,
  y,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  alpha: 1,
  rot: 0,
  flash: 0,
  glow: 0,
  z: 0,
});

export const resetVis = (v: Vis, x: number, y: number): void => {
  v.x = x;
  v.y = y;
  v.scale = 1;
  v.scaleX = 1;
  v.scaleY = 1;
  v.alpha = 1;
  v.rot = 0;
  v.flash = 0;
  v.glow = 0;
  v.z = 0;
};

interface TweenRec {
  active: boolean;
  target: NumRecord | null;
  prop: string;
  from: number;
  to: number;
  start: number;
  dur: number;
  ease: EaseFn;
  done: (() => void) | null;
  /** Monotonic tag so a caller can cancel exactly what it started. */
  tag: number;
}

const makeRec = (): TweenRec => ({
  active: false,
  target: null,
  prop: '',
  from: 0,
  to: 0,
  start: 0,
  dur: 0,
  ease: linear,
  done: null,
  tag: 0,
});

export interface TweenOpts {
  /** Absolute timeline time (ms) at which the tween begins. */
  readonly start: number;
  readonly dur: number;
  readonly ease?: EaseFn;
  /** Read the current value as `from` when the tween actually starts. */
  readonly fromCurrent?: boolean;
  readonly from?: number;
  readonly onDone?: () => void;
}

export class Tweener {
  private readonly recs: TweenRec[] = [];
  private readonly free: number[] = [];
  private nextTag = 1;
  /** Latest end-time of any live tween; lets the choreographer know when it is idle. */
  private endTime = 0;

  get busy(): boolean {
    for (let i = 0; i < this.recs.length; i++) {
      const r = this.recs[i];
      if (r !== undefined && r.active) return true;
    }
    return false;
  }

  get horizon(): number {
    return this.endTime;
  }

  /** Start a tween. Returns a tag usable with {@link cancelTag}. */
  to(target: NumRecord, prop: keyof Vis | string, to: number, o: TweenOpts): number {
    let idx = this.free.pop();
    if (idx === undefined) {
      idx = this.recs.length;
      this.recs.push(makeRec());
    }
    const r = this.recs[idx];
    if (r === undefined) return 0;
    r.active = true;
    r.target = target;
    r.prop = prop as string;
    r.to = to;
    r.start = o.start;
    r.dur = o.dur <= 0 ? 0 : o.dur;
    r.ease = o.ease ?? linear;
    r.done = o.onDone ?? null;
    r.tag = this.nextTag++;
    if (o.fromCurrent === true || o.from === undefined) {
      const cur = target[r.prop];
      r.from = typeof cur === 'number' ? cur : 0;
    } else {
      r.from = o.from;
    }
    const end = r.start + r.dur;
    if (end > this.endTime) this.endTime = end;
    return r.tag;
  }

  /** Convenience: set a value at a future time with no interpolation. */
  set(target: NumRecord, prop: keyof Vis | string, value: number, at: number): number {
    return this.to(target, prop, value, { start: at, dur: 0, from: value });
  }

  cancelTag(tag: number): void {
    for (let i = 0; i < this.recs.length; i++) {
      const r = this.recs[i];
      if (r !== undefined && r.active && r.tag === tag) this.release(i, r);
    }
  }

  /** Cancel every live tween writing to `target` (optionally only one property). */
  cancel(target: NumRecord, prop?: string): void {
    for (let i = 0; i < this.recs.length; i++) {
      const r = this.recs[i];
      if (r === undefined || !r.active) continue;
      if (r.target !== target) continue;
      if (prop !== undefined && r.prop !== prop) continue;
      this.release(i, r);
    }
  }

  update(now: number): void {
    for (let i = 0; i < this.recs.length; i++) {
      const r = this.recs[i];
      if (r === undefined || !r.active) continue;
      if (now < r.start) continue;
      const target = r.target;
      if (target === null) {
        this.release(i, r);
        continue;
      }
      if (r.dur <= 0) {
        target[r.prop] = r.to;
        const cb = r.done;
        this.release(i, r);
        if (cb !== null) cb();
        continue;
      }
      const raw = (now - r.start) / r.dur;
      if (raw >= 1) {
        target[r.prop] = r.to;
        const cb = r.done;
        this.release(i, r);
        if (cb !== null) cb();
        continue;
      }
      const k = r.ease(clamp01(raw));
      target[r.prop] = r.from + (r.to - r.from) * k;
    }
  }

  /**
   * Jump every live tween to its final value, in start-time order, firing
   * completion callbacks. This is the "settle instantly" path used by the skip
   * button, the reduced-motion path and the test harness.
   */
  settleAll(): void {
    // Repeat: completion callbacks may schedule follow-on tweens.
    for (let guard = 0; guard < 64; guard++) {
      let any = false;
      let best = -1;
      let bestT = Infinity;
      for (let i = 0; i < this.recs.length; i++) {
        const r = this.recs[i];
        if (r === undefined || !r.active) continue;
        any = true;
        const end = r.start + r.dur;
        if (end < bestT) {
          bestT = end;
          best = i;
        }
      }
      if (!any || best < 0) return;
      const r = this.recs[best];
      if (r === undefined) return;
      const target = r.target;
      if (target !== null) target[r.prop] = r.to;
      const cb = r.done;
      this.release(best, r);
      if (cb !== null) cb();
    }
  }

  clear(): void {
    for (let i = 0; i < this.recs.length; i++) {
      const r = this.recs[i];
      if (r !== undefined && r.active) this.release(i, r);
    }
    this.endTime = 0;
  }

  private release(idx: number, r: TweenRec): void {
    r.active = false;
    r.target = null;
    r.done = null;
    this.free.push(idx);
  }
}
