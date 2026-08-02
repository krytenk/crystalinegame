/**
 * CRYSTALLINE — cascade resolution → ordered GameEvent stream.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * Power crystals (line / burst / prism) are forged by 4 / L-T / 5 / 6+ matches.
 * Mix-and-match swaps between power crystals produce distinct board outcomes.
 * Specials wiped by a normal match chain-detonate so their power is never wasted.
 */

import {
  clearShadowOn,
  collectRelics,
  damageCrustNear,
  defuseBombsNear,
} from './blockers';
import type { GameEvent } from './events';
import { applyGravity } from './gravity';
import { sortCoords, type Grid2D } from './grid';
import { findAllMatches, findMatchesAt, groupOrientation } from './match';
import { bonusSpecialChance, type SpawnTable } from './spawn';
import type { Rng } from './rng';
import {
  footprintSolo,
  isPowerCrystal,
  planPowerSwap,
  type PowerKind,
} from './specials';
import {
  makeBurst,
  makeCore,
  makeLine,
  makePrism,
  makeSupernova,
  type IdAllocator,
} from './tile';
import {
  SCORE,
  type Cell,
  type ClearCause,
  type Coord,
  type MatchGroup,
  type MatchShape,
  type Piece,
} from './types';
import type { SessionState } from './state';

const MAX_CASCADE_STEPS = 64;
const MAX_DETONATIONS = 48;

const clearCells = (
  grid: Grid2D<Cell>,
  cells: readonly Coord[],
  cause: ClearCause,
  cascadeStep: number,
): GameEvent[] => {
  const actually: Coord[] = [];
  for (const c of cells) {
    const cell = grid.get(c.x, c.y);
    if (!cell || !cell.playable) continue;
    if (cell.crust > 0) continue;
    // Relics are never destroyed by matches/blasts — only collected at the bottom.
    if (cell.piece?.kind === 'relic') continue;
    if (cell.piece !== null) {
      cell.piece = null;
      actually.push(c);
    }
  }
  if (actually.length === 0) return [];
  return [
    {
      t: 'clear',
      cells: sortCoords(actually),
      cause,
      cascadeStep,
    },
  ];
};

/** Forge a power crystal from match shape / size. 6+ → Supernova. */
export const shapeReward = (
  ids: IdAllocator,
  group: MatchGroup,
  rng: Rng,
  scalar: number,
): Piece | null => {
  if (group.cells.length >= 6) return makeSupernova(ids);
  switch (group.shape) {
    case 'five':
      return makePrism(ids);
    case 'L':
    case 'T':
      return makeBurst(ids, group.color);
    case 'four':
      return makeLine(ids, group.color, groupOrientation(group));
    case 'three':
      if (rng.chance(bonusSpecialChance(scalar))) {
        return rng.chance(0.5)
          ? makeLine(ids, group.color, groupOrientation(group))
          : makeBurst(ids, group.color);
      }
      return null;
    default:
      return null;
  }
};

const pointsForGroup = (group: MatchGroup, cascadeStep: number): number => {
  const mult = 1 + cascadeStep * SCORE.cascadeStep;
  let pts = group.cells.length * SCORE.perCrystal * mult;
  if (group.cells.length >= 6) pts += SCORE.special.supernova;
  else if (group.shape === 'four') pts += SCORE.special.line;
  else if (group.shape === 'L' || group.shape === 'T') pts += SCORE.special.burst;
  else if (group.shape === 'five') pts += SCORE.special.prism;
  return Math.round(pts);
};

/** Expand clear set by chain-detonating power crystals inside it. */
const expandWithPowerChains = (
  grid: Grid2D<Cell>,
  seed: readonly Coord[],
): { cells: Coord[]; detonations: { at: Coord; kind: PowerKind }[] } => {
  const seen = new Set<number>();
  const cells: Coord[] = [];
  const detonations: { at: Coord; kind: PowerKind }[] = [];
  const queue: Coord[] = [];
  const detonated = new Set<number>();

  const addCell = (c: Coord): void => {
    if (!grid.inBounds(c.x, c.y) || !grid.at(c.x, c.y).playable) return;
    const i = grid.toIndex(c.x, c.y);
    if (seen.has(i)) return;
    seen.add(i);
    cells.push(c);
    queue.push(c);
  };

  for (const c of seed) addCell(c);

  let steps = 0;
  while (queue.length > 0 && steps < MAX_DETONATIONS) {
    const c = queue.shift() as Coord;
    const idx = grid.toIndex(c.x, c.y);
    const piece = grid.at(c.x, c.y).piece;
    if (!isPowerCrystal(piece) || detonated.has(idx)) continue;
    detonated.add(idx);
    steps++;
    detonations.push({ at: c, kind: piece.kind as PowerKind });
    for (const f of footprintSolo(grid, c, piece, piece.color)) addCell(f);
  }

  return { cells: sortCoords(cells), detonations };
};

/** Total collect-objective target for this level (0 if none). */
export const collectTarget = (session: SessionState): number =>
  session.level.objectives
    .filter((o) => o.kind === 'collect')
    .reduce((sum, o) => sum + o.target, 0);

/** Count relics currently sitting on the board. */
export const countRelicsOnBoard = (session: SessionState): number => {
  let n = 0;
  session.grid.forEach((cell) => {
    if (cell.piece?.kind === 'relic') n += 1;
  });
  return n;
};

const gravityAndRelics = (session: SessionState): GameEvent[] => {
  const events: GameEvent[] = [];
  const target = collectTarget(session);
  const remaining = Math.max(0, target - session.counters.relicsCollected);
  const { falls, spawns } = applyGravity(
    session.grid,
    session.rng,
    session.table as SpawnTable,
    session.ids,
    {
      relics:
        remaining > 0
          ? { remaining, onBoard: countRelicsOnBoard(session) }
          : undefined,
    },
  );
  if (falls.length > 0) events.push({ t: 'fall', moves: falls });
  if (spawns.length > 0) events.push({ t: 'spawn', spawns });
  // Collect may open space for more gravity in rare stacked cases — run twice.
  events.push(...collectRelics(session.grid, session.counters));
  // Second micro-pass: if relics sat above another relic that just collected.
  const more = collectRelics(session.grid, session.counters);
  if (more.length > 0) {
    events.push(...more);
    const g2 = applyGravity(
      session.grid,
      session.rng,
      session.table as SpawnTable,
      session.ids,
      {
        relics:
          Math.max(0, target - session.counters.relicsCollected) > 0
            ? {
                remaining: Math.max(0, target - session.counters.relicsCollected),
                onBoard: countRelicsOnBoard(session),
              }
            : undefined,
      },
    );
    if (g2.falls.length > 0) events.push({ t: 'fall', moves: g2.falls });
    if (g2.spawns.length > 0) events.push({ t: 'spawn', spawns: g2.spawns });
    events.push(...collectRelics(session.grid, session.counters));
  }
  return events;
};

/**
 * Resolve colour matches until static. Powers inside matches chain-detonate.
 * Power crystals are forged at origins for 4 / L-T / 5 / 6+.
 */
export const resolveCascades = (
  session: SessionState,
  origins: readonly Coord[],
  opts: { initialCascadeStep?: number } = {},
): GameEvent[] => {
  const events: GameEvent[] = [];
  const { grid, rng, ids } = session;
  let cascadeStep = opts.initialCascadeStep ?? 0;
  let wavePoints = 0;
  let firstWave = true;
  let steps = 0;

  while (steps < MAX_CASCADE_STEPS) {
    steps++;
    const groups: MatchGroup[] = firstWave
      ? findMatchesAt(grid, origins)
      : findAllMatches(grid);
    firstWave = false;
    if (groups.length === 0) break;

    const allMatched: Coord[] = [];
    const matchSet = new Set<number>();
    const rewards: { at: Coord; piece: Piece }[] = [];

    for (const group of groups) {
      const pts = pointsForGroup(group, cascadeStep);
      wavePoints += pts;
      session.score += pts;
      events.push({
        t: 'match',
        cells: group.cells,
        color: group.color,
        shape: group.shape,
        cascadeStep,
        points: pts,
      });
      events.push({ t: 'scoreChanged', score: session.score, delta: pts });

      for (const c of group.cells) {
        const idx = grid.toIndex(c.x, c.y);
        if (!matchSet.has(idx)) {
          matchSet.add(idx);
          allMatched.push(c);
        }
      }

      const reward = shapeReward(ids, group, rng, session.ddaScalar);
      if (reward) rewards.push({ at: group.origin, piece: reward });
    }

    const expanded = expandWithPowerChains(grid, allMatched);
    for (const d of expanded.detonations) {
      events.push({
        t: 'specialTriggered',
        at: d.at,
        kind: d.kind,
        affected: expanded.cells,
      });
    }

    const crust = damageCrustNear(grid, expanded.cells, session.counters);
    events.push(...crust.events);
    if (crust.points > 0) {
      session.score += crust.points;
      wavePoints += crust.points;
      events.push({ t: 'scoreChanged', score: session.score, delta: crust.points });
    }
    events.push(...clearShadowOn(grid, expanded.cells));
    defuseBombsNear(grid, expanded.cells, session.counters);

    const extra = expanded.cells.length - allMatched.length;
    if (extra > 0) {
      const bonus = Math.round(extra * SCORE.perCrystal * 0.5);
      session.score += bonus;
      wavePoints += bonus;
      events.push({ t: 'scoreChanged', score: session.score, delta: bonus });
    }

    events.push(
      ...clearCells(
        grid,
        expanded.cells,
        cascadeStep === 0 ? 'match' : 'cascade',
        cascadeStep,
      ),
    );

    for (const r of rewards) {
      const cell = grid.at(r.at.x, r.at.y);
      if (!cell.playable || cell.crust > 0) continue;
      cell.piece = r.piece;
      events.push({ t: 'spawnSpecial', at: r.at, piece: r.piece });
    }

    events.push(...gravityAndRelics(session));
    cascadeStep++;
  }

  // Living Core: after a strong cascade (3+ waves), sometimes gift a spinning token.
  if (cascadeStep >= 3) {
    const coreEv = trySpawnLivingCore(session);
    if (coreEv) events.push(coreEv);
  }

  events.push({ t: 'cascadeEnd', steps: cascadeStep, totalPoints: wavePoints });
  return events;
};

/** Spawn at most one Living Core if none exists and an empty playable cell is free. */
export const trySpawnLivingCore = (session: SessionState): GameEvent | null => {
  const { grid, rng, ids } = session;
  let hasCore = false;
  const empties: Coord[] = [];
  grid.forEach((cell, coord) => {
    if (!cell.playable) return;
    if (cell.piece?.kind === 'core') hasCore = true;
    if (cell.piece === null && cell.crust === 0) empties.push(coord);
  });
  if (hasCore || empties.length === 0) return null;
  // ~55% after big cascades — common enough to teach the feature
  if (!rng.chance(0.55)) return null;
  const at = empties[rng.int(empties.length)] as Coord;
  const piece = makeCore(ids);
  grid.at(at.x, at.y).piece = piece;
  return { t: 'coreSpawned', at, piece };
};

const COMBO_LABELS = new Set([
  'Twin Fault',
  'Rift Bloom',
  'Core Shockwave',
  'Chromatic Seams',
  'Chromatic Bloom',
  'Void Collapse',
  'Total Eclipse',
  'Solar Rift',
  'Nova Bloom',
  'Chromatic Nova',
  'Supernova Cascade',
]);

/**
 * Fire power crystal(s) after a swap. Supports mix-and-match combos.
 * Pieces are the post-swap occupants of `atA` / `atB`.
 */
export const triggerPowerSwap = (
  session: SessionState,
  atA: Coord,
  pieceA: Piece,
  atB: Coord,
  pieceB: Piece,
): GameEvent[] => {
  const events: GameEvent[] = [];
  const plan = planPowerSwap(session.grid, atA, pieceA, atB, pieceB, session.ids);
  if (!plan) return events;

  events.push({
    t: 'specialTriggered',
    at: atA,
    kind: plan.kind,
    affected: plan.affected,
  });

  const comboMult = COMBO_LABELS.has(plan.label) ? 1.4 : 1;
  const bonus = Math.round(plan.affected.length * SCORE.perCrystal * comboMult);
  session.score += bonus;
  events.push({ t: 'scoreChanged', score: session.score, delta: bonus });

  // Chain any other powers caught in the blast.
  const expanded = expandWithPowerChains(session.grid, plan.affected);
  for (const d of expanded.detonations) {
    const isPrimary =
      (d.at.x === atA.x && d.at.y === atA.y) || (d.at.x === atB.x && d.at.y === atB.y);
    if (!isPrimary) {
      events.push({
        t: 'specialTriggered',
        at: d.at,
        kind: d.kind,
        affected: expanded.cells,
      });
    }
  }

  const crust = damageCrustNear(session.grid, expanded.cells, session.counters);
  events.push(...crust.events);
  if (crust.points > 0) {
    session.score += crust.points;
    events.push({ t: 'scoreChanged', score: session.score, delta: crust.points });
  }
  events.push(...clearShadowOn(session.grid, expanded.cells));
  defuseBombsNear(session.grid, expanded.cells, session.counters);

  const cause: ClearCause =
    plan.kind === 'supernova'
      ? 'supernova'
      : plan.kind === 'line' || plan.kind === 'burst' || plan.kind === 'prism'
        ? plan.kind
        : 'match';
  events.push(...clearCells(session.grid, expanded.cells, cause, 0));
  events.push(...gravityAndRelics(session));
  events.push(...resolveCascades(session, expanded.cells, { initialCascadeStep: 1 }));
  return events;
};

/** Solo power activation (e.g. if only one power is involved). */
export const triggerSpecial = (
  session: SessionState,
  at: Coord,
  partner: Piece | null,
): GameEvent[] => {
  const piece = session.grid.at(at.x, at.y).piece;
  if (!piece || !isPowerCrystal(piece)) return [];
  const other: Piece = partner ?? { id: -1, kind: 'crystal', color: piece.color };
  return triggerPowerSwap(session, at, piece, at, other);
};

/**
 * Claim a Living Core: +2 moves, small burst clear, or free shards flavour score.
 */
export const claimLivingCore = (
  session: SessionState,
  at: Coord,
): GameEvent[] => {
  const events: GameEvent[] = [];
  const cell = session.grid.get(at.x, at.y);
  if (!cell?.piece || cell.piece.kind !== 'core') return events;

  cell.piece = null;
  const roll = session.rng.int(3);
  const reward: 'moves' | 'burst' | 'shards' =
    roll === 0 ? 'moves' : roll === 1 ? 'burst' : 'shards';

  events.push({ t: 'coreClaimed', at, reward });

  if (reward === 'moves') {
    session.movesLeft += 2;
    events.push({ t: 'movesChanged', left: session.movesLeft });
  } else if (reward === 'burst') {
    const foot = footprintSolo(session.grid, at, { id: -1, kind: 'burst', color: 'ember' }, null);
    // Re-import footprint - already have footprintSolo from specials
    events.push({
      t: 'specialTriggered',
      at,
      kind: 'core',
      affected: foot,
    });
    const crust = damageCrustNear(session.grid, foot, session.counters);
    events.push(...crust.events);
    if (crust.points > 0) {
      session.score += crust.points;
      events.push({ t: 'scoreChanged', score: session.score, delta: crust.points });
    }
    const pts = Math.round(foot.length * SCORE.perCrystal);
    session.score += pts;
    events.push({ t: 'scoreChanged', score: session.score, delta: pts });
    events.push(...clearCells(session.grid, foot, 'core', 0));
    events.push(...gravityAndRelics(session));
    events.push(...resolveCascades(session, foot, { initialCascadeStep: 1 }));
  } else {
    // "Shards" flavour — pure score burst for the demo economy visual
    const pts = 400;
    session.score += pts;
    events.push({ t: 'scoreChanged', score: session.score, delta: pts });
  }

  return events;
};

export type { MatchShape };
