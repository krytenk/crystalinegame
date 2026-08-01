# Theme packs — multi-game skin architecture

This repo runs **one pure-TS match-3 engine** with **product skins** (theme packs).

| Theme id | Product | Entry | Status |
|----------|---------|-------|--------|
| `crystalline` | Crystalline | `index.html` | Shipped (default) |
| `harbor` | Lantern Harbor | `harbor.html` or `?game=harbor` | Shipped sibling |
| `bakery` | Hearth Bakery | *(planned)* | Roadmap |
| `library` | Moonlit Library | *(planned)* | Roadmap |

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

## Adding a new skin (Bakery / Library)

1. Copy `src/themes/harbor.ts` → `bakery.ts` / `library.ts`
2. Register in `src/themes/runtime.ts`
3. Add `bakery.html` setting `window.__THEME__ = 'bakery'`
4. Generate art → `public/themes/bakery/` via a bake script
5. Vite MPA input for the new HTML entry

### Hearth Bakery (later)

- Pieces: pastries / ingredients  
- Meta: storefront restoration  
- Soft currency: **Warmth** or **Crumbs**  
- Conveyor: kitchen pass belt  

### Moonlit Library (later)

- Pieces: book spines / seals / ink  
- Meta: reading nook floors  
- Soft currency: **Ink** or **Quiet Hours**  
- Conveyor: returns cart  

## Asset bake

```bash
# Harbor (after Imagine sources land in session/raw)
python3 tools/bake_harbor.py
```

Crystalline assets remain under `public/gen/` and are **not** overwritten.
