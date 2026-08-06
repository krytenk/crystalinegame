# Hearth & Crumb — product spec

**Working title:** Hearth & Crumb  
**Theme id:** `bakery`  
**Status:** Spec only — not implemented  
**Family:** Departure Bay match-3 vertical (shared engine, original-feeling product)  
**Parent doctrine:** [`../README.md`](../README.md) · `docs/STUDIO_FOCUS.md`

---

## 1. One-liner (store / pitch)

**Match warm pastries on a kitchen pass. Restock the hearth. Collect recipe cards. A cozy bakery match-3 — not a mine, not a harbor.**

Alternate titles if trademark-clear: *Hearth Oven*, *Crumb & Kindling*, *Dawn Bakery*.

---

## 2. Fantasy verb (must feel different)

| | Crystalline | Lantern Harbor | **Hearth & Crumb** |
|--|-------------|----------------|---------------------|
| Verb | Mine / forge | Sort / restore docks | **Bake / restock / serve** |
| Board | Crystal belt | Harbor sorting belt | **Kitchen pass / oven belt** |
| Soft currency | Essence | Tideglass | **Warmth** (or **Crumbs** — pick one and lock) |
| Premium | Shards | Harbor Tokens | **Sugar Coin** / **Butter Chips** |
| Meta hub | Living cavern | Harbor docks | **Storefront & kitchen** |
| Pride | Furnish the mine | Place on the pier | **Stock shelves + oven glory** |
| Companion | Geode warden | Captain Lumen | **Head Baker (or oven cat / flour spirit)** |
| Signature 6+ | Supernova / Super Chest | **Super Chest (octopus)** | **Oven Bloom** / **Proofing Cloud** (not a chest) |
| Bonus crack | Geode | Chest | **Proofing basket / sealed tart box** |
| Event | Mine Rush | Tide Rush | **Oven Rush** / **Morning Service** |
| Album | Crystal keepsakes | Harbor keepsakes | **Recipe cards / tin labels** |
| Material wordmark | Ore (mine on press) | Sand under water | **Flour dust / sugar grain** |

Player mental model: *I am running a bakery morning rush*, not *I am matching gems*.

---

## 3. Differentiation plan (King-style illusion)

### 3.1 Must ship (non-negotiable)

1. **No crystal / dock language** in UI, companion, store, or toasts.  
2. **Piece set** that reads as food/ingredients at a glance (not recolored gems).  
3. **Meta art** = storefront rooms, not piers or mines.  
4. **Signature special** art + juice unique to bakery (oven bloom, dough stretch, sugar burst) — **not** an octopus or geode.  
5. **Companion + lines** 100% bakery.  
6. **Separate** `saveKey`, package id, icon, product name.  
7. **First 30 seconds:** title wordmark + tagline must not mention match-3 crystals.

### 3.2 Strongly recommended (feel original)

| Lever | Bakery choice |
|-------|----------------|
| **Tutorial metaphor** | “Swap ingredients · forge a dough line · fire the oven special” |
| **Map UX** | “Kitchen floors” / “neighborhood ovens” place cards — not “places on the pier” |
| **Conveyor copy** | “Pass belt” / “service line active” — never “sorting belt” / “mine rails” |
| **Clear screen** | “ORDER UP!” / “PERFECT BAKE!” not “DOCK CLEAR” |
| **Continue** | “One more tray?” / “Don’t waste the batch” |
| **SFX** | Ceramic, oven door, sugar pour, timer bell — not water or pickaxe |
| **Color system** | Warm cream, copper, jam red, pistachio — not teal harbor night |
| **Level name bank** | Culinary / morning-rush titles |

### 3.3 Optional “rules illusion” (same mechanics, different emphasis)

Without forking the engine, bias **content + presentation**:

| Trick | Implementation |
|-------|----------------|
| Early campaign emphasizes **score / cascade** | Level gen / chapter design lean |
| Mid campaign **crust = burnt sugar shell / sugar crust** | Copy + art only |
| **Collect = delivery parcels / cake toppers** drop to bottom | Art + labels |
| **Defuse = kitchen timers** (bombs) | Art + “timer” copy, not bombs |
| **Contain = smoke / steam** | Shadow art as steam clouds |
| Signature juice for 6+ is **oven bloom** (screen flash warm, rising particles) | `juice` theme hooks later |

Players remember **verbs and threats**, not color ids.

### 3.4 What you will *not* change (and that’s OK)

Match-3 geometry, special footprints, lives, continue, economy ladder shape, album/event *systems*. King doesn’t either — they change the **story of the thumb**.

---

## 4. Product identity

| Field | Value |
|-------|--------|
| `ThemeId` | `bakery` |
| Entry | `bakery.html` · `window.__THEME__ = 'bakery'` · `?game=bakery` |
| `saveKey` | `bakery.save` |
| `ahaKey` | `bakery.ahaDone` |
| `adShortKey` | `bakery.adShortIndex` |
| Package id (APK) | `ca.departurebaydigital.hearthcrumb` (or final name) |
| Asset root | `public/themes/bakery/` |
| Theme module | `src/themes/bakery.ts` |
| Bake script | `tools/bake_bakery.py` (clone harbor bake) |

---

## 5. Soft currency & economy copy

| Concept | Bakery |
|---------|--------|
| Soft | **Warmth** — “heat held in the hearth from good service” |
| Soft glyph fallback | letter **W** or oven icon only |
| Premium | **Sugar Coin** |
| Idle claim | “Overnight proof” / “Kitchen idle” |
| Daily | “Today’s service” |
| Shop | Bundles named like *Starter Pantry*, *Sugar Vault*, *Clear Skies* → *Quiet Kitchen* (ad pass) |

Essence-for-win formula **shared**; only labels/art change.

---

## 6. Meta hub — Storefront restoration

**Hub name:** The Hearth / **Your Shop**  
**CTA:** Restock the shop  

### Stages (4 at launch parity; 5–6 later with family)

| Stage | Working name | Tagline |
|-------|--------------|---------|
| 1 | Front Window | First light on the glass. |
| 2 | Work Table | Flour, orders, and the morning rush. |
| 3 | Oven Wall | Where six-match storms become bread. |
| 4 | Festival Counter | A line out the door only the stubborn earn. |

**Props (examples — 3–4 per stage):** copper scale, jam jars, proofing baskets, chalkboard menu, oven door, recipe book stand, cat on flour sack, festival bunting.

**Place ceremony:** “YOURS IN THE SHOP” · “SEE MY SHOP”  
**Idle:** Warmth drip from furnishings (`idleRatePerHour` shared formula).

---

## 7. Powers & signature fantasy

| Engine kind | Bakery name | Fantasy |
|-------------|-------------|---------|
| line | **Dough Rift** / Rolling Pin Line | Stretch of dough across a row/col |
| burst | **Oven Burst** / Crumb Burst | L/T pastry detonation |
| prism | **Glaze Prism** / Sugar Seal | Color clear = glaze type |
| supernova | **Oven Bloom** | Whole-pass heat wave — **not** Super Chest |

**Combo labels:** bakery idioms (*Twin Trays*, *Proofing Storm*, *Double Bloom*…).

**Juice (later):** warm orange bloom, flour puffs, rising steam — never tentacles.

---

## 8. Map & campaign

- Reuse **level catalogue** (1–150) if desired; **must** retheme chapter titles.  
- Map UI: place cards = kitchen zones / street ovens (not piers).  
- Chapters I–XV bakery names (e.g. *First Knead*, *Sugar Lane*, *Midnight Oven*…).  
- Arc 2 (151–200) only after family parity (`STUDIO_FOCUS` §14).

---

## 9. Companion

| | |
|--|--|
| Name | **Mira Hearth** (or flour-spirit **Pip**) |
| Role | Head baker / dawn shift lead |
| Tone | Warm, brisk, encouraging — never nautical or mining |
| Art | Original Imagine character; consistent across UI |

All `CompanionBeat` lines rewritten.

---

## 10. Material wordmark (brand)

- **Profile:** `flour` — soft particles, dust drift, press “kneads” or scatters sugar.  
- Hero only: product title, map hub title, clear headlines.  
- Optional easter egg: capped “pinch flour → Warmth dust” (same rules as ore/sand caps).

---

## 11. Art & audio checklist

### Art (`public/themes/bakery/`)

- [ ] Board piece atlas (6 colours + specials + blockers themed)  
- [ ] VFX sheets (no black plates; real alpha)  
- [ ] UI: lives, currency, goals, tools, banners, map bg, shop  
- [ ] Meta stages 1–4 + prop icons  
- [ ] Companion  
- [ ] Title floaters (pastry set, not harbor gems)  
- [ ] Launcher icons  

### Audio (gather list later)

- Oven ding, dough thump, sugar pour, ceramic plate, soft whoosh  

---

## 12. 60-second blind test

A tester who knows Harbor plays Bakery cold:

| Fail if… | Pass if… |
|----------|----------|
| Sees teal dock chrome | Sees warm kitchen palette |
| Reads “Tideglass / Super Chest / docks” | Reads Warmth / Oven Bloom / shop |
| Recognizes piece silhouettes as harbor cargo | Reads as food/ingredients |
| Same companion face | New baker character |
| Map says “pier places” | Map says kitchen / shop floors |

---

## 13. Build steps (implementation)

1. `src/themes/bakery.ts` from harbor template — all copy/paths  
2. Register `ThemeId` + `runtime.ts` + `bakery.html`  
3. `tools/bake_bakery.py` + Imagine asset pipeline  
4. `tools/build-android-bakery-apk.mjs` (unique applicationId)  
5. Pitch one-pager `docs/verticals/bakery/PITCH.md`  
6. Differentiation QA checklist above  

**Do not** start until Harbor/Crystalline launch path is stable (`STUDIO_FOCUS` §6).

---

## 14. Out of scope (this vertical)

- Engine rule forks  
- Real IAP  
- Shared save with Harbor  
- Reusing harbor companion or Super Chest art  

---

*Working title may change; theme id `bakery` should stay stable in code.*
