/**
 * CRYSTALLINE — local telemetry, the research payload.
 *
 * ===========================================================================
 *  ON-DEVICE ONLY. No beacon, no endpoint, no `fetch`, no `sendBeacon`, no
 *  session replay, no device or advertising identifier. Every number below is
 *  computed from this one player's own play and written to this one device's
 *  save file. Nothing leaves the machine. The audience for these numbers is
 *  the player, via the in-game Publisher Dashboard.
 * ===========================================================================
 *
 * The dashboard exists to make the research document's thesis *observable*:
 * that the lives gate, the price ladder and the hidden difficulty scalar are a
 * single instrument aimed at a small number of KPIs. So each derivation below
 * is documented against the definition the industry actually uses.
 *
 * ---------------------------------------------------------------------------
 * DERIVATIONS
 * ---------------------------------------------------------------------------
 * installedAt      First launch, wall-clock ms. Set once, never rewritten.
 *
 * sessions         +1 per `startSession()`. A session is one contiguous period
 *                  of the app being in the foreground.
 *
 * daysActive       Count of distinct *local calendar days* on which at least one
 *                  session began. Incremented when the current day key differs
 *                  from `lastSeenDay` (and on the very first session). Local,
 *                  not UTC: the question is whether the player's day contained
 *                  a visit. This is the denominator of ARPDAU.
 *
 * retention.d1     Sticky flags. True once the player has started a session on a
 * retention.d7     calendar day at least N midnights after the install day:
 * retention.d30      dN := (dayIndex(now) - dayIndex(installedAt)) >= N
 *                  Midnights crossed, not elapsed hours — this is the standard
 *                  cohort definition, under which installing at 23:50 and
 *                  returning at 00:10 counts as D1 retained. The doc's casual
 *                  benchmarks for comparison: D1 ~40%, D7 ~20%, D30 ~10%.
 *
 * levelsAttempted  +1 per level start (a life spent).
 * levelsWon        +1 per level cleared. Fails are `attempted - won` once no
 *                  level is in flight.
 *
 * totalPlaytimeMs  Sum of (now - lastAccrual) while a session is open. Accrued
 *                  lazily on read, so the value is current without a tick loop.
 *
 * creditsSpent     Sum of the `credits` price of every successful store
 *                  purchase. Simulated spend — the stand-in for real revenue.
 *
 * purchases        Count of successful store transactions.
 *
 * adsWatched       Rewarded views completed plus interstitials displayed, i.e.
 *                  simulated impressions the player actually sat through.
 *
 * arpdau           creditsSpent / max(1, daysActive).
 *                  Average Revenue Per Daily Active User, collapsed to a single
 *                  player: for one user, "revenue divided by daily actives"
 *                  degenerates to lifetime spend over days that user was active.
 *                  The max(1, …) guards the pre-first-session case.
 *
 * isPayer          purchases > 0.
 *                  The doc's conversion figure is ~4% of players; this is the
 *                  per-player form of that flag, and the divider between the
 *                  96% who fund nothing and the tail that funds everything.
 *
 * ddaScalar        Mirrored from the engine's `DdaState.scalar`, clamped to
 *                  [-1, 1]. Never surfaced during play; surfaced here on
 *                  purpose, because a hidden assist the player cannot see is
 *                  precisely what the research build exists to expose.
 */

import type { Metrics } from './api';
import { clamp, dayIndex, dayKey, safeCount, type Clock } from './time';

/**
 * Second-order figures the dashboard shows. Deliberately kept *out* of
 * `Metrics`, which is a frozen contract in `api.ts` and must not grow.
 */
export interface DashboardStats {
  readonly levelsFailed: number;
  /** levelsWon / max(1, levelsAttempted). */
  readonly winRate: number;
  /** Whole local days since install, inclusive of today. */
  readonly daysSinceInstall: number;
  /** daysActive / daysSinceInstall — the DAU/MAU "stickiness" ratio, per player. */
  readonly stickiness: number;
  /** creditsSpent / purchases. ARPPU; 0 for a non-payer. */
  readonly arppu: number;
  /** totalPlaytimeMs / max(1, sessions). */
  readonly meanSessionMs: number;
  readonly sessionsPerActiveDay: number;
  readonly adsPerActiveDay: number;
}

export interface TelemetrySnapshot {
  readonly metrics: Metrics;
  readonly lastSeenDay: string;
  readonly lastSessionAt: number;
}

export interface TelemetryInit {
  readonly metrics: Metrics;
  readonly lastSeenDay: string;
  readonly lastSessionAt?: number;
}

export class TelemetryModel {
  private readonly now: Clock;

  private installedAt: number;
  private sessions: number;
  private daysActive: number;
  private d1: boolean;
  private d7: boolean;
  private d30: boolean;
  private levelsAttempted: number;
  private levelsWon: number;
  private totalPlaytimeMs: number;
  private creditsSpent: number;
  private purchases: number;
  private adsWatched: number;
  private ddaScalar: number;

  private lastSeenDayKey: string;
  private lastSessionAt: number;
  /** Wall-clock of the last playtime accrual; `null` when no session is open. */
  private accrualMark: number | null = null;

  constructor(init: TelemetryInit, now: Clock) {
    this.now = now;
    const m = init.metrics;
    this.installedAt = Number.isFinite(m.installedAt) ? m.installedAt : now();
    this.sessions = safeCount(m.sessions, 0);
    this.daysActive = safeCount(m.daysActive, 0);
    this.d1 = m.retention.d1 === true;
    this.d7 = m.retention.d7 === true;
    this.d30 = m.retention.d30 === true;
    this.levelsAttempted = safeCount(m.levelsAttempted, 0);
    this.levelsWon = safeCount(m.levelsWon, 0);
    this.totalPlaytimeMs = safeCount(m.totalPlaytimeMs, 0);
    this.creditsSpent = safeCount(m.creditsSpent, 0);
    this.purchases = safeCount(m.purchases, 0);
    this.adsWatched = safeCount(m.adsWatched, 0);
    this.ddaScalar = clamp(m.ddaScalar, -1, 1);
    this.lastSeenDayKey = init.lastSeenDay || dayKey(this.installedAt);
    this.lastSessionAt = safeCount(init.lastSessionAt, 0);
  }

  // -------------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------------

  /** Open a session: bumps `sessions`, rolls `daysActive`, sets retention flags. */
  startSession(): void {
    const t = this.now();
    const today = dayKey(t);

    // daysActive counts distinct calendar days with a session. The `sessions === 0`
    // arm makes the very first launch count, since a fresh save initialises
    // lastSeenDay to the install day.
    if (this.sessions === 0 || today !== this.lastSeenDayKey) {
      this.daysActive += 1;
    }
    this.lastSeenDayKey = today;

    this.sessions += 1;
    this.lastSessionAt = t;
    this.accrualMark = t;

    // Retention: midnights crossed since the install day. Flags are sticky —
    // a cohort member who retains to D7 does not stop having retained.
    const crossed = dayIndex(t) - dayIndex(this.installedAt);
    if (crossed >= 1) this.d1 = true;
    if (crossed >= 7) this.d7 = true;
    if (crossed >= 30) this.d30 = true;
  }

  /** Close the session and bank the outstanding playtime. */
  endSession(): void {
    this.accruePlaytime();
    this.accrualMark = null;
  }

  /** Bank playtime up to now without closing the session. */
  heartbeat(): void {
    this.accruePlaytime();
  }

  private accruePlaytime(): void {
    if (this.accrualMark === null) return;
    const t = this.now();
    // A backwards clock jump must not subtract playtime already banked.
    const delta = t - this.accrualMark;
    if (delta > 0) this.totalPlaytimeMs += delta;
    this.accrualMark = t;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  noteLevelAttempt(): void {
    this.levelsAttempted += 1;
  }

  noteLevelWon(): void {
    this.levelsWon += 1;
  }

  /** Fails are derived (`attempted - won`); this exists for call-site symmetry. */
  noteLevelFailed(): void {
    /* derived from attempted - won; nothing to record */
  }

  noteCreditsSpent(amount: number): void {
    this.creditsSpent += safeCount(amount, 0);
  }

  notePurchase(creditsPrice: number): void {
    this.purchases += 1;
    this.noteCreditsSpent(creditsPrice);
  }

  noteAdWatched(): void {
    this.adsWatched += 1;
  }

  setDdaScalar(scalar: number): void {
    this.ddaScalar = clamp(scalar, -1, 1);
  }

  // -------------------------------------------------------------------------
  // Read models
  // -------------------------------------------------------------------------

  get metrics(): Metrics {
    this.accruePlaytime();
    return {
      installedAt: this.installedAt,
      sessions: this.sessions,
      daysActive: this.daysActive,
      retention: { d1: this.d1, d7: this.d7, d30: this.d30 },
      levelsAttempted: this.levelsAttempted,
      levelsWon: this.levelsWon,
      totalPlaytimeMs: this.totalPlaytimeMs,
      creditsSpent: this.creditsSpent,
      purchases: this.purchases,
      adsWatched: this.adsWatched,
      // ARPDAU — simulated credits spent per active day.
      arpdau: this.creditsSpent / Math.max(1, this.daysActive),
      // Conversion flag: has this player ever transacted at all?
      isPayer: this.purchases > 0,
      ddaScalar: this.ddaScalar,
    };
  }

  get lastSeenDay(): string {
    return this.lastSeenDayKey;
  }

  get snapshot(): TelemetrySnapshot {
    return {
      metrics: this.metrics,
      lastSeenDay: this.lastSeenDayKey,
      lastSessionAt: this.lastSessionAt,
    };
  }

  /** Second-order figures for the Publisher Dashboard. */
  get dashboard(): DashboardStats {
    const m = this.metrics;
    const daysSinceInstall = Math.max(1, dayIndex(this.now()) - dayIndex(m.installedAt) + 1);
    return {
      levelsFailed: Math.max(0, m.levelsAttempted - m.levelsWon),
      winRate: m.levelsWon / Math.max(1, m.levelsAttempted),
      daysSinceInstall,
      stickiness: m.daysActive / daysSinceInstall,
      arppu: m.purchases > 0 ? m.creditsSpent / m.purchases : 0,
      meanSessionMs: m.totalPlaytimeMs / Math.max(1, m.sessions),
      sessionsPerActiveDay: m.sessions / Math.max(1, m.daysActive),
      adsPerActiveDay: m.adsWatched / Math.max(1, m.daysActive),
    };
  }
}
