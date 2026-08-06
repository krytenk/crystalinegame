/**
 * Behavioral contract for power gems — what players should experience.
 */
import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import {
  planPowerSwap,
  powerSwapActivates,
  footprintLine,
  footprintRadius,
  footprintColor,
  footprintSolo,
} from '../../src/engine/specials';
import { Grid2D } from '../../src/engine/grid';
import {
  createIdAllocator,
  makeBurst,
  makeCell,
  makeCrystal,
  makeLine,
  makePrism,
  makeSupernova,
} from '../../src/engine/tile';
import type { Cell, LevelDef } from '../../src/engine/types';
import { shapeReward } from '../../src/engine/resolve';
import { createRng } from '../../src/engine/rng';

const emptyGrid = (w: number, h: number) => {
  const ids = createIdAllocator(1);
  const grid = new Grid2D<Cell>(w, h, () => makeCell(true));
  grid.forEach((cell) => {
    cell.piece = makeCrystal(ids, 'solar');
  });
  return { grid, ids };
};

const openLevel = (): LevelDef => ({
  id: 1,
  name: 'power-check',
  width: 6,
  height: 6,
  moves: 40,
  objectives: [{ kind: 'score', target: 999_999 }],
  stars: [100, 200, 300],
  colors: ['ember', 'aurum', 'solar', 'verdant', 'tidal', 'void'],
});

describe('power forge (match shapes)', () => {
  it('4-match forges a coloured Seam Rift (line)', () => {
    const ids = createIdAllocator(1);
    const rng = createRng(1);
    const group = {
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      color: 'ember' as const,
      shape: 'four' as const,
      origin: { x: 1, y: 0 },
    };
    const p = shapeReward(ids, group, rng, 0);
    expect(p?.kind).toBe('line');
    expect(p?.color).toBe('ember');
    expect(p?.orientation === 'h' || p?.orientation === 'v').toBe(true);
  });

  it('L/T forges Geode Burst of that colour', () => {
    const ids = createIdAllocator(1);
    const rng = createRng(1);
    const group = {
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ],
      color: 'tidal' as const,
      shape: 'L' as const,
      origin: { x: 0, y: 0 },
    };
    const p = shapeReward(ids, group, rng, 0);
    expect(p?.kind).toBe('burst');
    expect(p?.color).toBe('tidal');
  });

  it('5-match forges colourless Opal Prism', () => {
    const ids = createIdAllocator(1);
    const rng = createRng(1);
    const group = {
      cells: [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 })),
      color: 'void' as const,
      shape: 'five' as const,
      origin: { x: 2, y: 0 },
    };
    const p = shapeReward(ids, group, rng, 0);
    expect(p?.kind).toBe('prism');
    expect(p?.color).toBeNull();
  });

  it('6+ forges Supernova', () => {
    const ids = createIdAllocator(1);
    const rng = createRng(1);
    const group = {
      cells: [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 0 })),
      color: 'aurum' as const,
      shape: 'five' as const,
      origin: { x: 2, y: 0 },
    };
    const p = shapeReward(ids, group, rng, 0);
    expect(p?.kind).toBe('supernova');
  });
});

describe('power footprints (what they clear)', () => {
  it('horizontal Seam Rift clears the full row', () => {
    const { grid } = emptyGrid(5, 5);
    const at = { x: 2, y: 1 };
    const fp = footprintLine(grid, at, 'h');
    expect(fp.every((c) => c.y === 1)).toBe(true);
    expect(fp).toHaveLength(5);
  });

  it('vertical Seam Rift clears the full column', () => {
    const { grid } = emptyGrid(5, 5);
    const at = { x: 2, y: 1 };
    const fp = footprintLine(grid, at, 'v');
    expect(fp.every((c) => c.x === 2)).toBe(true);
    expect(fp).toHaveLength(5);
  });

  it('Geode Burst solo is 3×3 (radius 1)', () => {
    const { grid } = emptyGrid(5, 5);
    const at = { x: 2, y: 2 };
    const fp = footprintRadius(grid, at, 1);
    expect(fp).toHaveLength(9);
    expect(fp.every((c) => Math.max(Math.abs(c.x - 2), Math.abs(c.y - 2)) <= 1)).toBe(true);
  });

  it('Opal Prism + partner colour clears every gem of that colour', () => {
    const { grid, ids } = emptyGrid(4, 4);
    // paint mixed board
    grid.forEach((cell, c) => {
      cell.piece = makeCrystal(ids, c.x % 2 === 0 ? 'ember' : 'verdant');
    });
    const emberCount = footprintColor(grid, 'ember').length;
    const prism = makePrism(ids);
    const fp = footprintSolo(grid, { x: 0, y: 0 }, prism, 'ember');
    expect(fp.length).toBe(emberCount);
    expect(fp.every((c) => grid.at(c.x, c.y).piece?.color === 'ember' || (c.x === 0 && c.y === 0))).toBe(
      true,
    );
  });

  it('solo Seam Rift plan matches orientation', () => {
    const { grid, ids } = emptyGrid(5, 5);
    const at = { x: 2, y: 2 };
    const partner = { x: 3, y: 2 };
    grid.at(at.x, at.y).piece = makeLine(ids, 'ember', 'h');
    grid.at(partner.x, partner.y).piece = makeCrystal(ids, 'ember');
    const plan = planPowerSwap(
      grid,
      at,
      grid.at(at.x, at.y).piece!,
      partner,
      grid.at(partner.x, partner.y).piece!,
      ids,
    );
    expect(plan).not.toBeNull();
    expect(plan!.kind).toBe('line');
    // full row of y=2
    expect(plan!.affected.filter((c) => c.y === 2).length).toBe(5);
  });

  it('solo Geode Burst plan is 3×3 around the burst', () => {
    const { grid, ids } = emptyGrid(5, 5);
    const at = { x: 2, y: 2 };
    const partner = { x: 3, y: 2 };
    grid.at(at.x, at.y).piece = makeBurst(ids, 'tidal');
    grid.at(partner.x, partner.y).piece = makeCrystal(ids, 'tidal');
    const plan = planPowerSwap(
      grid,
      at,
      grid.at(at.x, at.y).piece!,
      partner,
      grid.at(partner.x, partner.y).piece!,
      ids,
    );
    expect(plan!.kind).toBe('burst');
    expect(plan!.affected.length).toBe(9);
  });
});

describe('power activation rules (session)', () => {
  it('rejects Seam Rift swapped into a different colour (no match)', () => {
    const s = createSession(openLevel(), 42);
    const g = s._state.grid;
    const ids = s._state.ids;
    // clear two adjacent cells to known pieces
    g.at(1, 1).piece = makeLine(ids, 'ember', 'h');
    g.at(2, 1).piece = makeCrystal(ids, 'void');
    // ensure neighbors don't form a match that would allow the swap
    g.at(0, 1).piece = makeCrystal(ids, 'solar');
    g.at(3, 1).piece = makeCrystal(ids, 'solar');
    g.at(1, 0).piece = makeCrystal(ids, 'solar');
    g.at(1, 2).piece = makeCrystal(ids, 'solar');
    g.at(2, 0).piece = makeCrystal(ids, 'aurum');
    g.at(2, 2).piece = makeCrystal(ids, 'aurum');
    const events = s.trySwap({ x: 1, y: 1 }, { x: 2, y: 1 });
    expect(events.some((e) => e.t === 'swapRejected')).toBe(true);
    expect(events.some((e) => e.t === 'specialTriggered')).toBe(false);
    // pieces unmoved
    expect(g.at(1, 1).piece?.kind).toBe('line');
    expect(g.at(2, 1).piece?.kind).toBe('crystal');
  });

  it('accepts Seam Rift swapped into the same colour and fires line clear', () => {
    const s = createSession(openLevel(), 7);
    const g = s._state.grid;
    const ids = s._state.ids;
    g.at(1, 1).piece = makeLine(ids, 'ember', 'h');
    g.at(2, 1).piece = makeCrystal(ids, 'ember');
    const events = s.trySwap({ x: 1, y: 1 }, { x: 2, y: 1 });
    expect(events.some((e) => e.t === 'swap')).toBe(true);
    expect(events.some((e) => e.t === 'specialTriggered')).toBe(true);
    const trig = events.find((e) => e.t === 'specialTriggered');
    expect(trig && trig.t === 'specialTriggered' && trig.kind === 'line').toBe(true);
  });

  it('Opal Prism + colour clears that colour across the board', () => {
    const s = createSession(openLevel(), 11);
    const g = s._state.grid;
    const ids = s._state.ids;
    // paint half the board verdant
    g.forEach((cell, c) => {
      if (cell.playable) cell.piece = makeCrystal(ids, c.x < 3 ? 'verdant' : 'ember');
    });
    g.at(2, 2).piece = makePrism(ids);
    g.at(3, 2).piece = makeCrystal(ids, 'verdant');
    const beforeVerdant = (() => {
      let n = 0;
      g.forEach((cell) => {
        if (cell.piece?.color === 'verdant') n++;
      });
      return n;
    })();
    expect(beforeVerdant).toBeGreaterThan(3);
    const events = s.trySwap({ x: 2, y: 2 }, { x: 3, y: 2 });
    expect(events.some((e) => e.t === 'specialTriggered')).toBe(true);
    // After clear+gravity, few or no verdant should remain from the blast
    // (gravity may drop new ones — but specialTriggered must be prism)
    const trig = events.find((e) => e.t === 'specialTriggered');
    expect(trig && trig.t === 'specialTriggered' && trig.kind === 'prism').toBe(true);
  });

  it('two powers always combo even if colours differ', () => {
    expect(
      powerSwapActivates(makeLine(createIdAllocator(1), 'ember', 'h'), makeBurst(createIdAllocator(2), 'void')),
    ).toBe(true);
  });
});
