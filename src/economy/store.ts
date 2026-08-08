/**
 * CRYSTALLINE — the SKU catalogue and purchase flow.
 *
 * ===========================================================================
 *  SIMULATION ONLY. Prices are in fictional `credits`. There is no payment
 *  processor, no billing SDK, no IAP product ID, no receipt validation and no
 *  network call. Nothing in this file can charge anyone anything.
 * ===========================================================================
 *
 * The ladder below deliberately reproduces real free-to-play price laddering,
 * because the shape of the ladder *is* the finding the research doc reports.
 * Reading the ladder by unit price:
 *
 *   SKU              credits   shards   cr/shard   role
 *   shards.pocket        120       30      4.00     the anchor — worst value,
 *                                                   exists to make the next
 *                                                   tier look generous
 *   shards.hoard         600      200      3.00     "BEST VALUE" — a 25% saving
 *                                                   against an anchor nobody is
 *                                                   meant to buy
 *   shards.vault       2,400    1,000      2.40     "MOST POPULAR" — the whale
 *                                                   tier. The doc's figure is
 *                                                   that ~4% of players fund the
 *                                                   game, so the top of the
 *                                                   ladder is priced for them,
 *                                                   not for the median player
 *   bundle.starter       150      120      1.25     the loss leader. Better than
 *                                                   every other tier, one time
 *                                                   only, and it does not exist
 *                                                   until the player has failed
 *                                                   a level. Conversion, not
 *                                                   revenue: it is priced to buy
 *                                                   the *first* transaction,
 *                                                   after which the ladder above
 *                                                   is the real product
 *   lives.refill          90        —         —     sells past the 30-minute gate
 *   ads.remove           900        —         —     sells past the interstitials
 *
 * `bundle.starter` is timed to the pressure point the doc names: the moment
 * immediately after the first failure, when the level has just been lost and
 * the lives counter has just ticked down. That timing is the mechanism. It is
 * reproduced here so it can be observed in the Publisher Dashboard.
 */

import type { PurchaseResult, Sku, SkuId, Wallet } from './api';
import type { BoostersModel } from './boosters';
import type { LivesModel } from './lives';
import type { WalletModel } from './wallet';

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const CATALOGUE: readonly Sku[] = [
  {
    id: 'shards.pocket',
    name: 'Pocket Handful',
    blurb: 'A small pouch of crystal shards.',
    credits: 120,
    grantShards: 30,
  },
  {
    id: 'shards.hoard',
    name: "Prospector's Hoard",
    blurb: 'Five times the shards for five times the price — and then some.',
    credits: 600,
    grantShards: 200,
    tag: 'bestValue',
  },
  {
    id: 'shards.vault',
    name: 'Geode Vault',
    blurb: 'A thousand shards, plus a full set of boosters to get you moving.',
    credits: 2400,
    grantShards: 1000,
    grantBoosters: { seedPrism: 3, extraMoves: 3, pickaxe: 3, reshuffle: 3 },
    tag: 'mostPopular',
  },
  {
    id: 'bundle.starter',
    name: "First Fracture Bundle",
    blurb: 'One time only: shards, boosters and a full set of lives at a steep discount.',
    credits: 150,
    grantShards: 120,
    grantLives: 5,
    grantBoosters: { seedPrism: 1, extraMoves: 1, pickaxe: 2, reshuffle: 1 },
    tag: 'limited',
    unlock: 'firstFail',
    oneTime: true,
  },
  {
    id: 'lives.refill',
    name: 'Full Lives',
    blurb: 'Skip the wait. Back to five lives, right now.',
    credits: 90,
    grantLives: 5,
  },
  {
    id: 'ads.remove',
    name: 'Clear Skies',
    blurb: 'Permanently skips free-gift waits when they return (future ad-ready).',
    credits: 900,
    oneTime: true,
  },
  {
    id: 'ads.pass7',
    name: 'Clear Skies · 7 Days',
    blurb: 'Convenience: no free-gift prompts for a week. Stacks from purchase time.',
    credits: 180,
    grantAdsFreeDays: 7,
    tag: 'bestValue',
  },
  {
    id: 'ads.pass30',
    name: 'Clear Skies · 30 Days',
    blurb: 'Month of no free-gift prompts. No hard paywall.',
    credits: 420,
    grantAdsFreeDays: 30,
    tag: 'mostPopular',
  },
  {
    id: 'ease.comfort',
    name: 'Comfort Tools',
    blurb: 'Ease of play: longer auto-hints and one free reshuffle per level when stuck. No dark timers.',
    credits: 250,
    grantComfort: true,
    oneTime: true,
    tag: 'limited',
  },
] as const;

const BY_ID: ReadonlyMap<SkuId, Sku> = new Map(CATALOGUE.map((s) => [s.id, s]));

export const getSku = (id: SkuId): Sku | undefined => BY_ID.get(id);

/** Unit price in credits per shard — the ladder, made explicit for the dashboard. */
export function creditsPerShard(sku: Sku): number | null {
  if (!sku.grantShards || sku.grantShards <= 0) return null;
  return sku.credits / sku.grantShards;
}

// ---------------------------------------------------------------------------
// Purchase flow
// ---------------------------------------------------------------------------

export interface StoreDeps {
  readonly wallet: WalletModel;
  readonly lives: LivesModel;
  readonly boosters: BoostersModel;
  /** Has the player failed a level yet? Gates `unlock: 'firstFail'`. */
  readonly hasFirstFail: () => boolean;
  /** Timed ad-free pass (ethical convenience). */
  readonly grantAdsFreeDays?: (days: number) => void;
  /** Permanent ease-of-play comfort pack. */
  readonly grantComfort?: () => void;
  /** Fired after a successful purchase so telemetry can record the spend. */
  readonly onPurchase?: (sku: Sku) => void;
}

export class StoreModel {
  private readonly owned: Set<SkuId>;
  private readonly deps: StoreDeps;

  constructor(deps: StoreDeps, ownedSkus: readonly SkuId[] = []) {
    this.deps = deps;
    this.owned = new Set(ownedSkus.filter((id) => BY_ID.has(id)));
  }

  /** Everything in the catalogue, locked or not — for the research dashboard. */
  get catalogue(): readonly Sku[] {
    return CATALOGUE;
  }

  get ownedSkus(): readonly SkuId[] {
    return [...this.owned];
  }

  owns(id: SkuId): boolean {
    return this.owned.has(id);
  }

  /** True when the SKU's `unlock` condition (if any) is satisfied. */
  isUnlocked(sku: Sku): boolean {
    if (sku.unlock === 'firstFail') return this.deps.hasFirstFail();
    return true;
  }

  /**
   * What the store should render right now: unlock conditions satisfied, and
   * one-time SKUs the player already owns removed.
   * Optional `labelOverlay` renames SKUs for themed product skins.
   */
  availableSkus(
    labelOverlay?: Partial<Record<SkuId, { readonly name: string; readonly blurb: string }>>,
  ): readonly Sku[] {
    return CATALOGUE.filter(
      (sku) => this.isUnlocked(sku) && !(sku.oneTime === true && this.owned.has(sku.id)),
    ).map((sku) => {
      const o = labelOverlay?.[sku.id];
      if (!o) return sku;
      return { ...sku, name: o.name, blurb: o.blurb };
    });
  }

  /**
   * Attempt a simulated purchase.
   *
   * A locked SKU reports `unknownSku`: from the player's point of view it does
   * not exist yet, and `PurchaseResult` (frozen contract) has no `locked`
   * variant. See the note in the workstream report.
   */
  purchase(id: SkuId): PurchaseResult {
    const sku = BY_ID.get(id);
    if (!sku) return { ok: false, reason: 'unknownSku' };
    if (!this.isUnlocked(sku)) return { ok: false, reason: 'unknownSku' };
    if (sku.oneTime === true && this.owned.has(sku.id)) {
      return { ok: false, reason: 'alreadyOwned' };
    }

    const paid = this.deps.wallet.spendCredits(sku.credits);
    if (!paid.ok) return { ok: false, reason: 'insufficientCredits' };

    if (sku.grantShards) this.deps.wallet.grantShards(sku.grantShards);
    if (sku.grantLives) {
      // Every lives grant in the catalogue is a full refill by design; grant()
      // caps at max either way, so this is safe if that ever changes.
      this.deps.lives.grant(sku.grantLives);
    }
    if (sku.grantBoosters) this.deps.boosters.grantMany(sku.grantBoosters);
    if (sku.grantAdsFreeDays) this.deps.grantAdsFreeDays?.(sku.grantAdsFreeDays);
    if (sku.grantComfort) this.deps.grantComfort?.();
    if (sku.oneTime === true) this.owned.add(sku.id);

    this.deps.onPurchase?.(sku);

    const wallet: Wallet = this.deps.wallet.state;
    return { ok: true, wallet };
  }
}
