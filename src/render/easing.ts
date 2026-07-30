/**
 * CRYSTALLINE — easing curves.
 *
 * Pure functions of normalised time `t` in [0, 1]. No allocation, no state.
 *
 * The elastic / back curves are load-bearing: the design doc singles out the
 * invalid-swap "elastic rejection" as an error-prevention affordance, so the
 * spring-back must genuinely overshoot and settle rather than merely reverse.
 */

export type EaseFn = (t: number) => number;

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const linear: EaseFn = (t) => t;

export const easeInQuad: EaseFn = (t) => t * t;
export const easeOutQuad: EaseFn = (t) => t * (2 - t);
export const easeInOutQuad: EaseFn = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const easeInCubic: EaseFn = (t) => t * t * t;
export const easeOutCubic: EaseFn = (t) => {
  const u = t - 1;
  return u * u * u + 1;
};
export const easeInOutCubic: EaseFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutQuart: EaseFn = (t) => 1 - Math.pow(1 - t, 4);
export const easeInQuart: EaseFn = (t) => t * t * t * t;

export const easeInOutSine: EaseFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutSine: EaseFn = (t) => Math.sin((t * Math.PI) / 2);

const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;

/** Anticipates backwards before launching — good for a tile "winding up" to clear. */
export const easeInBack: EaseFn = (t) => BACK_C3 * t * t * t - BACK_C1 * t * t;

/** Overshoots the target then settles — the spawn "pop" for specials. */
export const easeOutBack: EaseFn = (t) => {
  const u = t - 1;
  return 1 + BACK_C3 * u * u * u + BACK_C1 * u * u;
};

const ELASTIC_C4 = (2 * Math.PI) / 3;

/**
 * The rejection spring. Overshoots and oscillates down to rest.
 * Deliberately soft (period 3) so it reads as "that didn't take", not as an error.
 */
export const easeOutElastic: EaseFn = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_C4) + 1;
};

export const easeOutBounce: EaseFn = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const u = t - 1.5 / d1;
    return n1 * u * u + 0.75;
  }
  if (t < 2.5 / d1) {
    const u = t - 2.25 / d1;
    return n1 * u * u + 0.9375;
  }
  const u = t - 2.625 / d1;
  return n1 * u * u + 0.984375;
};

/**
 * Gravity with a small settle. Pieces accelerate then compress a touch on landing,
 * which is what sells weight without the cartoon read of a full bounce.
 */
export const easeFall: EaseFn = (t) => {
  if (t < 0.82) {
    const u = t / 0.82;
    return u * u * 1.035;
  }
  const u = (t - 0.82) / 0.18;
  return 1.035 - 0.035 * Math.sin((u * Math.PI) / 2);
};

/** 0 -> 1 -> 0, for one-shot flashes and pulses. */
export const pulse: EaseFn = (t) => Math.sin(clamp01(t) * Math.PI);

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
