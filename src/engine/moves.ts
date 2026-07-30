/**
 * CRYSTALLINE — swap validation.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * A legal swap is orthogonally adjacent (Manhattan distance === 1) and involves
 * two movable pieces. Diagonal and long-range swaps are rejected without
 * consuming a move — Nielsen error prevention from the research document.
 */

import { manhattan, type Grid2D } from './grid';
import { isMovable } from './tile';
import type { Cell, Coord } from './types';

export type SwapRejectReason = 'notAdjacent' | 'noMatch' | 'immovable' | 'notPlaying';

export interface SwapCheck {
  readonly ok: boolean;
  readonly reason?: SwapRejectReason;
}

/** True when two coordinates share an edge (no diagonals). */
export const isAdjacent = (a: Coord, b: Coord): boolean => manhattan(a, b) === 1;

/**
 * Structural swap check: bounds, adjacency, and movability.
 * Does **not** check whether the swap produces a match — that needs a trial swap.
 */
export const canAttemptSwap = (
  grid: Grid2D<Cell>,
  a: Coord,
  b: Coord,
  playing: boolean,
): SwapCheck => {
  if (!playing) return { ok: false, reason: 'notPlaying' };
  if (!grid.inBounds(a.x, a.y) || !grid.inBounds(b.x, b.y)) {
    return { ok: false, reason: 'notAdjacent' };
  }
  if (!isAdjacent(a, b)) return { ok: false, reason: 'notAdjacent' };

  const ca = grid.at(a.x, a.y);
  const cb = grid.at(b.x, b.y);
  if (!ca.playable || !cb.playable) return { ok: false, reason: 'immovable' };
  if (!isMovable(ca.piece) || !isMovable(cb.piece)) {
    return { ok: false, reason: 'immovable' };
  }
  return { ok: true };
};

/** Exchange the pieces at two coordinates. Caller must validate first. */
export const swapPieces = (grid: Grid2D<Cell>, a: Coord, b: Coord): void => {
  const ca = grid.at(a.x, a.y);
  const cb = grid.at(b.x, b.y);
  const tmp = ca.piece;
  ca.piece = cb.piece;
  cb.piece = tmp;
};
