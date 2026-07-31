/**
 * Soft daily goal + win streak — ethical retention (no appointment punish).
 *
 * Missing a day simply starts a fresh goal; streak only drops on a failed level.
 */

import { dayKey } from './time';

export interface DailyGoalsPersist {
  readonly day: string;
  readonly clears: number;
  readonly claimed: boolean;
  readonly winStreak: number;
  readonly bestStreak: number;
}

export interface DailyGoalsSnapshot {
  readonly day: string;
  readonly clears: number;
  readonly target: number;
  readonly claimed: boolean;
  readonly complete: boolean;
  readonly claimReady: boolean;
  readonly rewardEssence: number;
  readonly winStreak: number;
  readonly bestStreak: number;
  readonly pct: number;
}

export const DAILY_CLEAR_TARGET = 3;
export const DAILY_GOAL_ESSENCE = 35;

export function emptyDailyGoals(now: number): DailyGoalsPersist {
  return {
    day: dayKey(now),
    clears: 0,
    claimed: false,
    winStreak: 0,
    bestStreak: 0,
  };
}

export function parseDailyGoals(raw: unknown, now: number): DailyGoalsPersist {
  const base = emptyDailyGoals(now);
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const day = typeof o['day'] === 'string' ? o['day'] : base.day;
  const today = dayKey(now);
  // New calendar day → reset goal progress, keep streaks
  if (day !== today) {
    return {
      day: today,
      clears: 0,
      claimed: false,
      winStreak: Math.max(0, Math.floor(Number(o['winStreak']) || 0)),
      bestStreak: Math.max(0, Math.floor(Number(o['bestStreak']) || 0)),
    };
  }
  return {
    day,
    clears: Math.max(0, Math.floor(Number(o['clears']) || 0)),
    claimed: o['claimed'] === true,
    winStreak: Math.max(0, Math.floor(Number(o['winStreak']) || 0)),
    bestStreak: Math.max(0, Math.floor(Number(o['bestStreak']) || 0)),
  };
}

export class DailyGoalsModel {
  private day: string;
  private clears: number;
  private claimed: boolean;
  private winStreak: number;
  private bestStreak: number;

  constructor(snap: DailyGoalsPersist) {
    this.day = snap.day;
    this.clears = snap.clears;
    this.claimed = snap.claimed;
    this.winStreak = snap.winStreak;
    this.bestStreak = snap.bestStreak;
  }

  get serialized(): DailyGoalsPersist {
    return {
      day: this.day,
      clears: this.clears,
      claimed: this.claimed,
      winStreak: this.winStreak,
      bestStreak: this.bestStreak,
    };
  }

  roll(now: number): void {
    const today = dayKey(now);
    if (this.day !== today) {
      this.day = today;
      this.clears = 0;
      this.claimed = false;
      // Streak intentionally survives overnight — only fails break it
    }
  }

  noteWin(now: number): void {
    this.roll(now);
    this.clears += 1;
    this.winStreak += 1;
    if (this.winStreak > this.bestStreak) this.bestStreak = this.winStreak;
  }

  noteFail(now: number): void {
    this.roll(now);
    this.winStreak = 0;
  }

  /** Claim daily essence once when target reached. */
  claim(now: number): number {
    this.roll(now);
    if (this.claimed || this.clears < DAILY_CLEAR_TARGET) return 0;
    this.claimed = true;
    return DAILY_GOAL_ESSENCE;
  }

  snapshot(now: number): DailyGoalsSnapshot {
    this.roll(now);
    const complete = this.clears >= DAILY_CLEAR_TARGET;
    return {
      day: this.day,
      clears: this.clears,
      target: DAILY_CLEAR_TARGET,
      claimed: this.claimed,
      complete,
      claimReady: complete && !this.claimed,
      rewardEssence: DAILY_GOAL_ESSENCE,
      winStreak: this.winStreak,
      bestStreak: this.bestStreak,
      pct: Math.min(100, Math.floor((this.clears / DAILY_CLEAR_TARGET) * 100)),
    };
  }
}
