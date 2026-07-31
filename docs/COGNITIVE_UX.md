# Cognitive Architecture & Psychological Engagement

Research north star for **Crystalline** — how top-tier match-3 UX maps to this build.

This is a **research / portfolio** product. Monetization pressure is **simulated** (no real charges). The goal is to reproduce the *shape* of industry psych design so it can be studied, not to maximize harm.

---

## 1. Pattern recognition & the Rule of 3

| Principle | Industry pattern | Crystalline |
|-----------|------------------|-------------|
| Minimum pattern unit | Match-3 threshold | Engine match clusters ≥ 3 |
| Dual coding | Hue **and** silhouette differ | Crystal colors + distinct atlas shapes / power glyphs |
| Low PEF | High contrast pieces on quiet board | Dark cavern BG + saturated gems |
| OCD-adjacent loop | Spot → urge → swap → clear relief | Swap → clear VFX → cascade relief |

**Ongoing:** keep piece silhouettes non-overlapping at a glance; never add fine detail that only reads at 2× zoom.

---

## 2. Operant conditioning & variable rewards

| Principle | Industry | Crystalline |
|-----------|----------|-------------|
| Immediate sensory payoff | Burst + chime on every clear | Particles, score pop, glass/whoosh, synth |
| Variable magnitude | Cascades / specials feel “lucky big” | Cascade pitch climb, banners, hit-stop, shake |
| Competence inflation | Over-the-top fanfare | Power forged banners, Living Core, VFX tiers 3–6 |
| Soft invalid input | Bounce back, no penalty | `swapRejected` elastic + soft thud; no move cost |

**DDA (hidden):** `src/engine/dda.ts` biases spawn weights and special rates from fail streak / win ratio / move tempo — Flow Channel stewardship without surfacing the scalar in play HUD.

---

## 3. Loss aversion (meta, not core loop)

| Principle | Industry | Crystalline (simulated) |
|-----------|----------|-------------------------|
| Lives wall | 5 lives, ~30 min regen | `ECONOMY_CONST` lives + regen |
| Near-miss continue | +5 moves for currency / ad | Continue offer when out of moves & progress high |
| Sunk-cost framing | “One more try” polish | Soft copy: “so close” not “you failed” |
| Session pacing | Forced breaks | Lives gate + interstitial Shorts every N clears |

Core loop still **avoids** punishing invalid swaps.

---

## 4. Juice micro-timing (game feel)

Target choreography (industry-style):

| t (s) | Action |
|-------|--------|
| 0.00 | Match particles spawn |
| 0.00–0.10 | Tile scale squeeze (ease-in) |
| 0.05–0.15 | Fade out |
| ~0.10 | Score popup |
| ~0.20 | Gravity falls begin |
| ~0.30 | New tiles enter |

Implemented in `boardAnimator` + `juice` + match VFX. Haptics (`src/audio/haptics.ts`) align pulses with forge / cascade / special.

---

## 5. Typography & chrome

| Principle | Industry | Crystalline |
|-----------|----------|-------------|
| Large, thick, readable | Rounded display sans | Galactic Knights titles; Diamond Shape CTAs; Nunito body |
| Outline / shadow | Text over particles | HUD chips + stroked score floats |
| Minimal lore | No novel in-HUD | Short toasts, aha tutorial only |

---

## 6. Audio architecture

| Principle | Industry | Crystalline |
|-----------|----------|-------------|
| Pitch-up cascades | Same SFX, +semitone / step | Synth `clear(cascadeStep)` + samples |
| Soft fail | Light descending motif | `fail()` gentle descent — not harsh buzz |
| Mute | Always optional | Settings SFX toggle |

Voice lines (“Delicious!”) are **out of scope** for this crystal theme; musical climb carries the same reward gradient.

---

## 7. Explicitly not shipping as dark patterns

- Real payment processing  
- Undisclosed DDA (we surface it on the Publisher Dashboard)  
- Unlimited forced ads  
- Fake “friends need help” social pressure  

Research mode: study the levers; label the demo; keep `docs/LEGAL.md` accurate.

---

## Implementation checklist

- [x] Distinct gem dual-coding (atlas)  
- [x] Cascade pitch + banners  
- [x] Soft reject animation  
- [x] Hidden DDA + dashboard  
- [x] Simulated lives / store / ads  
- [x] Research-timed clear / fall  
- [x] Haptics layer  
- [x] Near-miss continue offer  
- [x] Meta **Crystal Cavern** loop (essence + staged furnishings)  
- [ ] Optional collapse/blast mode (future experiment)  
- [ ] Color-blind high-contrast palette preset (on hold)  
- [ ] Spoken VO (on hold — crystal theme uses musical climb)  
