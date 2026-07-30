/**
 * First Light — two-beat tutorial.
 *
 * Beat 1: one swap forges a Seam Rift (4-match).
 * Beat 2: fire that Rift by swapping it into a neighbouring gem.
 *
 * PURE MODEL CODE.
 */

import type { Grid2D } from './grid';
import { makeCrystal, type IdAllocator } from './tile';
import type { Cell, Coord, CrystalColor } from './types';

/**
 * 7×7 with **no** pre-existing match. One legal swap makes four ember:
 *   (2,2) ember ↔ (2,3) solar  →  row y=3 becomes e e e e …
 */
export const seedFirstLightAha = (grid: Grid2D<Cell>, ids: IdAllocator): Coord => {
  if (grid.width < 7 || grid.height < 7) {
    return { x: 1, y: 1 };
  }

  const palette: CrystalColor[][] = [
    ['aurum', 'solar', 'verdant', 'aurum', 'solar', 'verdant', 'aurum'],
    ['solar', 'verdant', 'aurum', 'solar', 'verdant', 'aurum', 'solar'],
    ['verdant', 'aurum', 'ember', 'verdant', 'aurum', 'solar', 'verdant'],
    ['ember', 'ember', 'solar', 'ember', 'aurum', 'verdant', 'aurum'],
    ['aurum', 'solar', 'verdant', 'solar', 'verdant', 'aurum', 'solar'],
    ['solar', 'verdant', 'aurum', 'verdant', 'aurum', 'solar', 'verdant'],
    ['verdant', 'aurum', 'solar', 'aurum', 'solar', 'verdant', 'aurum'],
  ];

  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const cell = grid.at(x, y);
      if (!cell.playable) continue;
      const c = palette[y]?.[x] ?? 'aurum';
      cell.piece = makeCrystal(ids, c);
      cell.crust = 0;
      cell.shadow = 0;
    }
  }

  return { x: 2, y: 2 };
};

export const AHA_SWAP_B: Coord = { x: 2, y: 3 };

/**
 * After the Rift is forged, find it and a safe neighbour to fire into.
 * Returns hint pair or null.
 */
export const findFireHint = (
  grid: Grid2D<Cell>,
): { power: Coord; target: Coord } | null => {
  let power: Coord | null = null;
  grid.forEach((cell, coord) => {
    if (cell.piece?.kind === 'line' || cell.piece?.kind === 'burst' || cell.piece?.kind === 'prism') {
      if (!power) power = coord;
    }
  });
  if (!power) return null;

  const p = power as Coord;
  const neighbors = [
    { x: p.x + 1, y: p.y },
    { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x, y: p.y - 1 },
  ];
  for (const n of neighbors) {
    if (!grid.inBounds(n.x, n.y)) continue;
    const cell = grid.at(n.x, n.y);
    if (!cell.playable || !cell.piece) continue;
    if (cell.piece.kind === 'crystal') return { power: p, target: n };
  }
  return null;
};

export type TutorialPhase = 'forge' | 'fire' | 'done';
