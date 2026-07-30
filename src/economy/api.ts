/**
 * CRYSTALLINE — simulated economy contract.
 *
 * FROZEN CONTRACT. The UI compiles against these interfaces.
 *
 * ===========================================================================
 *  EVERYTHING IN THIS SUBSYSTEM IS A SIMULATION.
 *
 *  `Credits` are a fictional stand-in for money. There is no payment processor,
 *  no billing SDK, no ad network, no analytics endpoint, and no network access
 *  of any kind anywhere in this codebase. Nothing here can charge anyone or
 *  transmit anything. The purpose is to reproduce the *shape* of a free-to-play
 *  monetization funnel closely enough to study it — see docs/ECONOMY.md.
 * ===========================================================================
 */

// ---------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------

/**
 * The two-tier currency structure every F2P title uses:
 *  - `credits` stands in for real money. It is only ever spent in the store.
 *  - `shards`  is the premium currency, bought with credits and spent in-game.
 * The indirection is itself the mechanic: it decouples spending from value.
 */
export interface Wallet {
  readonly credits: number;
  readonly shards: number;
}

export const ECONOMY_CONST = {
  /** Simulated starting balance. */
  startingCredits: 2500,
  startingShards: 50,
  /** Daily login stipend, so the simulation can continue after the wall bites. */
  dailyStipend: 50,

  maxLives: 5,
  /** Milliseconds to regenerate one life. */
  lifeRegenMs: 30 * 60 * 1000,

  /** Shard costs for in-game conveniences. */
  cost: {
    refillLives: 30,
    extraMoves5: 20,
    booster: 15,
  },

  /** Opening booster pack so demo / first-run players can actually use them. */
  startingBoosters: {
    seedPrism: 3,
    extraMoves: 3,
    pickaxe: 3,
    reshuffle: 3,
  } as const,

  /** A level fail or clear every N plays triggers a simulated interstitial. */
  interstitialEvery: 3,
  /**
   * Rewarded / interstitial length matches Discworld in 60s Shorts (~60s).
   * Skip unlocks after `adSkippableAfterMs` (mobile-ad cadence).
   * Completing the full duration grants the rewarded payout; Skip dismisses
   * with no reward (interstitials just close).
   */
  adDurationMs: 60_000,
  adSkippableAfterMs: 5_000,
} as const;

// ---------------------------------------------------------------------------
// Lives
// ---------------------------------------------------------------------------

export interface LivesState {
  readonly count: number;
  /** Wall-clock ms at which the next life lands, or `null` when full. */
  readonly nextRegenAt: number | null;
  /** Convenience for the HUD countdown. */
  readonly msUntilNext: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type SkuId =
  | 'shards.pocket'
  | 'shards.hoard'
  | 'shards.vault'
  | 'bundle.starter'
  | 'lives.refill'
  | 'ads.remove';

export interface Sku {
  readonly id: SkuId;
  readonly name: string;
  readonly blurb: string;
  /** Price in simulated credits. Mirrors real-world F2P price laddering. */
  readonly credits: number;
  readonly grantShards?: number;
  readonly grantLives?: number;
  readonly grantBoosters?: Partial<Record<BoosterId, number>>;
  /** Marketing flags that drive the store's visual treatment. */
  readonly tag?: 'bestValue' | 'mostPopular' | 'limited';
  /** `starter` only appears after the player's first level failure. */
  readonly unlock?: 'firstFail';
  readonly oneTime?: boolean;
}

export type PurchaseResult =
  | { readonly ok: true; readonly wallet: Wallet }
  | { readonly ok: false; readonly reason: 'insufficientCredits' | 'alreadyOwned' | 'unknownSku' };

// ---------------------------------------------------------------------------
// Boosters
// ---------------------------------------------------------------------------

export type BoosterId =
  /** Pre-game: start with a prism already on the board. */
  | 'seedPrism'
  /** Pre-game: +5 moves. */
  | 'extraMoves'
  /** In-game: remove any single piece. */
  | 'pickaxe'
  /** In-game: reshuffle the board on demand. */
  | 'reshuffle';

export interface BoosterInventory {
  readonly counts: Readonly<Record<BoosterId, number>>;
}

// ---------------------------------------------------------------------------
// Simulated advertising
// ---------------------------------------------------------------------------

export type AdPlacement = 'rewardedLife' | 'rewardedBooster' | 'rewardedContinue' | 'interstitial';

export interface AdOffer {
  readonly placement: AdPlacement;
  readonly rewardLabel: string;
  readonly durationMs: number;
  readonly skippableAfterMs: number;
}

export type AdResult =
  | { readonly ok: true; readonly placement: AdPlacement }
  | { readonly ok: false; readonly reason: 'dismissed' | 'adsRemoved' | 'capped' };

// ---------------------------------------------------------------------------
// Telemetry — the research payload
// ---------------------------------------------------------------------------

/**
 * The metrics the research document names, computed locally from this player's
 * own session and surfaced in the in-game Publisher Dashboard. Stored on-device
 * only; nothing is transmitted.
 */
export interface Metrics {
  readonly installedAt: number;
  readonly sessions: number;
  readonly daysActive: number;
  /** Retention flags for the classic D1/D7/D30 cohort checks. */
  readonly retention: { readonly d1: boolean; readonly d7: boolean; readonly d30: boolean };
  readonly levelsAttempted: number;
  readonly levelsWon: number;
  readonly totalPlaytimeMs: number;
  /** Simulated spend, in credits. */
  readonly creditsSpent: number;
  readonly purchases: number;
  readonly adsWatched: number;
  /** Derived: simulated credits spent per active day. */
  readonly arpdau: number;
  /** Derived: spend concentration, mirroring the doc's whale analysis. */
  readonly isPayer: boolean;
  readonly ddaScalar: number;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Bump when the shape changes; `persistence.ts` owns the migration path. */
export const SAVE_VERSION = 1;

export interface SaveData {
  readonly version: number;
  readonly wallet: Wallet;
  readonly lives: { readonly count: number; readonly nextRegenAt: number | null };
  readonly boosters: Readonly<Record<BoosterId, number>>;
  readonly ownedSkus: readonly SkuId[];
  readonly progress: {
    readonly highestUnlocked: number;
    readonly stars: Readonly<Record<number, number>>;
  };
  readonly metrics: Metrics;
  readonly settings: {
    readonly glyphs: boolean;
    readonly reducedMotion: boolean;
    readonly sfx: boolean;
    readonly music: boolean;
  };
  readonly dda: { readonly scalar: number; readonly failStreak: number; readonly history: readonly boolean[] };
  readonly lastSeenDay: string;
}
