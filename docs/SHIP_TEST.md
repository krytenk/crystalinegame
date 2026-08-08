# Ship-test build notes (v1.0.1)

**Date:** 2026-08-03  
**Purpose:** Device-test a production-shaped build (300 levels + accessibility + store artifacts).

## Install (device)

```bash
adb install -r release/crystalline-debug.apk
# Play-shaped binary (different signing — uninstall debug first if needed):
# adb uninstall ca.departurebaydigital.crystalline
# adb install -r release/crystalline-release.apk
```

| Artifact | Use |
|----------|-----|
| `release/crystalline-debug.apk` | Sideload / day-to-day QA |
| `release/crystalline-release.apk` | Release-signing smoke |
| `release/crystalline-release.aab` | **Upload to Play** internal track |
| `release/lanternharbor-debug.apk` | Harbor sibling sideload |

**Android version:** `versionName 1.0.2` · `versionCode 4`

## What’s in this build

| Area | Detail |
|------|--------|
| Levels | **1–300** catalogue live |
| Map | Chapters **I–XXX** (Crystalline + Harbor titles) |
| Colour-blind | **Shape glyphs default ON**; Settings → **High contrast** for larger symbols + rims |
| Deadlock gate | Opening boards re-checked after relic/shadow seed (fixes L165-class soft-locks) |
| Shop | Soft currency only · **no real money** (until Play Billing) |
| Free gifts | Short in-app timer · **no YouTube Shorts / no ad SDK** |
| Interstitials | **Off** for free build |
| Ice crust | Procedural ice blocks on crust goals |

## QA focus (your testing)

1. Fresh install → Settings: confirm **Colour-blind shapes** ON; toggle **High contrast**.  
2. Map reaches chapter **XXX** / level **300**.  
3. Spot bosses: L10, 15, 20, 25, 30, 160, 200, 250, 300.  
4. Continue / lives / shop badges still say simulated.  
5. Crust levels show ice shells (not flat grey pads).  
6. No opening board with zero legal moves.

## Still human / Console before public production

- Capture screenshots → `store/screenshots/`  
- Play Console forms + internal track upload of **current AAB**  
- Policy call on simulated shop vs real Billing  

See `docs/PLAY_STORE.md`.
