/**
 * Theme pack contract — one engine, many product skins.
 *
 * Crystalline is the default pack. Harbor (and later Bakery / Library) supply
 * copy, asset roots, meta catalogues, and palette only. Engine rules stay shared.
 */

import type { CrystalColor } from '@engine/types';
import type { PowerKind } from '@engine/specials';
import type { AlbumCardDef } from '@economy/album';
import type { EventMilestone } from '@economy/hybridEvent';
import type { MetaStage, MetaUpgrade } from '@economy/meta';
import type { SkuId } from '@economy/api';
import type { CompanionBeat } from '../narrative/companion';

export type ThemeId = 'crystalline' | 'harbor';

/** Soft league tiers: elite (rank ≤5), mid (≤15), casual (else). */
export type LeagueTiers = readonly [string, string, string];

export interface EventTheme {
  /** Prefix for weekly event ids, e.g. `mine-rush` or `tide-rush`. */
  readonly idPrefix: string;
  readonly name: string;
  readonly tagline: string;
  readonly milestones: readonly EventMilestone[];
  readonly league: LeagueTiers;
}

export interface PlaceCeremonyTheme {
  /** Optional video under public/; if empty, ceremony uses stage still only. */
  readonly webm: string;
  readonly mp4: string;
  readonly caption: string;
}

export interface CompanionTheme {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly art: string;
  readonly lines: Readonly<Record<CompanionBeat, readonly string[]>>;
}

export interface MapChapter {
  readonly roman: string;
  readonly title: string;
  readonly depth: string;
  readonly minId: number;
  readonly maxId: number;
}

export interface ThemeConfig {
  readonly id: ThemeId;
  readonly productName: string;
  readonly tagline: string;
  readonly storagePrefix: string;
  readonly saveKey: string;
  readonly ahaKey: string;
  readonly adShortKey: string;
  /** Soft meta currency label (Essence / Tideglass). */
  readonly softCurrencyName: string;
  /** Soft currency glyph for toasts. */
  readonly softCurrencyGlyph: string;
  readonly premiumCurrencyName: string;
  readonly metaHubName: string;
  readonly metaHubCta: string;
  /** Prefix under public/ for themed art; empty = crystalline root paths. */
  readonly assetRoot: string;
  readonly bgPath: string;
  readonly genManifestPath: string;
  readonly albumSheet: string;
  readonly livingCorePath: string;
  readonly companion: CompanionTheme;
  readonly metaStages: readonly MetaStage[];
  readonly metaUpgrades: readonly MetaUpgrade[];
  readonly albumCards: readonly AlbumCardDef[];
  readonly mapChapters: readonly MapChapter[];
  readonly storeCopy: Partial<
    Record<SkuId, { readonly name: string; readonly blurb: string }>
  >;
  readonly palette: Readonly<Record<CrystalColor, string>>;
  /** Player-facing labels (UI chrome). */
  readonly labels: Readonly<Record<string, string>>;
  /** CSS custom properties applied to :root / #app. */
  readonly cssVars: Readonly<Record<string, string>>;
  /** Variable-reward post-win beat name. */
  readonly bonusCrackName: string;
  /**
   * Art for the three sealed bonus-crack picks (geode / chest).
   * Site-relative path under public/; shown instead of glyph pips.
   */
  readonly bonusCrackArt: string;
  readonly versionLabel: string;
  /** Match-4 / L-T / 5 / 6+ special names. */
  readonly powerNames: Readonly<Record<PowerKind, string>>;
  /**
   * Combo labels keyed as `line+burst` (sorted by power rank low→high).
   * Missing keys fall back to crystalline defaults in the engine installer.
   */
  readonly comboLabels: Readonly<Record<string, string>>;
  readonly event: EventTheme;
  readonly placeCeremony: PlaceCeremonyTheme;
}
