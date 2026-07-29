/**
 * CRYSTALLINE — shared engine contract.
 *
 * FROZEN CONTRACT. Every workstream compiles against this file. Do not change a
 * published shape without the orchestrator updating all consumers together.
 *
 * This module is pure data. It must never reference the DOM, `window`, `document`,
 * canvas, audio, or timers. The engine is the Model; everything visual is a View
 * that reads this state and consumes the event stream in `events.ts`.
 */

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** A board coordinate. Origin is top-left; +y is downward (the direction of gravity). */
export interface Coord {
  readonly x: number;
  readonly y: number;
}

/** Flat-array index for a grid of the given width: `width * y + x`. */
export const toIndex = (width: number, x: number, y: number): number => width * y + x;

/** Inverse of {@link toIndex}. */
export const fromIndex = (width: number, index: number): Coord => ({
  x: index % width,
  y: Math.floor(index / width),
});

// ---------------------------------------------------------------------------
// Crystals
// ---------------------------------------------------------------------------

/**
 * The six playable crystal colours. Names are deliberately original to the
 * Crystalline theme — see docs/LEGAL.md.
 *
 * Each colour also owns a distinct silhouette and accessibility glyph so the board
 * is readable by shape alone, not just by hue (see SILHOUETTE / GLYPH below).
 */
export type CrystalColor = 'ember' | 'aurum' | 'solar' | 'verdant' | 'tidal' | 'void';

export const CRYSTAL_COLORS: readonly CrystalColor[] = [
  'ember',
  'aurum',
  'solar',
  'verdant',
  'tidal',
  'void',
] as const;

/** Outer silhouette baked per colour by the asset pipeline. */
export const SILHOUETTE: Readonly<Record<CrystalColor, string>> = {
  ember: 'shard',
  aurum: 'hexagon',
  solar: 'roundsquare',
  verdant: 'teardrop',
  tidal: 'diamond',
  void: 'octagon',
} as const;

/** Colour-blind glyph overlay, toggleable in settings. */
export const GLYPH: Readonly<Record<CrystalColor, string>> = {
  ember: 'flame',
  aurum: 'ring',
  solar: 'star',
  verdant: 'leaf',
  tidal: 'drop',
  void: 'moon',
} as const;

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/**
 * What occupies a cell.
 * - `crystal` — an ordinary matchable crystal.
 * - `line`    — 4-match reward; clears its whole row or column.
 * - `burst`   — L/T-match reward; clears a 3x3 radius.
 * - `prism`   — 5-in-a-row reward (the opalescent crystal); a wildcard that clears
 *               every crystal of the colour it is swapped with.
 * - `stone`   — immovable blocker; damaged only by an adjacent match.
 * - `bomb`    — carries a fuse; the level is lost if it reaches zero.
 * - `relic`   — a collectible that must be dropped off the bottom row.
 */
export type PieceKind = 'crystal' | 'line' | 'burst' | 'prism' | 'stone' | 'bomb' | 'relic';

export interface Piece {
  /**
   * Stable identity for the lifetime of the piece. The renderer keys its tween
   * state off this, so it MUST NOT be reused or reassigned while a piece is alive.
   */
  readonly id: number;
  readonly kind: PieceKind;
  /** `null` for kinds that carry no colour (`prism`, `stone`, `relic`). */
  readonly color: CrystalColor | null;
  /** Only meaningful for `line`. */
  readonly orientation?: 'h' | 'v';
  /** Only meaningful for `bomb`; decrements once per player move. */
  readonly fuse?: number;
}

/** True when the piece can be swapped by the player. */
export const isMovable = (p: Piece | null): boolean =>
  p !== null && p.kind !== 'stone' && p.kind !== 'bomb';

/** True when the piece participates in colour matching. */
export const isMatchable = (p: Piece | null): p is Piece =>
  p !== null && (p.kind === 'crystal' || p.kind === 'line' || p.kind === 'burst');

/** True when the piece is a player-triggerable special. */
export const isSpecial = (p: Piece | null): boolean =>
  p !== null && (p.kind === 'line' || p.kind === 'burst' || p.kind === 'prism');

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

/**
 * One board cell.
 *
 * `crust` and `shadow` are cell properties rather than pieces because they coexist
 * with an occupant: a crystal sits *inside* crusted stone and *under* creeping shadow.
 */
export interface Cell {
  /** `false` marks a hole in the board layout — nothing falls through it. */
  playable: boolean;
  /** The current occupant, or `null` mid-resolution. */
  piece: Piece | null;
  /** Encasing layers, 0..3. Removed one layer per adjacent match. */
  crust: number;
  /** Creeping shadow strength, 0..2. Spreads on a timer; smothers matching at 2. */
  shadow: number;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** The geometry of a detected match, which determines the reward. */
export type MatchShape = 'three' | 'four' | 'five' | 'L' | 'T';

export interface MatchGroup {
  readonly cells: readonly Coord[];
  readonly color: CrystalColor;
  readonly shape: MatchShape;
  /** The cell the reward spawns in — the pivot for L/T, the swapped cell otherwise. */
  readonly origin: Coord;
}

/** Why a set of cells was cleared. Drives which VFX and SFX the view plays. */
export type ClearCause =
  | 'match'
  | 'line'
  | 'burst'
  | 'prism'
  | 'bomb'
  | 'crust'
  | 'cascade';

// ---------------------------------------------------------------------------
// Objectives and levels
// ---------------------------------------------------------------------------

export type ObjectiveKind =
  /** Reach a target score before running out of moves. */
  | 'score'
  /** Break every crusted cell. */
  | 'crust'
  /** Drop N relics off the bottom row. */
  | 'collect'
  /** Defuse every bomb before any fuse expires. */
  | 'defuse'
  /** Reduce creeping shadow to zero cells. */
  | 'contain';

export interface Objective {
  readonly kind: ObjectiveKind;
  /** Target count: points for `score`, cells for `crust`/`contain`, items otherwise. */
  readonly target: number;
  /** Restricts `collect` to a specific colour, when set. */
  readonly color?: CrystalColor;
}

export interface LevelDef {
  readonly id: number;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly moves: number;
  readonly objectives: readonly Objective[];
  /** Star thresholds, ascending. Length 3. */
  readonly stars: readonly [number, number, number];
  /** Colours in play. Fewer colours means an easier board. */
  readonly colors: readonly CrystalColor[];
  /**
   * Optional ASCII layout, one string per row, one char per cell:
   *   `.` playable empty   `#` hole (unplayable)   `1`-`3` crust layers
   *   `S` stone            `B` bomb                `R` relic
   * When omitted the board is a full rectangle of plain cells.
   */
  readonly layout?: readonly string[];
  /** Moves between creeping-shadow spread ticks. Omit to disable shadow. */
  readonly shadowPeriod?: number;
  /** Starting fuse length for bombs placed by `layout`. */
  readonly bombFuse?: number;
  /** Base spawn weights per colour before DDA modulation. Defaults to uniform. */
  readonly spawnWeights?: Partial<Record<CrystalColor, number>>;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export type LevelStatus = 'playing' | 'won' | 'lost';

export interface ObjectiveProgress {
  readonly kind: ObjectiveKind;
  readonly target: number;
  readonly current: number;
  readonly done: boolean;
}

/** A read-only snapshot of the session, safe to hand to the view each frame. */
export interface BoardSnapshot {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Readonly<Cell>[];
  readonly movesLeft: number;
  readonly score: number;
  readonly status: LevelStatus;
  readonly objectives: readonly ObjectiveProgress[];
  readonly stars: number;
}

// ---------------------------------------------------------------------------
// Dynamic Difficulty Adjustment
// ---------------------------------------------------------------------------

/**
 * The DDA scalar runs from -1 (maximum hidden assistance for a struggling player)
 * through 0 (neutral) to +1 (maximum hidden pressure on a skilled player).
 *
 * It is never surfaced during play. The Publisher Dashboard exposes it for research
 * purposes, which is the point of this build.
 */
export interface DdaState {
  /** Current difficulty scalar, clamped to [-1, 1]. */
  readonly scalar: number;
  /** Consecutive failures on the current level. */
  readonly failStreak: number;
  /** Rolling win ratio over the last N attempts, 0..1. */
  readonly winRatio: number;
  /** Rolling mean seconds per move. */
  readonly meanMoveTime: number;
}

export interface DdaInputs {
  readonly failStreak: number;
  readonly winRatio: number;
  readonly meanMoveTime: number;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const SCORE = {
  /** Base points per crystal cleared. */
  perCrystal: 60,
  /** Multiplier applied per cascade step beyond the first. Step 3 scores 2x. */
  cascadeStep: 0.5,
  /** Bonus for creating a special. */
  special: { line: 120, burst: 200, prism: 500 },
  /** Bonus per crust layer removed. */
  crustLayer: 90,
  relic: 300,
} as const;
