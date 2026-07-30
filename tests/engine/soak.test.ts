import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/engine/board';
import { hasLegalMove } from '../../src/engine/deadlock';
import { createRng } from '../../src/engine/rng';
import type { LevelDef } from '../../src/engine/types';

const level: LevelDef = {
  id: 1,
  name: 'Soak',
  width: 8,
  height: 8,
  moves: 10_000,
  objectives: [{ kind: 'score', target: 9_999_999 }],
  stars: [100, 200, 300],
  colors: ['ember', 'aurum', 'solar', 'verdant', 'tidal', 'void'],
};

describe('determinism soak', () => {
  it('10k random legal probes: no crash, never hands back a dead board, replay matches', () => {
    const seed = 20260729;
    const run = () => {
      const s = createSession(level, seed);
      const rng = createRng(seed ^ 0x9e3779b9);
      const stream: string[] = [];
      let moves = 0;
      while (moves < 10_000 && s.snapshot().status === 'playing') {
        // Always legal board when control is returned.
        expect(hasLegalMove(s._state.grid)).toBe(true);

        const x = rng.int(level.width);
        const y = rng.int(level.height);
        const dir = rng.int(2);
        const b =
          dir === 0
            ? { x: Math.min(level.width - 1, x + 1), y }
            : { x, y: Math.min(level.height - 1, y + 1) };
        const ev = s.trySwap({ x, y }, b);
        stream.push(JSON.stringify(ev));
        moves++;
      }
      return stream.join('\n');
    };

    const a = run();
    const b = run();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  }, 60_000);
});
