import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import { getLevel } from '../../src/levels/index';
import { findLegalHint } from '../../src/engine/deadlock';
import type { ObjectiveProgress } from '../../src/engine/types';

describe('L13 winnability', () => {
  it('can complete collect goal with legal play (some seeds)', () => {
    const level = getLevel(13);
    let wins = 0;
    let maxCollect = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = createSession(level, seed * 9973);
      let steps = 0;
      while (s.snapshot().status === 'playing' && steps < 100) {
        steps++;
        const hint = findLegalHint(s._state.grid);
        if (!hint) {
          s.useReshuffle();
          continue;
        }
        s.trySwap(hint.a, hint.b);
      }
      const o = s.snapshot().objectives.find((x: ObjectiveProgress) => x.kind === 'collect');
      maxCollect = Math.max(maxCollect, o?.current ?? 0);
      if (s.snapshot().status === 'won') wins++;
    }
    // With fixed relic spawn, at least some runs collect 3 and win
    expect(maxCollect).toBeGreaterThanOrEqual(3);
    expect(wins).toBeGreaterThanOrEqual(1);
  });
});
