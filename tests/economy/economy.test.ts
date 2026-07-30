import { describe, expect, it } from 'vitest';
import { ECONOMY_CONST } from '../../src/economy/api';
import { Economy, createMemoryStorage } from '../../src/economy/index';
import { LivesModel } from '../../src/economy/lives';
import { WalletModel } from '../../src/economy/wallet';
import { BoostersModel } from '../../src/economy/boosters';
import { StoreModel } from '../../src/economy/store';
import { AdsModel } from '../../src/economy/ads';
import { decodeSave, freshSave, createMemoryStorage as mem } from '../../src/economy/persistence';

describe('wallet', () => {
  it('never goes negative and rejects overspend', () => {
    const w = new WalletModel({ credits: 100, shards: 10 });
    expect(w.spendCredits(150).ok).toBe(false);
    expect(w.state.credits).toBe(100);
    expect(w.spendCredits(40).ok).toBe(true);
    expect(w.state.credits).toBe(60);
  });
});

describe('lives', () => {
  it('regens across a mocked clock and caps at max', () => {
    let t = 1_000_000;
    const lives = new LivesModel({ count: 5, nextRegenAt: null }, () => t);
    for (let i = 0; i < 5; i++) expect(lives.consume()).toBe(true);
    expect(lives.state.count).toBe(0);
    expect(lives.consume()).toBe(false);

    t += ECONOMY_CONST.lifeRegenMs;
    expect(lives.state.count).toBe(1);

    t += ECONOMY_CONST.lifeRegenMs * 10;
    expect(lives.state.count).toBe(5);
    expect(lives.state.nextRegenAt).toBeNull();
  });

  it('clock skew backwards neither grants nor destroys lives', () => {
    let t = 5_000_000;
    const lives = new LivesModel({ count: 3, nextRegenAt: t + ECONOMY_CONST.lifeRegenMs }, () => t);
    expect(lives.state.count).toBe(3);
    t -= 60 * 60 * 1000; // jump back 1h
    expect(lives.state.count).toBe(3);
    // deadline clamped
    expect(lives.state.msUntilNext).toBeLessThanOrEqual(ECONOMY_CONST.lifeRegenMs);
  });
});

describe('store', () => {
  it('blocks overspend, one-time rebuy, and gates starter until first fail', () => {
    const wallet = new WalletModel({ credits: 200, shards: 0 });
    const lives = new LivesModel({ count: 5, nextRegenAt: null }, () => 0);
    const boosters = new BoostersModel();
    let firstFail = false;
    const shop = new StoreModel(
      {
        wallet,
        lives,
        boosters,
        hasFirstFail: () => firstFail,
      },
      [],
    );

    expect(shop.availableSkus().some((s) => s.id === 'bundle.starter')).toBe(false);
    firstFail = true;
    expect(shop.availableSkus().some((s) => s.id === 'bundle.starter')).toBe(true);

    expect(shop.purchase('shards.vault').ok).toBe(false); // too expensive
    const buy = shop.purchase('bundle.starter');
    expect(buy.ok).toBe(true);
    const again = shop.purchase('bundle.starter');
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('alreadyOwned');
  });
});

describe('ads', () => {
  it('enforces skip timing, daily cap, and interstitial cadence', () => {
    let t = 0;
    const lives = new LivesModel({ count: 1, nextRegenAt: null }, () => t);
    const boosters = new BoostersModel();
    let removed = false;
    const ads = new AdsModel(
      {
        now: () => t,
        lives,
        boosters,
        ownsAdRemoval: () => removed,
      },
      undefined,
      2,
    );

    expect(ads.start('rewardedLife').ok).toBe(true);
    t += 1000;
    expect(ads.complete().ok).toBe(false); // too early
    ads.reset();
    // Cap was consumed on start — start again
    expect(ads.start('rewardedLife').ok).toBe(true);
    t += ECONOMY_CONST.adDurationMs;
    expect(ads.complete().ok).toBe(true);
    expect(lives.state.count).toBeGreaterThan(1);

    // Cap = 2; third should fail
    expect(ads.start('rewardedLife').ok).toBe(false);

    ads.notePlayEnded();
    ads.notePlayEnded();
    ads.notePlayEnded();
    expect(ads.shouldShowInterstitial()).toBe(true);
    removed = true;
    expect(ads.shouldShowInterstitial()).toBe(false);
  });
});

describe('persistence', () => {
  it('round-trips and recovers corrupt data', () => {
    const storage = mem();
    const now = 1_700_000_000_000;
    const fresh = freshSave(now);
    storage.setItem('crystalline.save', JSON.stringify(fresh));
    const ok = decodeSave(storage.getItem('crystalline.save'), now);
    expect(ok.recovered).toBe(false);
    expect(ok.save.wallet.credits).toBe(ECONOMY_CONST.startingCredits);

    const bad = decodeSave('{not json', now);
    expect(bad.recovered).toBe(true);
  });
});

describe('Economy façade', () => {
  it('starts session, burns lives, unlocks starter, persists', () => {
    let t = 10_000;
    const storage = createMemoryStorage();
    const eco = new Economy({ now: () => t, storage, saveDebounceMs: 0 });
    eco.startSession();

    expect(eco.beginLevel(1)).toBe(true);
    eco.failLevel(0.2);
    const snap = eco.getSnapshot();
    expect(snap.firstFailAt).not.toBeNull();
    expect(snap.availableSkus.some((s) => s.id === 'bundle.starter')).toBe(true);
    expect(snap.metrics.levelsAttempted).toBe(1);
    expect(snap.dda.failStreak).toBe(1);

    // reload
    const eco2 = new Economy({ now: () => t, storage, saveDebounceMs: 0 });
    expect(eco2.getSnapshot().metrics.levelsAttempted).toBe(1);
  });
});
