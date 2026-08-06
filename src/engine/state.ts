/**
 * CRYSTALLINE — internal mutable session state.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * This is engine-private plumbing, deliberately kept out of the frozen contract:
 * `types.ts` publishes `BoardSnapshot`, which is what the view is allowed to see.
 * The shape here exists so `resolve`, `blockers`, `specials`, `objectives` and
 * `deadlock` can share one object without a circular dependency on `board.ts`.
 *
 * Everything the engine needs in order to be deterministic lives here: the grid, the
 * PRNG, the id allocator's counter, and the move index. Nothing is read from a clock
 * or a global.
 */

import type { Grid2D } from './grid';
import type { Rng } from './rng';
import type { SpawnTable } from './spawn';
import type { IdAllocator } from './tile';
import type { Cell, LevelDef, LevelStatus, ObjectiveProgress } from './types';

/** Running tallies that objectives are scored against. */
export interface SessionCounters {
  /** Cells whose crust reached zero. */
  crustBroken: number;
  /** Cells that started the level crusted. */
  crustInitial: number;
  /** Relics dropped off the bottom row. */
  relicsCollected: number;
  /** Bombs neutralised by a match or blast. */
  bombsDefused: number;
  /** Bombs present when the level began. */
  bombsInitial: number;
  /** Peak concurrent shadowed cells (informational / DDA). */
  shadowSeen: number;
  /**
   * Cumulative shadowed cells cleared by matches — the real `contain` progress.
   * Must never treat "no shadow on board" as done when this is still 0 (night
   * has not fallen yet), or pure-contain levels auto-win on the first swap.
   */
  shadowCleared: number;
}

export type EndReason = 'objectivesMet' | 'outOfMoves' | 'bombExpired';

export interface SessionState {
  readonly level: LevelDef;
  /** Grid identity is stable for the session; cell contents are mutated in place. */
  readonly grid: Grid2D<Cell>;
  readonly rng: Rng;
  readonly ids: IdAllocator;

  movesLeft: number;
  score: number;
  status: LevelStatus;
  /** Number of player moves committed. Drives bomb fuses and shadow ticks. */
  moveIndex: number;
  stars: number;
  endReason: EndReason | null;

  /** Current DDA scalar, -1..1. Never surfaced during play. */
  ddaScalar: number;
  /** Spawn probability table, rebuilt whenever the scalar changes. */
  table: SpawnTable;

  counters: SessionCounters;
  objectives: ObjectiveProgress[];
  /**
   * Once true, the sugar-crush win flourish has already run for this session.
   * Prevents re-entry if end-of-level logic is invoked more than once.
   */
  winFlourishPlayed: boolean;
}

export const newCounters = (): SessionCounters => ({
  crustBroken: 0,
  crustInitial: 0,
  relicsCollected: 0,
  bombsDefused: 0,
  bombsInitial: 0,
  shadowSeen: 0,
  shadowCleared: 0,
});

/** Convenience for modules that only need the level's colour set. */
export const levelColors = (level: LevelDef) =>
  level.colors.length > 0 ? level.colors : (['ember'] as const);
