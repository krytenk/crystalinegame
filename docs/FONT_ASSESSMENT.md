# Font assessment — Crystalline stack + Harbor direction

## 1. What is on disk today

| Face | Role today | Strengths | Weaknesses for casual match-3 |
|------|------------|-----------|--------------------------------|
| **DragonBlaze** | Title / wordmark (Crystalline) | Epic fantasy identity | Wrong genre for candy/cozy match-3; busy at small sizes |
| **Dragon Warrior** | Title fallback | Cleaner fantasy | Still medieval, not “casual mobile” |
| **Screen Techno** | Buttons / HUD / CTAs | Readable, modern, good on embossed buttons | Tech/sci-fi; not soft/bubbly; competes with candy genre |
| **Diamond Shape** (`display.woff2`) | Display fallback | Faceted “gem” vibe for crystals | Odd punctuation; not cozy harbor |
| **Bjorn Knight / Heroic Dragon** | Accent (barely used) | Decorative | Unreadable in UI chrome |
| **GalacticKnights** | Legacy fallback | Distinct | Outdated look |
| **Super Neonix** | Not wired | Neon outline | Poor contrast on busy boards |
| **Nunito** (Google) | Body | Excellent body readability | Not a display face |
| **CrystallineBody** (`body.woff2`) | Body fallback | Local body | Confirm licence if shipping |

### Fit score for *genre* (casual match-3 / cozy puzzle)

| Face | Genre fit (1–5) | Keep for Crystalline? | Keep for Harbor? |
|------|-----------------|------------------------|------------------|
| DragonBlaze | 2 | Yes (mine fantasy) | No as title |
| Screen Techno | 2 | Yes (UI clarity) | No as primary |
| Diamond Shape | 3 | Optional gem accent | No |
| Nunito | 5 body / 2 display | Yes body | Yes body |
| **Tidepop (new)** | 4–5 display* | Optional alt | **Yes primary** |

\*v1 is geometric/bold-rounded; refine glyph quality over time.

---

## 2. “Bon Bons Crush Legend” — what you want without paying $129

**We will not copy or reverse-engineer that commercial face.**  
What players *feel* from that genre (scènes à faire — free to pursue):

| Trait | Implementation approach |
|-------|-------------------------|
| Soft, rounded terminals | Stadium/circle construction |
| Heavy weight / “puffy” | Thick strokes, large counters |
| High energy CTAs | Slightly condensed, tall x-height |
| Readable on buttons | Avoid thin outlines-only |
| Candy-adjacent without brand | No distinctive Bon Bons letter quirks; original name **Tidepop** |

### Legal stance
- Typeface **copyright** protects the font software/outlines, not the abstract idea “rounded bold casual.”  
- Our face is **procedurally constructed geometry**, named **Tidepop**, licensed **OFL 1.1**.  
- Do **not** market as “Bon Bons alternative” or “Crush Legend clone.” Market as original casual display.

### Free OFL / Google Fonts you can also trial (no $129)

| Font | Why useful | Link-style |
|------|------------|------------|
| **Fredoka** | Rounded casual, very popular free | Google Fonts |
| **Baloo 2** | Soft display, playful | Google Fonts |
| **Nunito Black** | Already in stack; safe body/CTA hybrid | Google Fonts |
| **Sniglet** / **Bubblegum Sans** | More cartoon | Check licence |
| **Sofia Sans Condensed** | Strong UI | Google Fonts |

You can A/B Tidepop vs Fredoka on Harbor before locking.

---

## 3. Tidepop (shipped in repo)

| Item | Path |
|------|------|
| Font | `public/fonts/Tidepop/Tidepop-Bold.ttf` |
| Licence | `public/fonts/Tidepop/OFL.txt` |
| Builder | `tools/build_tidepop_font.py` → `python3 tools/build_tidepop_font.py` |
| Wired for Harbor | `--font-title` / `--font-display` in `src/themes/harbor.ts` |
| @font-face | `src/ui/styles.ts` → family `"Tidepop"` |

### Coverage (v1)
- A–Z (lowercase maps to same caps — display face)  
- 0–9, space, `!` `.` `-`  
- Not a text face — **titles, CTAs, HUD chips only**

### Quality honesty
v1 is a **usable placeholder identity** (bold rounded geometric). It will not fool a type designer into thinking it’s a $129 retail face — and that is correct. Next upgrades:
1. Manually redraw problem glyphs (S, K, W, digits) in FontForge  
2. Add proper sidebearings / kerning pairs for `LA`, `TO`, `AV`  
3. Optional outline style for win banners  
4. Export WOFF2 for web weight

---

## 4. Recommended stacks

### Crystalline (market) — keep fantasy hybrid
```
Title:   DragonBlaze
Display: ScreenTechno
Body:    Nunito
```

### Lantern Harbor — casual match-3
```
Title:   Tidepop
Display: Tidepop (or Fredoka if you prefer polished free)
Body:    Nunito
```

### If you want Crystalline more “King casual”
Swap title only to Tidepop **or** Fredoka — but then mine fantasy softens. Prefer keeping DragonBlaze for Crystalline brand split.

---

## 5. How to swap later

Harbor: edit `cssVars` in `src/themes/harbor.ts`.  
Crystalline: edit `:root` in `src/ui/styles.ts` / crystalline theme.  
Canvas strings in `main.ts` that hardcode font families should use the same CSS variable families (Harbor already uses Tidepop via CSS for DOM; canvas title still uses DragonBlaze in places — optional follow-up to theme canvas fonts).

## 6. Kinetic material wordmarks

Studio brand ritual (Harbor sand · Crystalline ore) is specified in **`docs/BRAND_WORDMARK.md`**.  
**Rule:** kinetic material only on hero titles (DragonBlaze mask for ore; Tidepop for sand). Never on HUD digits.
