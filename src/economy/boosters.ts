/**
 * CRYSTALLINE — booster inventory.
 *
 * SIMULATION ONLY. Boosters are bought with fictional shards.
 *
 * Boosters are the second half of the deficit loop. `lives.ts` creates a
 * *time* deficit; boosters exist to create a *capability* deficit — the level
 * that is beatable only with five more moves, or with one piece removed. The
 * research doc's point is that both deficits are authored, not discovered.
 *
 * Invariant: a count can never go below zero. Consuming a booster you do not
 * hold fails and returns a result; it never throws and never clamps silently.
 */

import { ECONOMY_CONST, type BoosterId, type BoosterInventory } from './api';
import { safeCount } from './time';
import type { WalletModel } from './wallet';

export const BOOSTER_IDS: readonly BoosterId[] = [
  'seedPrism',
  'extraMoves',
  'pickaxe',
  'reshuffle',
] as const;

/** Where a booster may be used. The UI reads this to place the buttons. */
export const BOOSTER_SLOT: Readonly<Record<BoosterId, 'preGame' | 'inGame'>> = {
  seedPrism: 'preGame',
  extraMoves: 'preGame',
  pickaxe: 'inGame',
  reshuffle: 'inGame',
} as const;

export type ConsumeResult =
  | { readonly ok: true; readonly id: BoosterId; readonly left: number }
  | { readonly ok: false; readonly reason: 'none' | 'unknownBooster' | 'invalidAmount' };

export type BuyBoosterResult =
  | { readonly ok: true; readonly id: BoosterId; readonly count: number; readonly shardsSpent: number }
  | { readonly ok: false; readonly reason: 'insufficientShards' | 'unknownBooster' | 'invalidAmount' };

const isBoosterId = (v: unknown): v is BoosterId =>
  typeof v === 'string' && (BOOSTER_IDS as readonly string[]).includes(v);

export class BoostersModel {
  private readonly counts: Record<BoosterId, number>;
  private readonly shardCost: number;

  constructor(
    initial: Partial<Record<BoosterId, number>> = {},
    shardCost: number = ECONOMY_CONST.cost.booster,
  ) {
    this.shardCost = Math.max(0, Math.floor(shardCost));
    this.counts = { seedPrism: 0, extraMoves: 0, pickaxe: 0, reshuffle: 0 };
    for (const id of BOOSTER_IDS) this.counts[id] = safeCount(initial[id], 0);
  }

  get inventory(): BoosterInventory {
    return { counts: { ...this.counts } };
  }

  get serialized(): Record<BoosterId, number> {
    return { ...this.counts };
  }

  /** Unit price in shards, so the UI can label the buy button. */
  get unitCost(): number {
    return this.shardCost;
  }

  count(id: BoosterId): number {
    return this.counts[id];
  }

  has(id: BoosterId, n = 1): boolean {
    return this.counts[id] >= Math.max(1, Math.floor(n));
  }

  grant(id: BoosterId, n = 1): number {
    if (!isBoosterId(id)) return 0;
    this.counts[id] += safeCount(n, 0);
    return this.counts[id];
  }

  /** Grant several at once — used by bundle SKUs and rewarded-ad payouts. */
  grantMany(grants: Partial<Record<BoosterId, number>>): void {
    for (const id of BOOSTER_IDS) {
      const n = grants[id];
      if (n !== undefined) this.grant(id, n);
    }
  }

  consume(id: BoosterId, n = 1): ConsumeResult {
    if (!isBoosterId(id)) return { ok: false, reason: 'unknownBooster' };
    if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: 'invalidAmount' };
    const want = Math.floor(n);
    if (this.counts[id] < want) return { ok: false, reason: 'none' };
    this.counts[id] -= want;
    return { ok: true, id, left: this.counts[id] };
  }

  /** Buy with the premium currency at `ECONOMY_CONST.cost.booster` each. */
  buyWithShards(wallet: WalletModel, id: BoosterId, qty = 1): BuyBoosterResult {
    if (!isBoosterId(id)) return { ok: false, reason: 'unknownBooster' };
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: 'invalidAmount' };
    const n = Math.floor(qty);
    const price = this.shardCost * n;
    const paid = wallet.spendShards(price);
    if (!paid.ok) {
      return {
        ok: false,
        reason: paid.reason === 'invalidAmount' ? 'invalidAmount' : 'insufficientShards',
      };
    }
    this.counts[id] += n;
    return { ok: true, id, count: this.counts[id], shardsSpent: price };
  }
}
