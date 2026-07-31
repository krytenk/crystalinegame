import { describe, expect, it } from 'vitest';
import { AlbumModel, needForCycle, pickAlbumCard, ALBUM_CARDS } from '../../src/economy/album';
import { HybridEventModel, emptyEventPersist } from '../../src/economy/hybridEvent';
import { idleRatePerHour, pendingIdleEssence } from '../../src/economy/idle';
import {
  conveyorShiftRow,
  levelHasConveyor,
  pickConveyorRow,
} from '../../src/engine/conveyor';
import { Grid2D } from '../../src/engine/grid';
import { makeCell, createIdAllocator, makeCrystal } from '../../src/engine/tile';
import type { Cell } from '../../src/engine/types';

describe('endless album', () => {
  it('raises need each cycle and can complete a page', () => {
    expect(needForCycle(0)).toBe(1);
    expect(needForCycle(2)).toBe(3);
    const m = new AlbumModel({ cycle: 0, counts: {}, lastPageReward: 0 });
    let n = 0;
    const res = m.grantFromWin({
      stars: 3,
      levelId: 5,
      rand: () => {
        // Always first card
        n++;
        return 0;
      },
    });
    expect(res.granted.length).toBeGreaterThan(0);
    expect(res.granted[0]?.rarity).toBeDefined();
    void n;
  });

  it('biases toward rarer cards at higher stars', () => {
    let raresLow = 0;
    let raresHigh = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const lo = pickAlbumCard(() => (i + 0.5) / N, 0, 1);
      const hi = pickAlbumCard(() => (i + 0.5) / N, 3, 25);
      if (lo.rarity === 'rare') raresLow++;
      if (hi.rarity === 'rare') raresHigh++;
    }
    expect(ALBUM_CARDS.some((c) => c.rarity === 'rare')).toBe(true);
    // Same sequence of u, higher stars should not reduce rare weight
    expect(raresHigh).toBeGreaterThanOrEqual(raresLow);
  });
});

describe('hybrid event', () => {
  it('awards personal milestones without blocking casuals', () => {
    const now = 1_700_000_000_000;
    const m = new HybridEventModel(emptyEventPersist(now));
    m.addWin(3);
    m.addWin(3);
    m.addWin(3);
    const due = m.claimDue();
    expect(due.essence).toBeGreaterThan(0);
    const snap = m.snapshot(now);
    expect(snap.personal).toBeGreaterThanOrEqual(3);
    expect(snap.leagueRank).toBeGreaterThanOrEqual(1);
  });
});

describe('idle cavern', () => {
  it('scales rate with stages and caps pending', () => {
    expect(idleRatePerHour(2, 4)).toBeGreaterThan(idleRatePerHour(0, 0));
    const last = 1_000_000;
    const now = last + 48 * 3_600_000;
    const p = pendingIdleEssence(last, now, 0, 0);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(40 + 0);
  });
});

describe('conveyor', () => {
  it('enables from mid levels and shifts a row', () => {
    expect(levelHasConveyor(10)).toBe(false);
    expect(levelHasConveyor(11)).toBe(true);
    const ids = createIdAllocator(1);
    const grid = new Grid2D<Cell>(3, 2, () => makeCell(true, 0, 0));
    grid.at(0, 1).piece = makeCrystal(ids, 'ember');
    grid.at(1, 1).piece = makeCrystal(ids, 'aurum');
    grid.at(2, 1).piece = makeCrystal(ids, 'tidal');
    const row = pickConveyorRow(grid);
    const ev = conveyorShiftRow(grid, row, 'left');
    expect(ev[0]?.t).toBe('conveyor');
    expect(grid.at(2, 1).piece?.kind).toBe('crystal');
  });
});
