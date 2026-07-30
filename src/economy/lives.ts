/**
 * CRYSTALLINE — the lives gate.
 *
 * SIMULATION ONLY. Lives are refilled with fictional shards; nothing here can
 * charge anyone.
 *
 * This is the mechanic the research doc calls "the pacing of frustration": five
 * lives, one lost per failure, one restored every thirty minutes. It caps a
 * session at five failures, converts the tail of a losing streak into a
 * scheduled return visit, and — critically — places the player in front of a
 * countdown at exactly the moment they most want to keep playing. Every offer
 * in `store.ts` is aimed at that countdown.
 *
 * Regeneration is computed from **wall-clock timestamps**, never from ticks, so
 * it accrues while the game is closed. That is the entire point: the timer runs
 * on the player's day, not on the process's uptime.
 */

import { ECONOMY_CONST, type LivesState } from './api';
import { safeCount, type Clock } from './time';

export interface LivesSnapshot {
  readonly count: number;
  readonly nextRegenAt: number | null;
}

export interface LivesOptions {
  readonly max?: number;
  readonly regenMs?: number;
}

export class LivesModel {
  private count: number;
  private nextRegenAt: number | null;
  private readonly now: Clock;
  private readonly max: number;
  private readonly regenMs: number;

  constructor(initial: LivesSnapshot, now: Clock, opts: LivesOptions = {}) {
    this.now = now;
    this.max = Math.max(1, opts.max ?? ECONOMY_CONST.maxLives);
    this.regenMs = Math.max(1, opts.regenMs ?? ECONOMY_CONST.lifeRegenMs);
    this.count = Math.min(this.max, safeCount(initial.count, this.max));
    this.nextRegenAt =
      typeof initial.nextRegenAt === 'number' && Number.isFinite(initial.nextRegenAt)
        ? initial.nextRegenAt
        : null;
    this.accrue();
  }

  /** Current state, with regeneration brought up to date first. */
  get state(): LivesState {
    this.accrue();
    const t = this.now();
    return {
      count: this.count,
      nextRegenAt: this.nextRegenAt,
      msUntilNext: this.nextRegenAt === null ? 0 : Math.max(0, this.nextRegenAt - t),
    };
  }

  get serialized(): LivesSnapshot {
    this.accrue();
    return { count: this.count, nextRegenAt: this.nextRegenAt };
  }

  get isFull(): boolean {
    this.accrue();
    return this.count >= this.max;
  }

  get maxLives(): number {
    return this.max;
  }

  /** Spend one life to start a level. Returns false when the gate is closed. */
  consume(): boolean {
    this.accrue();
    if (this.count <= 0) return false;
    const wasFull = this.count >= this.max;
    this.count -= 1;
    // Losing a life while full is what *starts* the clock. If a timer is
    // already running we leave it alone — dropping from 3 to 2 must not reset
    // the 29 minutes already banked toward the next life.
    if (wasFull || this.nextRegenAt === null) {
      this.nextRegenAt = this.now() + this.regenMs;
    }
    return true;
  }

  /** Grant `n` lives, capped at max. Reaching max clears the regen clock. */
  grant(n = 1): LivesState {
    this.accrue();
    this.count = Math.min(this.max, this.count + safeCount(n, 0));
    if (this.count >= this.max) this.nextRegenAt = null;
    else if (this.nextRegenAt === null) this.nextRegenAt = this.now() + this.regenMs;
    return this.state;
  }

  /** Instant full refill (`lives.refill` SKU, or the shard convenience cost). */
  refill(): LivesState {
    this.count = this.max;
    this.nextRegenAt = null;
    return this.state;
  }

  /**
   * Bring the count up to date from wall-clock time. Idempotent, and safe to
   * call on every read.
   *
   * Edge cases, all of which occur in the wild:
   *  - **Many hours elapsed** (game closed overnight): grant every whole period
   *    that passed, capped at `max`. `1 + floor(overshoot / regenMs)` counts the
   *    life that was already due plus each subsequent period.
   *  - **Clock ran backwards** (manual clock change, DST, NTP correction): the
   *    deadline can end up more than one full period in the future. We pull it
   *    back to `now + regenMs`. The *count* is never touched, so a backwards
   *    jump neither grants nor destroys lives — it only stops the countdown
   *    from appearing stuck at an absurd value.
   */
  private accrue(): void {
    const t = this.now();

    if (this.count >= this.max) {
      this.count = this.max;
      this.nextRegenAt = null;
      return;
    }

    if (this.nextRegenAt === null) {
      // Below max with no clock running (fresh migration, or a repaired save):
      // start one now rather than stalling the player forever.
      this.nextRegenAt = t + this.regenMs;
      return;
    }

    if (t >= this.nextRegenAt) {
      const overshoot = t - this.nextRegenAt;
      const gained = 1 + Math.floor(overshoot / this.regenMs);
      const room = this.max - this.count;
      this.count += Math.min(room, gained);
      if (this.count >= this.max) {
        this.nextRegenAt = null;
      } else {
        // Advance the deadline by exactly the periods consumed, preserving the
        // remainder so no fractional progress is lost.
        this.nextRegenAt += gained * this.regenMs;
      }
      return;
    }

    // Deadline is in the future. If it is further out than one whole period the
    // clock must have moved backwards; clamp so the HUD stays sane.
    if (this.nextRegenAt - t > this.regenMs) {
      this.nextRegenAt = t + this.regenMs;
    }
  }
}
