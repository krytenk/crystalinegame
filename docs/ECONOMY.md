# The Simulated Economy

> **Nothing in this system is real.**
> `Credits` are a fictional currency. There is no payment processor, no billing SDK, no ad
> network, no analytics endpoint, and no network capability anywhere in this codebase.
> Nothing here can charge anyone or transmit anything. Every screen that touches the
> economy carries a persistent **SIMULATED** marker, and the wallet can be reset from
> Settings at any time.

The purpose is to reproduce the *shape* of a free-to-play funnel faithfully enough to study
it end to end — the gates, the price ladders, the countdowns, and above all the *timing* of
the upsell relative to frustration. The research document (`claude.md`) argues that the
commercial power of the genre comes from the interaction of difficulty pacing with resource
scarcity. This build makes that interaction observable.

---

## Why two currencies

| Layer | Role |
|---|---|
| **Credits** | Stands in for money. Spent only in the store, never in gameplay. |
| **Shards** | Premium currency. Bought with Credits, spent on gameplay conveniences. |
| **Lives** | A time-gated resource. Not purchasable directly — only via Shards. |

The indirection is itself the mechanic. A player buying "200 Shards for 600 Credits" and
later spending "30 Shards to refill lives" never performs the arithmetic that would price
that refill at 90 Credits. Separating the purchase decision from the spend decision is what
makes the spend decision feel cheap. This is the single most transferable structural
observation in the genre, and it is reproduced here deliberately.

Bundle sizes are also non-linear (see below), so no two tiers share a Credits-per-Shard
rate. That defeats casual comparison and steers players toward the middle tier — the
classic decoy effect.

## Opening balances

| | |
|---|---|
| Starting Credits | 2,500 |
| Starting Shards | 50 |
| Daily login stipend | +50 Credits |

The stipend exists so the simulation can continue after the wall bites. **When Credits run
out, the wall is real** — that is the experience, not a bug in it.

## Store ladder

| SKU | Credits | Grants | Rate | Notes |
|---|---:|---|---:|---|
| Pocket of Shards | 120 | 30 Shards | 4.00 cr/shard | Anchor: deliberately poor value |
| Geode Hoard | 600 | 200 Shards | 3.00 cr/shard | `bestValue` |
| Vault of Ages | 2,400 | 1,000 Shards + boost | 2.40 cr/shard | `mostPopular`; the whale tier |
| Starter Bundle | discounted | mixed | — | **Appears only after the first level failure** |
| Instant Refill | — | full lives | — | Convenience purchase |
| Remove Ads | one-time | suppresses interstitials | — | Sold against an annoyance the game creates |

The **Starter Bundle** is the most instructive item. It is not on the shelf when the player
is happy. It unlocks on the first failure — the exact moment frustration peaks and price
sensitivity drops. The offer is generous, one-time, and framed as a rescue. Real titles do
this because it converts; it is reproduced here so the mechanism can be watched working.

## Lives: manufacturing the pause

- Maximum 5, one lost per failure
- One regenerates every 30 minutes, on wall-clock time so it accrues while the game is closed
- At zero, play is blocked

The research document's framing is that this is not primarily a monetization device but a
*session-length governor*: it forces a break that prevents burnout and creates an
anticipated return point later in the day. Monetization is the secondary effect. Losing five
lives in a row means a 2.5-hour wait, and it is at that moment — not during play — that the
store is at its most persuasive.

The regen clock is timestamp-based, and `lives.ts` explicitly handles a system clock moving
backwards so the state cannot be corrupted by it.

## Simulated advertising

Every ad in this build is a state machine and a timer. No ad is fetched, rendered, or
reported.

| Placement | Trigger | Reward |
|---|---|---|
| `rewardedLife` | Lives exhausted | +1 life |
| `rewardedBooster` | Pre-level | +1 booster |
| `rewardedContinue` | On failure | Continue with extra moves |
| `interstitial` | Every 3rd level completion or fail | none — pure friction |

Rewarded ads run 5 seconds with the skip control appearing at 3. Dismissing early grants
nothing. A daily cap prevents farming.

The interstitial exists to be irritating; **Remove Ads** is then sold as the cure. That the
same product creates and sells the solution to a problem is the point of including it.

## Difficulty and monetization pressure

The level curve steepens deliberately at **8, 15, 22, 28 and 30** (`PRESSURE_POINTS` in
`src/levels/index.ts`). Each spike lands shortly after a new blocker type is introduced,
when the player's skill has not yet caught up.

Layered on top, Dynamic Difficulty Adjustment (`src/engine/dda.ts`) runs a hidden scalar
from −1 (maximum assistance) to +1 (maximum pressure), driven by fail streak, rolling win
ratio, and mean time per move. It modulates spawn weights, special-crystal frequency, and
shadow spread rate. It is never surfaced during play.

The research document's claim is that this keeps players inside Csikszentmihalyi's flow
channel — out of anxiety, out of boredom — and that players prefer to believe outcomes are
purely skill-based. Assistance and pressure are therefore both invisible by design. The
Publisher Dashboard is the only place the scalar is exposed, and that exposure is the
research purpose of this build.

## Publisher Dashboard

Reachable from Settings. It computes the research document's own metrics from local play
only:

| Metric | Derivation |
|---|---|
| D1 / D7 / D30 retention | Did this player return on or after that day boundary since install |
| Sessions, days active | Counted locally |
| ARPDAU | Simulated Credits spent ÷ days active |
| ARPPU | Simulated Credits spent ÷ paying players (1 or 0 here) |
| Conversion | Whether this player ever spent |
| Levels attempted / won | Counted locally |
| DDA scalar | Current live value from the engine |

Single-player metrics are obviously not a cohort, and the dashboard says so. The value is in
watching one's *own* numbers move in response to one's own frustration — the funnel
described in the research document, observed from inside it.

The document's industry benchmarks, for reference: D1 ≈ 40%, D7 ≈ 20%, D30 ≈ 10%; roughly
96% of players never spend; revenue concentrates in a small fraction of high-spending users.

## Persistence

All state is `localStorage`, schema-versioned, with a migration path. Corrupt data falls
back to a fresh save rather than bricking the game. `src/economy/persistence.ts` is the only
module permitted to touch storage.

## Ethical boundary

Reproducing these patterns is not endorsing them. Several — the post-failure offer, the
manufactured annoyance sold back as a fix, the currency indirection that obscures real cost
— are studied precisely because they are effective on people who have not noticed them
working. Building a legible, side-by-side model of the funnel is a reasonable way to
understand it.

If this were ever pointed at real money, it would need: honest disclosure of odds and
prices, spending limits, protections for minors, and compliance with the regulations that
govern real-money game mechanics in each market. It is not, and it has no capability to be.
