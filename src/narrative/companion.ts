/**
 * CRYSTALLINE — Geode Warden companion (original IP).
 *
 * Thin narrator for retention ceremony — not a plot system.
 * Portrait: public/characters/geode-warden.webp
 */

export const COMPANION = {
  id: 'geode-warden',
  name: 'Geode Warden',
  role: 'Cavern guide',
  art: 'characters/geode-warden.webp',
} as const;

export type CompanionBeat =
  | 'title'
  | 'titleFirst'
  | 'win'
  | 'winPerfect'
  | 'lose'
  | 'daily'
  | 'cavern'
  | 'cavernReady'
  | 'geode'
  | 'geodeResult';

const LINES: Record<CompanionBeat, readonly string[]> = {
  title: [
    'The mountain remembers your steps. Dive when ready.',
    'Match, forge, furnish — I keep the lamps lit.',
    'A clear board feeds the cavern. Shall we?',
  ],
  titleFirst: [
    'First light in the mine. Swap four to forge a power.',
    'Welcome, prospector. I will show you the veins.',
  ],
  win: [
    'Clean cut! Essence drips into the cavern.',
    'The galleries hum for you — well dug.',
    'Another chamber yields. Onward, carefully.',
  ],
  winPerfect: [
    'Three stars — the geode sings. Discovery bonus sealed.',
    'Flawless work. The Deep will hear of this.',
  ],
  lose: [
    'The vein closed early. Breathe — lives return.',
    'Almost. The rock is patient; so are we.',
    'Not this path. Try another cut.',
  ],
  daily: [
    'A daily parcel from the guild. Claim it, friend.',
    'Welcome back. The mine left you a stipend.',
  ],
  cavern: [
    'Place what you can afford — the vista grows with you.',
    'Furnish the open stage. Ghost slots mark what is next.',
  ],
  cavernReady: [
    'You can place a piece right now. Look at the shop below.',
    'Essence is ready — seal it into the chamber.',
  ],
  geode: [
    'Tap a sealed geode. One hides a richer crack.',
    'Three veins. Trust your pick — I will not spoil it.',
  ],
  geodeResult: [
    'Sparkles for the cavern fund!',
    'A fine crack. Bank it and keep diving.',
    'Jackpot vein! The Warden is impressed.',
  ],
};

/** Deterministic-ish pick so the same beat doesn’t always feel static. */
export function companionLine(beat: CompanionBeat, salt = 0): string {
  const pool = LINES[beat];
  const i = Math.abs(salt + beat.length * 17) % pool.length;
  return pool[i] ?? pool[0]!;
}

/** Geode crack rewards — one pick among three sealed options (variable reward). */
export const GEODE_REWARDS = [10, 18, 40] as const;

/** Shuffle rewards into three slots (Fisher–Yates with simple seed). */
export function dealGeodeSlots(seed: number): readonly number[] {
  const arr = [...GEODE_REWARDS];
  let s = seed >>> 0 || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
