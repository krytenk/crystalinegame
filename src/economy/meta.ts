/**
 * CRYSTALLINE — meta progression (Playrix-style dual loop).
 *
 * Match-3 is the core. The **Crystal Cavern** is the long-term visual reward:
 * wins mint *essence*; essence furnishes chambers of a living mine.
 *
 * Pure model — no DOM. Persistence is a flat snapshot on EconomyAux.
 */

/** Stage ids — 1–4 classic cavern; 5–8 Act I-C Under-Crown (pairs with L151–300). */
export type CavernStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
  /**
   * Placement on the stage vista (% left / % top of the vista box).
   * Used to “live-furnish” the mine instead of only listing icons.
   */
  readonly place: { readonly left: number; readonly top: number; readonly scale?: number };
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
  // Act I-C Under-Crown
  {
    id: 5,
    name: 'Under-Crown',
    tagline: 'Where the mountain starts answering back.',
    art: 'cavern/stages/stage5.webp',
  },
  {
    id: 6,
    name: 'Spire Answer',
    tagline: 'The mountain’s first clear reply.',
    art: 'cavern/stages/stage6.webp',
  },
  {
    id: 7,
    name: 'Black Heartwalk',
    tagline: 'Deeper corridors where dual threats never sleep.',
    art: 'cavern/stages/stage7.webp',
  },
  {
    id: 8,
    name: 'Under-Crown Seal',
    tagline: 'Act I close — the living mine rests, for now.',
    art: 'cavern/stages/stage8.webp',
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
    place: { left: 14, top: 18, scale: 0.95 },
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
    place: { left: 72, top: 28, scale: 1.05 },
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
    place: { left: 38, top: 58, scale: 1.1 },
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
    place: { left: 78, top: 12, scale: 0.9 },
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
    place: { left: 44, top: 42, scale: 1.05 },
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
    place: { left: 18, top: 62, scale: 1 },
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
    place: { left: 62, top: 22, scale: 1.15 },
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
    place: { left: 12, top: 16, scale: 0.9 },
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
    place: { left: 42, top: 38, scale: 1.1 },
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
    place: { left: 70, top: 24, scale: 1 },
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
    place: { left: 20, top: 48, scale: 1 },
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
    place: { left: 76, top: 50, scale: 1.05 },
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
    place: { left: 40, top: 40, scale: 1.15 },
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
    place: { left: 16, top: 52, scale: 1.05 },
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
    place: { left: 68, top: 14, scale: 1.1 },
  },
  // Stage 5 — Under-Crown
  {
    id: 's5.lantern',
    name: 'Fault Lantern',
    blurb: 'A crystal lamp that hums when the belt forges power.',
    cost: 560,
    stage: 5,
    glyph: '✦',
    art: icon('s5_lantern'),
    order: 1,
    place: { left: 22, top: 28, scale: 1 },
  },
  {
    id: 's5.vein',
    name: 'Echo Vein',
    blurb: 'A teal-purple seam that answers every cascade.',
    cost: 600,
    stage: 5,
    glyph: '◇',
    art: icon('s5_vein'),
    order: 2,
    place: { left: 68, top: 36, scale: 1.05 },
  },
  {
    id: 's5.fault',
    name: 'Glass Fault',
    blurb: 'A cracked prism standing where light splits twice.',
    cost: 640,
    stage: 5,
    glyph: '⬠',
    art: icon('s5_fault'),
    order: 3,
    place: { left: 42, top: 58, scale: 1 },
  },
  {
    id: 's5.seal',
    name: 'Under-Crown Seal',
    blurb: 'The mountain’s mark — you have been noticed.',
    cost: 700,
    stage: 5,
    glyph: '◎',
    art: icon('s5_seal'),
    order: 4,
    place: { left: 78, top: 55, scale: 1.1 },
  },
  // Stage 6 — Regent Peak Close
  {
    id: 's6.heart',
    name: 'Living Answer',
    blurb: 'A heart of facets that beats with every Supernova forge.',
    cost: 780,
    stage: 6,
    glyph: '❋',
    art: icon('s6_heart'),
    order: 1,
    place: { left: 48, top: 42, scale: 1.15 },
  },
  {
    id: 's6.voice',
    name: 'Mountain Voice',
    blurb: 'Resonance crystal that sings on three-star clears.',
    cost: 840,
    stage: 6,
    glyph: '♪',
    art: icon('s6_voice'),
    order: 2,
    place: { left: 18, top: 50, scale: 1 },
  },
  {
    id: 's6.crown',
    name: 'Regent Crown',
    blurb: 'Gold and amethyst for the one who finished Act I.',
    cost: 900,
    stage: 6,
    glyph: '♛',
    art: icon('s6_crown'),
    order: 3,
    place: { left: 72, top: 22, scale: 1.05 },
  },
  {
    id: 's6.close',
    name: 'Crown Close',
    blurb: 'Seal the first Under-Crown — the mountain still has more chambers.',
    cost: 1000,
    stage: 6,
    glyph: '✧',
    art: icon('s6_close'),
    order: 4,
    place: { left: 50, top: 70, scale: 1.1 },
  },
  // Stage 7 — Double Seam / Black Heartwalk (L211–250)
  {
    id: 's7.spire',
    name: 'Spire Answer',
    blurb: 'A living crystal that answers every Supernova forge.',
    cost: 1100,
    stage: 7,
    glyph: '✶',
    art: icon('s7_spire'),
    order: 1,
    place: { left: 40, top: 30, scale: 1.1 },
  },
  {
    id: 's7.seam',
    name: 'Double Seam',
    blurb: 'Twin veins that light when you clear dual goals.',
    cost: 1180,
    stage: 7,
    glyph: '≡',
    art: icon('s7_seam'),
    order: 2,
    place: { left: 70, top: 48, scale: 1 },
  },
  {
    id: 's7.gallery',
    name: 'Silent Gallery',
    blurb: 'A quiet hall for the mid-Under-Crown march.',
    cost: 1260,
    stage: 7,
    glyph: '⌂',
    art: icon('s7_gallery'),
    order: 3,
    place: { left: 22, top: 55, scale: 1.05 },
  },
  {
    id: 's7.heartwalk',
    name: 'Black Heartwalk',
    blurb: 'Obsidian steps deeper toward the regent crown.',
    cost: 1340,
    stage: 7,
    glyph: '◆',
    art: icon('s7_heartwalk'),
    order: 4,
    place: { left: 58, top: 68, scale: 1 },
  },
  // Stage 8 — Act I finale (L251–300)
  {
    id: 's8.answer',
    name: 'Living Answer',
    blurb: 'The mountain’s reply — facets that beat on perfect clears.',
    cost: 1480,
    stage: 8,
    glyph: '❋',
    art: icon('s8_answer'),
    order: 1,
    place: { left: 48, top: 36, scale: 1.15 },
  },
  {
    id: 's8.voice',
    name: 'Mountain Voice',
    blurb: 'Resonance crystal that sings through the last galleries.',
    cost: 1580,
    stage: 8,
    glyph: '♪',
    art: icon('s8_voice'),
    order: 2,
    place: { left: 18, top: 52, scale: 1 },
  },
  {
    id: 's8.regent',
    name: 'Regent Crown',
    blurb: 'Gold and amethyst for the one who finished Act I.',
    cost: 1700,
    stage: 8,
    glyph: '♛',
    art: icon('s8_regent'),
    order: 3,
    place: { left: 74, top: 24, scale: 1.08 },
  },
  {
    id: 's8.close',
    name: 'Under-Crown Seal',
    blurb: 'Close Act I — the mine rests until Phase 2.',
    cost: 1850,
    stage: 8,
    glyph: '✧',
    art: icon('s8_close'),
    order: 4,
    place: { left: 50, top: 72, scale: 1.12 },
  },
];

export interface MetaSnapshot {
  readonly essence: number;
  readonly owned: readonly string[];
  readonly totalSpent: number;
  /** Highest stage with every upgrade owned (0 if none complete). */
  readonly stagesComplete: number;
  readonly nextAffordable: MetaUpgrade | null;
  /** Cheapest unowned upgrade in the open stage (even if unaffordable). */
  readonly nextTarget: MetaUpgrade | null;
  readonly ownedCount: number;
  readonly totalCount: number;
  /** Owned upgrades in the active (open) stage for vista placement. */
  readonly activeStageOwned: readonly MetaUpgrade[];
  readonly activeStageId: CavernStageId;
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

/** Active catalogues (theme packs may replace at boot). Defaults = crystalline. */
let activeStages: readonly MetaStage[] = META_STAGES;
let activeUpgrades: readonly MetaUpgrade[] = META_UPGRADES;

export function installMetaTheme(
  stages: readonly MetaStage[],
  upgrades: readonly MetaUpgrade[],
): void {
  activeStages = stages;
  activeUpgrades = upgrades;
}

export function getMetaStages(): readonly MetaStage[] {
  return activeStages;
}

export function getMetaUpgrades(): readonly MetaUpgrade[] {
  return activeUpgrades;
}

export class MetaModel {
  private essence: number;
  private owned: Set<string>;
  private totalSpent: number;

  constructor(snap?: Partial<MetaPersist>) {
    this.essence = Math.max(0, Math.floor(snap?.essence ?? 0));
    this.owned = new Set((snap?.owned ?? []).filter((id) => activeUpgrades.some((u) => u.id === id)));
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
    const need = activeUpgrades.filter((u) => u.stage === stage);
    return need.every((u) => this.owned.has(u.id));
  }

  grantEssence(amount: number): number {
    const n = Math.max(0, Math.floor(amount));
    this.essence += n;
    return this.essence;
  }

  buy(id: string): MetaBuyResult {
    const upgrade = activeUpgrades.find((u) => u.id === id);
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
    for (const s of activeStages) {
      if (this.stageComplete(s.id)) stagesComplete = s.id;
      else break;
    }
    const maxStage = activeStages.reduce((m, s) => Math.max(m, s.id), 1);
    const activeStageId = Math.min(maxStage, Math.max(1, stagesComplete + 1)) as CavernStageId;
    const openUpgrades = activeUpgrades.filter(
      (u) => !this.owned.has(u.id) && this.stageUnlocked(u.stage),
    ).sort((a, b) => a.cost - b.cost || a.order - b.order);
    const nextAffordable = openUpgrades.find((u) => this.essence >= u.cost) ?? null;
    const nextTarget = openUpgrades[0] ?? null;
    const activeStageOwned = activeUpgrades.filter(
      (u) => u.stage === activeStageId && this.owned.has(u.id),
    );

    return {
      essence: this.essence,
      owned: [...this.owned],
      totalSpent: this.totalSpent,
      stagesComplete,
      nextAffordable,
      nextTarget,
      ownedCount: this.owned.size,
      totalCount: activeUpgrades.length,
      activeStageOwned,
      activeStageId,
    };
  }

  upgradesForStage(stage: CavernStageId): readonly MetaUpgrade[] {
    return activeUpgrades.filter((u) => u.stage === stage).sort((a, b) => a.order - b.order);
  }

  owns(id: string): boolean {
    return this.owned.has(id);
  }
}
