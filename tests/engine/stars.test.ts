import { describe, expect, it } from 'vitest';
import { starsFromScore } from '../../src/engine/objectives';

describe('starsFromScore', () => {
  const thresholds = [2800, 4300, 6300] as const;

  it('awards no stars below the first threshold when not a win', () => {
    expect(starsFromScore(1000, thresholds)).toBe(0);
    expect(starsFromScore(1000, thresholds, { won: false })).toBe(0);
  });

  it('guarantees at least one star on a win', () => {
    expect(starsFromScore(500, thresholds, { won: true })).toBe(1);
  });

  it('counts thresholds with leftover-move bonus', () => {
    // 2500 + 10*120 = 3700 → past first, not second
    expect(starsFromScore(2500, thresholds, { won: true, movesLeft: 10 })).toBe(1);
    // 4000 + 5*120 = 4600 → two stars
    expect(starsFromScore(4000, thresholds, { won: true, movesLeft: 5 })).toBe(2);
    expect(starsFromScore(7000, thresholds, { won: true })).toBe(3);
  });
});
