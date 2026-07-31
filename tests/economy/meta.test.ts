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
    const m = new MetaModel({ essence: 10_000, owned: [], totalSpent: 0 });
    expect(m.stageUnlocked(1)).toBe(true);
    expect(m.stageUnlocked(2)).toBe(false);

    for (const u of META_UPGRADES.filter((x) => x.stage === 1)) {
      const r = m.buy(u.id);
      expect(r.ok).toBe(true);
    }
    expect(m.stageComplete(1)).toBe(true);
    expect(m.stageUnlocked(2)).toBe(true);
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
