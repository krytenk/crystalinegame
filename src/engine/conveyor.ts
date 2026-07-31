/**
 * Conveyor / dynamic edge — Sort-inspired board motion (pure model).
 *
 * After a successful resolve, shifts one playable row so the board never
 * feels fully static. Direction alternates by move index for readability.
 */

import type { GameEvent } from './events';
import type { Grid2D } from './grid';
import type { Cell } from './types';

/**
 * Levels from this id onward run conveyor after each player move that
 * spent a move (mid/deep chambers). Early tutorial boards stay static.
 */
export const CONVEYOR_FROM_LEVEL = 11;

export function levelHasConveyor(levelId: number): boolean {
  return levelId >= CONVEYOR_FROM_LEVEL;
}

/**
 * Shift pieces along a playable row. Holes stay fixed; only playable cells
 * with movable pieces participate.
 */
export function conveyorShiftRow(
  grid: Grid2D<Cell>,
  row: number,
  direction: 'left' | 'right',
): GameEvent[] {
  const h = grid.height;
  const w = grid.width;
  if (row < 0 || row >= h) return [];

  const xs: number[] = [];
  for (let x = 0; x < w; x++) {
    const cell = grid.get(x, row);
    if (cell?.playable) xs.push(x);
  }
  if (xs.length < 2) return [];

  const pieces = xs.map((x) => grid.at(x, row).piece);
  if (direction === 'left') {
    const first = pieces.shift();
    pieces.push(first ?? null);
  } else {
    const last = pieces.pop();
    pieces.unshift(last ?? null);
  }
  for (let i = 0; i < xs.length; i++) {
    grid.at(xs[i]!, row).piece = pieces[i] ?? null;
  }

  return [
    {
      t: 'conveyor',
      row,
      direction,
      cells: xs.length,
    },
  ];
}

/** Pick bottom-most mostly-playable row for the belt (stable visual). */
export function pickConveyorRow(grid: Grid2D<Cell>): number {
  for (let y = grid.height - 1; y >= 0; y--) {
    let playable = 0;
    for (let x = 0; x < grid.width; x++) {
      if (grid.get(x, y)?.playable) playable++;
    }
    if (playable >= 3) return y;
  }
  return Math.max(0, grid.height - 1);
}
