# Theme packs — multi-game skin architecture

This repo runs **one pure-TS match-3 engine** with **product skins** (theme packs).

| Theme id | Product | Entry | Status |
|----------|---------|-------|--------|
| `crystalline` | Crystalline | `index.html` | Shipped (default) |
| `harbor` | Lantern Harbor | `harbor.html` or `?game=harbor` | Shipped sibling |
| `bakery` | Hearth & Crumb | *(planned)* | Spec: `docs/verticals/bakery/SPEC.md` |
| `library` | Moonlit Stacks | *(planned)* | Spec: `docs/verticals/library/SPEC.md` |

## Contract

See `src/themes/types.ts` → `ThemeConfig`.

A pack owns:

- Product name, tagline, storage keys (`saveKey`, `ahaKey`, ad rotation)
- Soft/premium currency labels
- Meta stages + upgrade catalogue + art paths
- Album card catalogue + sheet path
- Companion name/art/lines
- Map chapters
- Store copy overlay (SKU names/blurbs)
- Palette + CSS variables
- Asset root under `public/`

Engine color ids (`ember` … `void`) stay stable. Skins remap **display names and art only**.

## Boot

```ts
const id = resolveThemeId(); // window.__THEME__, ?game=, or harbor.html path
const t = setTheme(id);
installMetaTheme(t.metaStages, t.metaUpgrades);
installAlbumTheme(t.albumSheet, t.albumCards);
installCompanion(...);
// Economy({ saveKey: t.saveKey })
```

## Theme surface (full)

| Field | Purpose |
|-------|---------|
| `metaStages` / `metaUpgrades` | Diorama catalogue |
| `albumCards` / `albumSheet` | Endless album |
| `event` | Hybrid event id prefix, milestones, league tiers |
| `powerNames` / `comboLabels` | Specials + combo toast names |
| `placeCeremony` | Placement reel paths + caption (`webm`/`mp4` empty = still only) |
| `labels` / `cssVars` / `storeCopy` | UI chrome |

Boot installs all of the above before `Economy` loads:

```ts
installMetaTheme / installAlbumTheme / installEventTheme / installPowerCopy / installCompanion
```

## Adding a new skin (Bakery / Library)

1. Copy `src/themes/harbor.ts` → `bakery.ts` / `library.ts`
2. Register in `src/themes/runtime.ts`
3. Add `bakery.html` setting `window.__THEME__ = 'bakery'`
4. Generate art → `public/themes/bakery/` via a bake script
5. Vite MPA input for the new HTML entry
6. Fill `event`, `powerNames`, `comboLabels`, `placeCeremony`

### Bakery / Library

Full product specs (differentiation doctrine, not paint-only reskins):

- [`docs/verticals/README.md`](./verticals/README.md) — family + “not a reskin” checklist  
- [`docs/verticals/bakery/SPEC.md`](./verticals/bakery/SPEC.md) — **Hearth & Crumb**  
- [`docs/verticals/library/SPEC.md`](./verticals/library/SPEC.md) — **Moonlit Stacks**  

## Leftovers / next content (not blocking)

| Item | Status |
|------|--------|
| Harbor placement reel video | Optional — still uses stage still (no mine reel) |
| CSS class names `.cavern-*` | Cosmetic; rename later if desired |
| Bakery / Library implementation | After launch path; see verticals specs |
| Harbor-specific placement whoosh SFX | Shared whoosh bank is fine |

## Asset bake

```bash
# Harbor (after Imagine sources land in session/raw)
python3 tools/bake_harbor.py
```

Crystalline assets remain under `public/gen/` and are **not** overwritten.
