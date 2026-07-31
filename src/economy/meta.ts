/**
 * CRYSTALLINE — meta progression (Playrix-style dual loop).
 *
 * Match-3 is the core. The **Crystal Cavern** is the long-term visual reward:
 * wins mint *essence*; essence furnishes chambers of a living mine.
 *
 * Pure model — no DOM. Persistence is a flat snapshot on EconomyAux.
 */

export type CavernStageId = 1 | 2 | 3 | 4;

export interface MetaUpgrade {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  /** Soft-currency cost (essence). */
  readonly cost: number;
  readonly stage: CavernStageId;
  /** Fallback glyph if art fails to load. */
  readonly glyph: string;
  /** Path under site root, e.g. `cavern/icons/s1_lamp.webp`. */
  readonly art: string;
  /** Order within stage (lower first). */
  readonly order: number;
}

export interface MetaStage {
  readonly id: CavernStageId;
  readonly name: string;
  readonly tagline: string;
  /** Wide vista for the cavern hub. */
  readonly art: string;
}

export const META_STAGES: readonly MetaStage[] = [
  {
    id: 1,
    name: 'Mouth of the Mine',
    tagline: 'Light the first crystal and claim the entrance.',
    art: 'cavern/stages/stage1.webp',
  },
  {
    id: 2,
    name: 'Prism Gallery',
    tagline: 'Power crystals hum in the middle halls.',
    art: 'cavern/stages/stage2.webp',
  },
  {
    id: 3,
    name: 'Living Core Vault',
    tagline: 'Where the mountain still remembers.',
    art: 'cavern/stages/stage3.webp',
  },
  {
    id: 4,
    name: 'Deep Geode',
    tagline: 'A chamber only the stubborn reach.',
    art: 'cavern/stages/stage4.webp',
  },
];

const icon = (file: string) => `cavern/icons/${file}.webp`;

/**
 * Furnishing catalogue. Costs ramp so early wins feel generous and later
 * purchases ask for multi-level star farming (research retention shape).
 */
export const META_UPGRADES: readonly MetaUpgrade[] = [
  // Stage 1
  {
    id: 's1.lamp',
    name: 'Crystal Lamp',
    blurb: 'A soft blue lantern for the entrance arch.',
    cost: 40,
    stage: 1,
    glyph: '✦',
    art: icon('s1_lamp'),
    order: 1,
  },
  {
    id: 's1.vein',
    name: 'Surface Vein',
    blurb: 'Expose a glitter of raw gem in the rock face.',
    cost: 60,
    stage: 1,
    glyph: '◇',
    art: icon('s1_vein'),
    order: 2,
  },
  {
    id: 's1.cart',
    name: 'Ore Cart',
    blurb: 'A wooden cart parked by the rails — progress you can see.',
    cost: 80,
    stage: 1,
    glyph: '▣',
    art: icon('s1_cart'),
    order: 3,
  },
  {
    id: 's1.banner',
    name: 'Guild Banner',
    blurb: 'Your claim mark hangs over the mouth of the mine.',
    cost: 100,
    stage: 1,
    glyph: '⚑',
    art: icon('s1_banner'),
    order: 4,
  },
  // Stage 2
  {
    id: 's2.prism',
    name: 'Prism Pedestal',
    blurb: 'A resting place for the first Power Crystal.',
    cost: 140,
    stage: 2,
    glyph: '◆',
    art: icon('s2_prism'),
    order: 1,
  },
  {
    id: 's2.pool',
    name: 'Mirror Pool',
    blurb: 'Still water that doubles every glow.',
    cost: 160,
    stage: 2,
    glyph: '○',
    art: icon('s2_pool'),
    order: 2,
  },
  {
    id: 's2.arch',
    name: 'Faceted Arch',
    blurb: 'A cut-stone passage into the gallery.',
    cost: 180,
    stage: 2,
    glyph: '⌂',
    art: icon('s2_arch'),
    order: 3,
  },
  {
    id: 's2.chorus',
    name: 'Resonance Chimes',
    blurb: 'Soft tones when a cascade hits above.',
    cost: 200,
    stage: 2,
    glyph: '♪',
    art: icon('s2_chorus'),
    order: 4,
  },
  // Stage 3
  {
    id: 's3.core',
    name: 'Core Cradle',
    blurb: 'A spinning Living Core sits in the vault.',
    cost: 260,
    stage: 3,
    glyph: '◎',
    art: icon('s3_core'),
    order: 1,
  },
  {
    id: 's3.veins',
    name: 'Deep Vein Network',
    blurb: 'Glowing seams crawl across the walls.',
    cost: 280,
    stage: 3,
    glyph: '≡',
    art: icon('s3_veins'),
    order: 2,
  },
  {
    id: 's3.altar',
    name: 'Supernova Altar',
    blurb: 'Where six-match storms are remembered.',
    cost: 300,
    stage: 3,
    glyph: '✶',
    art: icon('s3_altar'),
    order: 3,
  },
  {
    id: 's3.guardian',
    name: 'Stone Guardian',
    blurb: 'A silent watcher carved from basalt.',
    cost: 320,
    stage: 3,
    glyph: '♜',
    art: icon('s3_guardian'),
    order: 4,
  },
  // Stage 4
  {
    id: 's4.geode',
    name: 'Heart Geode',
    blurb: 'Crack the deep geode — rainbow light spills out.',
    cost: 400,
    stage: 4,
    glyph: '❋',
    art: icon('s4_geode'),
    order: 1,
  },
  {
    id: 's4.throne',
    name: 'Crystal Throne',
    blurb: 'A seat for the one who finished the saga.',
    cost: 450,
    stage: 4,
    glyph: '♛',
    art: icon('s4_throne'),
    order: 2,
  },
  {
    id: 's4.sky',
    name: 'Starfall Dome',
    blurb: 'The ceiling opens to a false night of sparks.',
    cost: 500,
    stage: 4,
    glyph: '✧',
    art: icon('s4_sky'),
    order: 3,
  },
];

export interface MetaSnapshot {
  readonly essence: number;
  readonly owned: readonly string[];
  readonly totalSpent: number;
  /** Highest stage with every upgrade owned (0 if none complete). */
  readonly stagesComplete: number;
  readonly nextAffordable: MetaUpgrade | null;
  readonly ownedCount: number;
  readonly totalCount: number;
}

export interface MetaPersist {
  readonly essence: number;
  readonly owned: readonly string[];
  readonly totalSpent: number;
}

export type MetaBuyResult =
  | { readonly ok: true; readonly upgrade: MetaUpgrade; readonly essence: number }
  | { readonly ok: false; readonly reason: 'unknown' | 'owned' | 'insufficient' | 'stageLocked' };

/** Essence granted on a clear. First-time stars pay more than replays. */
export function essenceForWin(opts: {
  stars: number;
  /** New stars earned this clear (0–3). */
  newStars: number;
  levelId: number;
}): number {
  const stars = Math.max(0, Math.min(3, Math.floor(opts.stars)));
  const fresh = Math.max(0, Math.min(3, Math.floor(opts.newStars)));
  const base = 25 + Math.min(20, opts.levelId); // deeper chambers pay a little more
  const starBonus = stars * 12;
  const discovery = fresh * 18; // first-time ★★★ is a big meta drip
  return base + starBonus + discovery;
}

export class MetaModel {
  private essence: number;
  private owned: Set<string>;
  private totalSpent: number;

  constructor(snap?: Partial<MetaPersist>) {
    this.essence = Math.max(0, Math.floor(snap?.essence ?? 0));
    this.owned = new Set((snap?.owned ?? []).filter((id) => META_UPGRADES.some((u) => u.id === id)));
    this.totalSpent = Math.max(0, Math.floor(snap?.totalSpent ?? 0));
  }

  get serialized(): MetaPersist {
    return {
      essence: this.essence,
      owned: [...this.owned],
      totalSpent: this.totalSpent,
    };
  }

  /** Stage is unlocked when previous stage is fully furnished (stage 1 always open). */
  stageUnlocked(stage: CavernStageId): boolean {
    if (stage === 1) return true;
    const prev = (stage - 1) as CavernStageId;
    return this.stageComplete(prev);
  }

  stageComplete(stage: CavernStageId): boolean {
    const need = META_UPGRADES.filter((u) => u.stage === stage);
    return need.every((u) => this.owned.has(u.id));
  }

  grantEssence(amount: number): number {
    const n = Math.max(0, Math.floor(amount));
    this.essence += n;
    return this.essence;
  }

  buy(id: string): MetaBuyResult {
    const upgrade = META_UPGRADES.find((u) => u.id === id);
    if (!upgrade) return { ok: false, reason: 'unknown' };
    if (this.owned.has(id)) return { ok: false, reason: 'owned' };
    if (!this.stageUnlocked(upgrade.stage)) return { ok: false, reason: 'stageLocked' };
    if (this.essence < upgrade.cost) return { ok: false, reason: 'insufficient' };
    this.essence -= upgrade.cost;
    this.totalSpent += upgrade.cost;
    this.owned.add(id);
    return { ok: true, upgrade, essence: this.essence };
  }

  snapshot(): MetaSnapshot {
    let stagesComplete = 0;
    for (const s of META_STAGES) {
      if (this.stageComplete(s.id)) stagesComplete = s.id;
      else break;
    }
    const nextAffordable =
      META_UPGRADES.filter(
        (u) =>
          !this.owned.has(u.id) &&
          this.stageUnlocked(u.stage) &&
          this.essence >= u.cost,
      ).sort((a, b) => a.cost - b.cost || a.order - b.order)[0] ?? null;

    return {
      essence: this.essence,
      owned: [...this.owned],
      totalSpent: this.totalSpent,
      stagesComplete,
      nextAffordable,
      ownedCount: this.owned.size,
      totalCount: META_UPGRADES.length,
    };
  }

  upgradesForStage(stage: CavernStageId): readonly MetaUpgrade[] {
    return META_UPGRADES.filter((u) => u.stage === stage).sort((a, b) => a.order - b.order);
  }

  owns(id: string): boolean {
    return this.owned.has(id);
  }
}
