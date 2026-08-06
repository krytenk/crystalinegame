# Material Wordmarks — brand bible application

**Studio signature:** *On every Departure Bay game, the hero word is a material you can touch.*  
**Status:** Spec for implementation (not built yet).  
**Products:** Lantern Harbor = sand · **Crystalline = ore / living crystal** · future verticals = flour / ink / paper.

This doc is the **Crystalline-facing** preparation of the same grammar already locked for Harbor in `docs/STUDIO_FOCUS.md` §4 and `docs/FONT_ASSESSMENT.md`.

---

## 1. What the brand is (and is not)

### Is
- A **shared studio ritual** across titles: press / tilt / chip the hero word → tactile material feedback.
- **Hero surfaces only** — title wordmark, map hub name, major clear headline.
- Material identity that **matches the product fantasy** (sand ≠ ore).
- Optional micro-reward easter egg with **hard caps** (never the economy).

### Is not
- Kinetic type on **moves / score / lives / goal counters** (readability first).
- A full custom type foundry project before cores are demoable.
- Copying Harbor’s sand physics onto Crystalline (wrong fantasy).
- Marketing as “like Candy Crush letters” — original material ritual only.

**Investor one-liner:** *Players recognize Departure Bay because the title is something you can dig.*

---

## 2. Product matrix

| Product | Material | Feel | Primary interaction | Secondary (device) | Optional easter egg |
|---------|----------|------|---------------------|--------------------|---------------------|
| **Lantern Harbor** | Sand under clear water | Cozy, soft, coastal | Drag / scoop grains; caustics | Device tilt → grain settle | Soft sand drip → tiny Tideglass, **capped** |
| **Crystalline** | **Ore / facet crystal in rock** | Mine, hard, luminous | **Tap to chip**; cracks grow | Tilt → specular slide on facets | **4 chips → 1 Shard**, hard daily/session cap |
| Bakery (later) | Flour / sugar crust | Warm, soft cloud | Press → puff | — | Capped flour dust |
| Library (later) | Ink / paper fiber | Quiet, dry | Press → ink bleed settle | — | Capped ink blot |

Same **API grammar**, different **profile** (`sand` | `ore` | …).

---

## 3. Crystalline material profile — `ore`

### Fantasy
The word **CRYSTALLINE** (and big hub words like **THE MINE**, **CRYSTAL CAVERN**) is carved into living stone:  
dark basalt body, **faceted gem fill** (product palette: aurum / tidal / void glints), gold ore veins, chips that spark when struck.

### Visual layers (back → front)

| Layer | Look | Motion |
|-------|------|--------|
| 0 Shadow | Soft drop under glyph | Static |
| 1 Rock body | Dark purple-brown stone silhouette of each letter | Subtle breathing scale ≤1% |
| 2 Ore veins | Thin gold/copper cracks through rock | Idle shimmer every 2–4s |
| 3 Facet fill | Crystal facets *inside* letter counters / thick strokes | Specular highlight tracks pointer or tilt |
| 4 Chip scars | White fracture lines after taps | Accumulate, fade after 8–12s if no reward |
| 5 Spark FX | Short prism particles on chip | 80–200ms |
| 6 Outline | Dark rim + gold hairline (legibility) | Static |

### Typeface pairing (Crystalline)

| Role | Face | Kinetic? |
|------|------|----------|
| **Hero wordmark** | **DragonBlaze** (outline as mask for ore fill) | **Yes — ore profile** |
| Display CTAs | ScreenTechno / Fredoka | No material |
| Body | Nunito | Never |
| Digits / BOSS / moves | ScreenTechno | **Never kinetic** |

**Do not** put ore material on Tidepop — Tidepop is Harbor’s letter DNA. Crystalline keeps **DragonBlaze** so the two products stay distinct at a glance.

### Palette tokens (align to theme)

```
ore.rock:        #1a1230 / #2a1f40
ore.vein:        #c9a227 / #ffd24a
ore.facetA:      #7ed0ff (tidal)
ore.facetB:      #e0a0ff (void)
ore.facetC:      #ffd24a (aurum)
ore.chip:        #fff6e8
ore.spark:       #ffffff → facet color
```

---

## 4. Interaction contract (shared grammar)

### Surfaces that may use kinetic material

| Surface | Harbor text example | Crystalline text example | Priority |
|---------|---------------------|--------------------------|----------|
| Title screen product name | LANTERN HARBOR | **CRYSTALLINE** | **P0** |
| Map hub title | THE HARBOR | **THE MINE** | P1 |
| Meta hub name | HARBOR DOCKS | **CRYSTAL CAVERN** | P1 |
| Win headline (3★ / perfect only) | PERFECT SORT! | **PERFECT CLEAR!** | P2 |
| Store feature / trailer | — | Same as title | Marketing |

### Surfaces that must never use it

- Play HUD: moves, score, lives, goals  
- Tool dock counts  
- Prelevel “BOSS” badge (ScreenTechno only — digit confusion risk)  
- Settings, dashboard, legal  
- Companion speech bubbles  

### Input

| Input | Crystalline response |
|-------|----------------------|
| **Tap / click** letter or whole mark | Chip crack + spark + soft haptic (`special` light) + glass-tick / ore-chip SFX |
| **Hold** | Deeper crack network; optional rumble |
| **Pointer move / tilt** (if available) | Specular slide across facets; veins catch light |
| **Reduced motion ON** | Static pretty ore fill — **no** particle spam, no chip accumulation animation |

### Easter egg economy (optional, v1.1+)

| Rule | Value |
|------|--------|
| Action | 4 successful chips on title wordmark |
| Reward | **+1 Shard** (premium sim currency) |
| Cap | **1 / day** and **3 / session** (whichever tighter) |
| UX | Tiny “ore fleck” toast — never a shop CTA |
| Analytics (local only) | Count chips; never required for progress |

Never gate levels, lives, or meta placement on wordmark play.

---

## 5. Architecture sketch — `HeroMaterialWordmark`

Shared module so Harbor sand and Crystalline ore stay one brand system.

```
src/brand/
  HeroMaterialWordmark.ts   # controller
  profiles/
    sand.ts                 # Harbor
    ore.ts                  # Crystalline
    types.ts                # MaterialProfile
  README.md                 # points here
```

### Profile interface (conceptual)

```ts
interface MaterialProfile {
  id: 'sand' | 'ore';
  /** CSS / canvas font stack for the hero letters only */
  fontFamily: string;
  /** Draw letter masks + material fill into a canvas or WebGL layer */
  paintIdle(ctx, glyphs, t): void;
  paintChip(ctx, at, intensity): void;
  paintSpecular(ctx, lightVec): void;
  sfxChip(): void;           // routes through AudioDirector
  hapticChip(): void;        # routes through haptics
  /** Easter egg progress units per chip; 0 = disabled */
  chipRewardUnits: number;
}
```

### Integration points

| Hook | File / area |
|------|-------------|
| Title mount | `renderTitle()` — replace plain CSS h1 with wordmark host |
| Theme select | `theme().id === 'harbor' ? sand : ore` |
| Settings | Existing **reduced motion** + optional “Title effects” toggle |
| Audio | New short `ore-chip.ogg` (or reuse glass-tick) under `public/sfx/` |
| Economy | Only if easter egg enabled — call existing shard grant with daily cap |

### Render approach (v1 recommended)

1. **Canvas 2D overlay** sized to the title box (simpler than WebGL for portfolio).  
2. Build letter paths from measuring DOM text **or** fixed string path tables for `CRYSTALLINE`.  
3. Clip material fill to glyph silhouettes.  
4. DOM stays underneath for accessibility (aria label); canvas `pointer-events` for chips.  
5. Fallback: CSS gradient text + static ore image if canvas fails.

**v0 (prep, no physics):** CSS `background-clip: text` with faceted gradient + gold stroke — ships identity without full kinetic.

---

## 6. Crystalline vs Harbor — do not collapse identity

| Axis | Harbor | Crystalline |
|------|--------|-------------|
| Letter DNA | Tidepop (rounded casual) | **DragonBlaze (fantasy display)** |
| Material | Soft sand + water | **Hard rock + facet crystal** |
| Sound | Soft grit / drip | **Crystal tick / stone chip** |
| Light | Warm lantern caustics | **Cool mine specular + gold vein** |
| Emotion | Cozy scoop | **Prospect / mine** |
| Color wash | Teal / amber | **Purple chamber / gold ore** |

A player who plays both should say: *same studio ritual, different dig.*

---

## 7. Phased delivery

| Phase | Deliverable | Success signal |
|-------|-------------|----------------|
| **P0 Spec** | This doc + theme profile constants | Founder agrees ore fantasy |
| **P1 Static hero** | Title uses ore gradient clip + DragonBlaze; no physics | Looks “mined” in screenshot |
| **P2 Kinetic v1** | Tap chip + sparks + haptic on title only | Demo-able on device |
| **P3 Specular / tilt** | Light tracks pointer or DeviceOrientation (permissioned) | “Living crystal” feel |
| **P4 Map / cavern titles** | Same component on map hub + meta hub | Ritual appears twice per session |
| **P5 Easter egg** | Capped shard from chips | Optional delight; dashboard can show count |
| **P6 Harbor parity** | Sand profile same component | Dual-product brand video possible |

**Order vs studio sequence:** cores → octopus readable → **wordmark v1** → launch push (`STUDIO_FOCUS` §6). Do not block L151–300 content on full P5.

---

## 8. Accessibility & settings

| Setting | Behavior |
|---------|----------|
| Reduced motion | Static ore fill; chips optional or single flash |
| SFX off | No chip audio |
| Haptics off | No vibration |
| Title effects off (new optional) | Plain DragonBlaze gold text |

Always provide a **text fallback** for the product name (SEO / TalkBack).

---

## 9. Art & audio gather list (Crystalline ore)

| Asset | Spec | Priority |
|-------|------|----------|
| Ore-chip SFX | 40–80ms stone/crystal tick | P2 |
| Facet spark sheet | 6–8 frames, 64², additive | P2 |
| Optional static title treatment | 720-wide webp for boot splash | P1 |
| Trailer still | Finger chipping CRYSTALLINE | Marketing |

No third-party font purchase required for ore path if DragonBlaze licence is already cleared for shipping (confirm in `public/fonts` README / LEGAL).

---

## 10. Acceptance tests (when building)

1. Title shows **ore material** on Crystalline; Harbor still sand/Tidepop.  
2. Tapping title produces chip FX + haptic (if enabled).  
3. Moves/score never use material fill.  
4. Reduced motion → no particle loop.  
5. Easter egg cannot exceed daily/session cap.  
6. 60-second blind test: screenshot is recognizably **mine**, not harbor sand.  
7. Performance: title idle ≤ 1–2% CPU on mid Android (A54 class).

---

## 11. Open decisions for founder

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Wordmark string: `CRYSTALLINE` vs wordmark logo image? | Type-driven first (cheaper iteration) |
| 2 | Chip easter egg at launch? | **No** at P2; add P5 after economy calm |
| 3 | Tilt require permission prompt? | Pointer specular first; tilt optional |
| 4 | Same component for win “PERFECT CLEAR!”? | P4 only; keep win ceremony lean |
| 5 | Rename product display for kinetic? | Keep CRYSTALLINE |

---

## 12. Related docs

| Doc | Role |
|-----|------|
| `docs/STUDIO_FOCUS.md` §4 | Studio grammar (source of truth for “why”) |
| `docs/FONT_ASSESSMENT.md` | Face stacks; Tidepop vs DragonBlaze |
| `docs/CAMPAIGN_ARC.md` | Content scale — brand is independent of level count |
| `src/themes/crystalline.ts` / `harbor.ts` | `--font-title` hooks |

---

*Departure Bay Digital — prepare the dig before you ship the trailer.*
