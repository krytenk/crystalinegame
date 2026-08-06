# Moonlit Stacks — product spec

**Working title:** Moonlit Stacks  
**Theme id:** `library`  
**Status:** Spec only — not implemented  
**Family:** Departure Bay match-3 vertical (shared engine, original-feeling product)  
**Parent doctrine:** [`../README.md`](../README.md) · `docs/STUDIO_FOCUS.md`

---

## 1. One-liner (store / pitch)

**Match luminous books and seals by moonlight. Restore the reading rooms. Collect rare editions. A quiet library match-3 — thoughtful, not candy, not coastal cargo.**

Alternate titles: *Lampblack Library*, *Quiet Stacks*, *After-Hours Archive*.

---

## 2. Fantasy verb (must feel different)

| | Crystalline | Lantern Harbor | Hearth & Crumb | **Moonlit Stacks** |
|--|-------------|----------------|----------------|---------------------|
| Verb | Mine / forge | Sort / restore | Bake / restock | **Shelve / restore / quiet** |
| Board | Crystal | Harbor belt | Kitchen pass | **Returns cart / reading table** |
| Soft currency | Essence | Tideglass | Warmth | **Ink** (or **Quiet Hours**) |
| Premium | Shards | Harbor Tokens | Sugar Coin | **Bookmarks** / **Seals** |
| Meta hub | Cavern | Docks | Shop | **Library floors / reading nooks** |
| Pride | Furnish mine | Place on pier | Stock shop | **Open rooms, place lamps & shelves** |
| Companion | Warden | Captain Lumen | Head baker | **Night librarian / archive moth / owl** |
| Signature 6+ | Supernova | Super Chest octopus | Oven Bloom | **Index Bloom** / **Story Wyrm** / **Catalogue Seal** |
| Bonus crack | Geode | Chest | Tart box | **Sealed folio / wax-locked volume** |
| Event | Mine Rush | Tide Rush | Oven Rush | **Quiet Hours** / **Night Catalogue** |
| Album | Crystals | Keepsakes | Recipes | **Edition plates / bookplates** |
| Material wordmark | Ore | Sand-water | Flour | **Ink in water / paper grain / dust motes** |

Player mental model: *I am putting a moonlit library back together*, not *I am matching gems or sorting crates*.

---

## 3. Differentiation plan (King-style illusion)

### 3.1 Must ship (non-negotiable)

1. **Zero** mine / harbor / bakery leak copy.  
2. Pieces read as **spines, seals, ink pots, ribbons, moons** — not pastries or cargo.  
3. Meta = **reading rooms**, not docks or ovens.  
4. Signature 6+ is **literary/magical quiet spectacle** (pages, seals, constellation of lights) — **not** octopus or oven.  
5. Companion exclusive to library.  
6. Own save keys, package id, icon.  
7. Tone: **calmer, later-evening** than Harbor’s festival or Bakery’s rush.

### 3.2 Strongly recommended

| Lever | Library choice |
|-------|----------------|
| **Tutorial** | “Swap volumes · seal a chapter line · open the catalogue special” |
| **Map** | Floors / wings / galleries as place cards |
| **Conveyor** | “Returns cart” / “shelving line” |
| **Clear** | “SHELVED!” / “QUIET CLEAR!” / “PERFECT EDITION!” |
| **Continue** | “Keep the lamp lit?” / “One more shelf?” |
| **SFX** | Page turn, soft stamp, wood shelf, distant clock — no water, no oven ding |
| **Palette** | Deep indigo, lamp gold, burgundy spine, cream paper |
| **Boss framing** | “Restricted section” / “Overdue storm” — still multi-objective under the hood |

### 3.3 Optional rules illusion (presentation + content bias)

| Trick | Library skin |
|-------|----------------|
| Crust | **Dust jackets / sealed bindings** |
| Bombs | **Overdue stamps / timer candles** |
| Relics collect | **Rare editions** falling to the returns desk |
| Shadow contain | **Gloom / unlit stacks** (steam of Harbor → dust of Library) |
| Score chapters | Early campaign more “quiet careful” contain/collect; less pure cascade chaos than Bakery |
| 6+ juice | Pages orbit, wax seal crack, soft starfield — **no tentacles, no flour explosion** |

### 3.4 Shared under the floorboards

Same match rules, lives, continue, DDA, album/event systems, optional shared level layouts with new names.

---

## 4. Product identity

| Field | Value |
|-------|--------|
| `ThemeId` | `library` |
| Entry | `library.html` · `__THEME__ = 'library'` · `?game=library` |
| `saveKey` | `library.save` |
| `ahaKey` | `library.ahaDone` |
| `adShortKey` | `library.adShortIndex` |
| Package id | `ca.departurebaydigital.moonlitstacks` |
| Asset root | `public/themes/library/` |
| Theme module | `src/themes/library.ts` |
| Bake script | `tools/bake_library.py` |

---

## 5. Soft currency & economy copy

| Concept | Library |
|---------|---------|
| Soft | **Ink** — “gathered from careful clears; spends into the stacks” |
| Fallback glyph | **I** or ink-pot art only |
| Premium | **Bookmarks** |
| Idle | “After-hours drip” / “Lamp still warm” |
| Daily | “Tonight’s quiet hours” |
| Ad pass | **Clear Lamps** / **Undisturbed Reading** (not Clear Skies) |

---

## 6. Meta hub — Restore the library

**Hub name:** The Stacks / **Your Library**  
**CTA:** Restore the rooms  

### Stages (launch parity)

| Stage | Working name | Tagline |
|-------|--------------|---------|
| 1 | Entrance Hall | First lamp in the dark. |
| 2 | Reading Nook | Chairs, soft light, open pages. |
| 3 | Restricted Wing | Seals and overdue storms. |
| 4 | Moon Gallery | A skylight only the patient open. |

**Props (examples):** brass lamp, rolling ladder, card catalogue, globe, moth mobile, wing chair, stained glass moon, rare case.

**Place ceremony:** “YOURS IN THE STACKS” · “SEE MY LIBRARY”

---

## 7. Powers & signature fantasy

| Engine kind | Library name | Fantasy |
|-------------|--------------|---------|
| line | **Chapter Line** / Spine Rift | A shelf-row clears |
| burst | **Seal Burst** | Wax seal cracks a cluster |
| prism | **Index Prism** / Catalogue Seal | Color = subject index |
| supernova | **Story Wyrm** or **Index Bloom** | Pages spiral; quiet full-board read |

**Avoid:** Super Chest, Oven Bloom, Festival Bloom names.

**Combo labels:** *Twin Spines*, *Quiet Collapse*, *Double Catalogue*…

---

## 8. Map & campaign

- Themed chapters I–XV (e.g. *Lampblack Lane*, *Dewey Deep*, *Overdue Hollow*…).  
- Place cards = wings/floors.  
- Arc 2 after family parity; stagger vs Harbor/Bakery drops.

---

## 9. Companion

| | |
|--|--|
| Name | **Archivist Quill** or **Miss Lampblack** |
| Role | Night librarian |
| Tone | Soft, wry, precise — never shouty candy or salty captain |
| Art | Original; lantern + book motifs OK if **not** Captain Lumen |

---

## 10. Material wordmark (brand)

- **Profile:** `ink` or `paper` — ink blooms in water, or paper-fiber grain with dust motes.  
- Press: ink spreads then settles; or dust falls off letterforms.  
- Hero only; optional capped easter-egg “press letters → Ink dust.”

---

## 11. Positioning vs siblings (store)

| Product | Emotional promise |
|---------|-------------------|
| Crystalline | Epic crystal mine power fantasy |
| Lantern Harbor | Cozy coastal festival / sort |
| Hearth & Crumb | Warm morning bakery energy |
| **Moonlit Stacks** | **Quiet, bookish, night calm** |

If two products share the same energy, rename until the **feeling** differs. Library must not be “Harbor but purple.”

---

## 12. Art & audio checklist

### Art (`public/themes/library/`)

- [ ] Board atlas (spines/seals/ink — distinct silhouettes from bakery/harbor)  
- [ ] VFX with real alpha  
- [ ] Full UI chrome set  
- [ ] Meta stages + props  
- [ ] Companion  
- [ ] Title floaters (books/moons)  
- [ ] Launcher icons  

### Audio

- Page flutter, stamp, wood creak, soft chime, cloth  

---

## 13. 60-second blind test

| Fail | Pass |
|------|------|
| “This is Harbor at night” | “This is a library game” |
| Cargo/pastry pieces | Spines/seals readable |
| Captain or baker face | Librarian exclusive |
| Tideglass / Warmth leaks | Ink / Bookmarks only |
| Super Chest / Oven Bloom | Story Wyrm / Index Bloom |

---

## 14. Build steps

1. `src/themes/library.ts`  
2. Register theme + `library.html`  
3. Bake pipeline + assets  
4. Android package script with unique id  
5. `docs/verticals/library/PITCH.md`  
6. Blind differentiation QA vs Harbor **and** Bakery  

---

## 15. Out of scope

- Engine forks  
- Shared saves  
- Reuse of Super Chest octopus or bakery oven as signature  
- Candy-bright UI that fights “quiet night” promise  

---

*Working title may change; theme id `library` stays stable in code.*
