/**
 * CRYSTALLINE — session façade.
 *
 * PURE MODEL CODE. No DOM, no timers, no Math.random, no Date.now.
 *
 * This is the only engine entry the UI should call.
 */

import { countShadowed, spreadShadow, tickBombs } from './blockers';
import { hasLegalMove, reshuffleBoard } from './deadlock';
import type { GameEvent } from './events';
import { applyGravity } from './gravity';
import { Grid2D } from './grid';
import { findMatchesAt, hasAnyMatch } from './match';
import { canAttemptSwap, swapPieces } from './moves';
import {
  allObjectivesMet,
  initObjectives,
  refreshObjectives,
  starsFromScore,
} from './objectives';
import { claimLivingCore, resolveCascades, triggerPowerSwap } from './resolve';
import { createRng } from './rng';
import {
  conveyorShiftRow,
  levelHasConveyor,
  pickConveyorRow,
} from './conveyor';
import { buildSpawnTable, fillEmptyCells } from './spawn';
import { isLivingCore, isPowerCrystal } from './specials';
import { newCounters, type SessionState } from './state';
import {
  createIdAllocator,
  makeBomb,
  makeCell,
  makePrism,
  makeRelic,
  makeStone,
} from './tile';
import type { BoardSnapshot, Cell, Coord, LevelDef } from './types';

export interface Session {
  trySwap(a: Coord, b: Coord): GameEvent[];
  snapshot(): BoardSnapshot;
  getDdaScalar(): number;
  applyDda(scalar: number): void;
  useSeedPrism(): GameEvent[];
  addMoves(n: number): GameEvent[];
  /**
   * Near-miss continue: revive a just-lost session (out of moves) with extra moves.
   * Does not burn another life — the life was never committed until the player declines.
   */
  continueWithMoves(n: number): GameEvent[];
  usePickaxe(at: Coord): GameEvent[];
  useReshuffle(): GameEvent[];
  /** Claim Living Core at a cell (tap). */
  claimCore(at: Coord): GameEvent[];
  /** Tests / integration only. */
  readonly _state: SessionState;
}

const parseLayout = (
  level: LevelDef,
  ids: ReturnType<typeof createIdAllocator>,
): Grid2D<Cell> => {
  const { width, height, layout, bombFuse = 5 } = level;
  return new Grid2D<Cell>(width, height, (_i, { x, y }) => {
    if (!layout) return makeCell(true, 0, 0);
    const ch = layout[y]?.[x] ?? '.';
    switch (ch) {
      case '#':
        return makeCell(false, 0, 0);
      case '1':
        return makeCell(true, 1, 0);
      case '2':
        return makeCell(true, 2, 0);
      case '3':
        return makeCell(true, 3, 0);
      case 'S': {
        const c = makeCell(true, 0, 0);
        c.piece = makeStone(ids);
        return c;
      }
      case 'B': {
        const c = makeCell(true, 0, 0);
        c.piece = makeBomb(ids, bombFuse);
        return c;
      }
      case 'R': {
        const c = makeCell(true, 0, 0);
        c.piece = makeRelic(ids);
        return c;
      }
      default:
        return makeCell(true, 0, 0);
    }
  });
};

const tallyInitial = (grid: Grid2D<Cell>) => {
  let crustInitial = 0;
  let bombsInitial = 0;
  grid.forEach((cell) => {
    if (!cell.playable) return;
    if (cell.crust > 0) crustInitial++;
    if (cell.piece?.kind === 'bomb') bombsInitial++;
  });
  return { crustInitial, bombsInitial };
};

const toSnapshot = (s: SessionState): BoardSnapshot => ({
  width: s.grid.width,
  height: s.grid.height,
  cells: s.grid.raw.map((c) => ({
    playable: c.playable,
    piece: c.piece,
    crust: c.crust,
    shadow: c.shadow,
  })),
  movesLeft: s.movesLeft,
  score: s.score,
  status: s.status,
  objectives: s.objectives,
  stars: s.stars,
});

const endIfNeeded = (s: SessionState, events: GameEvent[]): void => {
  s.objectives = refreshObjectives(s);
  events.push({ t: 'objectives', progress: s.objectives });

  if (s.status !== 'playing') {
    const won = s.status === 'won';
    s.stars = starsFromScore(s.score, s.level.stars, {
      won,
      movesLeft: won ? s.movesLeft : 0,
    });
    events.push({
      t: 'levelEnded',
      status: won ? 'won' : 'lost',
      score: s.score,
      stars: s.stars,
      reason: s.endReason ?? (won ? 'objectivesMet' : 'outOfMoves'),
    });
    return;
  }

  if (allObjectivesMet(s.objectives)) {
    s.status = 'won';
    s.endReason = 'objectivesMet';
    s.stars = starsFromScore(s.score, s.level.stars, {
      won: true,
      movesLeft: s.movesLeft,
    });
    events.push({
      t: 'levelEnded',
      status: 'won',
      score: s.score,
      stars: s.stars,
      reason: 'objectivesMet',
    });
    return;
  }

  if (s.movesLeft <= 0) {
    s.status = 'lost';
    s.endReason = 'outOfMoves';
    s.stars = starsFromScore(s.score, s.level.stars, { won: false });
    events.push({
      t: 'levelEnded',
      status: 'lost',
      score: s.score,
      stars: s.stars,
      reason: 'outOfMoves',
    });
  }
};

const ensurePlayable = (s: SessionState, events: GameEvent[]): void => {
  if (s.status !== 'playing') return;
  if (!hasLegalMove(s.grid)) {
    reshuffleBoard(s.grid, s.rng);
    events.push({ t: 'reshuffle', reason: 'deadlock' });
  }
};

const afterMove = (
  s: SessionState,
  events: GameEvent[],
  opts: { spentMove?: boolean } = {},
): void => {
  // Sort-inspired belt: only when a player move was spent (mid/deep levels).
  if (opts.spentMove && levelHasConveyor(s.level.id) && s.status === 'playing') {
    const row = pickConveyorRow(s.grid);
    const direction = s.moveIndex % 2 === 0 ? 'left' : 'right';
    const conv = conveyorShiftRow(s.grid, row, direction);
    if (conv.length > 0) {
      events.push(...conv);
      if (hasAnyMatch(s.grid)) {
        events.push(...resolveCascades(s, []));
      }
    }
  }
  events.push(...tickBombs(s));
  if (
    s.level.shadowPeriod !== undefined &&
    s.moveIndex > 0 &&
    s.moveIndex % s.level.shadowPeriod === 0
  ) {
    events.push(...spreadShadow(s, s.rng));
  }
  ensurePlayable(s, events);
  endIfNeeded(s, events);
};

const commitMove = (s: SessionState, events: GameEvent[]): void => {
  s.movesLeft -= 1;
  s.moveIndex += 1;
  events.push({ t: 'movesChanged', left: s.movesLeft });
};

const fillOpening = (s: SessionState): void => {
  const { grid, rng, table, ids } = s;
  for (let attempt = 0; attempt < 40; attempt++) {
    grid.forEach((cell) => {
      if (cell.piece?.kind === 'crystal') cell.piece = null;
    });
    fillEmptyCells(grid, rng, table, ids);
    if (!hasAnyMatch(grid) && hasLegalMove(grid)) return;
  }
  grid.forEach((cell) => {
    if (cell.piece?.kind === 'crystal') cell.piece = null;
  });
  fillEmptyCells(grid, rng, table, ids);
  if (hasAnyMatch(grid) || !hasLegalMove(grid)) reshuffleBoard(grid, rng);
};

/**
 * Collect levels previously had no relic spawns — boards were unwinnable.
 * Seed a visible starter set, then gravity refill injects the rest.
 */
const seedCollectRelics = (s: SessionState): void => {
  const target = s.level.objectives
    .filter((o) => o.kind === 'collect')
    .reduce((sum, o) => sum + o.target, 0);
  if (target <= 0) return;

  let onBoard = 0;
  s.grid.forEach((cell) => {
    if (cell.piece?.kind === 'relic') onBoard += 1;
  });
  // Seed about half the goal (at least 1, at most target) as gold artifacts near the top.
  const want = Math.min(target, Math.max(1, Math.ceil(target * 0.5)));
  if (onBoard >= want) return;

  // Prefer upper playable cells so the player sees them fall.
  const slots: { x: number; y: number }[] = [];
  for (let y = 0; y < s.grid.height; y++) {
    for (let x = 0; x < s.grid.width; x++) {
      const cell = s.grid.at(x, y);
      if (!cell.playable || cell.piece?.kind !== 'crystal') continue;
      if (cell.crust > 0) continue;
      slots.push({ x, y });
    }
  }
  // Upper rows first
  slots.sort((a, b) => a.y - b.y || a.x - b.x);

  let need = want - onBoard;
  for (const slot of slots) {
    if (need <= 0) break;
    const cell = s.grid.at(slot.x, slot.y);
    cell.piece = makeRelic(s.ids);
    need -= 1;
  }
};

export const createSession = (level: LevelDef, seed: number, ddaScalar = 0): Session => {
  const rng = createRng(seed);
  const ids = createIdAllocator(1);
  const grid = parseLayout(level, ids);
  const table = buildSpawnTable(level, ddaScalar);

  const counters = newCounters();
  const tallies = tallyInitial(grid);
  counters.crustInitial = tallies.crustInitial;
  counters.bombsInitial = tallies.bombsInitial;

  const state: SessionState = {
    level,
    grid,
    rng,
    ids,
    movesLeft: level.moves,
    score: 0,
    status: 'playing',
    moveIndex: 0,
    stars: 0,
    endReason: null,
    ddaScalar,
    table,
    counters,
    objectives: [],
  };

  fillOpening(state);
  seedCollectRelics(state);
  counters.shadowSeen = countShadowed(grid);
  state.objectives = initObjectives(level, counters);

  return {
    get _state() {
      return state;
    },

    getDdaScalar: () => state.ddaScalar,

    applyDda(scalar: number) {
      state.ddaScalar = Math.max(-1, Math.min(1, scalar));
      state.table = buildSpawnTable(level, state.ddaScalar);
    },

    snapshot: () => toSnapshot(state),

    trySwap(a: Coord, b: Coord): GameEvent[] {
      const events: GameEvent[] = [];
      const check = canAttemptSwap(grid, a, b, state.status === 'playing');
      if (!check.ok) {
        events.push({
          t: 'swapRejected',
          a,
          b,
          reason: check.reason ?? 'notPlaying',
        });
        return events;
      }

      const pieceA = grid.at(a.x, a.y).piece;
      const pieceB = grid.at(b.x, b.y).piece;

      // Living Core: swapping it claims the bonus (doesn't need a match).
      if (isLivingCore(pieceA) || isLivingCore(pieceB)) {
        const coreAt = isLivingCore(pieceA) ? a : b;
        events.push({ t: 'swap', a, b });
        // Don't swap — claim in place
        events.push(...claimLivingCore(state, coreAt));
        // No move spent for core claim via intentional swap-into — actually spend?
        // Treat as free reward: no move cost.
        afterMove(state, events, { spentMove: false });
        endIfNeeded(state, events);
        return events;
      }

      const powerInvolved = isPowerCrystal(pieceA) || isPowerCrystal(pieceB);

      swapPieces(grid, a, b);

      // After swap: original A is at b, original B is at a.
      const atA = grid.at(a.x, a.y).piece;
      const atB = grid.at(b.x, b.y).piece;

      if (powerInvolved && atA && atB && (isPowerCrystal(atA) || isPowerCrystal(atB))) {
        events.push({ t: 'swap', a, b });
        commitMove(state, events);
        events.push(...triggerPowerSwap(state, a, atA, b, atB));
        afterMove(state, events, { spentMove: true });
        return events;
      }

      const matches = findMatchesAt(grid, [a, b]);
      if (matches.length === 0) {
        swapPieces(grid, a, b);
        events.push({ t: 'swapRejected', a, b, reason: 'noMatch' });
        return events;
      }

      events.push({ t: 'swap', a, b });
      commitMove(state, events);
      events.push(...resolveCascades(state, [a, b]));
      afterMove(state, events, { spentMove: true });
      return events;
    },

    claimCore(at: Coord): GameEvent[] {
      const events: GameEvent[] = [];
      if (state.status !== 'playing') return events;
      events.push(...claimLivingCore(state, at));
      ensurePlayable(state, events);
      endIfNeeded(state, events);
      return events;
    },

    useSeedPrism(): GameEvent[] {
      const events: GameEvent[] = [];
      if (state.status !== 'playing') return events;
      const candidates: Coord[] = [];
      grid.forEach((cell, coord) => {
        if (cell.playable && cell.piece?.kind === 'crystal') candidates.push(coord);
      });
      if (candidates.length === 0) return events;
      const at = candidates[state.rng.int(candidates.length)] as Coord;
      const prism = makePrism(state.ids);
      grid.at(at.x, at.y).piece = prism;
      events.push({ t: 'spawnSpecial', at, piece: prism });
      return events;
    },

    addMoves(n: number): GameEvent[] {
      if (state.status !== 'playing') return [];
      state.movesLeft += Math.max(0, Math.floor(n));
      return [{ t: 'movesChanged', left: state.movesLeft }];
    },

    continueWithMoves(n: number): GameEvent[] {
      if (state.status !== 'lost' || state.endReason !== 'outOfMoves') return [];
      state.status = 'playing';
      state.endReason = null;
      state.movesLeft = Math.max(0, Math.floor(n));
      return [{ t: 'movesChanged', left: state.movesLeft }];
    },

    usePickaxe(at: Coord): GameEvent[] {
      const events: GameEvent[] = [];
      if (state.status !== 'playing') return events;
      if (!grid.inBounds(at.x, at.y)) return events;
      const cell = grid.at(at.x, at.y);
      if (!cell.playable || cell.piece === null) return events;
      if (cell.piece.kind === 'stone') return events;
      if (cell.piece.kind === 'relic') return events; // never smash collect artifacts
      cell.piece = null;
      events.push({ t: 'clear', cells: [at], cause: 'match', cascadeStep: 0 });
      const collectTarget = level.objectives
        .filter((o) => o.kind === 'collect')
        .reduce((sum, o) => sum + o.target, 0);
      let relicsOnBoard = 0;
      grid.forEach((c) => {
        if (c.piece?.kind === 'relic') relicsOnBoard += 1;
      });
      const { falls, spawns } = applyGravity(grid, state.rng, state.table, state.ids, {
        relics:
          collectTarget > state.counters.relicsCollected
            ? {
                remaining: collectTarget - state.counters.relicsCollected,
                onBoard: relicsOnBoard,
              }
            : undefined,
      });
      if (falls.length > 0) events.push({ t: 'fall', moves: falls });
      if (spawns.length > 0) events.push({ t: 'spawn', spawns });
      events.push(...resolveCascades(state, [at]));
      ensurePlayable(state, events);
      endIfNeeded(state, events);
      return events;
    },

    useReshuffle(): GameEvent[] {
      if (state.status !== 'playing') return [];
      reshuffleBoard(grid, state.rng);
      return [{ t: 'reshuffle', reason: 'deadlock' }];
    },
  };
};
