# Crystalline

A crystal-themed **match-3** demo (research / portfolio build).

Match gems, forge **Power Crystals**, chain combos, and explore a simulated free-to-play economy. Monetization is **fake** — no real payments, no ad network SDK, no tracking beacons. Rewarded “ads” play public Discworld in 60 Seconds YouTube Shorts as creative placeholders.

> Repo name spelling: **crystalinegame** · product name: **Crystalline**

---

## Can I play it from GitHub?

| Where | Playable? | Notes |
|--------|-----------|--------|
| **Live demo** | **Yes — browser only** | No download. Open the link below. |
| **This GitHub repo** | **No (not by itself)** | GitHub shows source code. It is not a host for the running game unless you enable Pages or run it yourself. |
| **Your computer** | **Yes, after install** | Clone → `npm install` → `npm run dev` |

### Play now (hosted)

**https://departurebaydigital.ca/demos/crystalline/**

Works on phone and desktop. Tap once to unlock sound.

---

## Run it locally

You need **Node.js 18+** (20 recommended).

```bash
git clone https://github.com/krytenk/crystalinegame.git
cd crystalinegame
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Other commands

```bash
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
npm test           # unit tests
npm run typecheck  # TypeScript
```

Crystal art and trimmed SFX already live under `public/gen/` and `public/sfx/`. You do **not** need the Python bake tools just to play.

---

## What this project is

- **Portrait match-3** (720×1280 logical canvas)
- Pure TypeScript **engine** (no engine framework)
- Baked **crystal atlas** + match VFX sheets
- Procedural synth + **glass / whoosh** samples
- Simulated lives, store, boosters, DDA, telemetry dashboard
- 30 data-driven levels

### What it is *not*

- A published App Store / Play Store product  
- Real IAP or real ad monetization  
- Multiplayer  

See `docs/ECONOMY.md` and `docs/LEGAL.md` for the simulation framing.

---

## Project layout

```text
src/
  engine/     # match-3 rules, specials, gravity, objectives
  render/     # canvas, atlas, VFX, juice
  economy/    # simulated wallet, lives, ads, store
  audio/      # WebAudio + sample bank
  levels/     # JSON level catalogue
  main.ts     # UI state machine + bootstrap
public/
  gen/        # crystal sprites + VFX (required at runtime)
  sfx/        # trimmed glass / whoosh OGG
  fonts/      # display faces
  bg/         # cavern backdrop
tools/        # optional asset bake (Python)
docs/         # economy + legal notes
```

---

## Deploy notes

Production static build:

```bash
npm run build
# upload contents of dist/ to any static host
```

This demo is deployed under a **subdirectory** (`/demos/crystalline/`). Asset URLs are base-relative so that works; prefer `base: './'` in Vite (already set).

---

## License / assets

Code is for portfolio / research use unless you add a LICENSE file.

Third-party audio (whooshes, glass) came from free stock sources; keep attribution if you redistribute commercially. Discworld Shorts embeds are public YouTube videos used only as demo creative — not an ad network integration.

---

## Author

Built for **Departure Bay Digital** · Nanaimo, BC  
Live: [departurebaydigital.ca/demos/crystalline](https://departurebaydigital.ca/demos/crystalline/)
