/**
 * Compatibility export for older call sites expecting specialFootprint.
 */
import type { Grid2D } from './grid';
import { footprintSolo } from './specials';
import type { Cell, Coord, CrystalColor, Piece } from './types';

export const specialFootprint = (
  grid: Grid2D<Cell>,
  at: Coord,
  piece: Piece,
  swapColor: CrystalColor | null,
): Coord[] => footprintSolo(grid, at, piece, swapColor);
