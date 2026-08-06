import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import { hasLegalMove } from '../../src/engine/deadlock';
import { LEVEL_COUNT, getLevel } from '../../src/levels/index';

describe('Catalogue open playability (ship gate)', () => {
  it('every level 1…N opens with a legal move on smoke seeds', () => {
    const seeds = [1, 42, 99, 1337, 9001];
    const bad: string[] = [];
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const lvl = getLevel(id);
      for (const seed of seeds) {
        const s = createSession(lvl, seed * 9973 + id);
        if (!hasLegalMove(s._state.grid)) bad.push(`L${id} seed=${seed}`);
      }
    }
    if (bad.length) console.error(bad.join('\n'));
    expect(LEVEL_COUNT).toBe(300);
    expect(bad).toEqual([]);
  });
});
