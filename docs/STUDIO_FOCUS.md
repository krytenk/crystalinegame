# Studio focus — Departure Bay Digital

**Purpose:** Keep product, brand, and polish in the right order so the work drives **investment-grade proof** (playable dual-loop products, retention literacy, honest marketing) rather than hanging on low-ROI detail.

**Audience:** Founder + agents implementing this repo (Crystalline, Lantern Harbor, future verticals).

**Last refined:** 2026-08-03 (conversation-derived; treat as living doctrine).  
**Also see:** §11 post-launch cadence · §12 forward backlog (docks expansion, etc.).

---

## 1. Operating principle

AI with web synthesis and full codebase context is the default execution path for engineering, research synthesis, and systems design. Founder owns **vision, brand, prioritization, and “what success looks like.”** Agents own **implementation, assessment against data, and ruthless de-scoping of what does not move the metric.**

**Rule:** Prefer decisions that improve:

1. **Playable fairness + “one more run”** (core loop)  
2. **Emotional peak offers** (continue / lives / boosters)  
3. **Meta attachment** (docks / cavern pride)  
4. **Honest marketing** (sell what ships)  
5. **Studio signature** (material wordmarks, signature specials)  

…over decisions that only improve aesthetics with no funnel or identity payoff.

---

## 2. What actually drives funding / investment narrative

Investors and sophisticated players care about **evidence of product literacy**, not a single shader.

| Layer | Proof | Examples in this repo |
|-------|--------|------------------------|
| **A. Retention architecture** | Dual loop, lives, continue, DDA pressure, daily, album | `docs/ECONOMY.md`, economy modules, continue ceremony |
| **B. Content + fairness** | Catalogue, boss identity, playability gates | 150 levels, `docs/LEVEL_PASS.md`, boss pass L10/15/20/25/30 |
| **C. Product craft** | Clear UX hierarchy, mobile feel | Map places, slim play HUD, clear-screen loot tray |
| **D. Brand / distinction** | Recognizable studio ritual | Material wordmarks (planned); Super Chest octopus (planned polish) |
| **E. Trailer truth** | Marketing matches build | Do not advertise limbs/sand that are not in the binary |

**Funding story (one line):**  
*Original dual-loop match-3 IP (mine + harbor), ethical sim F2P literacy, multi-product theme architecture, and a tactile brand signature — built with agentic execution, proven on device.*

**Not the funding story:** kinetic type alone, or any single VFX flex without cores 1–3.

---

## 3. Cores 1–3 (monetization / retention engine)

These are the **ROI spine**. Polish amplifies them; it does not replace them.

### Core 1 — Levels: skill + occasional help
- Fair move budgets, readable goals, bosses that *play* multi-threat  
- Soft hints, comfort tools, pickaxe/reshuffle as help — not only as store SKUs  
- **Metric feel:** “hard but fair / one more try”

### Core 2 — Continue / lives / boosters at peak emotion
- Life on fail (not win); near-miss continue before life burn  
- Clear, short continue ceremony (progress %, one gold rescue, free watch path)  
- **Metric feel:** “I almost had it — save me”

### Core 3 — Meta they care about
- Tideglass/essence → place prop → vista pride + idle drip  
- Place ceremony is a **second win**, not a form row  
- Album as visual loot on clear when granted  
- **Metric feel:** “my docks / my mine — I don’t want to lose this habit”

**Status (2026-08-03):** Architecture in place; boss identity + continue ceremony + place pride tightened. Still iterate on late-catalogue fairness and meta attachment depth.

---

## 4. Brand signature — Material Wordmarks

### Promise (one sentence)
**On every Departure Bay game, the hero word is a material you can touch.**

### Cross-product pattern

| Product | Material | Interaction | Optional easter egg (never required) |
|---------|----------|-------------|--------------------------------------|
| **Lantern Harbor** | Sand under clear water | Tilt / drag grains; light caustics | Optional “scoop sand” soft drip (capped) |
| **Crystalline** | Ore / rock crystal | Tap to chip / mine ore | e.g. 4 chips → 1 shard, **hard daily/session cap** |
| **Future verticals** | Flour, ink, paper grain, etc. | Same grammar: press the hero | Same optional micro-reward rules |

### Grammar (every game)

1. **Hero surfaces only** — title wordmark, big map/hub name, major clear headline.  
2. **Never** kinetic material on tiny HUD numbers (moves/score) — readability first.  
3. **Touch / tilt / press** → material feedback + soft haptics/SFX.  
4. **Optional easter egg** — never gates progress; never out-earns clear/meta rewards.  
5. **Reduced motion / settings kill-switch.**

### Why this is the brand (not a gimmick)
Large studios compete on volume and franchise. A small studio can own a **repeatable tactile ritual** across titles so a player (or investor) says: *“That’s a Departure Bay game.”*

**Implementation prep (Crystalline ore + shared grammar):** [`docs/BRAND_WORDMARK.md`](./BRAND_WORDMARK.md)  
Shared module sketch: `HeroMaterialWordmark` (profiles: `sand` | `ore` | …).

---

## 5. Spectacle layer (peak fantasy)

| Asset | Role | When |
|-------|------|------|
| **Super Chest octopus grab** | Signature *gameplay* fantasy made visible (limbs target gems, pull in) | Before marketing that sells Super Chest; after cores are “good enough” to demo |
| **Kinetic sand / ore wordmarks** | Signature *brand* on hero titles | Early identity pack — not years later; not before cores are demoable |
| **Clear-screen ceremony** | Emotional payoff of the run | Already shipping; keep lean |

**Sell what you launch.** If the trailer shows wrapping tentacles, the binary must show grab-and-pull (even v1). If the trailer is dual-loop + brand, wordmarks can lead.

---

## 6. Recommended sequence (follow this unless data says otherwise)

| Order | Work | Success signal |
|-------|------|----------------|
| **1** | Cores 1–3 tightness | Bosses feel multi-threat; continue hits; place feels like pride |
| **2** | Super Chest octopus **readable** choreography (targeted arms + gem travel) | Trailer/store can show the fantasy honestly |
| **3** | Material wordmark v1 (Harbor sand + Crystalline ore, hero only) | Brand ritual playable on title of both products |
| **4** | Launch / portfolio push | Device demos + pitch: architecture + signature |
| **5** | Updates | See §11 cadence + §12 backlog (docks stages 5–6, levels, polish) |

**Do not** invert: months of sand physics before fair L15 or a clear continue beat.

---

## 7. Decision filter (use on every feature debate)

Ask, in order:

1. Does this improve **cores 1–3** or **honest marketing of them**?  
2. Does this strengthen the **studio signature** (material heroes / signature special) without harming readability?  
3. Is this **nice-to-have polish** that can wait for an update?

If only (3) → backlog.  
If (1) or (2) → schedule.  
If it fails all three → drop.

---

## 8. What we already learned in this product

- Theme packs (Harbor vs Crystalline) are the multi-product architecture — **keep saves, art, copy isolated**.  
- Declutter (map, clear, play, prelevel) beats “more systems on one screen.”  
- Forms lose to **visual loot and pride ceremonies**.  
- Fonts that break digits or make BOSS look like “8” destroy trust — **display kinetic only on heroes**.  
- Economy is **simulated** for research; still design timing as if real (see `docs/ECONOMY.md`).

---

## 9. Related docs

| Doc | Role |
|-----|------|
| `docs/ECONOMY.md` | Sim F2P ladder, lives, ads |
| `docs/LEVEL_PASS.md` | Catalogue gates + boss pass log |
| `docs/PITCH.md` / `docs/PITCH_HARBOR.md` | Portfolio framing |
| `docs/THEMES.md` | Theme pack contract |
| `docs/FONT_ASSESSMENT.md` | Faces + Tidepop honesty |

---

## 10. Founder note (captured intent)

Stylization and kinetic hero type matter because the studio needs a **brand that stands out** against much larger competitors — not because particles replace dual-loop design. The path to funding the future is: **prove product literacy (cores) → ship signature fantasy honestly (octopus when marketed) → stamp the brand (material wordmarks) → scale verticals (Bakery / Library / …) with the same ritual.**

Agents: when the founder fixates on a low-ROI visual, gently re-anchor to §6–§7; when the founder articulates brand ritual, capture it here and implement in the shared pattern.

---

## 11. Post-launch content cadence

### Industry reality (match-3 / casual F2P)

| Studio type | Typical pattern |
|-------------|-----------------|
| **Large live-ops (King / Playrix class)** | **Weekly–biweekly** level drops + frequent events; meta expansions less often |
| **Mid-size live product** | **Monthly** content patch + seasonal event; bigger meta every **quarter** |
| **Small / agentic studio (us)** | Do **not** promise weekly forever. Promise **honest, batchable** updates |

Weekly only works with a dedicated live-ops pipeline. For Departure Bay: **quality + predictability > fake velocity**.

### Recommended structure for this studio

Use a **hybrid**: small monthly “alive” signal + larger 3-month content pillars.

| Cadence | What ships | Goal |
|---------|------------|------|
| **Monthly (light)** | ~**20–40 levels** (or one new chapter band) · bug fixes · 1 balance retune · optional event refresh | “Game is alive”; store “What’s New”; retention drip |
| **Every 3 months (pillar)** | **Docks / cavern expansion** (new stage + 3–4 props + art) **and/or** vertical theme progress (Bakery / Library) | Marketing beat + Tideglass sink + portfolio breadth |
| **Launch content complete** | **Act I to L300** (151–300 Under-Crown / Outer Channels) — see `docs/CAMPAIGN_ARC.md` | Store can claim **300 levels** only after LEVEL_PASS |
| **Phase 2 story** | **Act II L301–600** post-launch pillars | Future-proofed story; not day-one unlock |

### Founder plan locked (2026-08-03, campaign updated same day)

**Campaign scale (authoritative):**  
- **Launch = 300 levels** (1–150 shipped; **151–300 to build before public launch**).  
- **Phase 2 story = 301–600** (designed now, built post-launch).  
Full beat sheet, chapters XVI–LX, and difficulty grammar: **`docs/CAMPAIGN_ARC.md`**.

| Track | Work |
|-------|------|
| **A — Launch catalogue** | Build **151–300** in milestones M1/M2/M3 (200 → 250 → 300); LEVEL_PASS each decade; fix chapter XV catch-all |
| **B — Live products (Harbor + Crystalline)** | Quarterly **docks/cavern stage 5–6** with Act I-C so Tideglass/essence still sinks |
| **C — Family expansion** | Bakery / Library to parity (shared levels OK; own art/copy); stagger marketing |
| **D — Brand / fantasy** | Octopus readable grab; material wordmarks hero-only |
| **E — Phase 2** | After launch stability: **301–600** Act II + meta stages 7–8 |

**Bakery/Library** may trail **art** behind Crystalline/Harbor, but should not force delaying **mechanical** 151–300 if launch needs volume.

### Practical calendar (months 1–6 post launch-ready)

| Window | Focus |
|--------|--------|
| **Month 1** | Stability, fairness from play; level pack if needed |
| **Month 2** | Level pack + Bakery theme scaffold / art spine |
| **Month 3 (pillar)** | **Docks/cavern stage 5** + Bakery vertical toward playable map |
| **Month 4** | Level pack + Library scaffold / art spine |
| **Month 5** | Level pack + Bakery/Library meta + copy pass |
| **Month 6 (pillar)** | **Docks/cavern stage 6** + Bakery + Library at **launch parity** (or as close as quality allows) |
| **Month 7+** | Staggered **Campaign Arc 2** per product (§14) |

### Rules of thumb

1. **Levels monthly** (or every 6 weeks if quality slips) — cheapest content unit; keeps the match-3 spine fed.  
2. **Docks / diorama expansion quarterly** — art-heavy; players notice “new place on the pier.”  
3. **Never ship empty months of silence** if the store listing is live — even a small level pack counts.  
4. **Don’t expand docks every month** — dilutes ceremony; stage drops should feel like events.  
5. **Album/event** can tick monthly with numbers/copy only (low art cost).  
6. If the product is **portfolio/demo only** (not live store): use **3–6 month pillars** only; skip monthly theater until real users exist.

### When the product is still pre-funding / portfolio

| Mode | Cadence |
|------|---------|
| **Investor demo** | Pillars only: cores → octopus → wordmarks → one docks expansion if demo runs long |
| **Soft launch / real retention data** | Switch on **monthly levels + quarterly meta** |
| **Full live** | Hybrid table above |

---

## 12. Forward backlog (post-launch / content packs)

Prioritized for when §6 steps 1–4 are done or in flight. Not pre-launch blockers unless noted.

### P1 — Docks / meta expansion (Harbor + mirror for Crystalline)

**Problem:** Meta catalogue is **finite** (Harbor: 4 stages, 15 places). After full furnish, Tideglass still drops from clears but **place goals end**; idle rate/cap **plateau**. Long-term dual-loop needs a sink.

**Plan:**

| Pack | Content | Notes |
|------|---------|--------|
| **Docks Stage 5** | New stage name + vista art + **3–4 props** + costs above stage 4 + idle formula bump when `stagesComplete ≥ 5` | First Tideglass sink after Night Festival |
| **Docks Stage 6** | Same pattern | Second quarterly pillar |
| **Optional prestige** | Re-skin / upgrade existing props for cost, no new stage art | Only if art budget is tight |

**Do not** rebalance costs of already-owned stage 1–4 items in a live save (rug-pull). New content only.

**Crystalline:** mirror with cavern stages 5–6 so both products stay in parity.

**Unlock rule (unchanged pattern):** stage N opens when stage N−1 is fully owned.

**When complete (all current stages):** UI should still celebrate (“Night Festival complete”) and point soft goals at **album / next levels** — not a dead end screen.

### P2 — Level catalogue growth (Act I-C + Act II)

| Pack | Size | Cadence |
|------|------|---------|
| **Act I-C launch** | **151–300** (150 levels) + chapters XVI–XXX | **Pre-launch** — see `docs/CAMPAIGN_ARC.md` |
| Decade bands | ~10 levels | While building 151–300, ship internal milestones M1/M2/M3 |
| **Act II Phase 2** | **301–600** + chapters XXXI–LX | **Post-launch** pillars |

Always run `docs/LEVEL_PASS.md` gates. Do not advertise 300 until M3 is green.

### P3 — Bakery + Library to launch parity

**Specs:** `docs/verticals/bakery/SPEC.md`, `docs/verticals/library/SPEC.md`, doctrine `docs/verticals/README.md`.

Target bar (Harbor sibling standard) **plus** differentiation checklist (fantasy verb, signature special, meta, companion, wordmark, audio, package id — not palette-only). 60-second blind test vs siblings must pass before “shipped.”

### P4 — Spectacle / brand (updates)

- Super Chest octopus limb v2 (wrap + more prey polish)  
- Material wordmark sand/ore fidelity  
- Capped easter-egg economy on hero materials  

### P5 — Live-ops light

- Daily/event number retunes  
- Seasonal copy + one banner art  
- No full new systems unless retention data demands it  

---

## 13. One-line cadence answer

**Default for a live Departure Bay match-3:**  
**Monthly light (levels + fixes) + every ~3 months a pillar (docks stage / major fantasy / brand).**  

**First ~6 months post launch-ready:** levels + docks art **plus** Bakery/Library parity — **not** Campaign Arc 2.  

**3–6 months only** is fine for **portfolio or pre-UA** phases.  
**Weekly** is a large-studio live-ops tax — adopt only with real users and a dedicated pipeline.

---

## 14. Campaign acts + multi-product stagger

**Authoritative plan:** [`docs/CAMPAIGN_ARC.md`](./CAMPAIGN_ARC.md) (300 launch · 301–600 Phase 2 story).

### Arc inventory

| Act | Levels | Map chapters | Status |
|-----|--------|--------------|--------|
| **I-A / I-B** | **1–150** | I–XV | **Shipped** |
| **I-C (launch complete)** | **151–300** | **XVI–XXX** | **Planned — build pre-launch** |
| **II (Phase 2 story)** | **301–600** | **XXXI–LX** | **Designed; build post-launch** |
| **III+** | 601+ | TBD | Only after Act II proves retention |

### Multi-product stagger (after parity)

When **Harbor, Crystalline, Bakery, Library** all sit at launch-comparable depth:

1. **Do not** drop Arc 2 on all products the same week.  
2. **Stagger campaign shifts** so the studio always has a news beat:

| Example quarter | Product getting Arc 2 (or next arc beat) |
|-----------------|------------------------------------------|
| Q1 | Harbor Arc 2 |
| Q2 | Crystalline Arc 2 |
| Q3 | Bakery Arc 2 (or first big campaign if shorter at parity) |
| Q4 | Library Arc 2 |

3. **Off-quarter products** still get **monthly light levels** or event tweaks if live.  
4. **Docks/meta stages** can offset campaign months (e.g. Harbor stage 5 in month 3, Arc 2 in month 7) so pillars don’t stack on one title only.

### Success criteria before starting Arc 2 build

- [ ] Harbor + Crystalline stable at 150 + meta stages 1–4 (launch bar)  
- [ ] Bakery theme pack playable end-to-end at agreed parity  
- [ ] Library theme pack playable end-to-end at agreed parity  
- [ ] Docks/cavern stage 5 (and ideally 6) designed or shipped so meta isn’t empty  
- [ ] Arc 2 chapter names + boss list filled for the first product in the stagger  

Until those boxes are checked, **monthly levels + docks art + vertical builds** are the correct plan.
