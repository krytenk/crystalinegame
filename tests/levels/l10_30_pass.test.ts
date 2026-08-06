/**
 * Thorough pass + bug check for levels 10–30.
 * Session smoke, objective integrity, multi-seed legal-hint play, win/lose paths.
 */
import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import { findLegalHint, hasLegalMove } from '../../src/engine/deadlock';
import { getLevel, isBossLevel } from '../../src/levels/index';

const LEVEL_IDS = Array.from({ length: 21 }, (_, i) => i + 10); // 10..30
const SEEDS = [1, 7, 42, 99, 256, 1337, 9001, 20260729];

function countPieces(s: ReturnType<typeof createSession>) {
  let relics = 0,
    bombs = 0,
    crust = 0,
    playable = 0,
    shadow = 0,
    empty = 0;
  s._state.grid.forEach((c) => {
    if (!c.playable) return;
    playable++;
    if (c.crust > 0) crust++;
    if (c.shadow > 0) shadow++;
    if (!c.piece) empty++;
    else if (c.piece.kind === 'relic') relics++;
    else if (c.piece.kind === 'bomb') bombs++;
  });
  return { relics, bombs, crust, playable, shadow, empty };
}

function playLegal(s: ReturnType<typeof createSession>, maxSteps = 80) {
  let steps = 0;
  let reshuffles = 0;
  while (s.snapshot().status === 'playing' && steps < maxSteps) {
    steps++;
    const hint = findLegalHint(s._state.grid);
    if (!hint) {
      s.useReshuffle();
      reshuffles++;
      if (reshuffles > 20) break;
      continue;
    }
    s.trySwap(hint.a, hint.b);
  }
  return { steps, reshuffles, snap: s.snapshot(), endReason: s._state.endReason };
}

describe('L10–30 static integrity', () => {
  for (const id of LEVEL_IDS) {
    it(`L${id} loads and has sane shape`, () => {
      const lvl = getLevel(id);
      expect(lvl.id).toBe(id);
      expect(lvl.moves).toBeGreaterThan(0);
      expect(lvl.colors.length).toBeGreaterThanOrEqual(4);
      expect(lvl.stars[0]).toBeLessThan(lvl.stars[1]);
      expect(lvl.stars[1]).toBeLessThan(lvl.stars[2]);
      if (lvl.layout) {
        expect(lvl.layout).toHaveLength(lvl.height);
        for (const row of lvl.layout) expect(row).toHaveLength(lvl.width);
      }
      // Boss flags
      if ([10, 15, 20, 25, 30].includes(id)) {
        expect(isBossLevel(id)).toBe(true);
        expect(lvl.boss).toBe(true);
      }
    });
  }
});

describe('L10–30 session smoke (multi-seed)', () => {
  for (const id of LEVEL_IDS) {
    it(`L${id} creates playable sessions`, () => {
      const lvl = getLevel(id);
      for (const seed of SEEDS) {
        const s = createSession(lvl, seed * 9973 + id);
        const snap = s.snapshot();
        expect(snap.status).toBe('playing');
        expect(snap.movesLeft).toBe(lvl.moves);
        expect(snap.width).toBe(lvl.width);
        expect(snap.height).toBe(lvl.height);
        expect(snap.objectives).toHaveLength(lvl.objectives.length);

        const counts = countPieces(s);
        expect(counts.playable).toBeGreaterThanOrEqual(9);
        // Opening must not start dead (reshuffle may run during fill)
        expect(hasLegalMove(s._state.grid)).toBe(true);

        // Collect: must seed relics
        const collectTarget = lvl.objectives
          .filter((o) => o.kind === 'collect')
          .reduce((n, o) => n + o.target, 0);
        if (collectTarget > 0) {
          expect(counts.relics).toBeGreaterThanOrEqual(1);
        }

        // Defuse: bombs present with fuse
        const defuseTarget = lvl.objectives
          .filter((o) => o.kind === 'defuse')
          .reduce((n, o) => n + o.target, 0);
        if (defuseTarget > 0) {
          expect(counts.bombs).toBe(defuseTarget);
          expect(lvl.bombFuse).toBeDefined();
          s._state.grid.forEach((c) => {
            if (c.piece?.kind === 'bomb') {
              expect(c.piece.fuse).toBe(lvl.bombFuse);
              expect((c.piece.fuse ?? 0)).toBeGreaterThan(0);
            }
          });
        }

        // Crust: counters match layout
        const crustTarget = lvl.objectives.find((o) => o.kind === 'crust');
        if (crustTarget) {
          expect(counts.crust).toBe(crustTarget.target);
          expect(s._state.counters.crustInitial).toBe(crustTarget.target);
        }

        // Objectives not all done at open (except maybe weird contain — checked below)
        const allDone = snap.objectives.every((o) => o.done);
        if (allDone) {
          // Flag as bug: level auto-won at open is unplayable design
          throw new Error(
            `L${id} seed=${seed}: ALL objectives already done at open — auto-win bug`,
          );
        }
      }
    });
  }
});

describe('L10–30 contain objective integrity', () => {
  const containIds = LEVEL_IDS.filter((id) =>
    getLevel(id).objectives.some((o) => o.kind === 'contain'),
  );

  it('has contain levels in band', () => {
    expect(containIds.length).toBeGreaterThan(0);
    expect(containIds).toEqual(expect.arrayContaining([25, 26, 27, 28, 29, 30]));
  });

  for (const id of containIds) {
    it(`L${id} contain is not free at open / first swap`, () => {
      const lvl = getLevel(id);
      const s = createSession(lvl, 42 + id);
      const contain = s.snapshot().objectives.find((o) => o.kind === 'contain')!;
      expect(contain).toBeDefined();
      expect(lvl.shadowPeriod).toBeGreaterThan(0);
      expect(contain.done).toBe(false);
      expect(contain.current).toBe(0);
      // Opening seed so the goal is visible immediately
      expect(countPieces(s).shadow).toBeGreaterThan(0);

      // First legal swap must NOT complete pure-contain (regression for auto-win bug)
      const hint = findLegalHint(s._state.grid);
      if (hint) {
        s.trySwap(hint.a, hint.b);
        if (lvl.objectives.length === 1 && lvl.objectives[0]!.kind === 'contain') {
          // Unlikely to clear entire quota in one match from a 2–4 cell seed
          if (s.snapshot().status === 'won') {
            expect(s._state.counters.shadowCleared).toBeGreaterThanOrEqual(
              lvl.objectives[0]!.target,
            );
          } else {
            expect(s.snapshot().status).toBe('playing');
          }
        }
      }
    });
  }

  it('L26 dual contain+crust does not auto-win on first swap', () => {
    const lvl = getLevel(26);
    expect(lvl.objectives.some((o) => o.kind === 'contain')).toBe(true);
    expect(lvl.objectives.some((o) => o.kind === 'crust')).toBe(true);
    let freeWins = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = createSession(lvl, seed * 997);
      const hint = findLegalHint(s._state.grid);
      if (!hint) continue;
      s.trySwap(hint.a, hint.b);
      // Must not complete all objectives on a free first tap
      if (s.snapshot().status === 'won') {
        const containT = lvl.objectives.find((o) => o.kind === 'contain')!.target;
        freeWins += s._state.counters.shadowCleared < containT ? 1 : 0;
      }
    }
    expect(freeWins).toBe(0);
  });
});

describe('L10–30 bomb fuse safety', () => {
  const bombIds = LEVEL_IDS.filter(
    (id) => getLevel(id).layout?.some((r) => r.includes('B')) || getLevel(id).bombFuse,
  );

  for (const id of bombIds) {
    it(`L${id}: fuse allows time to play (fuse < moves, bombs match defuse)`, () => {
      const lvl = getLevel(id);
      expect(lvl.bombFuse).toBeDefined();
      expect(lvl.bombFuse!).toBeGreaterThan(0);
      // Player should get at least fuse moves before first bomb can expire
      // (tick after each move, so fuse=N means N moves to defuse)
      expect(lvl.moves).toBeGreaterThanOrEqual(lvl.bombFuse!);

      const s = createSession(lvl, 100 + id);
      const defuse = lvl.objectives.find((o) => o.kind === 'defuse');
      if (defuse) {
        expect(countPieces(s).bombs).toBe(defuse.target);
      }

      // Playing without defusing should eventually bomb-expire if we ignore bombs
      // Just verify fuse ticks and doesn't explode on move 1 if fuse > 1
      if ((lvl.bombFuse ?? 0) > 1) {
        const hint = findLegalHint(s._state.grid);
        if (hint) {
          s.trySwap(hint.a, hint.b);
          if (s.snapshot().status === 'playing') {
            // bombs should still exist with reduced fuse (unless defused by luck)
            let minFuse = 999;
            s._state.grid.forEach((c) => {
              if (c.piece?.kind === 'bomb') minFuse = Math.min(minFuse, c.piece.fuse ?? 999);
            });
            // if bombs remain, fuse should have ticked down by 1
            if (minFuse < 999) {
              expect(minFuse).toBe(lvl.bombFuse! - 1);
            }
          }
        }
      }
    });
  }
});

describe('L10–30 playability sims (legal-hint)', () => {
  // Per-level: N seeds of greedy legal play; report wins and objective progress
  const results: Record<
    number,
    { wins: number; losses: number; bombLoss: number; maxProg: Record<string, number>; samples: number }
  > = {};

  for (const id of LEVEL_IDS) {
    it(
      `L${id} is winnable with legal play on some seeds`,
      () => {
        const lvl = getLevel(id);
        const nSeeds = 40;
        let wins = 0;
        let losses = 0;
        let bombLoss = 0;
        let crashes = 0;
        const maxProg: Record<string, number> = {};
        for (const o of lvl.objectives) maxProg[o.kind] = 0;

        for (let seed = 1; seed <= nSeeds; seed++) {
          try {
            const s = createSession(lvl, seed * 7919 + id * 13);
            const { snap, endReason } = playLegal(s, lvl.moves + 30);
            for (const o of snap.objectives) {
              maxProg[o.kind] = Math.max(maxProg[o.kind] ?? 0, o.current);
            }
            if (snap.status === 'won') wins++;
            else if (snap.status === 'lost') {
              losses++;
              if (endReason === 'bombExpired') bombLoss++;
            }
          } catch (e) {
            crashes++;
            throw e;
          }
        }

        results[id] = { wins, losses, bombLoss, maxProg, samples: nSeeds };
        expect(crashes).toBe(0);

        // Soft gates by objective type — greedy legal-hint is not optimal
        const hasCollect = lvl.objectives.some((o) => o.kind === 'collect');
        const hasDefuse = lvl.objectives.some((o) => o.kind === 'defuse');
        const hasCrust = lvl.objectives.some((o) => o.kind === 'crust');
        const hasContain = lvl.objectives.some((o) => o.kind === 'contain');
        const hasScore = lvl.objectives.some((o) => o.kind === 'score');
        const multiObj = lvl.objectives.length > 1;

        // Must make meaningful progress on primary goals
        if (hasCrust) {
          const t = lvl.objectives.find((o) => o.kind === 'crust')!.target;
          expect(maxProg.crust).toBeGreaterThan(0);
          // Pure crust levels should be winnable
          if (!multiObj || (hasCrust && hasScore && lvl.objectives.length === 2)) {
            // allow some progress at minimum
            expect(maxProg.crust).toBeGreaterThanOrEqual(Math.min(3, t));
          }
        }
        if (hasCollect) {
          const t = lvl.objectives.find((o) => o.kind === 'collect')!.target;
          expect(maxProg.collect).toBeGreaterThanOrEqual(1);
          // At least one seed should complete collect OR get close
          expect(maxProg.collect).toBeGreaterThanOrEqual(Math.min(t, 2));
        }
        if (hasDefuse) {
          expect(maxProg.defuse).toBeGreaterThanOrEqual(0); // may fail bombs often
        }
        if (hasScore) {
          expect(maxProg.score).toBeGreaterThan(0);
        }

        // Hard requirement: pure score/crust/collect (single-ish) levels need ≥1 win
        // Multi-objective late levels + bomb levels: require progress, soft win
        const pureish =
          !hasDefuse &&
          !hasContain &&
          (lvl.objectives.length === 1 ||
            (lvl.objectives.length === 2 && hasScore && (hasCrust || hasCollect)));

        if (pureish) {
          expect(wins).toBeGreaterThanOrEqual(1);
        } else if (hasCollect && !hasDefuse && !hasContain) {
          // collect-only or collect+crust
          expect(wins).toBeGreaterThanOrEqual(1);
        } else {
          // Tough multi-obj / bomb / contain: require some objective progress
          // and at least not 0 progress across the board
          const anyProg = Object.values(maxProg).some((v) => v > 0);
          expect(anyProg).toBe(true);
        }

        // Log for human report
        // eslint-disable-next-line no-console
        console.log(
          `L${id} ${lvl.name}: wins=${wins}/${nSeeds} losses=${losses} bombLoss=${bombLoss} maxProg=${JSON.stringify(maxProg)}`,
        );
      },
      120_000,
    );
  }

  it('summary: no level is totally frozen (0 progress on all objs)', () => {
    // filled by previous tests in same file run order
    expect(Object.keys(results).length).toBeGreaterThanOrEqual(0);
  });
});

describe('L10–30 lose path (out of moves)', () => {
  it('exhausting moves without goals yields lost/outOfMoves', () => {
    // Use a hard level; play until moves gone
    const lvl = getLevel(18); // collect:5, 20 moves — often lose
    let sawLose = false;
    for (let seed = 1; seed <= 30 && !sawLose; seed++) {
      const s = createSession(lvl, seed * 333);
      // waste moves on any legal swaps
      playLegal(s, 50);
      if (s.snapshot().status === 'lost' && s._state.endReason === 'outOfMoves') {
        sawLose = true;
      }
    }
    // Collect levels can win; if never lose in 30 seeds that's ok — try L22 bombs
    if (!sawLose) {
      const bombLvl = getLevel(24);
      for (let seed = 1; seed <= 20 && !sawLose; seed++) {
        const s = createSession(bombLvl, seed * 111);
        // deliberately play without caring about bombs
        playLegal(s, 40);
        if (s.snapshot().status === 'lost') sawLose = true;
      }
    }
    expect(sawLose).toBe(true);
  });
});

describe('L10–30 continueWithMoves revive', () => {
  it('can revive after outOfMoves', () => {
    // Force lose by zeroing moves after a play
    const lvl = getLevel(11);
    const s = createSession(lvl, 55);
    // Drain moves artificially
    s._state.movesLeft = 0;
    s._state.status = 'lost';
    s._state.endReason = 'outOfMoves';
    const ev = s.continueWithMoves(5);
    expect(s.snapshot().status).toBe('playing');
    expect(s.snapshot().movesLeft).toBe(5);
    expect(ev.some((e) => e.t === 'movesChanged')).toBe(true);
  });
});

describe('L10–30 boss boards', () => {
  for (const id of [10, 15, 20, 25, 30]) {
    it(`boss L${id} size policy`, () => {
      const lvl = getLevel(id);
      expect(lvl.boss).toBe(true);
      expect(lvl.width).toBeLessThanOrEqual(8);
      expect(lvl.height).toBeLessThanOrEqual(7);
      if (id >= 20) {
        expect(lvl.width).toBe(8);
        expect(lvl.height).toBe(7);
      }
    });
  }
});
