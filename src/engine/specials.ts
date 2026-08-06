/**
 * CRYSTALLINE — power crystals and mix-and-match combos.
 *
 * PURE MODEL CODE.
 *
 * Match 4 → Seam Rift · L/T → Geode Burst · 5 → Opal Prism · 6+ → Supernova.
 * Combos scale up to dual 7×7 and full-board wipes.
 */

import { sortCoords, type Grid2D } from './grid';
import { makeBurst, makeLine, type IdAllocator } from './tile';
import type { Cell, Coord, CrystalColor, Piece } from './types';

export type PowerKind = 'line' | 'burst' | 'prism' | 'supernova';

export const isPowerCrystal = (p: Piece | null): p is Piece =>
  p !== null &&
  (p.kind === 'line' || p.kind === 'burst' || p.kind === 'prism' || p.kind === 'supernova');

export const isLivingCore = (p: Piece | null): p is Piece => p !== null && p.kind === 'core';

/** Player-facing names for HUD toasts (defaults = crystalline). */
export const POWER_NAME: Readonly<Record<PowerKind, string>> = {
  line: 'Seam Rift',
  burst: 'Geode Burst',
  prism: 'Opal Prism',
  supernova: 'Supernova',
};

const DEFAULT_COMBOS: Readonly<Record<string, string>> = {
  'line+line': 'Twin Fault',
  'line+burst': 'Rift Bloom',
  'burst+burst': 'Core Shockwave',
  'line+prism': 'Chromatic Seams',
  'burst+prism': 'Chromatic Bloom',
  'prism+prism': 'Void Collapse',
  'line+supernova': 'Solar Rift',
  'burst+supernova': 'Nova Bloom',
  'prism+supernova': 'Chromatic Nova',
  'supernova+supernova': 'Total Eclipse',
};

const POWER_RANK: Record<PowerKind, number> = {
  line: 0,
  burst: 1,
  prism: 2,
  supernova: 3,
};

let activePowerNames: Readonly<Record<PowerKind, string>> = POWER_NAME;
let activeCombos: Readonly<Record<string, string>> = DEFAULT_COMBOS;

/** Theme packs install display names at boot (engine rules unchanged). */
export function installPowerCopy(
  names: Readonly<Record<PowerKind, string>>,
  combos?: Readonly<Record<string, string>>,
): void {
  activePowerNames = { ...POWER_NAME, ...names };
  activeCombos = combos ? { ...DEFAULT_COMBOS, ...combos } : DEFAULT_COMBOS;
}

export function powerDisplayName(kind: PowerKind): string {
  return activePowerNames[kind] ?? POWER_NAME[kind];
}

export const comboLabel = (a: PowerKind, b: PowerKind): string => {
  const [x, y] = POWER_RANK[a] <= POWER_RANK[b] ? [a, b] : [b, a];
  const key = `${x}+${y}`;
  return activeCombos[key] ?? DEFAULT_COMBOS[key] ?? 'Power Cascade';
};

const pushUnique = (out: Coord[], seen: Set<number>, grid: Grid2D<Cell>, c: Coord): void => {
  if (!grid.inBounds(c.x, c.y)) return;
  if (!grid.at(c.x, c.y).playable) return;
  const i = grid.toIndex(c.x, c.y);
  if (seen.has(i)) return;
  seen.add(i);
  out.push(c);
};

export const footprintCross = (grid: Grid2D<Cell>, at: Coord): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  for (let x = 0; x < grid.width; x++) pushUnique(out, seen, grid, { x, y: at.y });
  for (let y = 0; y < grid.height; y++) pushUnique(out, seen, grid, { x: at.x, y });
  return sortCoords(out);
};

export const footprintLine = (
  grid: Grid2D<Cell>,
  at: Coord,
  orientation: 'h' | 'v',
): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  if (orientation === 'v') {
    for (let y = 0; y < grid.height; y++) pushUnique(out, seen, grid, { x: at.x, y });
  } else {
    for (let x = 0; x < grid.width; x++) pushUnique(out, seen, grid, { x, y: at.y });
  }
  return sortCoords(out);
};

/** Chebyshev radius (1 = 3×3, 2 = 5×5, 3 = 7×7). */
export const footprintRadius = (grid: Grid2D<Cell>, at: Coord, radius: number): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      pushUnique(out, seen, grid, { x: at.x + dx, y: at.y + dy });
    }
  }
  return sortCoords(out);
};

export const footprintColor = (
  grid: Grid2D<Cell>,
  color: CrystalColor,
  includeAt?: Coord,
): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  grid.forEach((cell, coord) => {
    if (cell.playable && cell.piece?.color === color) pushUnique(out, seen, grid, coord);
  });
  if (includeAt) pushUnique(out, seen, grid, includeAt);
  return sortCoords(out);
};

export const footprintBoard = (grid: Grid2D<Cell>): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  grid.forEach((cell, coord) => {
    if (!cell.playable || !cell.piece) return;
    if (cell.piece.kind === 'stone') return;
    pushUnique(out, seen, grid, coord);
  });
  return sortCoords(out);
};

/**
 * Super Chest / Kraken: 8 tentacle rays + body, then "pull" a colour (shells)
 * from anywhere on the board and eat them.
 *
 * Directions include diagonals so tentacles read as branching arms.
 */
export const footprintTentacles = (
  grid: Grid2D<Cell>,
  at: Coord,
  length = 5,
): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  // Body — octopus sits on a 3×3
  for (const c of footprintRadius(grid, at, 1)) pushUnique(out, seen, grid, c);
  const dirs: readonly (readonly [number, number])[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [dx, dy] of dirs) {
    for (let i = 1; i <= length; i++) {
      pushUnique(out, seen, grid, { x: at.x + dx * i, y: at.y + dy * i });
    }
  }
  return sortCoords(out);
};

/**
 * Octopus Super Chest clear: tentacles + every piece of the "meal" colour.
 * Prefer partner colour (swapped shell); else tidal shells; else largest colour group.
 */
export const footprintKraken = (
  grid: Grid2D<Cell>,
  at: Coord,
  mealColor: CrystalColor | null,
): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  for (const c of footprintTentacles(grid, at, 5)) pushUnique(out, seen, grid, c);

  let color = mealColor;
  if (!color) {
    // Prefer shells (tidal) when present — Harbor "pull the shells in"
    let tidalCount = 0;
    const counts = new Map<CrystalColor, number>();
    grid.forEach((cell) => {
      const col = cell.piece?.color;
      if (!col || !cell.playable) return;
      counts.set(col, (counts.get(col) ?? 0) + 1);
      if (col === 'tidal') tidalCount++;
    });
    if (tidalCount > 0) color = 'tidal';
    else {
      let best: CrystalColor | null = null;
      let bestN = 0;
      for (const [c, n] of counts) {
        if (n > bestN) {
          best = c;
          bestN = n;
        }
      }
      color = best;
    }
  }
  if (color) {
    for (const c of footprintColor(grid, color, at)) pushUnique(out, seen, grid, c);
  }
  return sortCoords(out);
};

export const footprintSolo = (
  grid: Grid2D<Cell>,
  at: Coord,
  piece: Piece,
  partnerColor: CrystalColor | null,
): Coord[] => {
  if (piece.kind === 'line') return footprintLine(grid, at, piece.orientation ?? 'h');
  if (piece.kind === 'burst') return footprintRadius(grid, at, 1);
  if (piece.kind === 'prism') {
    if (partnerColor) return footprintColor(grid, partnerColor, at);
    return sortCoords([at]);
  }
  if (piece.kind === 'supernova') {
    // Super Chest: tentacles branch out, pull meal colour, eat them.
    return footprintKraken(grid, at, partnerColor);
  }
  if (piece.kind === 'core') {
    return footprintRadius(grid, at, 1);
  }
  return [];
};

export interface ComboPlan {
  readonly affected: Coord[];
  readonly kind: PowerKind;
  readonly chainFires: readonly { at: Coord; piece: Piece }[];
  readonly label: string;
}

const merge = (grid: Grid2D<Cell>, lists: readonly (readonly Coord[])[]): Coord[] => {
  const out: Coord[] = [];
  const seen = new Set<number>();
  for (const list of lists) {
    for (const c of list) pushUnique(out, seen, grid, c);
  }
  return sortCoords(out);
};

/**
 * True when a power may fire on this swap.
 * - Power + power → always (combo).
 * - Prism + coloured crystal → always (prism paints that colour).
 * - Line / burst / coloured power + crystal → **same colour only**.
 * - Supernova (no colour) + crystal → always (peak wipe still needs a partner gem).
 */
export const powerSwapActivates = (aPiece: Piece, bPiece: Piece): boolean => {
  const aPow = isPowerCrystal(aPiece);
  const bPow = isPowerCrystal(bPiece);
  if (!aPow && !bPow) return false;
  if (aPow && bPow) return true;

  const power = aPow ? aPiece : bPiece;
  const other = aPow ? bPiece : aPiece;

  if (power.kind === 'prism') {
    // Prism must swap into a coloured gem (or power already handled above).
    return other.color !== null || other.kind === 'crystal';
  }
  if (power.kind === 'supernova') {
    // Peak special has no colour — partner any clearable gem.
    return other.kind === 'crystal' || other.color !== null || isPowerCrystal(other);
  }
  // Line / burst: require same colour as the power gem.
  if (power.color && other.color) return power.color === other.color;
  return false;
};

/**
 * Plan the outcome of a swap that involves at least one power crystal.
 * Pieces are the post-swap occupants of `a` / `b`.
 */
export const planPowerSwap = (
  grid: Grid2D<Cell>,
  a: Coord,
  aPiece: Piece,
  b: Coord,
  bPiece: Piece,
  ids: IdAllocator,
): ComboPlan | null => {
  const aPow = isPowerCrystal(aPiece);
  const bPow = isPowerCrystal(bPiece);
  if (!aPow && !bPow) return null;
  if (!powerSwapActivates(aPiece, bPiece)) return null;

  if (aPow && bPow) {
    const ka = aPiece.kind as PowerKind;
    const kb = bPiece.kind as PowerKind;
    const label = comboLabel(ka, kb);

    // Any supernova pairing with another power → full board (peak payoff).
    if (ka === 'supernova' || kb === 'supernova') {
      if (ka === 'supernova' && kb === 'supernova') {
        return { affected: footprintBoard(grid), kind: 'supernova', chainFires: [], label };
      }
      // Supernova + line/burst/prism: still board wipe with spectacle kind
      return { affected: footprintBoard(grid), kind: 'supernova', chainFires: [], label };
    }

    if (ka === 'prism' && kb === 'prism') {
      return { affected: footprintBoard(grid), kind: 'prism', chainFires: [], label };
    }

    if (ka === 'prism' || kb === 'prism') {
      const prismAt = ka === 'prism' ? a : b;
      const other = ka === 'prism' ? bPiece : aPiece;
      const otherAt = ka === 'prism' ? b : a;
      const color = other.color;
      const chainFires: { at: Coord; piece: Piece }[] = [];
      const parts: Coord[][] = [[prismAt, otherAt]];

      if (color && (other.kind === 'line' || other.kind === 'burst')) {
        const targets = footprintColor(grid, color);
        for (const t of targets) {
          if ((t.x === otherAt.x && t.y === otherAt.y) || (t.x === prismAt.x && t.y === prismAt.y)) {
            continue;
          }
          const cell = grid.at(t.x, t.y);
          if (!cell.piece || cell.piece.color !== color) continue;
          if (other.kind === 'line') {
            const ori: 'h' | 'v' =
              other.orientation ?? ((t.x + t.y) % 2 === 0 ? 'h' : 'v');
            const piece = makeLine(ids, color, ori);
            chainFires.push({ at: t, piece });
            parts.push(footprintLine(grid, t, ori));
          } else {
            const piece = makeBurst(ids, color);
            chainFires.push({ at: t, piece });
            parts.push(footprintRadius(grid, t, 2)); // upgraded chromatic bloom
          }
        }
        if (other.kind === 'line') {
          parts.push(footprintLine(grid, otherAt, other.orientation ?? 'h'));
        } else {
          parts.push(footprintRadius(grid, otherAt, 2));
        }
      } else if (color) {
        parts.push(footprintColor(grid, color, prismAt));
      }

      return {
        affected: merge(grid, parts),
        kind: 'prism',
        chainFires,
        label,
      };
    }

    if (ka === 'line' && kb === 'line') {
      return {
        affected: merge(grid, [footprintCross(grid, a), footprintCross(grid, b)]),
        kind: 'line',
        chainFires: [],
        label,
      };
    }

    // Line + Burst → full cross + 7×7 bloom (radius 3)
    if ((ka === 'line' && kb === 'burst') || (ka === 'burst' && kb === 'line')) {
      const lineAt = ka === 'line' ? a : b;
      const burstAt = ka === 'burst' ? a : b;
      return {
        affected: merge(grid, [
          footprintCross(grid, lineAt),
          footprintRadius(grid, burstAt, 3),
        ]),
        kind: 'burst',
        chainFires: [],
        label,
      };
    }

    // Burst + Burst → dual 7×7 (feels like "two big zones")
    if (ka === 'burst' && kb === 'burst') {
      return {
        affected: merge(grid, [
          footprintRadius(grid, a, 3),
          footprintRadius(grid, b, 3),
        ]),
        kind: 'burst',
        chainFires: [],
        label,
      };
    }
  }

  // Solo power + ordinary crystal
  const powerAt = aPow ? a : b;
  const power = aPow ? aPiece : bPiece;
  const partner = aPow ? bPiece : aPiece;
  const partnerColor = partner.color ?? power.color;
  return {
    affected: footprintSolo(grid, powerAt, power, partnerColor),
    kind: power.kind as PowerKind,
    chainFires: [],
    label: powerDisplayName(power.kind as PowerKind),
  };
};

export const powersInCells = (
  grid: Grid2D<Cell>,
  cells: readonly Coord[],
): { at: Coord; piece: Piece }[] => {
  const out: { at: Coord; piece: Piece }[] = [];
  for (const c of cells) {
    const p = grid.get(c.x, c.y)?.piece ?? null;
    if (isPowerCrystal(p)) out.push({ at: c, piece: p });
  }
  return out;
};
