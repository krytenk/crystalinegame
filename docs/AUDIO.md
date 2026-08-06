# Audio — SFX review & ambient plan

## Current stack

| Layer | Implementation | Role |
|-------|----------------|------|
| **Samples** | `public/sfx/*.ogg` via `SampleBank` | Match body, whooshes, title sting |
| **Synth** | Procedural `Synth` (Web Audio) | Pitch climbs, star dings, power chimes |
| **Ambient pad** | `Synth.startPad()` — 4 detuned sines + slow LFO | Soft hum on title / when music setting on |
| **Haptics** | Capacitor + Vibration | Parallel juice, not audio |

## SFX inventory (shipping)

| Clip | Feel | Used for |
|------|------|----------|
| `glass.ogg` | Crystal shatter | Match clear body |
| `glass-tick.ogg` | Light chip | Crust / soft hits |
| `whoosh-soft.ogg` | Air | Match whoosh |
| `whoosh-slice.ogg` | Sharp line | Seam Rift / line specials |
| `whoosh-motion.ogg` | Smooth move | Prism / cascade polish |
| `whoosh-heavy.ogg` | Weight | Burst / big power |
| `whoosh-cinematic.ogg` | Epic tail | Supernova / win flourish |
| `whoosh-title.ogg` | Open sting | Title PLAY |

**Verdict:** Enough for a **playable / portfolio** build. Gaps (priority order):

1. **Bomb tick / defuse** — distinct from glass (urgent tick, soft “snuff”)  
2. **Relic / album collect** — bright chime (not another whoosh)  
3. **UI confirm** — soft tap for buttons (optional; `uiTap` is synth)  
4. **Win stinger** — short 1–1.5s musical sting layered under flourish  
5. **Lose / life spent** — low muted thud (not aggressive fail horn)

Keep samples **short mono OGG**, loudness-normalized, under ~300 ms for one-shots (whoosh-cinematic can be longer).

## Ambient beds (shipping)

Theme-keyed loops in `public/sfx/`:

| File | Theme | Texture |
|------|--------|---------|
| `ambient-mine.ogg` | Crystalline | **Cave water drips** (Dragon Studio droplets-in-a-cave, looped ~28s) |
| `ambient-harbor.ogg` | Lantern Harbor | **Regular water drip** (Dragon Studio water-dripping ~22s) |

**API:** `AudioDirector.setMusic` / `setTheme` → `SampleBank.startAmbient`  
**Duck:** one-shots briefly pull ambient gain down (~0.28×) then recover.  
**Fallback:** if a bed fails to decode, procedural `Synth.startPad()` still works.  
**Toggle:** Settings → Ambient pad.

### Avoid

- Full orchestral tracks fighting match SFX  
- Vocal hooks that tire after 10 minutes  
- Loud risers as “ambient”

## Placement

| Screen | Ambient |
|--------|---------|
| Title / map / prelevel / results / play | Bed on (ducked under SFX in play) |
| Music setting off | Silent bed |

## License note

Whoosh/glass/chime/thud sources: Dragon Studio + Freesound community packs (trimmed).  
Ambient beds currently **procedurally generated** (ffmpeg lavfi) for placeholder place-feel — replace with studio-owned or CC0 field recordings when ready.
