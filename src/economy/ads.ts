/**
 * CRYSTALLINE — free-gift / future-ad cadence layer.
 *
 * ===========================================================================
 *  THERE IS NO AD NETWORK HERE. No SDK, no YouTube Shorts creative, no
 *  impression beacon. This module is a state machine + timer for **opt-in
 *  free gifts** (lives / boosters / continue). Interstitials are disabled
 *  for Play free builds (`interstitialEvery: 0`) until a real ad SDK lands.
 * ===========================================================================
 *
 *  - **Interstitial** — disabled by default (every = 0).
 *  - **Rewarded / free gift** — opt-in short wait, daily cap, then payout.
 *
 * Session state machine:
 *
 *      idle ──start()──► playing ──(skippableAfterMs)──► skippable
 *                           │                               │
 *                           │ dismiss()                     ├─ complete()  ─► completed  (reward granted, once)
 *                           ▼                               └─ dismiss()   ─► dismissed  (nothing granted)
 *                       dismissed
 *
 * `playing` and `skippable` are derived from the injected clock, so a test can
 * jump to 3000ms and assert the Skip button should appear without waiting.
 */

import {
  ECONOMY_CONST,
  type AdOffer,
  type AdPlacement,
  type AdResult,
  type BoosterId,
} from './api';
import type { BoostersModel } from './boosters';
import type { LivesModel } from './lives';
import { dayKey, safeCount, type Clock } from './time';

/**
 * Rewarded views permitted per local calendar day. Ten is a plausible industry
 * setting: generous enough that the free path feels real, tight enough that a
 * player leaning on it exclusively still hits the lives wall most days.
 */
export const REWARDED_DAILY_CAP = 10;

export type AdSessionState = 'idle' | 'playing' | 'skippable' | 'completed' | 'dismissed';

export interface AdProgress {
  readonly state: AdSessionState;
  readonly elapsedMs: number;
  readonly remainingMs: number;
  /** True once `skippableAfterMs` has passed — the UI reveals Skip. */
  readonly canSkip: boolean;
  /** True once the full `durationMs` has passed — `complete()` will pay out. */
  readonly finished: boolean;
}

export type AdStartResult =
  | { readonly ok: true; readonly offer: AdOffer }
  | { readonly ok: false; readonly reason: 'capped' | 'adsRemoved' | 'busy' };

/** Persisted ad bookkeeping. Lives in the save blob's `aux` section. */
export interface AdsSnapshot {
  readonly rewardedDay: string;
  readonly rewardedToday: number;
  readonly totalPlays: number;
  readonly interstitialsShown: number;
}

export interface AdsDeps {
  readonly now: Clock;
  readonly lives: LivesModel;
  readonly boosters: BoostersModel;
  /** True when the player owns `ads.remove`. */
  readonly ownsAdRemoval: () => boolean;
  /** Fired when a rewarded view completes or an interstitial is displayed. */
  readonly onAdWatched?: (placement: AdPlacement) => void;
}

const REWARD_LABEL: Readonly<Record<AdPlacement, string>> = {
  rewardedLife: '+1 Life',
  rewardedBooster: '+1 Booster',
  rewardedContinue: '+5 Moves — keep playing',
  interstitial: '',
};

interface Session {
  placement: AdPlacement;
  offer: AdOffer;
  startedAt: number;
  /** Set once the session reaches a terminal state; `null` while live. */
  terminal: 'completed' | 'dismissed' | null;
  /** The booster a `rewardedBooster` view will pay out. */
  booster: BoosterId;
}

export class AdsModel {
  private readonly deps: AdsDeps;
  private session: Session | null = null;
  private rewardedDay: string;
  private rewardedToday: number;
  private totalPlays: number;
  private interstitialsShown: number;
  private readonly cap: number;

  constructor(deps: AdsDeps, snapshot?: Partial<AdsSnapshot>, cap: number = REWARDED_DAILY_CAP) {
    this.deps = deps;
    this.cap = Math.max(0, Math.floor(cap));
    this.rewardedDay = snapshot?.rewardedDay ?? dayKey(deps.now());
    this.rewardedToday = safeCount(snapshot?.rewardedToday, 0);
    this.totalPlays = safeCount(snapshot?.totalPlays, 0);
    this.interstitialsShown = safeCount(snapshot?.interstitialsShown, 0);
  }

  get serialized(): AdsSnapshot {
    return {
      rewardedDay: this.rewardedDay,
      rewardedToday: this.rewardedToday,
      totalPlays: this.totalPlays,
      interstitialsShown: this.interstitialsShown,
    };
  }

  // -------------------------------------------------------------------------
  // Offers
  // -------------------------------------------------------------------------

  /**
   * Describe the rewarded offer for a placement. Pure — it neither starts a
   * session nor consumes cap, so the UI can render the button label cheaply.
   */
  offerRewarded(placement: AdPlacement): AdOffer {
    return {
      placement,
      rewardLabel: REWARD_LABEL[placement],
      durationMs: ECONOMY_CONST.adDurationMs,
      skippableAfterMs: ECONOMY_CONST.adSkippableAfterMs,
    };
  }

  /** Rewarded views left today, after rolling the day over if needed. */
  rewardedRemainingToday(): number {
    this.rollDay();
    return Math.max(0, this.cap - this.rewardedToday);
  }

  canOfferRewarded(): boolean {
    return this.rewardedRemainingToday() > 0;
  }

  // -------------------------------------------------------------------------
  // Session state machine
  // -------------------------------------------------------------------------

  /**
   * Begin a simulated view. The daily cap is consumed here, at impression time,
   * exactly as a real frequency cap counts impressions rather than payouts —
   * otherwise a player could dismiss endlessly to farm fresh offers.
   */
  start(placement: AdPlacement, booster: BoosterId = 'pickaxe'): AdStartResult {
    if (this.session !== null && this.session.terminal === null) {
      return { ok: false, reason: 'busy' };
    }
    if (placement === 'interstitial') {
      if (this.deps.ownsAdRemoval()) return { ok: false, reason: 'adsRemoved' };
    } else {
      this.rollDay();
      if (this.rewardedToday >= this.cap) return { ok: false, reason: 'capped' };
      this.rewardedToday += 1;
    }

    const offer = this.offerRewarded(placement);
    this.session = {
      placement,
      offer,
      startedAt: this.deps.now(),
      terminal: null,
      booster,
    };
    return { ok: true, offer };
  }

  get state(): AdSessionState {
    return this.progress().state;
  }

  get currentOffer(): AdOffer | null {
    return this.session === null || this.session.terminal !== null ? null : this.session.offer;
  }

  /** Derived playback state. Safe to poll every frame. */
  progress(): AdProgress {
    const s = this.session;
    if (s === null) {
      return { state: 'idle', elapsedMs: 0, remainingMs: 0, canSkip: false, finished: false };
    }
    // A clock that jumped backwards must not produce negative elapsed time.
    const elapsed = Math.max(0, this.deps.now() - s.startedAt);
    const canSkip = elapsed >= s.offer.skippableAfterMs;
    const finished = elapsed >= s.offer.durationMs;
    if (s.terminal !== null) {
      return {
        state: s.terminal,
        elapsedMs: elapsed,
        remainingMs: 0,
        canSkip,
        finished,
      };
    }
    return {
      state: canSkip ? 'skippable' : 'playing',
      elapsedMs: elapsed,
      remainingMs: Math.max(0, s.offer.durationMs - elapsed),
      canSkip,
      finished,
    };
  }

  /**
   * Watch it through to the end and take the reward.
   *
   * Fails — granting nothing — when there is no session, when the session has
   * already terminated (so a reward can never be collected twice), or when the
   * full `durationMs` has not yet elapsed. `AdResult` is a frozen contract with
   * only three failure reasons, so all three cases report `dismissed`: from the
   * player's side the outcome is identical, no reward.
   */
  complete(): AdResult {
    const s = this.session;
    if (s === null || s.terminal !== null) return { ok: false, reason: 'dismissed' };

    const elapsed = Math.max(0, this.deps.now() - s.startedAt);
    if (elapsed < s.offer.durationMs) {
      s.terminal = 'dismissed';
      return { ok: false, reason: 'dismissed' };
    }

    s.terminal = 'completed';
    this.grantReward(s);
    this.deps.onAdWatched?.(s.placement);
    return { ok: true, placement: s.placement };
  }

  /** Bail out early. Grants nothing, whether or not Skip was available yet. */
  dismiss(): AdResult {
    const s = this.session;
    if (s !== null && s.terminal === null) s.terminal = 'dismissed';
    return { ok: false, reason: 'dismissed' };
  }

  /** Clear a terminated session so the UI can return to the game. */
  reset(): void {
    if (this.session !== null && this.session.terminal !== null) this.session = null;
  }

  private grantReward(s: Session): void {
    switch (s.placement) {
      case 'rewardedLife':
        this.deps.lives.grant(1);
        return;
      case 'rewardedBooster':
        this.deps.boosters.grant(s.booster, 1);
        return;
      case 'rewardedContinue':
        // Extra moves live in the engine's session, not in the economy. The
        // `{ ok: true, placement: 'rewardedContinue' }` result is the grant —
        // the caller applies it to the live board.
        return;
      case 'interstitial':
        return;
    }
  }

  // -------------------------------------------------------------------------
  // Interstitial cadence
  // -------------------------------------------------------------------------

  /** Record a level ending — a clear or a fail. Both count toward the cadence. */
  notePlayEnded(): void {
    this.totalPlays += 1;
  }

  /**
   * Interstitials: off when `interstitialEvery` ≤ 0 (ship default).
   * When enabled later: every Nth level end, never if `ads.remove` owned.
   */
  shouldShowInterstitial(): boolean {
    if (this.deps.ownsAdRemoval()) return false;
    const every = ECONOMY_CONST.interstitialEvery;
    if (every <= 0) return false;
    return this.totalPlays > 0 && this.totalPlays % every === 0;
  }

  /** Call when the interstitial Short has actually been displayed. */
  noteInterstitialShown(): void {
    this.interstitialsShown += 1;
    this.deps.onAdWatched?.('interstitial');
  }

  get playsUntilInterstitial(): number {
    if (this.deps.ownsAdRemoval()) return Number.POSITIVE_INFINITY;
    const every = ECONOMY_CONST.interstitialEvery;
    if (every <= 0) return Number.POSITIVE_INFINITY;
    return every - (this.totalPlays % every);
  }

  private rollDay(): void {
    const today = dayKey(this.deps.now());
    if (today !== this.rewardedDay) {
      this.rewardedDay = today;
      this.rewardedToday = 0;
    }
  }
}
