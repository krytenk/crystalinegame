/**
 * CRYSTALLINE — the two-tier wallet.
 *
 * SIMULATION ONLY. `credits` are a fictional stand-in for money; no payment
 * processor, billing SDK or IAP integration exists anywhere in this build.
 *
 * The two-tier structure is itself the mechanic the research doc describes:
 * money buys `credits`, `credits` buy `shards`, `shards` buy relief from a
 * blocker. Each hop launders the price signal a little more, so by the time the
 * player spends, the cost has stopped feeling like a cost.
 *
 * Invariant: **a balance can never go negative.** Overspending fails and returns
 * a result. It does not throw, and it does not silently clamp to zero — a silent
 * clamp would let a caller believe it had been paid.
 */

import type { Wallet } from './api';
import { safeCount } from './time';

export type WalletFailure = 'insufficientCredits' | 'insufficientShards' | 'invalidAmount';

export type SpendResult =
  | { readonly ok: true; readonly wallet: Wallet; readonly spent: number }
  | { readonly ok: false; readonly reason: WalletFailure; readonly wallet: Wallet };

export class WalletModel {
  private credits: number;
  private shards: number;

  constructor(initial: Wallet) {
    this.credits = safeCount(initial.credits, 0);
    this.shards = safeCount(initial.shards, 0);
  }

  get state(): Wallet {
    return { credits: this.credits, shards: this.shards };
  }

  canAffordCredits(amount: number): boolean {
    return Number.isFinite(amount) && amount >= 0 && this.credits >= Math.floor(amount);
  }

  canAffordShards(amount: number): boolean {
    return Number.isFinite(amount) && amount >= 0 && this.shards >= Math.floor(amount);
  }

  spendCredits(amount: number): SpendResult {
    return this.spend('credits', amount, 'insufficientCredits');
  }

  spendShards(amount: number): SpendResult {
    return this.spend('shards', amount, 'insufficientShards');
  }

  grantCredits(amount: number): Wallet {
    this.credits += safeCount(amount, 0);
    return this.state;
  }

  grantShards(amount: number): Wallet {
    this.shards += safeCount(amount, 0);
    return this.state;
  }

  private spend(
    which: 'credits' | 'shards',
    amount: number,
    reason: WalletFailure,
  ): SpendResult {
    // A negative or non-finite "spend" would be a covert grant. Reject it.
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      return { ok: false, reason: 'invalidAmount', wallet: this.state };
    }
    const cost = Math.floor(amount);
    const held = which === 'credits' ? this.credits : this.shards;
    if (held < cost) return { ok: false, reason, wallet: this.state };
    if (which === 'credits') this.credits = held - cost;
    else this.shards = held - cost;
    return { ok: true, wallet: this.state, spent: cost };
  }
}
