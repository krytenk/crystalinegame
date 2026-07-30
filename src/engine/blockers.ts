/**
 * CRYSTALLINE — blocker side-effects.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * Crust and shadow live on the cell; stone / bomb / relic are pieces.
 */

import type { GameEvent } from './events';
import { ddaModulation } from './dda';
import { sortCoords, type Grid2D } from './grid';
import type { Rng } from './rng';
import { withFuse } from './tile';
import { SCORE, type Cell, type Coord } from './types';
import type { SessionState } from './state';

/**
 * Damage crust on cells adjacent to a clear, and on the cleared cells themselves.
 * Returns events plus points earned (SCORE.crustLayer per layer cracked).
 */
export const damageCrustNear = (
  grid: Grid2D<Cell>,
  cleared: readonly Coord[],
  counters: { crustBroken: number },
): { events: GameEvent[]; points: number } => {
  const events: GameEvent[] = [];
  const candidates = new Set<number>();

  for (const c of cleared) {
    candidates.add(grid.toIndex(c.x, c.y));
    for (const n of grid.neighbors4(c.x, c.y)) {
      candidates.add(grid.toIndex(n.x, n.y));
    }
  }

  let layersHit = 0;
  for (const idx of candidates) {
    const { x, y } = grid.fromIndex(idx);
    const cell = grid.at(x, y);
    if (!cell.playable || cell.crust <= 0) continue;
    cell.crust -= 1;
    layersHit += 1;
    events.push({ t: 'crustDamaged', at: { x, y }, layersLeft: cell.crust });
    if (cell.crust === 0) counters.crustBroken += 1;
  }

  return { events, points: layersHit * SCORE.crustLayer };
};

/** Clear shadow on matched cells. */
export const clearShadowOn = (grid: Grid2D<Cell>, cells: readonly Coord[]): GameEvent[] => {
  const cleared: Coord[] = [];
  for (const c of cells) {
    const cell = grid.get(c.x, c.y);
    if (!cell || !cell.playable || cell.shadow <= 0) continue;
    cell.shadow = 0;
    cleared.push(c);
  }
  if (cleared.length === 0) return [];
  return [{ t: 'shadowCleared', cells: sortCoords([...cleared]) }];
};

/**
 * Spread creeping shadow. Number of new cells scales with DDA shadowRate.
 * Prefers cells adjacent to existing shadow.
 */
export const spreadShadow = (
  session: SessionState,
  rng: Rng,
): GameEvent[] => {
  const { grid, level, ddaScalar } = session;
  if (level.shadowPeriod === undefined) return [];

  const rate = ddaModulation(ddaScalar).shadowRate;
  const baseCount = 1;
  const count = Math.max(1, Math.round(baseCount * rate));

  // Seed: cells already shadowed.
  const shadowed: Coord[] = [];
  const free: Coord[] = [];
  grid.forEach((cell, coord) => {
    if (!cell.playable) return;
    if (cell.shadow > 0) shadowed.push(coord);
    else free.push(coord);
  });

  if (free.length === 0) return [];

  const targets: Coord[] = [];
  // Prefer neighbours of existing shadow.
  const frontier: Coord[] = [];
  for (const s of shadowed) {
    for (const n of grid.neighbors4(s.x, s.y)) {
      const cell = grid.at(n.x, n.y);
      if (cell.playable && cell.shadow === 0) frontier.push(n);
    }
  }

  const pickPool = frontier.length > 0 ? frontier : free;
  const used = new Set<number>();
  for (let i = 0; i < count && used.size < pickPool.length; i++) {
    // Deterministic pick from remaining pool.
    const available = pickPool.filter((c) => !used.has(grid.toIndex(c.x, c.y)));
    if (available.length === 0) break;
    const choice = available[rng.int(available.length)] as Coord;
    used.add(grid.toIndex(choice.x, choice.y));
    targets.push(choice);
  }

  for (const t of targets) {
    const cell = grid.at(t.x, t.y);
    cell.shadow = Math.min(2, cell.shadow + 1);
    session.counters.shadowSeen = Math.max(
      session.counters.shadowSeen,
      countShadowed(grid),
    );
  }

  if (targets.length === 0) return [];
  return [{ t: 'shadowSpread', cells: sortCoords(targets) }];
};

export const countShadowed = (grid: Grid2D<Cell>): number => {
  let n = 0;
  grid.forEach((c) => {
    if (c.playable && c.shadow > 0) n++;
  });
  return n;
};

/** Tick bomb fuses after a player move. Returns events; may set level lost. */
export const tickBombs = (session: SessionState): GameEvent[] => {
  const events: GameEvent[] = [];
  const { grid } = session;
  let exploded = false;

  grid.forEach((cell, coord) => {
    if (!cell.piece || cell.piece.kind !== 'bomb') return;
    const fuse = (cell.piece.fuse ?? 1) - 1;
    if (fuse <= 0) {
      events.push({ t: 'bombExploded', at: coord });
      exploded = true;
    } else {
      cell.piece = withFuse(cell.piece, fuse);
      events.push({ t: 'bombTick', at: coord, fuse });
    }
  });

  if (exploded && session.status === 'playing') {
    session.status = 'lost';
    session.endReason = 'bombExpired';
  }
  return events;
};

/**
 * Defuse bombs adjacent to a clear (or on a cleared cell if somehow matchable).
 * Bombs are not matchable; adjacency is the only path.
 */
export const defuseBombsNear = (
  grid: Grid2D<Cell>,
  cleared: readonly Coord[],
  counters: { bombsDefused: number },
): GameEvent[] => {
  const events: GameEvent[] = [];
  const seen = new Set<number>();

  for (const c of cleared) {
    for (const n of grid.neighbors4(c.x, c.y)) {
      const idx = grid.toIndex(n.x, n.y);
      if (seen.has(idx)) continue;
      seen.add(idx);
      const cell = grid.at(n.x, n.y);
      if (cell.piece?.kind === 'bomb') {
        cell.piece = null;
        counters.bombsDefused += 1;
        // Represent defuse as a clear-style bomb removal via crust? Use bombExploded
        // is wrong. We'll emit specialTriggered-like via clear — use bombTick fuse 0
        // is wrong too. Emit as clear cause bomb handled elsewhere.
        // Use a bombExploded only for expiry. For defuse, just remove silently and
        // rely on objectives refresh. Emit crustDamaged-like? Better: clear event
        // is handled by caller. Just remove the piece.
      }
    }
  }
  return events;
};

/** Collect relics that sit on the bottom-most playable cell of their column. */
export const collectRelics = (
  grid: Grid2D<Cell>,
  counters: { relicsCollected: number },
): GameEvent[] => {
  const events: GameEvent[] = [];

  for (let x = 0; x < grid.width; x++) {
    // Find lowest playable y.
    let bottom = -1;
    for (let y = grid.height - 1; y >= 0; y--) {
      if (grid.at(x, y).playable) {
        bottom = y;
        break;
      }
    }
    if (bottom < 0) continue;
    const cell = grid.at(x, bottom);
    if (cell.piece?.kind === 'relic') {
      cell.piece = null;
      counters.relicsCollected += 1;
      events.push({
        t: 'relicCollected',
        at: { x, y: bottom },
        total: counters.relicsCollected,
      });
    }
  }
  return events;
};
