/**
 * Endless Album — infinitely repeatable collection (live-ops retention).
 *
 * Completing a page grants a reward and rolls into the next cycle with
 * higher duplicate targets so content never “ends.” Pure model.
 */

export interface AlbumCardDef {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly blurb: string;
}

/** Fixed catalogue — cycles only raise `need`, never require new art packs. */
export const ALBUM_CARDS: readonly AlbumCardDef[] = [
  { id: 'ember', name: 'Ember Shard', glyph: '◆', blurb: 'Warm crystal common in the mouth of the mine.' },
  { id: 'aqua', name: 'Aqua Facet', glyph: '◇', blurb: 'Cool blue cut from prism galleries.' },
  { id: 'jade', name: 'Jade Vein', glyph: '✦', blurb: 'Soft green seam under the rails.' },
  { id: 'violet', name: 'Violet Core', glyph: '❖', blurb: 'Deep hue from living vaults.' },
  { id: 'solar', name: 'Solar Chip', glyph: '★', blurb: 'Gold fleck that catches lamp-light.' },
  { id: 'line', name: 'Line Crystal', glyph: '═', blurb: 'Forged when four align true.' },
  { id: 'burst', name: 'Geode Burst', glyph: '◎', blurb: 'L/T power stamp for the album.' },
  { id: 'prism', name: 'Opal Prism', glyph: '⬠', blurb: 'Five-match rainbow seal.' },
  { id: 'warden', name: 'Warden Token', glyph: '⛏', blurb: 'A mark from the Geode Warden.' },
] as const;

export interface AlbumSlotView {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly blurb: string;
  readonly count: number;
  readonly need: number;
  readonly complete: boolean;
}

export interface AlbumSnapshot {
  readonly cycle: number;
  readonly slots: readonly AlbumSlotView[];
  readonly completeCount: number;
  readonly totalSlots: number;
  readonly pct: number;
  readonly pageComplete: boolean;
  /** Essence awarded when the last open page was completed (UI toast). */
  readonly lastPageReward: number;
}

export interface AlbumPersist {
  readonly cycle: number;
  readonly counts: Readonly<Record<string, number>>;
  readonly lastPageReward: number;
}

export function needForCycle(cycle: number): number {
  return 1 + Math.max(0, Math.floor(cycle));
}

export function emptyAlbumPersist(): AlbumPersist {
  return { cycle: 0, counts: {}, lastPageReward: 0 };
}

export function parseAlbumPersist(raw: unknown): AlbumPersist {
  if (!raw || typeof raw !== 'object') return emptyAlbumPersist();
  const o = raw as Record<string, unknown>;
  const cycle = Math.max(0, Math.floor(Number(o['cycle']) || 0));
  const counts: Record<string, number> = {};
  const c = o['counts'];
  if (c && typeof c === 'object') {
    for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n > 0) counts[k] = n;
    }
  }
  return {
    cycle,
    counts,
    lastPageReward: Math.max(0, Math.floor(Number(o['lastPageReward']) || 0)),
  };
}

export class AlbumModel {
  private cycle: number;
  private counts: Map<string, number>;
  private lastPageReward: number;

  constructor(snap?: Partial<AlbumPersist>) {
    this.cycle = Math.max(0, Math.floor(snap?.cycle ?? 0));
    this.counts = new Map(Object.entries(snap?.counts ?? {}));
    this.lastPageReward = Math.max(0, Math.floor(snap?.lastPageReward ?? 0));
  }

  get serialized(): AlbumPersist {
    return {
      cycle: this.cycle,
      counts: Object.fromEntries(this.counts),
      lastPageReward: this.lastPageReward,
    };
  }

  private need(): number {
    return needForCycle(this.cycle);
  }

  snapshot(): AlbumSnapshot {
    const need = this.need();
    const slots: AlbumSlotView[] = ALBUM_CARDS.map((c) => {
      const count = this.counts.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        glyph: c.glyph,
        blurb: c.blurb,
        count,
        need,
        complete: count >= need,
      };
    });
    const completeCount = slots.filter((s) => s.complete).length;
    const totalSlots = slots.length;
    return {
      cycle: this.cycle,
      slots,
      completeCount,
      totalSlots,
      pct: Math.floor((completeCount / Math.max(1, totalSlots)) * 100),
      pageComplete: completeCount >= totalSlots,
      lastPageReward: this.lastPageReward,
    };
  }

  /**
   * Grant sticker packs from a clear. Stars and deeper levels yield more pulls.
   * Returns granted card ids (for UI). May complete a page → roll cycle.
   */
  grantFromWin(opts: {
    stars: number;
    levelId: number;
    /** Simple rng 0..1 */
    rand: () => number;
  }): { granted: readonly string[]; pageReward: number } {
    const pulls = 1 + Math.min(3, Math.max(0, opts.stars)) + (opts.levelId >= 20 ? 1 : 0);
    const granted: string[] = [];
    for (let i = 0; i < pulls; i++) {
      const card = ALBUM_CARDS[Math.floor(opts.rand() * ALBUM_CARDS.length)]!;
      this.counts.set(card.id, (this.counts.get(card.id) ?? 0) + 1);
      granted.push(card.id);
    }
    let pageReward = 0;
    if (this.snapshot().pageComplete) {
      pageReward = 40 + this.cycle * 15;
      this.lastPageReward = pageReward;
      // Roll next endless page — keep overflow counts so duplicates feel valuable
      this.cycle += 1;
      const need = this.need();
      for (const c of ALBUM_CARDS) {
        const have = this.counts.get(c.id) ?? 0;
        // Spend `previous need` worth, keep surplus into the new cycle
        const prevNeed = needForCycle(this.cycle - 1);
        this.counts.set(c.id, Math.max(0, have - prevNeed));
      }
      void need;
    }
    return { granted, pageReward };
  }
}
