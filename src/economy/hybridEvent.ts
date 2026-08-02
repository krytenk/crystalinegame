/**
 * Hybrid live event — personal milestones + soft league (no real multiplayer).
 *
 * Casual players always earn milestone rewards; “rank” is a local simulated
 * field for competitive flavour only.
 */

export interface EventMilestone {
  readonly at: number;
  readonly label: string;
  readonly essence: number;
  readonly shards: number;
}

export const EVENT_MILESTONES: readonly EventMilestone[] = [
  { at: 3, label: 'First seam', essence: 20, shards: 5 },
  { at: 8, label: 'Deep cut', essence: 35, shards: 10 },
  { at: 15, label: 'Gallery clear', essence: 50, shards: 15 },
  { at: 25, label: 'Vault push', essence: 80, shards: 25 },
] as const;

export interface EventThemeCatalog {
  readonly idPrefix: string;
  readonly name: string;
  readonly tagline: string;
  readonly milestones: readonly EventMilestone[];
  /** elite (≤5), mid (≤15), casual */
  readonly league: readonly [string, string, string];
}

const DEFAULT_EVENT: EventThemeCatalog = {
  idPrefix: 'mine-rush',
  name: 'Mine Rush',
  tagline: 'Clear chambers for personal milestones · soft league for flavour',
  milestones: EVENT_MILESTONES,
  league: ['Crystal Elite', 'Vein Patrol', 'Prospectors'],
};

let activeEvent: EventThemeCatalog = DEFAULT_EVENT;

/** Theme packs call at boot so event copy/id never collides across products. */
export function installEventTheme(catalog: EventThemeCatalog): void {
  activeEvent = {
    idPrefix: catalog.idPrefix || DEFAULT_EVENT.idPrefix,
    name: catalog.name || DEFAULT_EVENT.name,
    tagline: catalog.tagline || DEFAULT_EVENT.tagline,
    milestones: catalog.milestones?.length ? catalog.milestones : DEFAULT_EVENT.milestones,
    league: catalog.league ?? DEFAULT_EVENT.league,
  };
}

export function getEventMilestones(): readonly EventMilestone[] {
  return activeEvent.milestones;
}

export interface HybridEventPersist {
  readonly id: string;
  readonly endsAt: number;
  readonly personal: number;
  readonly claimed: readonly number[];
}

export interface HybridEventSnapshot {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly endsAt: number;
  readonly msLeft: number;
  readonly personal: number;
  readonly claimed: readonly number[];
  readonly nextMilestone: EventMilestone | null;
  readonly milestones: readonly (EventMilestone & { readonly done: boolean; readonly claimed: boolean })[];
  /** Simulated league rank 1–50 (lower is better). Cosmetic. */
  readonly leagueRank: number;
  readonly leagueLabel: string;
}

const MS_DAY = 86_400_000;

/** Weekly event id from install-agnostic week bucket. */
export function eventIdFor(now: number): string {
  const week = Math.floor(now / (7 * MS_DAY));
  return `${activeEvent.idPrefix}-${week}`;
}

export function emptyEventPersist(now: number): HybridEventPersist {
  const id = eventIdFor(now);
  return {
    id,
    endsAt: (Math.floor(now / (7 * MS_DAY)) + 1) * 7 * MS_DAY,
    personal: 0,
    claimed: [],
  };
}

export function parseEventPersist(raw: unknown, now: number): HybridEventPersist {
  if (!raw || typeof raw !== 'object') return emptyEventPersist(now);
  const o = raw as Record<string, unknown>;
  const id = typeof o['id'] === 'string' ? o['id'] : eventIdFor(now);
  // Rollover if week changed
  if (id !== eventIdFor(now)) return emptyEventPersist(now);
  const claimed = Array.isArray(o['claimed'])
    ? (o['claimed'] as unknown[]).map((n) => Math.floor(Number(n) || 0)).filter((n) => n > 0)
    : [];
  return {
    id,
    endsAt: Math.max(now, Math.floor(Number(o['endsAt']) || emptyEventPersist(now).endsAt)),
    personal: Math.max(0, Math.floor(Number(o['personal']) || 0)),
    claimed,
  };
}

export class HybridEventModel {
  private id: string;
  private endsAt: number;
  private personal: number;
  private claimed: Set<number>;

  constructor(snap: HybridEventPersist) {
    this.id = snap.id;
    this.endsAt = snap.endsAt;
    this.personal = snap.personal;
    this.claimed = new Set(snap.claimed);
  }

  get serialized(): HybridEventPersist {
    return {
      id: this.id,
      endsAt: this.endsAt,
      personal: this.personal,
      claimed: [...this.claimed],
    };
  }

  /** Ensure current week event is active. */
  roll(now: number): void {
    const want = eventIdFor(now);
    if (this.id !== want) {
      const fresh = emptyEventPersist(now);
      this.id = fresh.id;
      this.endsAt = fresh.endsAt;
      this.personal = 0;
      this.claimed = new Set();
    }
  }

  /** Points from a clear (stars + win). */
  addWin(stars: number): void {
    this.personal += 1 + Math.max(0, Math.min(3, stars));
  }

  /**
   * Claim all unclaimed milestones the player has reached.
   * Returns total essence/shards granted.
   */
  claimDue(): { essence: number; shards: number; labels: string[] } {
    let essence = 0;
    let shards = 0;
    const labels: string[] = [];
    for (const m of activeEvent.milestones) {
      if (this.personal >= m.at && !this.claimed.has(m.at)) {
        this.claimed.add(m.at);
        essence += m.essence;
        shards += m.shards;
        labels.push(m.label);
      }
    }
    return { essence, shards, labels };
  }

  snapshot(now: number): HybridEventSnapshot {
    this.roll(now);
    const catalog = activeEvent.milestones;
    const milestones = catalog.map((m) => ({
      ...m,
      done: this.personal >= m.at,
      claimed: this.claimed.has(m.at),
    }));
    const next = catalog.find((m) => this.personal < m.at) ?? null;
    // Soft league: better personal → better rank; never zero-sum punish
    const leagueRank = Math.max(1, Math.min(50, 48 - Math.floor(this.personal * 1.4)));
    const [elite, mid, casual] = activeEvent.league;
    const leagueLabel = leagueRank <= 5 ? elite : leagueRank <= 15 ? mid : casual;
    return {
      id: this.id,
      name: activeEvent.name,
      tagline: activeEvent.tagline,
      endsAt: this.endsAt,
      msLeft: Math.max(0, this.endsAt - now),
      personal: this.personal,
      claimed: [...this.claimed],
      nextMilestone: next,
      milestones,
      leagueRank,
      leagueLabel,
    };
  }
}
