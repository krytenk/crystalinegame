import { describe, expect, it } from 'vitest';
import {
  COMPANION,
  companionLine,
  dealGeodeSlots,
  GEODE_REWARDS,
} from '../../src/narrative/companion';

describe('Geode Warden companion', () => {
  it('has original art path and stable name', () => {
    expect(COMPANION.name).toBe('Geode Warden');
    expect(COMPANION.art).toContain('geode-warden');
  });

  it('returns non-empty lines for each beat', () => {
    for (const beat of [
      'title',
      'titleFirst',
      'win',
      'winPerfect',
      'lose',
      'daily',
      'cavern',
      'cavernReady',
      'geode',
      'geodeResult',
      'coreSpire',
      'streak',
    ] as const) {
      expect(companionLine(beat, 0).length).toBeGreaterThan(8);
    }
  });

  it('deals a permutation of geode rewards', () => {
    const a = dealGeodeSlots(42);
    const b = dealGeodeSlots(99);
    expect([...a].sort((x, y) => x - y)).toEqual([...GEODE_REWARDS].sort((x, y) => x - y));
    expect(a).toHaveLength(3);
    // Different seeds should usually shuffle differently (not guaranteed for all seeds)
    expect(dealGeodeSlots(1)).toHaveLength(3);
    void b;
  });
});
