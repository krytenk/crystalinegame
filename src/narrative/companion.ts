/**
 * Companion narrator — thin retention ceremony, not a plot system.
 * Theme packs install name/art/lines at boot; crystalline defaults below.
 */

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
  | 'geodeResult'
  | 'coreSpire'
  | 'streak';

export interface CompanionDef {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly art: string;
}

const DEFAULT_LINES: Record<CompanionBeat, readonly string[]> = {
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
  coreSpire: [
    'Core Spire — the mountain’s spine. Conveyors never sleep.',
    'Deep chambers. Steady hands. I am with you still.',
  ],
  streak: [
    'The streak holds. Don’t rush the rock.',
    'Heat in the lamp glass — keep the chain clean.',
  ],
};

let active: CompanionDef = {
  id: 'geode-warden',
  name: 'Geode Warden',
  role: 'Cavern guide',
  art: 'characters/geode-warden.webp',
};

let lines: Record<CompanionBeat, readonly string[]> = { ...DEFAULT_LINES };

export function installCompanion(
  def: CompanionDef,
  nextLines: Readonly<Record<CompanionBeat, readonly string[]>>,
): void {
  active = def;
  lines = { ...DEFAULT_LINES, ...nextLines };
}

/** Live companion identity (theme-aware). */
export const COMPANION: CompanionDef = {
  get id() {
    return active.id;
  },
  get name() {
    return active.name;
  },
  get role() {
    return active.role;
  },
  get art() {
    return active.art;
  },
};

/** Deterministic-ish pick so the same beat doesn’t always feel static. */
export function companionLine(beat: CompanionBeat, salt = 0): string {
  const pool = lines[beat] ?? DEFAULT_LINES[beat];
  const i = Math.abs(salt + beat.length * 17) % pool.length;
  return pool[i] ?? pool[0]!;
}

/** Variable-reward post-win pick among three sealed options. */
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
