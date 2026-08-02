import { describe, it, expect } from 'vitest';
import {
  LEVELS,
  LEVEL_COUNT,
  PRESSURE_POINTS,
  BOSS_LEVELS,
  getLevel,
  isBossLevel,
} from '../../src/levels/index';

describe('level catalogue', () => {
  it('loads and validates all 40 levels', () => {
    expect(LEVEL_COUNT).toBe(40);
    expect(LEVELS).toHaveLength(40);
  });

  it('has contiguous ids and non-empty names', () => {
    LEVELS.forEach((lvl, i) => {
      expect(lvl.id).toBe(i + 1);
      expect(lvl.name.length).toBeGreaterThan(0);
    });
  });

  it('opens gently and ends hard', () => {
    const first = getLevel(1);
    // Early curve: smaller board + eased score (bigger on-screen gems experiment)
    expect(first.width).toBeLessThanOrEqual(7);
    expect(first.height).toBeLessThanOrEqual(7);
    expect(first.objectives).toEqual([{ kind: 'score', target: 1000 }]);
    expect(first.colors).toHaveLength(4);

    const midBoss = getLevel(30);
    expect(midBoss.objectives).toHaveLength(4);
    expect(midBoss.colors).toHaveLength(6);

    const last = getLevel(40);
    expect(last.objectives.length).toBeGreaterThanOrEqual(3);
    expect(last.colors).toHaveLength(6);
  });

  it('introduces each blocker type across the curve', () => {
    const kinds = new Set(LEVELS.flatMap((l) => l.objectives.map((o) => o.kind)));
    expect([...kinds].sort()).toEqual(['collect', 'contain', 'crust', 'defuse', 'score']);
  });

  it('every layout matches its declared board size', () => {
    for (const lvl of LEVELS) {
      if (!lvl.layout) continue;
      expect(lvl.layout).toHaveLength(lvl.height);
      for (const row of lvl.layout) expect(row).toHaveLength(lvl.width);
    }
  });

  it('star thresholds ascend', () => {
    for (const lvl of LEVELS) {
      expect(lvl.stars[0]).toBeLessThan(lvl.stars[1]);
      expect(lvl.stars[1]).toBeLessThan(lvl.stars[2]);
    }
  });

  it('pressure points reference real levels', () => {
    for (const id of PRESSURE_POINTS) {
      expect(() => getLevel(id)).not.toThrow();
    }
  });

  it('levels needing a shadow timer declare one', () => {
    for (const lvl of LEVELS) {
      if (lvl.objectives.some((o) => o.kind === 'contain')) {
        expect(lvl.shadowPeriod).toBeGreaterThan(0);
      }
    }
  });

  it('keeps big-gem board sizes: 7×7 max, bosses up to 8×7', () => {
    for (const lvl of LEVELS) {
      if (lvl.boss) {
        expect(lvl.width).toBeLessThanOrEqual(8);
        expect(lvl.height).toBeLessThanOrEqual(7);
      } else {
        expect(lvl.width).toBeLessThanOrEqual(7);
        expect(lvl.height).toBeLessThanOrEqual(7);
      }
    }
  });

  it('flags chapter bosses and uses 8×7 after the mid threshold', () => {
    for (const id of BOSS_LEVELS) {
      expect(isBossLevel(id)).toBe(true);
      expect(getLevel(id).boss).toBe(true);
    }
    // Late bosses get the slightly larger stage
    for (const id of [20, 25, 30, 35, 40]) {
      const b = getLevel(id);
      expect(b.width * b.height).toBeGreaterThanOrEqual(7 * 7);
      expect(b.width).toBe(8);
      expect(b.height).toBe(7);
      expect(b.objectives.length).toBeGreaterThanOrEqual(2);
    }
  });
});
