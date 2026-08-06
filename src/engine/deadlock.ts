/**
 * CRYSTALLINE — deadlock detection and reshuffle.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * Before returning control to the player, simulate every orthogonal swap of
 * movable pieces. If none produces a match (and no special combination works),
 * reshuffle fallable crystals until at least one legal move exists.
 */

import { findMatchesAt, hasAnyMatch } from './match';
import { isAdjacent, swapPieces } from './moves';
import { sortCoords, type Grid2D } from './grid';
import type { Rng } from './rng';
import { isPowerCrystal, powerSwapActivates } from './specials';
import { isFallable, isMovable } from './tile';
import type { Cell, Coord, Piece } from './types';

/** True when swapping a and b would create a match or trigger a power combo. */
export const swapWouldResolve = (grid: Grid2D<Cell>, a: Coord, b: Coord): boolean => {
  const ca = grid.get(a.x, a.y);
  const cb = grid.get(b.x, b.y);
  if (!ca || !cb || !ca.playable || !cb.playable) return false;
  if (!isMovable(ca.piece) || !isMovable(cb.piece)) return false;

  // Power fires only with a valid partner (same colour for line/burst).
  if (
    ca.piece &&
    cb.piece &&
    (isPowerCrystal(ca.piece) || isPowerCrystal(cb.piece)) &&
    powerSwapActivates(ca.piece, cb.piece)
  ) {
    return true;
  }

  swapPieces(grid, a, b);
  const matches = findMatchesAt(grid, [a, b]);
  swapPieces(grid, a, b);
  return matches.length > 0;
};

/** Scan the whole board for any legal resolving swap. */
export const hasLegalMove = (grid: Grid2D<Cell>): boolean => findLegalHint(grid) !== null;

/**
 * First legal swap for soft / comfort auto-hints (deterministic scan order).
 */
export const findLegalHint = (grid: Grid2D<Cell>): { a: Coord; b: Coord } | null => {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const a = { x, y };
      // Only check right and down to avoid double work.
      for (const b of [
        { x: x + 1, y },
        { x, y: y + 1 },
      ]) {
        if (!grid.inBounds(b.x, b.y)) continue;
        if (!isAdjacent(a, b)) continue;
        if (swapWouldResolve(grid, a, b)) return { a, b };
      }
    }
  }
  return null;
};

/**
 * Collect fallable coloured pieces and reshuffle their colours / kinds carefully:
 * only plain crystals are recoloured in place to keep specials and blockers stable.
 * Retries until hasLegalMove or attempts exhausted.
 */
export const reshuffleBoard = (grid: Grid2D<Cell>, rng: Rng, maxAttempts = 40): boolean => {
  // Gather positions of plain crystals only.
  const cells: Coord[] = [];
  const colors: Piece[] = [];

  grid.forEach((cell, coord) => {
    if (!cell.playable || !isFallable(cell.piece)) return;
    if (cell.piece.kind === 'crystal' && cell.piece.color) {
      cells.push(coord);
      colors.push(cell.piece);
    }
  });

  if (cells.length < 3) return hasLegalMove(grid);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    rng.shuffle(colors);
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i] as Coord;
      const piece = colors[i] as Piece;
      const cell = grid.at(c.x, c.y);
      cell.piece = piece;
    }
    // Reject boards that already have matches (auto-cascade would steal control).
    if (hasAnyMatch(grid)) continue;
    if (hasLegalMove(grid)) return true;
  }

  // Last resort: leave whatever we have; still report whether legal.
  return hasLegalMove(grid);
};

/** Coordinates of every playable cell (for tests / tooling). */
export const playableCoords = (grid: Grid2D<Cell>): Coord[] => {
  const out: Coord[] = [];
  grid.forEach((cell, coord) => {
    if (cell.playable) out.push(coord);
  });
  return sortCoords(out);
};
