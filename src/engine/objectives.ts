/**
 * CRYSTALLINE — objective progress.
 *
 * PURE MODEL CODE. No DOM, no timers.
 */

import type { SessionCounters, SessionState } from './state';
import type { LevelDef, ObjectiveProgress } from './types';

/** Build initial objective progress from the level definition and counters. */
export const initObjectives = (
  level: LevelDef,
  counters: SessionCounters,
): ObjectiveProgress[] =>
  level.objectives.map((o) => {
    let current = 0;
    if (o.kind === 'crust') current = counters.crustBroken;
    else if (o.kind === 'collect') current = counters.relicsCollected;
    else if (o.kind === 'defuse') current = counters.bombsDefused;
    else if (o.kind === 'contain') current = 0;
    else if (o.kind === 'score') current = 0;
    return {
      kind: o.kind,
      target: o.target,
      current: Math.min(current, o.target),
      done: current >= o.target,
    };
  });

/** Recompute progress after score / counters / board change. */
export const refreshObjectives = (session: SessionState): ObjectiveProgress[] => {
  const { level, counters, score, grid } = session;

  // Live contain count: cells still under shadow.
  let shadowed = 0;
  if (level.objectives.some((o) => o.kind === 'contain')) {
    grid.forEach((cell) => {
      if (cell.playable && cell.shadow > 0) shadowed++;
    });
  }

  return level.objectives.map((o) => {
    let current = 0;
    switch (o.kind) {
      case 'score':
        current = score;
        break;
      case 'crust':
        current = counters.crustBroken;
        break;
      case 'collect':
        current = counters.relicsCollected;
        break;
      case 'defuse':
        current = counters.bombsDefused;
        break;
      case 'contain': {
        // Target is the number of shadowed cells to clear (initial), progress is
        // how many have been cleared: initial - remaining.
        const initial = Math.max(o.target, counters.shadowSeen);
        current = Math.max(0, initial - shadowed);
        // If no shadow remains, fully done.
        if (shadowed === 0) current = o.target;
        break;
      }
      default:
        current = 0;
    }
    const clamped = Math.min(current, o.target);
    return {
      kind: o.kind,
      target: o.target,
      current: clamped,
      done: clamped >= o.target,
    };
  });
};

export const allObjectivesMet = (progress: readonly ObjectiveProgress[]): boolean =>
  progress.length > 0 && progress.every((p) => p.done);

/**
 * Star count from score thresholds (0..3).
 *
 * @param won when true, clearing the level always awards at least ★ — thresholds
 * only decide whether you earn ★★ / ★★★. A win with 0 stars felt like a broken
 * save rather than a tough score gate.
 * @param movesLeft leftover moves add a small effective-score bonus so efficient
 * clears are rewarded without needing absurd point totals.
 */
export const starsFromScore = (
  score: number,
  thresholds: readonly [number, number, number],
  opts: { won?: boolean; movesLeft?: number } = {},
): number => {
  const leftoverBonus = Math.max(0, opts.movesLeft ?? 0) * 120;
  const effective = score + leftoverBonus;
  let n = 0;
  for (const t of thresholds) {
    if (effective >= t) n++;
  }
  if (opts.won && n < 1) n = 1;
  return n;
};
