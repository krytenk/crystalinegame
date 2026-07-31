# Custom fonts (FontBundles)

Commercial use covered by a **FontBundles** subscription (user-owned licence).

## Active stack (wired in `src/ui/styles.ts`)

| Role | Face | Files | Used for |
|------|------|-------|----------|
| **Title** | **DragonBlaze** | `DragonBlaze.woff2`, `DragonBlaze/*` | Logo, panel `h1`, cascade banners, win chrome |
| **Title fallback** | Dragon Warrior | `DragonWarrior.ttf` | If Blaze fails to load |
| **Display** | **Screen Techno** | `ScreenTechno.ttf` | Buttons, CTAs, HUD labels, chapter tags |
| **Display fallback** | Diamond Shape | `display.woff2` | Crystal-punch backup |
| **Accent (available)** | Bjorn Knight / Heroic Dragon | `BjornKnight.ttf`, `HeroicDragon.ttf` | `--font-accent` (optional special callouts) |
| **Body** | Nunito (Google) or `body.woff2` | — | Paragraphs, tips, long copy |

## Catalogue on disk

| File | Notes |
|------|--------|
| `DragonBlaze.zip` | Full pack (includes huge bonus art — not needed at runtime) |
| `DragonBlaze/` | Runtime OTF/TTF/WOFF/WOFF2 |
| `Dragon Warrior.ttf` / `DragonWarrior.ttf` | Clean fantasy serif |
| `Bjorn Knight.ttf` / `BjornKnight.ttf` | Decorative fantasy |
| `Heroic Dragon.ttf` / `HeroicDragon.ttf` | Elegant fantasy display |
| `Screen Techno.ttf` / `ScreenTechno.ttf` | Modern geometric UI |
| `Super Neonix.ttf` | Neon outline — **not wired** (hard to read on busy boards) |
| `GalacticKnights-Regular.woff` | Previous title face (fallback) |
| `display.woff2` | Diamond Shape solid (fallback display) |
| `display-outline.woff2` | Diamond Shape outline |
| `Diamond Shape/` | Source package |

## Fit notes (Crystalline)

| Face | Title “CRYSTALLINE” | Buttons | Small HUD |
|------|---------------------|---------|-----------|
| DragonBlaze | Strong epic identity | Busy | No |
| Dragon Warrior | Clean fantasy | OK short | Marginal |
| Bjorn Knight | Decorative | Decorative | No |
| Heroic Dragon | Elegant | OK | Marginal |
| Screen Techno | Too tech alone | **Excellent** | Good |
| Super Neonix | Outline only | Poor contrast | No |
| Diamond Shape | Gem vibe | Punchy | No punctuation quirks |

**Current hybrid:** fantasy wordmark (**DragonBlaze**) + modern mobile CTAs (**Screen Techno**) + readable body (**Nunito**). Crystal-mine mood without losing legibility on a phone.

## How to swap

Edit CSS variables in `injectStyles()`:

```css
--font-title: "DragonBlaze", ...
--font-display: "ScreenTechno", ...
--font-accent: "BjornKnight", ...
--font-body: "Nunito", ...
```

Canvas strings in `main.ts` / `juice.ts` must list the same family names.

## Optional cleanup

- Runtime only needs `DragonBlaze.woff2` + the `.ttf` display faces above (~250KB), not the 87MB zip or Bonus PNGs.
- Preview PNGs `_preview_*.png` can be deleted; they are local review only.
