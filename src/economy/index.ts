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
import {
  AlbumModel,
  parseAlbumPersist,
  type AlbumSnapshot,
} from './album';
import {
  HybridEventModel,
  parseEventPersist,
  type HybridEventSnapshot,
} from './hybridEvent';
import {
  DailyGoalsModel,
  parseDailyGoals,
  type DailyGoalsSnapshot,
} from './dailyGoals';
import { IdleModel, parseIdlePersist, type IdleSnapshot } from './idle';
import {
  essenceForWin,
  MetaModel,
  type MetaBuyResult,
  type MetaSnapshot,
} from './meta';
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
  /** localStorage key — theme packs use distinct keys so progress never collides. */
  readonly saveKey?: string;
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
  readonly meta: MetaSnapshot;
  /** Essence granted on the most recent win (UI toast). */
  readonly lastEssenceGain: number;
  /** Daily login gift just claimed (null after consume). */
  readonly pendingDailyGift: { readonly credits: number; readonly essence: number } | null;
  readonly album: AlbumSnapshot;
  readonly event: HybridEventSnapshot;
  readonly idle: IdleSnapshot;
  /** Wall-clock when timed ad-free ends (null if inactive). */
  readonly adsFreeUntil: number | null;
  readonly adsFreeActive: boolean;
  readonly comfortOwned: boolean;
  /** Last album page reward (0 if none this win). */
  readonly lastAlbumPageReward: number;
  readonly lastAlbumGranted: readonly { readonly id: string; readonly rarity: string }[];
  readonly lastAlbumRareCount: number;
  readonly daily: DailyGoalsSnapshot;
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
  private meta!: MetaModel;
  private album!: AlbumModel;
  private hybridEvent!: HybridEventModel;
  private idle!: IdleModel;
  private dailyGoals!: DailyGoalsModel;
  private progress!: PersistedSave['progress'];
  private settings!: PersistedSave['settings'];
  private dda!: PersistedSave['dda'];
  private aux!: EconomyAux;
  private lastEssenceGain = 0;
  private lastAlbumPageReward = 0;
  private lastAlbumGranted: { id: string; rarity: string }[] = [];
  private lastAlbumRareCount = 0;
  /**
   * True after beginLevel while an attempt can still cost a life.
   * Cleared on win (no charge) or after failLevel consumes one life.
   * Prevents double-charging and matches “life spent on fail, not on play”.
   */
  private lifeAtStake = false;

  constructor(opts: EconomyOptions = {}) {
    this.now = opts.now ?? systemClock;
    const storage = opts.storage ?? createBrowserStorage();
    this.saveStore = new SaveStore({
      storage,
      timer: opts.timer ?? systemTimer,
      debounceMs: opts.saveDebounceMs ?? 0,
      now: this.now,
      key: opts.saveKey,
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
    this.meta = new MetaModel({
      essence: save.aux.metaEssence,
      owned: save.aux.metaOwned,
      totalSpent: save.aux.metaTotalSpent,
    });
    this.album = new AlbumModel(parseAlbumPersist(save.aux.album));
    this.hybridEvent = new HybridEventModel(parseEventPersist(save.aux.hybridEvent, this.now()));
    this.idle = new IdleModel(parseIdlePersist(save.aux.idle, this.now()));
    this.idle.touch(this.now());
    this.dailyGoals = new DailyGoalsModel(parseDailyGoals(save.aux.dailyGoals, this.now()));
    this.lastEssenceGain = 0;
    this.lastAlbumPageReward = 0;
    this.lastAlbumGranted = [];
    this.lastAlbumRareCount = 0;

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

  private isAdsFreeActive(): boolean {
    if (this.shop.owns('ads.remove')) return true;
    const until = this.aux.adsFreeUntil;
    return typeof until === 'number' && until > this.now();
  }

  private rebuildShop(ownedSkus: readonly SkuId[]): void {
    this.shop = new StoreModel(
      {
        wallet: this.wallet,
        lives: this.lives,
        boosters: this.boosters,
        hasFirstFail: () => this.aux.firstFailAt !== null,
        grantAdsFreeDays: (days) => {
          const add = Math.max(0, Math.floor(days)) * 86_400_000;
          const base = Math.max(this.now(), this.aux.adsFreeUntil ?? 0);
          this.aux = { ...this.aux, adsFreeUntil: base + add };
        },
        grantComfort: () => {
          this.aux = { ...this.aux, comfortOwned: true };
        },
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
        ownsAdRemoval: () => this.isAdsFreeActive(),
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
    this.hybridEvent.roll(this.now());
    const meta = this.meta.snapshot();
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
      meta,
      lastEssenceGain: this.lastEssenceGain,
      pendingDailyGift: this.aux.pendingDailyGift,
      album: this.album.snapshot(),
      event: this.hybridEvent.snapshot(this.now()),
      idle: this.idle.snapshot(this.now(), meta.stagesComplete, meta.ownedCount),
      adsFreeUntil: this.aux.adsFreeUntil,
      adsFreeActive: this.isAdsFreeActive(),
      comfortOwned: this.aux.comfortOwned || this.shop.owns('ease.comfort'),
      lastAlbumPageReward: this.lastAlbumPageReward,
      lastAlbumGranted: this.lastAlbumGranted,
      lastAlbumRareCount: this.lastAlbumRareCount,
      daily: this.dailyGoals.snapshot(this.now()),
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

  /** Clear the daily-gift toast flag after the UI has shown it. */
  consumeDailyGift(): void {
    if (!this.aux.pendingDailyGift) return;
    this.aux = { ...this.aux, pendingDailyGift: null };
    this.persist();
    this.emit();
  }

  private claimDailyStipend(): void {
    const today = dayKey(this.now());
    if (this.aux.stipendDay === today) return;
    const credits = ECONOMY_CONST.dailyStipend;
    const essence = ECONOMY_CONST.dailyEssence;
    this.wallet.grantCredits(credits);
    this.meta.grantEssence(essence);
    this.syncMetaAux();
    this.aux = {
      ...this.aux,
      stipendDay: today,
      pendingDailyGift: { credits, essence },
    };
  }

  /**
   * Gate entry: require at least one life available, but **do not spend it yet**.
   * Lives are consumed in {@link failLevel} (loss / quit / decline continue).
   * Wins clear the stake with no charge so successful clears never burn lives.
   */
  beginLevel(_levelId: number): boolean {
    if (this.lives.state.count <= 0) return false;
    this.lifeAtStake = true;
    this.telemetry.noteLevelAttempt();
    this.persist();
    this.emit();
    return true;
  }

  completeLevel(levelId: number, stars: number, ddaScalar: number): void {
    // Win: release the stake without spending a life.
    this.lifeAtStake = false;
    const id = Math.floor(levelId);
    const prev = Number(this.progress.stars[id] ?? 0);
    const nextStars = Math.max(prev, Math.min(3, Math.max(0, Math.floor(stars))));
    const newStars = Math.max(0, nextStars - prev);
    this.progress = {
      highestUnlocked: Math.max(this.progress.highestUnlocked, id + 1),
      stars: { ...this.progress.stars, [id]: nextStars },
    };
    // Meta dual-loop: wins mint essence for the Crystal Cavern.
    const gain = essenceForWin({ stars: nextStars, newStars, levelId: id });
    this.meta.grantEssence(gain);
    this.lastEssenceGain = gain;

    // Endless album pulls + hybrid event points
    let seed = (id * 9973 + nextStars * 131 + this.aux.totalPlays) >>> 0;
    const albumRes = this.album.grantFromWin({
      stars: nextStars,
      levelId: id,
      rand: () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0x10000;
      },
    });
    this.lastAlbumGranted = albumRes.granted.map((g) => ({ id: g.id, rarity: g.rarity }));
    this.lastAlbumRareCount = albumRes.rareCount;
    this.lastAlbumPageReward = albumRes.pageReward;
    if (albumRes.pageReward > 0) {
      this.meta.grantEssence(albumRes.pageReward);
      this.lastEssenceGain += albumRes.pageReward;
    }

    this.hybridEvent.roll(this.now());
    this.hybridEvent.addWin(nextStars);
    // Auto-claim due personal milestones (ethical: always pay the track)
    const due = this.hybridEvent.claimDue();
    if (due.essence > 0) {
      this.meta.grantEssence(due.essence);
      this.lastEssenceGain += due.essence;
    }
    if (due.shards > 0) this.wallet.grantShards(due.shards);

    this.dailyGoals.noteWin(this.now());

    this.syncMetaAux();
    this.syncLiveOpsAux();
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

  /** Claim cozy idle cavern drip. */
  claimIdleEssence(): number {
    const meta = this.meta.snapshot();
    const n = this.idle.claim(this.now(), meta.stagesComplete, meta.ownedCount);
    if (n > 0) {
      this.meta.grantEssence(n);
      this.lastEssenceGain = n;
      this.syncMetaAux();
    }
    this.syncLiveOpsAux();
    this.persist();
    this.emit();
    return n;
  }

  /** Manually claim hybrid event milestones if any pending (usually auto). */
  claimEventMilestones(): { essence: number; shards: number; labels: string[] } {
    this.hybridEvent.roll(this.now());
    const due = this.hybridEvent.claimDue();
    if (due.essence > 0) {
      this.meta.grantEssence(due.essence);
      this.lastEssenceGain = due.essence;
      this.syncMetaAux();
    }
    if (due.shards > 0) this.wallet.grantShards(due.shards);
    this.syncLiveOpsAux();
    this.persist();
    this.emit();
    return due;
  }

  private syncLiveOpsAux(): void {
    this.aux = {
      ...this.aux,
      album: this.album.serialized,
      hybridEvent: this.hybridEvent.serialized,
      idle: this.idle.serialized,
      dailyGoals: this.dailyGoals.serialized,
    };
  }

  buyMetaUpgrade(id: string): MetaBuyResult {
    const result = this.meta.buy(id);
    if (result.ok) {
      this.syncMetaAux();
      this.persist();
      this.emit();
    }
    return result;
  }

  /**
   * Bonus essence (geode crack, events). Surfaces in `lastEssenceGain` for UI.
   */
  grantBonusEssence(amount: number): number {
    const n = Math.max(0, Math.floor(amount));
    if (n <= 0) return this.meta.snapshot().essence;
    this.meta.grantEssence(n);
    this.lastEssenceGain = n;
    this.syncMetaAux();
    this.persist();
    this.emit();
    return this.meta.snapshot().essence;
  }

  private syncMetaAux(): void {
    const m = this.meta.serialized;
    this.aux = {
      ...this.aux,
      metaEssence: m.essence,
      metaOwned: m.owned,
      metaTotalSpent: m.totalSpent,
    };
  }

  failLevel(ddaScalar: number): void {
    // Spend at most one life per attempt (start no longer consumes).
    if (this.lifeAtStake) {
      this.lives.consume();
      this.lifeAtStake = false;
    }
    this.telemetry.noteLevelFailed();
    this.telemetry.setDdaScalar(ddaScalar);
    this.dailyGoals.noteFail(this.now());
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
    this.syncLiveOpsAux();
    this.notePlay();
    this.persist();
    this.emit();
  }

  /** Soft daily goal claim (3 clears → essence). Ethical: no miss-window punish. */
  claimDailyGoal(): number {
    const n = this.dailyGoals.claim(this.now());
    if (n > 0) {
      this.meta.grantEssence(n);
      this.lastEssenceGain = n;
      this.syncMetaAux();
    }
    this.syncLiveOpsAux();
    this.persist();
    this.emit();
    return n;
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
      // Ad passes change interstitial eligibility
      this.rebuildAds();
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
    this.syncLiveOpsAux();
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
        album: this.album.serialized,
        hybridEvent: this.hybridEvent.serialized,
        idle: this.idle.serialized,
        dailyGoals: this.dailyGoals.serialized,
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
  META_STAGES,
  META_UPGRADES,
  essenceForWin,
  MetaModel,
  installMetaTheme,
  getMetaStages,
  getMetaUpgrades,
} from './meta';
export type { MetaSnapshot, MetaUpgrade, MetaBuyResult, CavernStageId } from './meta';
export {
  ALBUM_CARDS,
  ALBUM_SHEET,
  ALBUM_SHEET_SIZE,
  needForCycle,
  albumCard,
  installAlbumTheme,
  getAlbumSheet,
  getAlbumCards,
} from './album';
export type { AlbumSnapshot, AlbumSlotView, AlbumRarity } from './album';
export { EVENT_MILESTONES, installEventTheme, getEventMilestones } from './hybridEvent';
export type { HybridEventSnapshot, EventMilestone, EventThemeCatalog } from './hybridEvent';
export type { IdleSnapshot } from './idle';
export type { DailyGoalsSnapshot } from './dailyGoals';
export { DAILY_CLEAR_TARGET, DAILY_GOAL_ESSENCE } from './dailyGoals';
export { CONVEYOR_FROM_LEVEL, levelHasConveyor } from '../engine/conveyor';
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
