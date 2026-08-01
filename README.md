# Crystalline + Lantern Harbor

A **match-3 research / portfolio** build with **two product skins** on one engine:

| Product | Theme | Entry |
|---------|--------|--------|
| **Crystalline** | Crystal mine | `/` · `index.html` |
| **Lantern Harbor** | Cozy coastal docks | `/harbor.html` · `?game=harbor` |

Match pieces, forge specials, chain combos, restore a meta diorama, and explore a simulated free-to-play economy. Monetization is **fake** — no real payments, no ad network SDK, no tracking beacons. Rewarded “ads” play public Discworld in 60 Seconds YouTube Shorts as creative placeholders.

> Repo name spelling: **crystalinegame** · products: **Crystalline** + **Lantern Harbor**

---

## Can I play it from GitHub?

| Where | Playable? | Notes |
|--------|-----------|--------|
| **GitHub Pages** | **Yes — browser only** | Built automatically on each push to `main`. |
| **Live demo (portfolio)** | **Yes — browser only** | Same build on Departure Bay Digital. |
| **Repo file browser** | **No** | Source only — not the running game. |
| **Your computer** | **Yes, after install** | Clone → `npm install` → `npm run dev` |

### Play now (no download)

- **GitHub Pages:** https://krytenk.github.io/crystalinegame/
- **Portfolio host:** https://departurebaydigital.ca/demos/crystalline/

Works on phone and desktop. Tap once to unlock sound.

> **Note:** GitHub Pages must deploy the **Vite production build** (`dist/`), not the raw repo root. A GitHub Action (`.github/workflows/pages.yml`) builds and publishes on every push to `main`.

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

- **Crystalline:** `http://localhost:5173/`
- **Lantern Harbor:** `http://localhost:5173/harbor.html`

### Other commands

```bash
npm run build      # production build → dist/ (both HTML entries)
npm run preview    # serve dist/ locally
npm test           # unit tests
npm run typecheck  # TypeScript
npm run assets:harbor  # re-bake Harbor atlas from Imagine sources
npm run android:apk  # Capacitor → debug APK in release/
```

### Android APK

Sideload build (Capacitor WebView shell). See **[docs/ANDROID.md](docs/ANDROID.md)**.

```bash
npm run android:apk
# → release/crystalline-debug.apk
adb install -r release/crystalline-debug.apk
```

Crystal art lives under `public/gen/`; Harbor art under `public/themes/harbor/`. SFX under `public/sfx/`. You do **not** need the Python bake tools just to play.

---

## What this project is

- **Portrait match-3** (720×1280 logical canvas)
- Pure TypeScript **engine** (no engine framework)
- Baked **crystal atlas** + match VFX sheets
- Procedural synth + **glass / whoosh** samples
- Simulated lives, store, boosters, DDA, telemetry dashboard
- **40** data-driven levels (four map chapters through Core Spire)
- Research-driven **cognitive UX** (juice timing, cascade pitch, near-miss continue, hidden DDA) — see `docs/COGNITIVE_UX.md`
- **Meta dual loop** — Crystalline: Crystal Cavern + essence · Harbor: Harbor Docks + Tideglass  
- Live-ops: endless album, hybrid events, daily goal, cozy idle drip  
- Theme packs: [`docs/THEMES.md`](docs/THEMES.md)  
- Pitch: [`docs/PITCH.md`](docs/PITCH.md) · Harbor: [`docs/PITCH_HARBOR.md`](docs/PITCH_HARBOR.md)

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

### GitHub Pages

Configured via **GitHub Actions** (not “Deploy from branch / root”):

1. Repo → **Settings → Pages**
2. **Source:** GitHub Actions  
3. Push to `main` (or run the **Deploy GitHub Pages** workflow manually)

The workflow runs `npm ci && npm run build` and publishes `dist/`.

### Manual / other hosts

```bash
npm run build
# upload contents of dist/ to any static host
```

Asset paths use Vite `base: './'` so subdirectory deploys work (e.g. `/demos/crystalline/` or `/crystalinegame/`).

---

## License / assets

Code is for portfolio / research use unless you add a LICENSE file.

Third-party audio (whooshes, glass) came from free stock sources; keep attribution if you redistribute commercially. Discworld Shorts embeds are public YouTube videos used only as demo creative — not an ad network integration.

---

## Author

Built for **Departure Bay Digital** · Nanaimo, BC  
Live: [departurebaydigital.ca/demos/crystalline](https://departurebaydigital.ca/demos/crystalline/)
