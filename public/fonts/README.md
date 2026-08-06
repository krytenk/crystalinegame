# Custom fonts

See also **[docs/FONT_ASSESSMENT.md](../../docs/FONT_ASSESSMENT.md)** for genre fit and Tidepop notes.

## Active stack (wired in `src/ui/styles.ts`)

| Role | Face | Files | Used for |
|------|------|-------|----------|
| **Title (Crystalline)** | **DragonBlaze** | `DragonBlaze.woff2`, `DragonBlaze/*` | Logo, panel `h1`, cascade banners |
| **Title / Display (Harbor)** | **Tidepop** | `Tidepop/Tidepop-Bold.ttf` | Harbor wordmark + CTAs (OFL original) |
| **Title fallback** | Dragon Warrior | `DragonWarrior.ttf` | If Blaze fails to load |
| **Display (Crystalline)** | **Screen Techno** | `ScreenTechno.ttf` | Buttons, CTAs, HUD labels |
| **Display fallback** | Diamond Shape | `display.woff2` | Crystal-punch backup |
| **Accent (available)** | Bjorn Knight / Heroic Dragon | `BjornKnight.ttf`, `HeroicDragon.ttf` | `--font-accent` |
| **Body** | Nunito (Google) or `body.woff2` | — | Paragraphs, tips, long copy |

FontBundles faces (DragonBlaze etc.): commercial use covered by **user-owned FontBundles** subscription.  
**Tidepop:** SIL OFL 1.1 — original geometric face, **not** a Bon Bons Crush Legend clone.

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
