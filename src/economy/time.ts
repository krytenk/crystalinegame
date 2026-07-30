/**
 * CRYSTALLINE — economy clock utilities.
 *
 * SIMULATION ONLY. Nothing here talks to a server, and nothing here reads a
 * global clock on its own: every consumer receives a `Clock` so tests can
 * fast-forward thirty minutes (or three hours, or a week) without waiting.
 */

/** Injected wall-clock source. Defaults to `Date.now` at the composition root. */
export type Clock = () => number;

/** The default clock. Only `index.ts` should reach for this. */
export const systemClock: Clock = () => Date.now();

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Local calendar day key, `YYYY-MM-DD`.
 *
 * Local rather than UTC on purpose: "did the player come back today?" is a
 * question about the player's day, not Greenwich's. Retention and daily-cap
 * boundaries both flip at the player's local midnight.
 */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Index of the local calendar day containing `ts`, measured in whole days from
 * the epoch. Subtracting two of these gives the number of *midnights* crossed,
 * which is exactly how D1/D7/D30 retention is defined — a player who installs
 * at 23:50 and returns at 00:10 has retained to D1.
 */
export function dayIndex(ts: number): number {
  const d = new Date(ts);
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY,
  );
}

/** Whole local days between two instants (midnights crossed, never negative). */
export function daysBetween(fromTs: number, toTs: number): number {
  return Math.max(0, dayIndex(toTs) - dayIndex(fromTs));
}

/** Clamp helper used across the economy for defensive numeric handling. */
export function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}

/** Coerce anything to a non-negative safe integer, defaulting on garbage. */
export function safeCount(n: unknown, fallback = 0): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}
