import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import type { LevelDef } from '../../src/engine/types';
import { hasAnyMatch } from '../../src/engine/match';
import { findLegalHint } from '../../src/engine/deadlock';

const lvl = (): LevelDef => ({
  id: 1,
  name: 't',
  width: 5,
  height: 5,
  moves: 30,
  objectives: [{ kind: 'score', target: 999999 }],
  stars: [1, 2, 3],
  colors: ['ember', 'aurum', 'solar', 'verdant', 'tidal'],
});

describe('cascades after drops', () => {
  it('clears natural matches formed after a swap cascade (board ends with no match)', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const s = createSession(lvl(), seed);
      const h = findLegalHint(s._state.grid);
      if (!h) continue;
      const ev = s.trySwap(h.a, h.b);
      if (ev.some((e) => e.t === 'swap')) {
        expect(hasAnyMatch(s._state.grid)).toBe(false);
      }
    }
  });
});
