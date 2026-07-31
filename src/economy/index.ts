/**
 * CRYSTALLINE — Economy façade.
 *
 * SIMULATION ONLY. Single entry the UI consumes. Injectable clock + storage.
 */

import {
  ECONOMY_CONST,
  type AdPlacement,
  type AdResult,
  type BoosterId,
  type LivesState,
  type Metrics,
  type PurchaseResult,
  type Sku,
  type SkuId,
  type Wallet,
} from './api';
import { AdsModel, type AdProgress } from './ads';
import { BoostersModel, BOOSTER_SLOT } from './boosters';
import { LivesModel } from './lives';
import { SAVE_VERSION } from './api';
import {
  createBrowserStorage,
  createMemoryStorage,
  freshSave,
  SaveStore,
  systemTimer,
  type EconomyAux,
  type PersistedSave,
  type Storage,
  type Timer,
} from './persistence';
import { StoreModel } from './store';
import { TelemetryModel, type DashboardStats } from './telemetry';
import { dayKey, systemClock, type Clock } from './time';
import { WalletModel } from './wallet';

export type EconomyListener = () => void;

export interface EconomyOptions {
  readonly now?: Clock;
  readonly storage?: Storage;
  readonly timer?: Timer;
  readonly saveDebounceMs?: number;
}

export interface EconomySnapshot {
  readonly wallet: Wallet;
  readonly lives: LivesState;
  readonly boosters: Readonly<Record<BoosterId, number>>;
  readonly ownedSkus: readonly SkuId[];
  readonly availableSkus: readonly Sku[];
  readonly metrics: Metrics;
  readonly dashboard: DashboardStats;
  readonly progress: {
    readonly highestUnlocked: number;
    readonly stars: Readonly<Record<number, number>>;
  };
  readonly settings: PersistedSave['settings'];
  readonly dda: PersistedSave['dda'];
  readonly firstFailAt: number | null;
  readonly ad: AdProgress;
}

export class Economy {
  private readonly now: Clock;
  private readonly saveStore: SaveStore;
  private readonly listeners = new Set<EconomyListener>();

  private wallet!: WalletModel;
  private lives!: LivesModel;
  private boosters!: BoostersModel;
  private shop!: StoreModel;
  private ads!: AdsModel;
  private telemetry!: TelemetryModel;
  private progress!: PersistedSave['progress'];
  private settings!: PersistedSave['settings'];
  private dda!: PersistedSave['dda'];
  private aux!: EconomyAux;

  constructor(opts: EconomyOptions = {}) {
    this.now = opts.now ?? systemClock;
    const storage = opts.storage ?? createBrowserStorage();
    this.saveStore = new SaveStore({
      storage,
      timer: opts.timer ?? systemTimer,
      debounceMs: opts.saveDebounceMs ?? 0,
      now: this.now,
    });
    this.hydrate(this.saveStore.load());
  }

  private hydrate(save: PersistedSave): void {
    this.wallet = new WalletModel(save.wallet);
    this.lives = new LivesModel(save.lives, this.now);
    this.boosters = new BoostersModel(save.boosters);
    this.progress = {
      highestUnlocked: save.progress.highestUnlocked,
      stars: { ...save.progress.stars },
    };
    this.settings = { ...save.settings };
    this.dda = {
      scalar: save.dda.scalar,
      failStreak: save.dda.failStreak,
      history: [...save.dda.history],
    };
    this.aux = { ...save.aux };

    this.telemetry = new TelemetryModel(
      {
        metrics: save.metrics,
        lastSeenDay: save.lastSeenDay,
        lastSessionAt: save.aux.lastSessionAt,
      },
      this.now,
    );

    this.rebuildShop(save.ownedSkus);
    this.rebuildAds();
  }

  private rebuildShop(ownedSkus: readonly SkuId[]): void {
    this.shop = new StoreModel(
      {
        wallet: this.wallet,
        lives: this.lives,
        boosters: this.boosters,
        hasFirstFail: () => this.aux.firstFailAt !== null,
        onPurchase: (sku) => {
          this.telemetry.notePurchase(sku.credits);
        },
      },
      ownedSkus,
    );
  }

  private rebuildAds(): void {
    this.ads = new AdsModel(
      {
        now: this.now,
        lives: this.lives,
        boosters: this.boosters,
        ownsAdRemoval: () => this.shop.owns('ads.remove'),
        onAdWatched: () => {
          this.telemetry.noteAdWatched();
        },
      },
      {
        rewardedDay: this.aux.rewardedDay,
        rewardedToday: this.aux.rewardedToday,
        totalPlays: this.aux.totalPlays,
        interstitialsShown: this.aux.interstitialsShown,
      },
    );
  }

  subscribe(fn: EconomyListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  getSnapshot(): EconomySnapshot {
    this.claimDailyStipend();
    return {
      wallet: this.wallet.state,
      lives: this.lives.state,
      boosters: this.boosters.serialized,
      ownedSkus: this.shop.ownedSkus,
      availableSkus: this.shop.availableSkus(),
      metrics: this.telemetry.metrics,
      dashboard: this.telemetry.dashboard,
      progress: this.progress,
      settings: this.settings,
      dda: this.dda,
      firstFailAt: this.aux.firstFailAt,
      ad: this.ads.progress(),
    };
  }

  startSession(): void {
    this.telemetry.startSession();
    this.claimDailyStipend();
    this.persist();
    this.emit();
  }

  endSession(): void {
    this.telemetry.endSession();
    this.persist();
    this.emit();
  }

  private claimDailyStipend(): void {
    const today = dayKey(this.now());
    if (this.aux.stipendDay === today) return;
    this.wallet.grantCredits(ECONOMY_CONST.dailyStipend);
    this.aux = { ...this.aux, stipendDay: today };
  }

  beginLevel(_levelId: number): boolean {
    if (!this.lives.consume()) return false;
    this.telemetry.noteLevelAttempt();
    this.persist();
    this.emit();
    return true;
  }

  completeLevel(levelId: number, stars: number, ddaScalar: number): void {
    const id = Math.floor(levelId);
    const prev = Number(this.progress.stars[id] ?? 0);
    const nextStars = Math.max(prev, Math.min(3, Math.max(0, Math.floor(stars))));
    this.progress = {
      highestUnlocked: Math.max(this.progress.highestUnlocked, id + 1),
      stars: { ...this.progress.stars, [id]: nextStars },
    };
    this.telemetry.noteLevelWon();
    this.telemetry.setDdaScalar(ddaScalar);
    this.dda = {
      scalar: ddaScalar,
      failStreak: 0,
      history: [...this.dda.history, true].slice(-20),
    };
    this.notePlay();
    this.persist();
    this.emit();
  }

  failLevel(ddaScalar: number): void {
    this.telemetry.noteLevelFailed();
    this.telemetry.setDdaScalar(ddaScalar);
    this.aux = {
      ...this.aux,
      firstFailAt: this.aux.firstFailAt ?? this.now(),
      levelsFailed: this.aux.levelsFailed + 1,
    };
    this.dda = {
      scalar: ddaScalar,
      failStreak: this.dda.failStreak + 1,
      history: [...this.dda.history, false].slice(-20),
    };
    // Rebuild shop so starter bundle unlocks after first fail.
    this.rebuildShop(this.shop.ownedSkus);
    this.notePlay();
    this.persist();
    this.emit();
  }

  private notePlay(): void {
    this.ads.notePlayEnded();
    this.aux = {
      ...this.aux,
      totalPlays: this.ads.serialized.totalPlays,
      interstitialsShown: this.ads.serialized.interstitialsShown,
    };
  }

  purchase(id: SkuId): PurchaseResult {
    const result = this.shop.purchase(id);
    if (result.ok) {
      this.persist();
      this.emit();
    }
    return result;
  }

  buyBooster(id: BoosterId, qty = 1) {
    const result = this.boosters.buyWithShards(this.wallet, id, qty);
    if (result.ok) {
      this.persist();
      this.emit();
    }
    return result;
  }

  consumeBooster(id: BoosterId) {
    const result = this.boosters.consume(id);
    if (result.ok) {
      this.persist();
      this.emit();
    }
    return result;
  }

  /** Free grant (demo top-up, rewarded ad, etc.). */
  grantBoosters(grants: Partial<Record<BoosterId, number>>): void {
    this.boosters.grantMany(grants);
    this.persist();
    this.emit();
  }

  /** Restock the opening pack if the bag is totally empty (old saves). */
  ensureStarterBoosters(): void {
    const counts = this.boosters.serialized;
    const total =
      counts.seedPrism + counts.extraMoves + counts.pickaxe + counts.reshuffle;
    if (total > 0) return;
    this.boosters.grantMany({ ...ECONOMY_CONST.startingBoosters });
    this.persist();
    this.emit();
  }

  refillLivesWithShards(): boolean {
    const paid = this.wallet.spendShards(ECONOMY_CONST.cost.refillLives);
    if (!paid.ok) return false;
    this.lives.refill();
    this.persist();
    this.emit();
    return true;
  }

  /** Near-miss continue: pay shards for +5 moves (does not grant inventory booster). */
  spendShardsForContinue(): boolean {
    const paid = this.wallet.spendShards(ECONOMY_CONST.cost.extraMoves5);
    if (!paid.ok) return false;
    this.persist();
    this.emit();
    return true;
  }

  shouldShowInterstitial(): boolean {
    return this.ads.shouldShowInterstitial();
  }

  startAd(placement: AdPlacement, booster: BoosterId = 'pickaxe') {
    return this.ads.start(placement, booster);
  }

  adProgress(): AdProgress {
    return this.ads.progress();
  }

  completeAd(): AdResult {
    const result = this.ads.complete();
    this.syncAdsAux();
    this.persist();
    this.emit();
    return result;
  }

  dismissAd(): AdResult {
    const result = this.ads.dismiss();
    this.syncAdsAux();
    this.persist();
    this.emit();
    return result;
  }

  noteInterstitialShown(): void {
    this.ads.noteInterstitialShown();
    this.syncAdsAux();
    this.persist();
    this.emit();
  }

  private syncAdsAux(): void {
    const a = this.ads.serialized;
    this.aux = {
      ...this.aux,
      rewardedDay: a.rewardedDay,
      rewardedToday: a.rewardedToday,
      totalPlays: a.totalPlays,
      interstitialsShown: a.interstitialsShown,
    };
  }

  updateSettings(partial: Partial<PersistedSave['settings']>): void {
    this.settings = { ...this.settings, ...partial };
    this.persist();
    this.emit();
  }

  resetProfile(): void {
    this.saveStore.clear();
    this.hydrate(freshSave(this.now()));
    this.persist();
    this.emit();
  }

  private persist(): void {
    const a = this.ads.serialized;
    const tel = this.telemetry.snapshot;
    const data: PersistedSave = {
      version: SAVE_VERSION,
      wallet: this.wallet.state,
      lives: this.lives.serialized,
      boosters: this.boosters.serialized,
      ownedSkus: this.shop.ownedSkus,
      progress: this.progress,
      metrics: tel.metrics,
      settings: this.settings,
      dda: this.dda,
      lastSeenDay: tel.lastSeenDay,
      aux: {
        ...this.aux,
        rewardedDay: a.rewardedDay,
        rewardedToday: a.rewardedToday,
        totalPlays: a.totalPlays,
        interstitialsShown: a.interstitialsShown,
        lastSessionAt: tel.lastSessionAt,
      },
    };
    this.saveStore.save(data);
    this.saveStore.flush();
  }
}

export {
  DISCWORLD_SHORTS,
  nextDiscworldShort,
  youtubeEmbedUrl,
} from './discworldShorts';
export {
  ECONOMY_CONST,
  BOOSTER_SLOT,
  createMemoryStorage,
  createBrowserStorage,
  systemClock,
  systemTimer,
};

export type {
  Wallet,
  LivesState,
  Metrics,
  Sku,
  SkuId,
  BoosterId,
  AdPlacement,
  DashboardStats,
};
