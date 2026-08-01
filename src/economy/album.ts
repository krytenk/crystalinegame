/**
 * Endless Album — infinitely repeatable collection (live-ops retention).
 *
 * Completing a page grants a reward and rolls into the next cycle with
 * higher duplicate targets so content never “ends.” Pure model.
 */

export type AlbumRarity = 'common' | 'uncommon' | 'rare';

/** Sprite rect inside `gen/crystals@1x.webp` (1024×640, 128px cells). */
export interface AlbumAtlasFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface AlbumCardDef {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly blurb: string;
  readonly rarity: AlbumRarity;
  /** Relative weight in the drop table (before star bias). */
  readonly weight: number;
  /** Real crystal atlas frame — album shards are the same gems as the board. */
  readonly atlas: AlbumAtlasFrame;
  /** CSS glow / rim colour for the living shard stage. */
  readonly glow: string;
  readonly glowSoft: string;
}

/** Fixed catalogue — cycles only raise `need`, never require new art packs. */
export const ALBUM_SHEET = 'gen/crystals@1x.webp';
/** Sheet pixel size for CSS background-size. */
export const ALBUM_SHEET_SIZE = { w: 1024, h: 640 } as const;
export const ALBUM_FRAME = 128;

const F = (x: number, y: number): AlbumAtlasFrame => ({
  x,
  y,
  w: ALBUM_FRAME,
  h: ALBUM_FRAME,
});

export const ALBUM_CARDS: readonly AlbumCardDef[] = [
  {
    id: 'ember',
    name: 'Ember Shard',
    glyph: '◆',
    blurb: 'Warm crystal common in the mouth of the mine.',
    rarity: 'common',
    weight: 28,
    atlas: F(0, 0),
    glow: '#ff6a3a',
    glowSoft: 'rgba(255, 100, 50, 0.55)',
  },
  {
    id: 'aqua',
    name: 'Tidal Facet',
    glyph: '◇',
    blurb: 'Cool blue cut from prism galleries.',
    rarity: 'common',
    weight: 26,
    atlas: F(512, 256),
    glow: '#3ec8ff',
    glowSoft: 'rgba(60, 200, 255, 0.55)',
  },
  {
    id: 'jade',
    name: 'Verdant Shard',
    glyph: '✦',
    blurb: 'Soft green seam under the rails.',
    rarity: 'common',
    weight: 24,
    atlas: F(896, 128),
    glow: '#4dde8a',
    glowSoft: 'rgba(70, 220, 130, 0.5)',
  },
  {
    id: 'violet',
    name: 'Void Facet',
    glyph: '❖',
    blurb: 'Deep hue from living vaults.',
    rarity: 'uncommon',
    weight: 14,
    atlas: F(128, 384),
    glow: '#b06aff',
    glowSoft: 'rgba(170, 100, 255, 0.55)',
  },
  {
    id: 'solar',
    name: 'Solar Chip',
    glyph: '★',
    blurb: 'Gold fleck that catches lamp-light.',
    rarity: 'uncommon',
    weight: 12,
    atlas: F(256, 128),
    glow: '#ffd24a',
    glowSoft: 'rgba(255, 210, 70, 0.55)',
  },
  {
    id: 'line',
    name: 'Line Crystal',
    glyph: '═',
    blurb: 'Forged when four align true.',
    rarity: 'uncommon',
    weight: 10,
    atlas: F(128, 0),
    glow: '#ff8a60',
    glowSoft: 'rgba(255, 130, 90, 0.5)',
  },
  {
    id: 'burst',
    name: 'Geode Burst',
    glyph: '◎',
    blurb: 'L/T power stamp for the album.',
    rarity: 'rare',
    weight: 5,
    atlas: F(0, 128),
    glow: '#ffc060',
    glowSoft: 'rgba(255, 190, 90, 0.65)',
  },
  {
    id: 'prism',
    name: 'Opal Prism',
    glyph: '⬠',
    blurb: 'Five-match rainbow seal.',
    rarity: 'rare',
    weight: 4,
    atlas: F(768, 384),
    glow: '#e0b0ff',
    glowSoft: 'rgba(220, 170, 255, 0.65)',
  },
  {
    id: 'warden',
    name: 'Warden Core',
    glyph: '⛏',
    blurb: 'A spinning seal from the Geode Warden.',
    rarity: 'rare',
    weight: 3,
    // prism cell as stand-in; stage also uses living_core img when present
    atlas: F(768, 384),
    glow: '#ffe56a',
    glowSoft: 'rgba(255, 230, 100, 0.7)',
  },
] as const;

/** Active sheet + cards (theme packs may replace at boot). */
let activeSheet = ALBUM_SHEET;
let activeCards: readonly AlbumCardDef[] = ALBUM_CARDS;
let byId = new Map(ALBUM_CARDS.map((c) => [c.id, c]));

export function installAlbumTheme(sheet: string, cards: readonly AlbumCardDef[]): void {
  activeSheet = sheet;
  activeCards = cards;
  byId = new Map(cards.map((c) => [c.id, c]));
}

export function getAlbumSheet(): string {
  return activeSheet;
}

export function getAlbumCards(): readonly AlbumCardDef[] {
  return activeCards;
}

export function albumCard(id: string): AlbumCardDef | undefined {
  return byId.get(id);
}

/** Weighted pick; stars and deep levels bias toward uncommon/rare. */
export function pickAlbumCard(rand: () => number, stars: number, levelId: number): AlbumCardDef {
  const rareBoost = 1 + Math.min(3, stars) * 0.35 + (levelId >= 20 ? 0.4 : levelId >= 11 ? 0.15 : 0);
  const weights = activeCards.map((c) => {
    if (c.rarity === 'common') return c.weight;
    if (c.rarity === 'uncommon') return c.weight * (1 + rareBoost * 0.5);
    return c.weight * rareBoost;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < activeCards.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return activeCards[i]!;
  }
  return activeCards[activeCards.length - 1]!;
}

export interface AlbumSlotView {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly blurb: string;
  readonly rarity: AlbumRarity;
  readonly count: number;
  readonly need: number;
  readonly complete: boolean;
  readonly atlas: AlbumAtlasFrame;
  readonly glow: string;
  readonly glowSoft: string;
}

export interface AlbumGrant {
  readonly id: string;
  readonly rarity: AlbumRarity;
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
    const slots: AlbumSlotView[] = activeCards.map((c) => {
      const count = this.counts.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        glyph: c.glyph,
        blurb: c.blurb,
        rarity: c.rarity,
        count,
        need,
        complete: count >= need,
        atlas: c.atlas,
        glow: c.glow,
        glowSoft: c.glowSoft,
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
  }): { granted: readonly AlbumGrant[]; pageReward: number; rareCount: number } {
    const pulls = 1 + Math.min(3, Math.max(0, opts.stars)) + (opts.levelId >= 20 ? 1 : 0);
    const granted: AlbumGrant[] = [];
    let rareCount = 0;
    for (let i = 0; i < pulls; i++) {
      const card = pickAlbumCard(opts.rand, opts.stars, opts.levelId);
      this.counts.set(card.id, (this.counts.get(card.id) ?? 0) + 1);
      granted.push({ id: card.id, rarity: card.rarity });
      if (card.rarity === 'rare') rareCount += 1;
    }
    let pageReward = 0;
    if (this.snapshot().pageComplete) {
      pageReward = 40 + this.cycle * 15;
      this.lastPageReward = pageReward;
      // Roll next endless page — keep overflow counts so duplicates feel valuable
      this.cycle += 1;
      for (const c of activeCards) {
        const have = this.counts.get(c.id) ?? 0;
        // Spend `previous need` worth, keep surplus into the new cycle
        const prevNeed = needForCycle(this.cycle - 1);
        this.counts.set(c.id, Math.max(0, have - prevNeed));
      }
    }
    return { granted, pageReward, rareCount };
  }
}
