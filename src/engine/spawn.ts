/**
 * CRYSTALLINE — weighted procedural generation.
 *
 * PURE MODEL CODE. No DOM, no timers. All randomness arrives as an `Rng` parameter.
 *
 * Unweighted randomness breaks match-3 in two specific ways, and this module exists
 * to guard against both:
 *
 *  1. **Dead boards** — a refill that leaves zero legal moves. Guarded downstream by
 *     `deadlock.ts`, which this module cooperates with by never producing a board
 *     without first being checked.
 *  2. **Runaway self-clearing** — a refill that immediately matches itself, so the
 *     board keeps cascading without player input. Guarded here: when choosing a
 *     colour for a cell we reject colours that would instantly complete a run,
 *     retrying a bounded number of times and then accepting whatever we drew. The
 *     bound matters — an unbounded retry can livelock on a board where every colour
 *     completes a run.
 *
 * The probability table is the level's `spawnWeights` (uniform by default) run
 * through the DDA modulator, so a struggling player quietly receives more of the
 * colours their objectives need.
 */

import { baseWeightsFor, modulateWeights, objectiveColors, ddaModulation } from './dda';
import type { Grid2D } from './grid';
import { wouldFormRun } from './match';
import type { Rng } from './rng';
import { makeCrystal, type IdAllocator } from './tile';
import type { Cell, CrystalColor, LevelDef, Piece } from './types';

/** How many times to redraw a colour before accepting an instant self-match. */
export const SPAWN_RETRY_LIMIT = 8;

/** Base probability that an ordinary three-match also awards a special. */
export const BONUS_SPECIAL_BASE = 0.04;

export interface SpawnTable {
  readonly colors: readonly CrystalColor[];
  /** Parallel to `colors`. Not normalised — `Rng.weighted` handles the total. */
  readonly weights: readonly number[];
  /** The DDA scalar this table was built at, for the dashboard. */
  readonly scalar: number;
}

/**
 * Builds the probability table for a level at a given difficulty scalar.
 * Pure: no rng, no mutation.
 */
export const buildSpawnTable = (level: LevelDef, scalar: number): SpawnTable => {
  const colors = level.colors.length > 0 ? level.colors : (['ember'] as CrystalColor[]);
  const base = level.colors.length > 0 ? baseWeightsFor(level) : [1];
  const relevant = objectiveColors(level.objectives);
  return {
    colors,
    weights: modulateWeights(colors, base, scalar, relevant),
    scalar,
  };
};

/** Draws one colour from the table. */
export const pickSpawnColor = (rng: Rng, table: SpawnTable): CrystalColor =>
  table.colors[rng.weighted(table.weights)] as CrystalColor;

/**
 * Draws a colour for (x, y) that does not instantly complete a run of three.
 *
 * Falls back to the last draw after {@link SPAWN_RETRY_LIMIT} attempts so this can
 * never spin forever on a board where every colour would match.
 */
export const pickNonMatchingColor = (
  rng: Rng,
  table: SpawnTable,
  grid: Grid2D<Cell>,
  x: number,
  y: number,
  retries = SPAWN_RETRY_LIMIT,
): CrystalColor => {
  let color = pickSpawnColor(rng, table);
  for (let i = 0; i < retries && wouldFormRun(grid, x, y, color); i++) {
    color = pickSpawnColor(rng, table);
  }
  return color;
};

/** Creates a crystal for (x, y), biased away from instant self-matching. */
export const spawnCrystalFor = (
  rng: Rng,
  table: SpawnTable,
  ids: IdAllocator,
  grid: Grid2D<Cell>,
  x: number,
  y: number,
): Piece => makeCrystal(ids, pickNonMatchingColor(rng, table, grid, x, y));

/**
 * Fills every empty playable cell with a crystal, guaranteeing no pre-existing match.
 *
 * Used for the opening position and by the reshuffle repair path. Cells are visited
 * top-to-bottom so `wouldFormRun` always sees already-committed neighbours.
 */
export const fillEmptyCells = (
  grid: Grid2D<Cell>,
  rng: Rng,
  table: SpawnTable,
  ids: IdAllocator,
): number => {
  let placed = 0;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.at(x, y);
      if (!cell.playable || cell.piece !== null) continue;
      cell.piece = spawnCrystalFor(rng, table, ids, grid, x, y);
      placed++;
    }
  }
  return placed;
};

/**
 * Probability that a plain three-match also drops a special.
 *
 * This is the "special spawn frequency" DDA lever. Assistance raises it, pressure
 * lowers it. Rewards for four / L / T / five are never withheld — silently denying a
 * reward the player earned is the kind of DDA that gets noticed, and noticed DDA
 * stops working.
 */
export const bonusSpecialChance = (scalar: number): number =>
  Math.max(0, BONUS_SPECIAL_BASE * ddaModulation(scalar).specialRate);
