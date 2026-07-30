import { describe, expect, it } from 'vitest';
import { Grid2D } from '../../src/engine/grid';
import { findAllMatches, findMatchesAt, wouldFormRun } from '../../src/engine/match';
import { makeCell, makeCrystal, createIdAllocator } from '../../src/engine/tile';
import type { Cell, CrystalColor } from '../../src/engine/types';

const ids = createIdAllocator(1);

const paint = (
  w: number,
  h: number,
  colors: (CrystalColor | null)[][],
): Grid2D<Cell> =>
  new Grid2D(w, h, (_i, { x, y }) => {
    const cell = makeCell(true);
    const c = colors[y]?.[x] ?? null;
    if (c) cell.piece = makeCrystal(ids, c);
    return cell;
  });

describe('match detection', () => {
  it('finds a horizontal three', () => {
    const g = paint(5, 3, [
      ['ember', 'ember', 'ember', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
    ]);
    const m = findAllMatches(g);
    expect(m.some((x) => x.shape === 'three' && x.color === 'ember')).toBe(true);
  });

  it('finds four, five, L and T', () => {
    const four = paint(5, 3, [
      ['ember', 'ember', 'ember', 'ember', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
    ]);
    expect(findAllMatches(four).some((m) => m.shape === 'four')).toBe(true);

    const five = paint(5, 3, [
      ['ember', 'ember', 'ember', 'ember', 'ember'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
    ]);
    expect(findAllMatches(five).some((m) => m.shape === 'five')).toBe(true);

    // L: three horizontal + two down from left
    const ell = paint(5, 4, [
      ['ember', 'ember', 'ember', 'tidal', 'void'],
      ['ember', 'solar', 'verdant', 'tidal', 'void'],
      ['ember', 'solar', 'verdant', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
    ]);
    const shapes = findAllMatches(ell).map((m) => m.shape);
    expect(shapes.some((s) => s === 'L' || s === 'T' || s === 'four' || s === 'five')).toBe(
      true,
    );
  });

  it('smart scan only needs origins', () => {
    const g = paint(5, 3, [
      ['ember', 'ember', 'tidal', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
      ['aurum', 'solar', 'verdant', 'tidal', 'void'],
    ]);
    // Swap would place third ember — but for existing, only check (0,0)
    expect(findMatchesAt(g, [{ x: 0, y: 0 }]).length).toBe(0);
  });

  it('wouldFormRun detects XX_', () => {
    const g = paint(4, 1, [['ember', 'ember', null, 'void']]);
    // cell 2 empty conceptually for wouldFormRun against empty — set empty
    g.at(2, 0).piece = null;
    expect(wouldFormRun(g, 2, 0, 'ember')).toBe(true);
    expect(wouldFormRun(g, 2, 0, 'void')).toBe(false);
  });
});
