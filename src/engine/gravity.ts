/**
 * CRYSTALLINE — gravity and top-of-board refill.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * Gravity is per-column, bottom-up. Stones and bombs are pinned (isFallable).
 * Unplayable cells (holes) never receive pieces and never act as landing pads —
 * pieces fall *past* a hole only when there is a playable empty cell below them
 * with a continuous path of playable cells; holes break the column.
 *
 * Implementation: each column is a vertical shaft of playable cells. Fallable
 * pieces compact toward the bottom of the shaft; empties rise; new pieces spawn
 * above the top playable cell of each shaft.
 */

import type { FallMove, SpawnRef } from './events';
import type { Grid2D } from './grid';
import type { Rng } from './rng';
import { pickNonMatchingColor, type SpawnTable } from './spawn';
import { isFallable, makeCrystal, makeRelic, type IdAllocator } from './tile';
import type { Cell, Piece } from './types';

export interface GravityResult {
  readonly falls: FallMove[];
  readonly spawns: SpawnRef[];
}

/**
 * Collect-objective relic injection during top-of-board refill.
 * `remaining` = objective target − already collected.
 * Spawns relics until `onBoard + newlySpawned` covers remaining (with a small buffer).
 */
export interface RelicSpawnPlan {
  remaining: number;
  onBoard: number;
}

export interface GravityOpts {
  readonly relics?: RelicSpawnPlan;
}

/**
 * Apply gravity + refill for the whole board.
 * Mutates the grid. Returns the motion the view must animate.
 */
export const applyGravity = (
  grid: Grid2D<Cell>,
  rng: Rng,
  table: SpawnTable,
  ids: IdAllocator,
  opts: GravityOpts = {},
): GravityResult => {
  const falls: FallMove[] = [];
  const spawns: SpawnRef[] = [];

  // How many relics still need to appear for collect goals (in flight + not yet collected).
  let relicsToInject = 0;
  if (opts.relics && opts.relics.remaining > 0) {
    const deficit = opts.relics.remaining - opts.relics.onBoard;
    // Inject at least the deficit, and keep a small surplus so chains don't starve.
    relicsToInject = Math.max(0, deficit + (deficit > 0 ? 1 : 0));
  }

  for (let x = 0; x < grid.width; x++) {
    // Collect playable row indices top→bottom for this column.
    const shaft: number[] = [];
    for (let y = 0; y < grid.height; y++) {
      const cell = grid.at(x, y);
      if (cell.playable) shaft.push(y);
    }
    if (shaft.length === 0) continue;

    // Read current fallable pieces top→bottom, leaving pinned pieces in place.
    // Strategy: walk bottom-up; for each empty playable cell, pull the nearest
    // fallable piece from above within the same contiguous playable segment.
    // Holes split columns into independent segments.
    let segStart = 0;
    while (segStart < shaft.length) {
      // Segment ends at a gap in y (hole) or end of shaft.
      let segEnd = segStart;
      while (
        segEnd + 1 < shaft.length &&
        (shaft[segEnd + 1] as number) === (shaft[segEnd] as number) + 1
      ) {
        segEnd++;
      }

      compactSegment(
        grid,
        x,
        shaft,
        segStart,
        segEnd,
        falls,
        spawns,
        rng,
        table,
        ids,
        () => {
          if (relicsToInject <= 0) return false;
          // Aggressive when we still need several; always fair chance when any remain.
          const p = Math.min(0.72, 0.28 + relicsToInject * 0.12);
          if (rng.chance(p)) {
            relicsToInject -= 1;
            return true;
          }
          return false;
        },
      );
      segStart = segEnd + 1;
    }
  }

  // If RNG was unlucky and we still need relics, force-inject into any top-of-column
  // crystal that just spawned (last spawns in list).
  if (relicsToInject > 0) {
    for (let i = spawns.length - 1; i >= 0 && relicsToInject > 0; i--) {
      const s = spawns[i]!;
      if (s.piece.kind !== 'crystal') continue;
      const cell = grid.at(s.to.x, s.to.y);
      if (cell.piece?.id !== s.piece.id) continue;
      const relic = makeRelic(ids);
      cell.piece = relic;
      (spawns as SpawnRef[])[i] = { ...s, piece: relic };
      relicsToInject -= 1;
    }
  }

  return { falls, spawns };
};

/**
 * Compact one contiguous playable segment (no holes between).
 * Bottom of segment is shaft[segEnd]; top is shaft[segStart].
 */
const compactSegment = (
  grid: Grid2D<Cell>,
  x: number,
  shaft: readonly number[],
  segStart: number,
  segEnd: number,
  falls: FallMove[],
  spawns: SpawnRef[],
  rng: Rng,
  table: SpawnTable,
  ids: IdAllocator,
  shouldSpawnRelic: () => boolean,
): void => {
  // Collect fallable pieces from bottom to top of segment (we want bottom-first stack).
  const stack: { piece: Piece; fromY: number }[] = [];
  for (let i = segEnd; i >= segStart; i--) {
    const y = shaft[i] as number;
    const cell = grid.at(x, y);
    if (isFallable(cell.piece)) {
      stack.push({ piece: cell.piece, fromY: y });
      cell.piece = null;
    }
    // Pinned pieces (stone/bomb) stay; they also block falling through — but
    // since we already nulled fallables, pinned remain and create sub-segments
    // implicitly by remaining in place. Re-stack only into empty cells.
  }

  // Place stack from bottom upward into empty playable cells (skipping pinned).
  let stackIdx = 0;
  for (let i = segEnd; i >= segStart; i--) {
    const y = shaft[i] as number;
    const cell = grid.at(x, y);
    if (cell.piece !== null) continue; // pinned
    if (stackIdx < stack.length) {
      const item = stack[stackIdx] as { piece: Piece; fromY: number };
      stackIdx++;
      cell.piece = item.piece;
      if (item.fromY !== y) {
        falls.push({
          pieceId: item.piece.id,
          from: { x, y: item.fromY },
          to: { x, y },
        });
      }
    }
  }

  // Remaining empty cells at the top of the segment need spawns.
  // Count empties top→bottom and fill them with new crystals (or relics) falling in.
  let fromAbove = 0;
  for (let i = segStart; i <= segEnd; i++) {
    const y = shaft[i] as number;
    const cell = grid.at(x, y);
    if (cell.piece !== null) continue;
    fromAbove++;
    const piece = shouldSpawnRelic()
      ? makeRelic(ids)
      : makeCrystal(ids, pickNonMatchingColor(rng, table, grid, x, y));
    cell.piece = piece;
    spawns.push({
      piece,
      to: { x, y },
      fromAbove,
    });
  }
};
