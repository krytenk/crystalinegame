/**
 * CRYSTALLINE — piece construction and identity.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * `Piece.id` is the renderer's tween key. It must be stable for the whole life of a
 * piece and must never be reused while that piece is alive, so ids come from a
 * monotonic allocator owned by the session. The allocator's counter is part of the
 * session's deterministic state, which is why it is explicit rather than a module
 * global — two sessions must not share a counter.
 */

import {
  isMatchable,
  isMovable,
  isSpecial,
  type Cell,
  type CrystalColor,
  type Piece,
  type PieceKind,
} from './types';

// Re-exported so engine modules have a single import site for piece predicates.
export { isMatchable, isMovable, isSpecial };

/** Monotonic id source. Never returns the same value twice. */
export interface IdAllocator {
  next(): number;
  /** The next id that will be handed out — part of the session snapshot. */
  getState(): number;
  setState(next: number): void;
}

export const createIdAllocator = (start = 1): IdAllocator => {
  let counter = Math.max(1, Math.floor(start));
  return {
    next: () => counter++,
    getState: () => counter,
    setState: (n) => {
      counter = Math.max(1, Math.floor(n));
    },
  };
};

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export const makeCrystal = (ids: IdAllocator, color: CrystalColor): Piece => ({
  id: ids.next(),
  kind: 'crystal',
  color,
});

export const makeLine = (
  ids: IdAllocator,
  color: CrystalColor,
  orientation: 'h' | 'v',
): Piece => ({
  id: ids.next(),
  kind: 'line',
  color,
  orientation,
});

export const makeBurst = (ids: IdAllocator, color: CrystalColor): Piece => ({
  id: ids.next(),
  kind: 'burst',
  color,
});

export const makePrism = (ids: IdAllocator): Piece => ({
  id: ids.next(),
  kind: 'prism',
  color: null,
});

/** 6+ match peak special — huge clear / board-wipe combos. */
export const makeSupernova = (ids: IdAllocator): Piece => ({
  id: ids.next(),
  kind: 'supernova',
  color: null,
});

/** Living Core — spinning bonus token, not matchable. */
export const makeCore = (ids: IdAllocator): Piece => ({
  id: ids.next(),
  kind: 'core',
  color: null,
});

export const makeStone = (ids: IdAllocator): Piece => ({
  id: ids.next(),
  kind: 'stone',
  color: null,
});

export const makeBomb = (ids: IdAllocator, fuse: number): Piece => ({
  id: ids.next(),
  kind: 'bomb',
  color: null,
  fuse: Math.max(0, Math.floor(fuse)),
});

export const makeRelic = (ids: IdAllocator): Piece => ({
  id: ids.next(),
  kind: 'relic',
  color: null,
});

/**
 * Rebuilds a bomb with a new fuse while preserving its id — a bomb ticking down is
 * still the same physical object to the renderer.
 */
export const withFuse = (bomb: Piece, fuse: number): Piece => ({
  ...bomb,
  fuse: Math.max(0, Math.floor(fuse)),
});

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/** `stone` and `bomb` are pinned to their cell; everything else obeys gravity. */
export const isFallable = (p: Piece | null): p is Piece =>
  p !== null && p.kind !== 'stone' && p.kind !== 'bomb';

/** Blockers occupy a cell but are never part of a colour match. */
export const isBlocker = (p: Piece | null): p is Piece =>
  p !== null && (p.kind === 'stone' || p.kind === 'bomb');

/** Shadow at strength 2 smothers the cell: nothing in it can match. */
export const SHADOW_SMOTHER = 2;

/** True when the cell's occupant may participate in colour matching right now. */
export const cellCanMatch = (cell: Cell | undefined): boolean =>
  cell !== undefined &&
  cell.playable &&
  cell.shadow < SHADOW_SMOTHER &&
  isMatchable(cell.piece);

/** The colour used for match comparison, or `null` when the cell cannot match. */
export const matchColorOf = (cell: Cell | undefined): CrystalColor | null => {
  if (!cellCanMatch(cell)) return null;
  return cell?.piece?.color ?? null;
};

/** A fresh, empty, playable cell. */
export const makeCell = (playable = true, crust = 0, shadow = 0): Cell => ({
  playable,
  piece: null,
  crust,
  shadow,
});

/** Deep-ish copy of a cell. `Piece` is immutable so it can be shared by reference. */
export const cloneCell = (c: Cell): Cell => ({
  playable: c.playable,
  piece: c.piece,
  crust: c.crust,
  shadow: c.shadow,
});

/** Human-readable kind list, used by tooling and tests. */
export const PIECE_KINDS: readonly PieceKind[] = [
  'crystal',
  'line',
  'burst',
  'prism',
  'supernova',
  'core',
  'stone',
  'bomb',
  'relic',
] as const;
