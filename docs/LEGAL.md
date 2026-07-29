# Intellectual Property Position

This document records the deliberate design decisions that keep Crystalline on the lawful
side of the line the research document (`claude.md`) draws between an unprotectable
mechanical idea and protected artistic expression. It exists so the reasoning is written
down rather than assumed.

**This is an engineering record, not legal advice.** Anyone shipping this commercially
should have a qualified IP lawyer review it.

---

## The governing principle

Copyright protects the *expression* of an idea, never the idea, procedure, method of
operation, or mathematical system itself. Game mechanics, structural algorithms, and rules
of play are unprotectable. What is aggressively protected is the specific audiovisual
expression laid over them.

Two cases in the research document mark the boundary:

- **Data East v. Epyx (9th Cir. 1988)** — fifteen identified similarities between two
  karate games were *not* infringement, because they were either inherent constraints of
  the genre (*scènes à faire*) or dictated by the technology. Genre-necessary tropes
  cannot be monopolised.
- **Tetris Holding v. Xio (D.N.J. 2012)** — Xio copied only "rules and functional
  elements" and still lost decisively. Under the Abstraction-Filtration-Comparison test,
  the court filtered out the abstract idea and found Xio had replicated the exact playfield
  dimensions, the block colours, shapes and textures, the ghost-piece appearance, and the
  garbage-line visualisation. The court rejected the merger defence, noting an "almost
  unlimited number of ways" exist to art a falling-block game. Xio copied the *look* to
  avoid the labour of inventing one.

The lesson is precise: **take the mathematics, invent the aesthetics.**

---

## What Crystalline takes (unprotectable ideas)

These are freely usable and are implemented independently in `src/engine/`:

| Mechanic | Where |
|---|---|
| Align three or more like tiles on a rectangular grid | `engine/match.ts` |
| Swap two orthogonally adjacent tiles | `engine/moves.ts` |
| Cascading gravity and refill from above | `engine/gravity.ts` |
| Recursive re-resolution until the board is static | `engine/resolve.ts` |
| Rewards for matches of 4, 5, and L/T shapes | `engine/specials.ts` |
| Weighted spawn tables; deadlock detection and reshuffle | `engine/spawn.ts`, `engine/deadlock.ts` |
| Limited moves, objective-gated levels, a level map | `engine/objectives.ts` |
| A regenerating lives resource; a premium currency | `economy/lives.ts`, `economy/wallet.ts` |
| Dynamic Difficulty Adjustment against a flow channel | `engine/dda.ts` |

Every one of these is a procedure or system. None was derived from another studio's source
code — no decompilation, no reverse engineering, no asset extraction. The algorithms here
were written from the architectural description in the research document, which is itself
a description of general technique.

## What Crystalline does not take (protected expression)

Deliberately divergent choices, made to avoid the *Tetris v. Xio* failure mode:

**Theme.** Living crystal geodes in a subterranean mine. Not confectionery. The research
document explicitly recommends selecting "an entirely different aesthetic motif" and names
this class of choice.

**Tile art.** Original generated crystal artwork (`assets/`), processed by our own pipeline
(`tools/`). Each of the six colours is additionally baked into a **distinct silhouette** —
shard, hexagon, rounded square, teardrop, diamond, octagon — so the tiles differ in shape
as well as hue. This was a readability decision first, but it also means the tile set does
not resemble any other game's rounded-square confectionery.

**Colour names.** `ember`, `aurum`, `solar`, `verdant`, `tidal`, `void` — invented for this
project.

**Board dimensions.** Levels run 7×7, 8×8 and 9×8/9×9 with holes and irregular layouts
(`src/levels/`), rather than a single fixed field. *Tetris v. Xio* treated exact dimensional
replication as evidence of copying.

**Audio.** Entirely procedural — synthesised at runtime in `src/audio/synth.ts` with
WebAudio. There are no audio files in this project at all, so no sampled or imitated audio
identity exists. The one mechanic adopted, raising the clear tone by a semitone per cascade
step, is a *technique* (an ascending chromatic sequence), not a recording, a melody, or a
voice.

**No voiceover.** The distinctive deep-voiced affirmations described in the research
document are a signature performance element. Nothing analogous is reproduced.

**UI and trade dress.** Original layout, typography, colour palette, iconography, naming
and copy. No app icon, menu structure, or marketing material that could suggest affiliation
with or endorsement by any existing publisher.

**Currency naming.** "Credits" and "Shards" — not Gold Bars.

**Level and blocker naming.** `crust`, `stone`, `bomb`, `creeping shadow`, `relic` — themed
to the mine setting rather than renamed versions of another game's blockers. Note that a
spreading-obstacle mechanic *as a mechanic* is unprotectable; only a specific expression of
one would be.

---

## Canadian originality threshold

For distribution into Canada, `CCH Canadian v. Law Society of Upper Canada` sets the
originality bar at an **"exercise of skill and judgment"** — higher than the rejected
"sweat of the brow" doctrine, lower than the American creativity standard.

This matters in one specific place. Taking existing third-party sprites and mechanically
recolouring them would be a "purely mechanical" modification, failing the CCH standard: it
would neither earn copyright in the result nor avoid infringing the original.

Our asset pipeline is not that. It performs alpha extraction, silhouette redesign per
colour, glyph authoring, special-piece variant composition, and procedural generation of
pieces that have no source art at all (`stone`, `bomb`, `crust`, `shadow`). Those are
evaluative choices between alternatives, applied to source art generated for this project
— which is the substance of skill and judgment.

Canada's s. 29.21 user-generated-content exception is **non-commercial only** and is
therefore irrelevant to a retail release. It is not relied on here.

---

## Standing rules for this codebase

1. Never copy, decompile, or reverse-engineer another game's code or assets.
2. Never introduce an asset whose provenance is unknown.
3. If a mechanic must be described by naming another game, name the *mechanic* in the code,
   not the game.
4. Keep audio procedural.
5. Keep the crystal/mine theme coherent — thematic drift toward confectionery would erode
   the trade-dress distinction that most of this position rests on.

## Note on the monetization simulation

The economy layer reproduces the *structure* of a free-to-play funnel for research
purposes. Its currency is fictional and it contains no payment processing, ad SDK, or
network capability of any kind — see `docs/ECONOMY.md` and the header of
`src/economy/api.ts`. Monetization design patterns are business methods, not copyrightable
expression; reproducing the shape of a funnel raises no copyright question. Regulatory
regimes governing real-money mechanics (loot boxes, disclosure obligations, protections for
minors) would apply to a commercial release with actual payments, and none of that exists
here.
