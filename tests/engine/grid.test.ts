import { describe, expect, it } from 'vitest';
import { Grid2D, manhattan, coordEq } from '../../src/engine/grid';
import { fromIndex, toIndex } from '../../src/engine/types';

describe('Grid2D', () => {
  it('maps indices with width * y + x', () => {
    const g = new Grid2D(4, 3, (i, c) => ({ i, ...c }));
    expect(g.at(2, 1)).toEqual({ i: toIndex(4, 2, 1), x: 2, y: 1 });
    expect(fromIndex(4, 6)).toEqual({ x: 2, y: 1 });
    expect(g.size).toBe(12);
  });

  it('rejects out of bounds', () => {
    const g = new Grid2D(2, 2, () => 0);
    expect(g.get(5, 0)).toBeUndefined();
    expect(() => g.at(5, 0)).toThrow();
  });

  it('manhattan and adjacency', () => {
    expect(manhattan({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
    expect(manhattan({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2);
    expect(coordEq({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
  });
});
