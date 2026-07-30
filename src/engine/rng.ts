/**
 * CRYSTALLINE — seeded pseudo-random number generation.
 *
 * PURE MODEL CODE. No DOM, no timers, no `Math.random`.
 *
 * Every stochastic decision in the engine flows through an {@link Rng} instance so
 * that a `(level, seed)` pair reproduces a byte-identical event stream. The generator
 * is mulberry32: a 32-bit state, extremely fast, and good enough statistically for a
 * puzzle board. Because the whole state is a single uint32 it can be snapshotted and
 * restored trivially, which is what makes replay and the determinism soak possible.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). Returns 0 when `n <= 0`. */
  int(n: number): number;
  /** Uniform integer in [min, max] inclusive. */
  range(min: number, max: number): number;
  /** Uniform element of a non-empty array. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Index chosen proportionally to `weights`. Negative weights are treated as 0. */
  weighted(weights: readonly number[]): number;
  /** In-place Fisher-Yates shuffle. Returns the same array for chaining. */
  shuffle<T>(items: T[]): T[];
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** An independent generator continuing from this one's current state. */
  clone(): Rng;
  /** The full internal state — a single uint32. */
  getState(): number;
  /** Restores a state previously returned by {@link getState}. */
  setState(state: number): void;
}

/** Normalises any numeric seed (including negatives and floats) into a uint32. */
export const normaliseSeed = (seed: number): number => {
  if (!Number.isFinite(seed)) return 0;
  return Math.floor(seed) >>> 0;
};

/**
 * Creates a mulberry32 generator.
 *
 * @param seed any finite number; it is coerced to a uint32.
 */
export const createRng = (seed: number): Rng => {
  let state = normaliseSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (n: number): number => {
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(next() * n);
  };

  const rng: Rng = {
    next,
    int,
    range: (min, max) => {
      if (max < min) return min;
      return min + int(max - min + 1);
    },
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError('Rng.pick: empty array');
      const v = items[int(items.length)];
      return v as T;
    },
    weighted: (weights) => {
      let total = 0;
      for (let i = 0; i < weights.length; i++) {
        const w = weights[i] ?? 0;
        if (w > 0) total += w;
      }
      if (total <= 0) return int(weights.length);
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        const w = weights[i] ?? 0;
        if (w <= 0) continue;
        roll -= w;
        if (roll < 0) return i;
      }
      // Floating-point drift only; fall back to the last positive bucket.
      for (let i = weights.length - 1; i >= 0; i--) {
        if ((weights[i] ?? 0) > 0) return i;
      }
      return 0;
    },
    shuffle: <T,>(items: T[]): T[] => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const a = items[i] as T;
        const b = items[j] as T;
        items[i] = b;
        items[j] = a;
      }
      return items;
    },
    chance: (p) => next() < p,
    clone: () => createRng(state),
    getState: () => state,
    setState: (s) => {
      state = normaliseSeed(s);
    },
  };

  return rng;
};
