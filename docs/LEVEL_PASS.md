# Level pass process

Formal playability + integrity gates for the **full launch catalogue**
(currently **300** Act I levels; suite is `LEVEL_COUNT`-aware).

## Commands

```bash
# Full automated pass (integrity + smoke + legal-hint sims)
npm test -- tests/levels/

# Full catalogue pass + classic L10–30 band
npm test -- tests/levels/l1_40_pass.test.ts
npm test -- tests/levels/l10_30_pass.test.ts

# Act I-C band (151–300 integrity + sample playability)
npm test -- tests/levels/l151_300_pass.test.ts

# Tooling suite
npm test && npm run typecheck && npm run build
```

## Gates

| Gate | Rule |
|------|------|
| Catalogue | Contiguous 1…N levels; layouts match crust/defuse counts |
| Open | Every seed opens `playing` with a legal move; no auto-win |
| Fuse | `bombFuse` defined when bombs present; `moves >= bombFuse` |
| Playability | Prefer ≥1 legal-hint win in 48 seeds; if 0 wins, require progress on non-defuse goals |

Legal-hint bots **ignore bombs** (they pick any match). Bomb-heavy levels will lose often under this bot; that is expected. Human / bomb-aware play is stronger.

## Pass log (2026-08-02)

### Toolchain
- Catalogue: **300** levels validated on load  
  - L101–150 via `scripts/gen_levels_101_150.mjs`  
  - L151–300 via `scripts/gen_levels_151_300.mjs` + `scripts/fairness_151_300.mjs`
- Map chapters I–XXX (Crystalline + Harbor; XV closed at 150)
- Full catalogue pass suite green (`LEVEL_COUNT`-aware)
- Theme dual product verifier: **VERDICT: PASS**

### Balance retune (early/mid band)
| Level | Change |
|-------|--------|
| L5 Pressure Point | score 6800→5200, moves 20→24 |
| L18 Reliquary | collect 5→4, moves 20→26 |
| L23 Salvage Under Fire | collect 3→2, moves 20→24, fuse 5→6 |
| L30 Living Core | moves 22→26 |
| L36 Twin Charge | crust trim, moves 18→24, fuse 4→6 |
| L39 Bomb Garden | bombs 5→4, collect 3→2, moves 18→24, fuse 3→5 |
| L40 Heart of Spire | bombs 4→3, collect/contain ease, moves 22→28, fuse 3→5, shadow 2→3 |

### Boss identity pass (2026-08-03)
| Level | Change |
|-------|--------|
| L10 Glacier Heart | dual: crust 20 + score 3200 (boss, not crust-only) |
| L15 The Long Drop | dual: collect 3 + defuse 2, fuse 5, moves 22 |
| L20 Fuse Tyrant | defuse 4 + score 4500, fuse 5, moves 22 |
| L25 Nightfall Gate | contain 12 + crust 10, shadow period 3 |
| L30 Living Core | multi-threat retune: crust 12, defuse 3, collect 2, contain 8, moves 28, fuse 5 |

### Harbor metrics alignment (2026-08-03)
Levels are **shared** (Harbor + Crystalline skins). Re-applied fairness after wall/compact drift:

| Rule | Metric |
|------|--------|
| Fuse safety | `moves >= bombFuse` always |
| Multi-bomb | bombs ≥ 2 → fuse ≥ 4; moves ≥ fuse+6 (or +8 if bombs ≥ 3) |
| L23 | compact layout kept; **moves 24, fuse 6** (LEVEL_PASS) |
| L39 | **moves 24, fuse 5, collect 2** |
| L40 | **moves 28, fuse 5, shadow 3** |
| Wall band L22/24 | fuse 5, moves 20 |
| Hangover L41–42, L56–59 | moves ≥ 20 (not 14-move crush) |
| Late multi-bomb bosses | auto-fair fuse/moves (L80–100 band) |

Play suite: full catalogue integrity + smoke + legal-hint gates green.

Late catalogue still uses progress gates under legal-hint; bomb-aware bot is next cycle.

### Act I-C fairness (2026-08-03) — L151–300
Auto-pass via `node scripts/fairness_151_300.mjs`:

| Rule | Application |
|------|-------------|
| Fuse safety | bombs present → fuse; `moves >= fuse` |
| Multi-bomb | ≥2 bombs → fuse ≥4, moves ≥ fuse+6; ≥3 → fuse+8 |
| Multi-obj | ≥4 objectives → moves ≥ 22 |
| Boss multi | boss + ≥4 objs → moves ≥ 26; L280+ bosses → 28 |
| Contain | shadow period ≥ 2 |
| Late score | boss multi score targets eased ~8%; contain cap 14 |

Updated band on last run: L230–300 bosses (15 files). Manual play still recommended on L160/200/250/300.

### Act I-C checkpoint retune (2026-08-03)
| Level | Change |
|-------|--------|
| L160 Storm Ledger | fuse 6, score 4200, contain 10, moves 28 |
| L200 Apex Approach | fuse 6, score 5500, contain 11, moves 28 |
| L250 Fog Choir | fuse 6, score 6800, collect 3, contain 12, moves 28 |
| L300 Last Quay | fuse 6, score 7500, collect 4, contain 12, moves 30 |

Also: Crystalline cavern stages 5–6 + Harbor prelevel outer/treaty banners; map postcards for XVI–XXX use stage 5–6 art.

### Contain / cavern tighten (2026-08-03)
Pure-contain L26 was a soft free win after the L25 boss. Retuned mid-band for **tighter multi-threat + cavern shapes**:

| Level | Change |
|-------|--------|
| L26 Spreading Caverns | dual **contain 12 + crust 14**, moves 16, shadow period **2**, two-chamber cavern layout |
| L27 Shuttered Depths | contain 8→**12**, moves 20→**16**, period **2** |
| L28 Lightless Galleries | contain 8→**12**, period **2**, gallery-hole layout (moves 18) |
| L29 Endgame Protocol | contain 8→**12**, moves 18, fuse **5**, period **2**, crust corridors |
| L30 Living Core | contain 8→**12**, moves 28→**26**, period **2** |
| L38 Creeping Walls | contain 12→**14**, moves 20→**16**, period **2** |

**Forward rule:** pure-contain-only is avoided after L25; shadow period defaults to **2** in this band so darkness pressures the budget.

### Theme dual product
- Crystalline + Harbor entries; isolated saves/events/powers/art

## Manual play checklist

1. Open `http://localhost:5173/` (Crystalline) and `/harbor.html`
2. Complete L1 tutorial (forge + fire)
3. Clear a mid level with conveyor (L11+)
4. Win → meta place prop (cavern / docks ceremony)
5. Open album + event screens
6. Confirm no mine copy on Harbor chrome

## Next pass cycle

- Bomb-aware sim bot for defuse levels (stricter win-rate gates)
- Soften pure-collect “Treasure Drop” variants that starve under greedy play
- Optional Harbor placement video
- Bakery / Library theme packs (see `docs/STUDIO_FOCUS.md`)
- **Campaign Act I-C (L151–300)** pre-launch — plan in `docs/CAMPAIGN_ARC.md`
- **Act II (L301–600)** post-launch story phase — same doc
