# Product verticals — one engine, original-feeling games

**Studio doctrine:** Each store listing must feel like an **original concept**, not “Crystalline with different wallpaper.” King-style reskins succeed by changing **fantasy verb, mascot, meta goal, signature special, and first-session identity** — while sharing the invisible engine.

| Vertical | Product name (working) | Status | Spec |
|----------|------------------------|--------|------|
| Mine | **Crystalline** | Shipped | `src/themes/crystalline.ts` |
| Harbor | **Lantern Harbor** | Shipped sibling | `docs/PITCH_HARBOR.md`, `src/themes/harbor.ts` |
| Bakery | **Hearth & Crumb** (working) | Spec only | [`bakery/SPEC.md`](./bakery/SPEC.md) |
| Library | **Moonlit Stacks** (working) | Spec only | [`library/SPEC.md`](./library/SPEC.md) |

**Roadmap timing:** See `docs/STUDIO_FOCUS.md` §11–§14 — first ~6 months bring Bakery + Library to **launch parity**; Campaign Arc 2 after family parity, staggered per product.

---

## Differentiation doctrine (the “not a reskin” checklist)

A player who has played Harbor should not open Bakery and think *same game, different skin* within **60 seconds**. Use **at least 6 of 8** levers below for every new vertical.

| # | Lever | Shared engine? | Must change |
|---|--------|----------------|-------------|
| 1 | **Core fantasy verb** | Match-3 rules stay | What the player *believes* they are doing (mine / sort docks / bake / shelve) |
| 2 | **Signature special (6+)** | Power kind = supernova | Unique name + art + juice fantasy (Super Chest octopus, oven bloom, book wyrm, etc.) |
| 3 | **Meta hub** | Essence → place props | Place, currency name, 4+ stages, prop set, pride copy |
| 4 | **Companion** | Beat slots | Face, name, role, every line |
| 5 | **Map / chapters** | Level ids can share data | Chapter titles, depth labels, place-card art, product map UX copy |
| 6 | **Material wordmark** | — | Sand / ore / flour / ink kinetic hero (brand ritual) |
| 7 | **Audio + haptics palette** | Capacitor haptics API | SFX bank labels + mix; optional music pad color |
| 8 | **Store / package identity** | — | Name, icon, screenshots, one-liner, `applicationId`, save keys |

**Allowed to stay identical (invisible):** match rules, specials *mechanics*, lives/continue economy shape, album/event systems, level JSON layouts (optional share with retuned copy), conveyor timing, DDA.

**Never ship a vertical that only changes:** palette + piece PNGs + product name.

---

## Shared vs owned

```
src/engine/*          SHARED (pure rules)
src/economy/*         SHARED (install*Theme hooks)
src/themes/<id>.ts    OWNED per product
public/themes/<id>/   OWNED art + bake
*/*.html entry        OWNED (__THEME__ = id)
saveKey / packageId   OWNED (never collide)
```

---

## Launch parity bar (Bakery / Library)

Same as Harbor sibling standard:

- [ ] Theme pack registered + HTML entry + separate APK id when packaged  
- [ ] Isolated `saveKey` / aha / ad rotation  
- [ ] Full art bake (board, UI chrome, map, meta stages, companion)  
- [ ] Meta 4 stages × ~3–4 props (or 15 total)  
- [ ] Map chapters I–XV (or shared level catalogue + themed chapter titles)  
- [ ] Power names + combo labels + event theme  
- [ ] Material wordmark **profile** defined (kinetic can ship later)  
- [ ] Pitch one-pager + store icon set  
- [ ] Manual play: L1 aha, mid conveyor, clear → place pride, album art  

---

## Implementation order (when building)

1. Scaffold theme + empty art dirs from Harbor template  
2. Lock **fantasy doc** (this folder’s SPEC) before bulk Imagine  
3. Bake board + meta + companion  
4. Wire `ThemeId`, runtime, APK script  
5. Differentiation QA: 60-second blind test against Harbor/Crystalline  

---

## Related

- `docs/THEMES.md` — technical theme contract  
- `docs/STUDIO_FOCUS.md` — funding order, cadence, Arc 2 stagger  
- `docs/FONT_ASSESSMENT.md` — faces; verticals may pick display stacks  
