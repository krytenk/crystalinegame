/**
 * Cozy idle drip from the Crystal Cavern meta-layer.
 *
 * Furnishing stages raise passive essence while offline. Ethical: no punishment
 * for missing a window — claim whenever you return, capped.
 */

export interface IdlePersist {
  readonly lastClaimAt: number;
}

export interface IdleSnapshot {
  readonly ratePerHour: number;
  readonly pending: number;
  readonly cap: number;
  readonly lastClaimAt: number;
  readonly msSinceClaim: number;
}

const HOUR = 3_600_000;

/** Soft currency per hour from cavern investment. */
export function idleRatePerHour(stagesComplete: number, ownedCount: number): number {
  return 4 + stagesComplete * 3 + Math.floor(ownedCount * 0.6);
}

export function idleCap(stagesComplete: number): number {
  return 40 + stagesComplete * 25;
}

export function pendingIdleEssence(
  lastClaimAt: number,
  now: number,
  stagesComplete: number,
  ownedCount: number,
): number {
  if (lastClaimAt <= 0) return 0;
  const ms = Math.max(0, now - lastClaimAt);
  const hours = ms / HOUR;
  const raw = hours * idleRatePerHour(stagesComplete, ownedCount);
  return Math.min(idleCap(stagesComplete), Math.floor(raw));
}

export function parseIdlePersist(raw: unknown, now: number): IdlePersist {
  if (!raw || typeof raw !== 'object') return { lastClaimAt: now };
  const o = raw as Record<string, unknown>;
  const t = Math.floor(Number(o['lastClaimAt']) || 0);
  return { lastClaimAt: t > 0 ? t : now };
}

export class IdleModel {
  private lastClaimAt: number;

  constructor(snap: IdlePersist) {
    this.lastClaimAt = snap.lastClaimAt;
  }

  get serialized(): IdlePersist {
    return { lastClaimAt: this.lastClaimAt };
  }

  snapshot(now: number, stagesComplete: number, ownedCount: number): IdleSnapshot {
    const pending = pendingIdleEssence(this.lastClaimAt, now, stagesComplete, ownedCount);
    return {
      ratePerHour: idleRatePerHour(stagesComplete, ownedCount),
      pending,
      cap: idleCap(stagesComplete),
      lastClaimAt: this.lastClaimAt,
      msSinceClaim: Math.max(0, now - this.lastClaimAt),
    };
  }

  /** Claim pending essence; resets timer. Returns amount granted. */
  claim(now: number, stagesComplete: number, ownedCount: number): number {
    const n = pendingIdleEssence(this.lastClaimAt, now, stagesComplete, ownedCount);
    this.lastClaimAt = now;
    return n;
  }

  /** Touch without claiming (e.g. first install). */
  touch(now: number): void {
    if (this.lastClaimAt <= 0) this.lastClaimAt = now;
  }
}
