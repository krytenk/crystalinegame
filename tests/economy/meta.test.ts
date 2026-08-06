import { describe, expect, it } from 'vitest';
import {
  essenceForWin,
  MetaModel,
  META_UPGRADES,
} from '../../src/economy/meta';

describe('meta progression', () => {
  it('grants more essence for first-time stars', () => {
    const replay = essenceForWin({ stars: 3, newStars: 0, levelId: 5 });
    const first = essenceForWin({ stars: 3, newStars: 3, levelId: 5 });
    expect(first).toBeGreaterThan(replay);
  });

  it('locks later stages until the previous is fully furnished', () => {
    const m = new MetaModel({ essence: 100_000, owned: [], totalSpent: 0 });
    expect(m.stageUnlocked(1)).toBe(true);
    expect(m.stageUnlocked(2)).toBe(false);

    for (const u of META_UPGRADES.filter((x) => x.stage === 1)) {
      const r = m.buy(u.id);
      expect(r.ok).toBe(true);
    }
    expect(m.stageComplete(1)).toBe(true);
    expect(m.stageUnlocked(2)).toBe(true);
  });

  it('exposes eight cavern stages for the 300-level Act I sink', () => {
    const maxStage = Math.max(...META_UPGRADES.map((u) => u.stage));
    expect(maxStage).toBe(8);
    for (let s = 1; s <= 8; s++) {
      const props = META_UPGRADES.filter((u) => u.stage === s);
      expect(props.length).toBeGreaterThanOrEqual(3);
    }
    // Full furnish unlocks through stage 8
    const m = new MetaModel({ essence: 500_000, owned: [], totalSpent: 0 });
    for (let s = 1; s <= 8; s++) {
      expect(m.stageUnlocked(s as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)).toBe(true);
      for (const u of META_UPGRADES.filter((x) => x.stage === s)) {
        expect(m.buy(u.id).ok).toBe(true);
      }
      expect(m.stageComplete(s as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)).toBe(true);
    }
    expect(m.snapshot().stagesComplete).toBe(8);
    expect(m.snapshot().totalCount).toBe(META_UPGRADES.length);
  });

  it('rejects buys when broke or already owned', () => {
    const m = new MetaModel({ essence: 10, owned: [], totalSpent: 0 });
    const first = META_UPGRADES.find((u) => u.stage === 1)!;
    expect(m.buy(first.id).ok).toBe(false);
    m.grantEssence(first.cost);
    expect(m.buy(first.id).ok).toBe(true);
    expect(m.buy(first.id).ok).toBe(false);
  });

  it('exposes nextTarget, placement coords, and active stage props', () => {
    const first = META_UPGRADES.find((u) => u.stage === 1)!;
    expect(first.place.left).toBeGreaterThanOrEqual(0);
    expect(first.place.top).toBeLessThanOrEqual(100);

    const m = new MetaModel({ essence: 0, owned: [], totalSpent: 0 });
    const snap = m.snapshot();
    expect(snap.activeStageId).toBe(1);
    expect(snap.nextTarget?.id).toBe(first.id);
    expect(snap.activeStageOwned).toHaveLength(0);

    m.grantEssence(first.cost);
    expect(m.buy(first.id).ok).toBe(true);
    const after = m.snapshot();
    expect(after.activeStageOwned.some((u) => u.id === first.id)).toBe(true);
    expect(after.nextTarget?.id).not.toBe(first.id);
  });
});
