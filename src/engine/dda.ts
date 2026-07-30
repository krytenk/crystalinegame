/**
 * CRYSTALLINE — Dynamic Difficulty Adjustment.
 *
 * PURE MODEL CODE. No DOM, no timers, no randomness, no I/O.
 *
 * The scalar runs -1 (maximum hidden assistance for a struggling player) through 0
 * (neutral) to +1 (maximum hidden pressure on a skilled one). It is NEVER surfaced
 * during play; the Publisher Dashboard reads it after the fact, which is the point of
 * this research build.
 *
 * DDA here is pure parameter manipulation — the level geometry and rules are
 * untouched. What moves is:
 *   - spawn weights (assist biases toward objective-relevant colours),
 *   - how often a match awards a special,
 *   - how fast creeping shadow expands.
 *
 * Everything in this file is a pure function of its inputs, so the dashboard can
 * replay a player's metric history and reproduce the exact curve they experienced.
 */

import type { CrystalColor, DdaInputs, DdaState, LevelDef, Objective } from './types';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Weights of each signal in the final scalar. They sum to 1. */
export const DDA_WEIGHTS = {
  failStreak: 0.45,
  winRatio: 0.35,
  moveTime: 0.2,
} as const;

/** A fail streak at or beyond this saturates the assistance term. */
export const FAIL_STREAK_SATURATION = 3;
/** Seconds per move considered neutral. Faster reads as skill, slower as struggle. */
export const NEUTRAL_MOVE_SECONDS = 6;
/** Half-width of the move-time band, in seconds. */
export const MOVE_TIME_SPAN = 5;

/**
 * Maps performance metrics onto the difficulty scalar.
 *
 * Sign convention: positive contributions mean "this player is coping, apply
 * pressure"; negative mean "this player is drowning, assist".
 */
export const computeDda = (inputs: DdaInputs): number => {
  const { failStreak, winRatio, meanMoveTime } = inputs;

  // Repeated failure is the strongest and most urgent assist signal.
  const streak = clamp(Math.max(0, failStreak) / FAIL_STREAK_SATURATION, 0, 1);
  const streakTerm = -streak;

  // A rolling win ratio above half means the player is comfortably ahead.
  const ratioTerm = clamp((clamp(winRatio, 0, 1) - 0.5) * 2, -1, 1);

  // Deliberation time. Zero means "no data yet" and must not read as infinite skill.
  const timeTerm =
    meanMoveTime > 0
      ? clamp((NEUTRAL_MOVE_SECONDS - meanMoveTime) / MOVE_TIME_SPAN, -1, 1)
      : 0;

  const scalar =
    streakTerm * DDA_WEIGHTS.failStreak +
    ratioTerm * DDA_WEIGHTS.winRatio +
    timeTerm * DDA_WEIGHTS.moveTime;

  return clamp(scalar, -1, 1);
};

/** Convenience wrapper producing the full published state shape. */
export const makeDdaState = (inputs: DdaInputs): DdaState => ({
  scalar: computeDda(inputs),
  failStreak: inputs.failStreak,
  winRatio: inputs.winRatio,
  meanMoveTime: inputs.meanMoveTime,
});

// ---------------------------------------------------------------------------
// Modulation
// ---------------------------------------------------------------------------

export interface DdaModulation {
  /**
   * Multiplier applied to objective-relevant colours in the spawn table.
   * > 1 when assisting (scalar < 0), < 1 when applying pressure.
   */
  readonly colorBias: number;
  /** Multiplier on the chance a qualifying match awards a special. */
  readonly specialRate: number;
  /** Multiplier on how many cells creeping shadow claims per spread tick. */
  readonly shadowRate: number;
}

/** Strongest bias multiplier at scalar = -1. */
export const MAX_COLOR_BIAS = 2.5;
/** Special-spawn frequency swing, +/- this fraction. */
export const SPECIAL_RATE_SWING = 0.35;
/** Shadow spread-rate swing, +/- this fraction. */
export const SHADOW_RATE_SWING = 0.6;

export const ddaModulation = (scalar: number): DdaModulation => {
  const s = clamp(scalar, -1, 1);
  // At s = -1 objective colours are MAX_COLOR_BIAS times as likely; at s = +1 they
  // are suppressed by the reciprocal amount.
  const colorBias = Math.pow(MAX_COLOR_BIAS, -s);
  return {
    colorBias,
    specialRate: 1 - s * SPECIAL_RATE_SWING,
    shadowRate: 1 + s * SHADOW_RATE_SWING,
  };
};

/**
 * The colours a level's objectives actually care about.
 *
 * Only `collect` carries a colour in the frozen contract, so that is the honest
 * answer for most levels; an empty result means "no colour is more useful than any
 * other" and the assist falls back to flattening the distribution.
 */
export const objectiveColors = (objectives: readonly Objective[]): CrystalColor[] => {
  const out: CrystalColor[] = [];
  for (const o of objectives) {
    if (o.color && !out.includes(o.color)) out.push(o.color);
  }
  return out;
};

/**
 * Applies the DDA scalar to a base weight vector.
 *
 * When assisting with no colour-specific objective we still help, by flattening the
 * distribution toward uniform: an even spread of colours produces more incidental
 * three-in-a-rows than a lopsided one.
 *
 * Pure: same inputs, same output, no randomness.
 */
export const modulateWeights = (
  colors: readonly CrystalColor[],
  baseWeights: readonly number[],
  scalar: number,
  relevant: readonly CrystalColor[],
): number[] => {
  const s = clamp(scalar, -1, 1);
  const { colorBias } = ddaModulation(s);

  const out = colors.map((c, i) => {
    const base = Math.max(0, baseWeights[i] ?? 0);
    return relevant.includes(c) ? base * colorBias : base;
  });

  if (relevant.length === 0 && s !== 0) {
    // No favoured colour: assistance flattens, pressure sharpens.
    const total = out.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const mean = total / out.length;
      // t = 1 fully uniform (max assist), t = -1 doubles the spread (max pressure).
      const t = -s;
      for (let i = 0; i < out.length; i++) {
        const w = out[i] ?? 0;
        out[i] = Math.max(0, w + (mean - w) * t);
      }
    }
  }

  const total = out.reduce((a, b) => a + b, 0);
  if (total <= 0) return colors.map(() => 1);
  return out;
};

/** Base weights for a level, defaulting to uniform, aligned with `level.colors`. */
export const baseWeightsFor = (level: LevelDef): number[] =>
  level.colors.map((c) => {
    const w = level.spawnWeights?.[c];
    return w === undefined || !Number.isFinite(w) || w <= 0 ? 1 : w;
  });
