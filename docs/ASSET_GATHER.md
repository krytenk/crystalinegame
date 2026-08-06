# Sounds & VFX to gather — Lantern Harbor

**Goal:** replace the current **mine/glass/whoosh** bank so Harbor no longer *sounds* like Crystalline.  
**Format targets:** mono OGG Vorbis, ~−14 LUFS peak-normalized, under 1.5s for hits, 2–4s for stingers.  
**Sources:** freesound.org / Pixabay / own phone foley / AI SFX — **commercial licence**, keep attribution file.

---

## A. Must-have SFX (gameplay loop)

| Priority | Clip ID (filename) | Role | Direction (record / buy) | Length |
|----------|--------------------|------|---------------------------|--------|
| P0 | `harbor-match-pop.ogg` | Match-3 clear | Soft wooden *tok* + light water drip (not glass shatter) | 80–150ms |
| P0 | `harbor-match-tick.ogg` | Small chip / crust-like | Rope creak or crate lid click | 40–80ms |
| P0 | `harbor-cascade-1..4.ogg` | Cascade pitch ladder | Same family as pop, rising ~1 semitone each | 80–120ms each |
| P0 | `harbor-swap.ogg` | Valid swap | Soft cloth / soft *whoosh* over wood | 60–100ms |
| P0 | `harbor-reject.ogg` | Invalid swap bounce | Muted *bonk* / rubber | 80–120ms |
| P0 | `harbor-ui-tap.ogg` | Button / UI | Soft parchment or ceramic tap | 30–50ms |
| P0 | `harbor-win.ogg` | Level clear | Short festival chime + distant harbor bell | 1.2–2.0s |
| P0 | `harbor-lose.ogg` | Fail | Soft descending wood block + fog horn *very* quiet | 0.8–1.5s |
| P1 | `harbor-line.ogg` | Line special (Belt Rift) | Fast rope whip / belt rumble | 200–400ms |
| P1 | `harbor-burst.ogg` | Crate Burst | Crate crack + soft splash | 300–500ms |
| P1 | `harbor-prism.ogg` | Signal Prism | Glass lantern *ting* + sparkle | 300–500ms |
| P1 | `harbor-supernova.ogg` | Festival Bloom | Festival bloom / fireworks soft + bell | 600–1200ms |
| P1 | `harbor-conveyor.ogg` | Conveyor row shift | Short belt roller / chain | 150–300ms |
| P1 | `harbor-drop.ogg` | Gravity land | Soft *thud* stack of crates | 50–90ms |
| P1 | `harbor-core-spawn.ogg` | Beacon Core appears | Warm lantern ignite | 250–400ms |
| P1 | `harbor-core-claim.ogg` | Beacon Core tap | Satisfying *chime* | 200–350ms |
| P2 | `harbor-title.ogg` | Title sting | Short nautical-cozy fanfare | 0.8–1.2s |
| P2 | `harbor-place.ogg` | Meta prop placed | Wooden dock *thunk* + gull far | 400–700ms |
| P2 | `harbor-idle-claim.ogg` | Idle Tideglass claim | Coin/shell clink soft | 150–250ms |
| P2 | `harbor-album-seal.ogg` | Album page complete | Stamp / wax seal | 200–350ms |
| P2 | `harbor-booster.ogg` | Booster armed | Soft sparkle | 150–250ms |

**Optional ambience (loop, duck under SFX):**  
`harbor-ambience-loop.ogg` — distant water + quiet dock night (8–20s seamless loop).

### Licence checklist when gathering
- [ ] Commercial use allowed (or public domain)
- [ ] Attribution text saved in `public/sfx/harbor/ATTRIBUTION.md`
- [ ] No trademarked character voices
- [ ] No stolen Candy Crush / King audio

---

## B. Must-have VFX (visual)

Current Harbor VFX are soft particle sheets from one burst still — **replace** with harbor-native clips.

| Priority | Asset | Spec | Notes |
|----------|--------|------|--------|
| P0 | Match 3 burst sheet | 4×4 or 16 frames, 320², transparent | Lantern spark / soft amber pop |
| P0 | Match 4 burst | ~18 frames, 384² | Crate splinter soft (cozy, not gore) |
| P0 | Match 5 burst | ~20 frames, 416² | Shell splash + teal |
| P0 | Match 6+ burst | ~24 frames, 480² | Festival lantern bloom (screen blend OK) |
| P1 | Line clear streak | Horizontal + vertical, 8–12 frames | Rope/light trail |
| P1 | Burst radius ring | 10–14 frames | Expanding harbor glow |
| P1 | Conveyor dust | Looping 8 frames | Belt grit / soft steam |
| P1 | Tile drop dust | 6 frames | Soft impact puff |
| P2 | Win confetti | Lantern confetti / paper | No candy shapes |
| P2 | Idle sparkle | Loop on diorama | Fireflies / lamp spark |
| P2 | Beacon Core spin | 6×2 sheet @ 96px (already have placeholder) | Improve quality |

### VFX delivery format
- WebP sheets, **no cell borders**, subject centered per cell  
- Or short MP4 → bake with `tools/bake_vfx.py` style pipeline  
- Manifest entries already exist for tiers 3–6 under `themes/harbor/gen/`

---

## C. What you already have (Harbor)

| Area | Status |
|------|--------|
| Board pieces atlas | Present (`themes/harbor/gen/crystals@*.webp`) |
| Meta stages + icons | Present |
| Companion | Captain Lumen present |
| UI banners / map | Present |
| App icon source | `themes/harbor/ui/ic_launcher_*.png` + 512 |
| SFX | **Still crystalline glass/whoosh** — replace with list A |
| Match VFX sheets | Placeholder soft bursts — replace with list B |

---

## D. Suggested free search keywords

**SFX:** `wooden crate impact short`, `rope whip short`, `soft ui click mobile`, `harbor bell short`, `water drip single`, `paper lantern`, `festival sparkle chime`, `belt conveyor short`, `coins soft clink`.

**VFX refs (style only):** cozy mobile match VFX, lantern spark, soft splash, paper confetti night festival — **do not** copy any title’s exact frames.
