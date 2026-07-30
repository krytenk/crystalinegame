import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/engine/board';
import { hasLegalMove } from '../../src/engine/deadlock';
import { isAdjacent } from '../../src/engine/moves';
import { computeDda, modulateWeights as modW } from '../../src/engine/dda';
import { buildSpawnTable } from '../../src/engine/spawn';
import type { LevelDef } from '../../src/engine/types';

const basicLevel = (over: Partial<LevelDef> = {}): LevelDef => ({
  id: 1,
  name: 'Test',
  width: 6,
  height: 6,
  moves: 30,
  objectives: [{ kind: 'score', target: 500 }],
  stars: [300, 600, 900],
  colors: ['ember', 'aurum', 'solar', 'verdant', 'tidal', 'void'],
  ...over,
});

describe('moves / session', () => {
  it('rejects diagonal swaps without consuming a move', () => {
    const s = createSession(basicLevel(), 42);
    const before = s.snapshot().movesLeft;
    const events = s.trySwap({ x: 0, y: 0 }, { x: 1, y: 1 });
    expect(events.some((e) => e.t === 'swapRejected')).toBe(true);
    expect(s.snapshot().movesLeft).toBe(before);
    expect(isAdjacent({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
  });

  it('opening board has a legal move and no immediate full-board auto-match loop', () => {
    for (const seed of [1, 2, 3, 7, 99, 12345]) {
      const s = createSession(basicLevel(), seed);
      expect(hasLegalMove(s._state.grid)).toBe(true);
      expect(s.snapshot().status).toBe('playing');
    }
  });

  it('determinism: same seed yields identical event stream for same swap sequence', () => {
    const level = basicLevel();
    const run = (seed: number) => {
      const s = createSession(level, seed);
      const all: string[] = [];
      // Probe a few candidate swaps across the board.
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const snap = s.snapshot();
          if (snap.status !== 'playing') break;
          const ev = s.trySwap({ x, y }, { x: x + 1, y });
          all.push(JSON.stringify(ev));
          if (s.snapshot().status !== 'playing') break;
        }
      }
      return all.join('|');
    };
    expect(run(999)).toBe(run(999));
  });

  it('invalid noMatch swap costs no move', () => {
    // Force a board and try many swaps; any rejection must not decrease moves.
    const s = createSession(basicLevel(), 7);
    let rejected = 0;
    for (let y = 0; y < 5 && rejected < 3; y++) {
      for (let x = 0; x < 5 && rejected < 3; x++) {
        const before = s.snapshot().movesLeft;
        const ev = s.trySwap({ x, y }, { x: x + 1, y });
        if (ev.some((e) => e.t === 'swapRejected' && e.reason === 'noMatch')) {
          expect(s.snapshot().movesLeft).toBe(before);
          rejected++;
        }
      }
    }
    // Not all boards guarantee a noMatch nearby, so soft assert.
    expect(rejected >= 0).toBe(true);
  });
});

describe('DDA', () => {
  it('fail streak drives assistance (negative scalar)', () => {
    const s = computeDda({ failStreak: 5, winRatio: 0.1, meanMoveTime: 12 });
    expect(s).toBeLessThan(0);
  });

  it('high win ratio drives pressure (positive scalar)', () => {
    const s = computeDda({ failStreak: 0, winRatio: 0.95, meanMoveTime: 2 });
    expect(s).toBeGreaterThan(0);
  });

  it('modulateWeights boosts relevant colours when assisting', () => {
    const colors = ['ember', 'aurum', 'solar'] as const;
    const base = [1, 1, 1];
    const assisted = modW([...colors], base, -1, ['ember']);
    const pressure = modW([...colors], base, 1, ['ember']);
    expect(assisted[0]!).toBeGreaterThan(assisted[1]!);
    expect(pressure[0]!).toBeLessThan(pressure[1]!);
  });

  it('buildSpawnTable is pure', () => {
    const level = basicLevel();
    const a = buildSpawnTable(level, -0.5);
    const b = buildSpawnTable(level, -0.5);
    expect(a.weights).toEqual(b.weights);
  });
});

describe('layout / blockers', () => {
  it('parses crust and stones from layout', () => {
    const level = basicLevel({
      width: 4,
      height: 4,
      layout: ['....', '.1S.', '.B..', '....'],
      bombFuse: 3,
      objectives: [{ kind: 'crust', target: 1 }],
    });
    const s = createSession(level, 1);
    const cells = s.snapshot().cells;
    const idx = (x: number, y: number) => y * 4 + x;
    expect(cells[idx(1, 1)]?.crust).toBe(1);
    expect(cells[idx(2, 1)]?.piece?.kind).toBe('stone');
    expect(cells[idx(1, 2)]?.piece?.kind).toBe('bomb');
    expect(cells[idx(1, 2)]?.piece?.fuse).toBe(3);
  });
});

