# Super Chest & Octopus — brand bible (Harbor peak)

**Status:** Locked (2026-08-05)  
**Products:** Lantern Harbor (primary). Crystalline twin is **Living Geode / Supernova** — no octopus.  
**Engine kind:** `piece.kind === 'supernova'` (shared code name; theme copy differs).

---

## 1. Decision (do not reopen lightly)

| Choice | Locked answer |
|--------|----------------|
| Keep the octopus? | **Yes** — Harbor signature mascot |
| Is the board tile a biological octopus? | **No** — tile is the **Super Chest** |
| When does the octopus “live”? | **Peak feast** (activate) + optional peek on idle chest |
| Full character animation (always-on breathe, 8-arm IK, blink states)? | **No for launch** — too expensive |
| “Living enough”? | **Breathe pulse + feast performance** (A+B, not AAA actor) |
| Exile octopus to rare super-event only? | **No** — encore later OK; peak feast is home |
| Mining crew from screen edges? | **No** — overbuild; not the peak special |
| Change clear rules? | **No** — same feast / pull / board resolve; fantasy only |

**Design test:** Mute 3-second gif must read *chest opens → cute octopus works the board → gems come home* — not *a match piece grew tentacles*.

---

## 2. Roles

| Layer | Harbor | Crystalline |
|-------|--------|-------------|
| **Idle board piece** | Super Chest (treasure silhouette; octopus may **peek** on lid) | Living Geode / star-core (faceted; no limbs) |
| **Activate feast** | Lid open → mascot **wakes** → **arms** grab prey → pull in → festival bloom | Core **cracks** → prism **vein rays** pull shards → shatter dazzle |
| **Player copy** | Super Chest | Living Geode (power name) / Supernova banner OK as shorthand |
| **Results recap** | Super Chest + octopus_chest art | Living Core path / geode art |

**Cross-rhyme without sameness:** same *job* (peak 6+ special ceremony), different *costume*. Harbor keeps **arms**; mine keeps **rays**. Do not convert Harbor feast to pure light rays.

---

## 3. Beat sheet — Super Chest feast (Harbor)

Total budget ~1.0–1.1s (must finish before cascade UI steals focus).

| Phase | Time (norm) | Visual | Audio (intent) |
|-------|-------------|--------|----------------|
| **Open** | 0.00–0.12 | Soft teal/gold open flash; body pops in; **no full arms yet** | Chest open / soft whoosh |
| **Wake** | 0.08–0.25 | Octopus body **breathes** (scale + slight Y bob); eyes readable | Wet glass / cute stir |
| **Reach** | 0.12–0.45 | Arms extend to prey (S-curve, suckers); ambient arms fill silhouette | Limb plucks |
| **Wrap** | 0.40–0.56 | Tips hook gems | Grab tick |
| **Pull** | 0.56–0.95 | Prey rides arms home; chomp pulse on body | Treasure / feast sting |
| **Bloom** | 0.85–1.0 | Rings + soft teal flash; fade | Chime resolve |

**Not required:** pathfinding NPCs, lid bone animation, per-frame blink state machine.

---

## 4. Beat sheet — Living Geode feast (Crystalline)

| Phase | Visual |
|-------|--------|
| **Crack** | Hairline prism cracks / facet spokes on core |
| **Ray** | Thin gold / void / white **vein rays** to prey (not tentacles) |
| **Pull** | Shards travel along rays into core |
| **Shatter dazzle** | White/gold/purple burst + screen flash |

---

## 5. Art rules

### Idle Super Chest (board atlas / placeholder)

- Silhouette = **chest** first (box + lid + clasp).  
- Octopus is **passenger**: small dome / eyes on lid, not full-body creature filling the cell.  
- Palette locked to `octopus_chest` art: teal dorsal, coral belly accents, gold hardware.  
- Badge / a11y label: **CHEST** (not NOVA, not OCTO).

### Feast body

- Prefer `themes/harbor/gen/octopus_chest_128.webp` (or higher) via `JuiceSystem.setKrakenBodySrc`.  
- Procedural fallback: cute teal head + eyes + chomp (already in `drawKrakenBody`).  
- Breathe: ~4–8% scale sine + slight Y bob; chomp on pull phase only.

### Arms

- Keep sucker arms — they **are** the mascot body language.  
- Optional: soft lantern/gold tip highlight so pull reads on dark boards.  
- Attach under / at chest edge so arms grow from the chest, not from empty cell center only.

### What not to ship as “living”

- Always-on 8-limb idle on every Super Chest tile.  
- Separate crew characters chipping gems.  
- New engine clear rules for “octopus AI.”

---

## 6. Code map (implementation)

| Concern | Location |
|---------|----------|
| Engine kind | `supernova` (unchanged) |
| Theme names | `harbor.powerNames.supernova` = Super Chest; crystalline = Living Geode |
| Board fantasy | `BoardView.peakFantasy`: `'superchest' \| 'supernova'` |
| Board paint | placeholder `superchest` vs `supernova` |
| Feast | `juice.krakenFeast` / `supernovaFeast` via `peakSpecialFeast` |
| Sprite load | `juice.setKrakenBodySrc(assetUrl(...))` on Harbor boot |
| Audio | Harbor supernova → Super Chest sting; mine → generic peak |

---

## 7. Later (not launch blockers)

- Super-event encore: octopus on map / chapter boss / album (in *addition* to peak feast).  
- Higher-res feast sprite / lid open frames if art budget allows.  
- Limb v2 wrap polish (already tracked in studio backlog).

---

## 8. Related

- [`STUDIO_FOCUS.md`](./STUDIO_FOCUS.md) §5 spectacle  
- [`CAMPAIGN_ARC.md`](./CAMPAIGN_ARC.md) signature pillars  
- [`THEMES.md`](./THEMES.md) theme pack contract  
