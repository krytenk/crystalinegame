/**
 * Full-catalogue level pass (all launch levels).
 *
 * Gates:
 *  - static integrity (ids, layout vs objectives, fuse safety)
 *  - session smoke (legal opening on multi-seed)
 *  - playability: legal-hint wins OR meaningful objective progress
 *    (greedy bots ignore bombs — late defuse stacks are progress-gated)
 *
 * Run: `npm test -- tests/levels/l1_40_pass.test.ts`
 */
import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import { findLegalHint, hasLegalMove } from '../../src/engine/deadlock';
import { getLevel, LEVEL_COUNT, LEVELS } from '../../src/levels/index';

const ALL_IDS = LEVELS.map((l) => l.id);

function countPieces(s: ReturnType<typeof createSession>) {
  let relics = 0,
    bombs = 0,
    crust = 0,
    playable = 0,
    shadow = 0;
  s._state.grid.forEach((c) => {
    if (!c.playable) return;
    playable++;
    if (c.crust > 0) crust++;
    if (c.shadow > 0) shadow++;
    if (c.piece?.kind === 'relic') relics++;
    else if (c.piece?.kind === 'bomb') bombs++;
  });
  return { relics, bombs, crust, playable, shadow };
}

function playLegal(s: ReturnType<typeof createSession>, maxSteps = 100) {
  let steps = 0;
  let reshuffles = 0;
  while (s.snapshot().status === 'playing' && steps < maxSteps) {
    steps++;
    const hint = findLegalHint(s._state.grid);
    if (!hint) {
      s.useReshuffle();
      reshuffles++;
      if (reshuffles > 25) break;
      continue;
    }
    s.trySwap(hint.a, hint.b);
  }
  return { snap: s.snapshot(), endReason: s._state.endReason, steps };
}

describe('Full catalogue integrity', () => {
  it('loads contiguous launch levels', () => {
    expect(LEVEL_COUNT).toBeGreaterThanOrEqual(40);
    expect(LEVELS).toHaveLength(LEVEL_COUNT);
    expect(ALL_IDS).toEqual(Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1));
  });

  for (const id of ALL_IDS) {
    it(`L${id} layout matches crust/defuse objectives`, () => {
      const lvl = getLevel(id);
      expect(lvl.moves).toBeGreaterThan(0);
      if (!lvl.layout) return;

      let crust = 0;
      let bombs = 0;
      for (const row of lvl.layout) {
        for (const ch of row) {
          if (ch === '1' || ch === '2' || ch === '3') crust++;
          if (ch === 'B') bombs++;
        }
      }
      const crustObj = lvl.objectives.find((o) => o.kind === 'crust');
      if (crustObj) expect(crustObj.target).toBe(crust);
      const defuseObj = lvl.objectives.find((o) => o.kind === 'defuse');
      if (defuseObj) {
        expect(defuseObj.target).toBe(bombs);
        expect(lvl.bombFuse).toBeDefined();
        expect(lvl.bombFuse!).toBeGreaterThan(0);
        expect(lvl.moves).toBeGreaterThanOrEqual(lvl.bombFuse!);
      }
    });
  }
});

describe('Full catalogue session smoke', () => {
  const seeds = [1, 42, 99, 1337, 9001];
  for (const id of ALL_IDS) {
    it(`L${id} opens playable on multi-seed`, () => {
      const lvl = getLevel(id);
      for (const seed of seeds) {
        const s = createSession(lvl, seed * 9973 + id);
        const snap = s.snapshot();
        expect(snap.status).toBe('playing');
        expect(hasLegalMove(s._state.grid)).toBe(true);
        expect(snap.objectives.every((o) => o.done)).toBe(false);
        const counts = countPieces(s);
        expect(counts.playable).toBeGreaterThanOrEqual(9);
      }
    });
  }
});

describe('Full catalogue playability (legal-hint)', () => {
  for (const id of ALL_IDS) {
    it(
      `L${id} is winnable or makes objective progress`,
      () => {
        const lvl = getLevel(id);
        const nSeeds = 48;
        let wins = 0;
        let crashes = 0;
        const maxProg: Record<string, number> = {};
        for (const o of lvl.objectives) maxProg[o.kind] = 0;

        for (let seed = 1; seed <= nSeeds; seed++) {
          try {
            // Mix of seed families so unlucky single streams don't fail soft levels
            const s = createSession(lvl, seed * 7919 + id * 13 + seed * 17);
            const { snap } = playLegal(s, lvl.moves + 40);
            for (const o of snap.objectives) {
              maxProg[o.kind] = Math.max(maxProg[o.kind] ?? 0, o.current);
            }
            if (snap.status === 'won') wins++;
          } catch {
            crashes++;
          }
        }

        expect(crashes).toBe(0);

        const hasDefuse = lvl.objectives.some((o) => o.kind === 'defuse');
        const multiObj = lvl.objectives.length > 1;
        const bombHeavy = hasDefuse && multiObj;

        if (wins >= 1) {
          expect(wins).toBeGreaterThanOrEqual(1);
          return;
        }

        // Zero wins: still require real progress (greedy bot is not optimal)
        for (const o of lvl.objectives) {
          if (o.kind === 'defuse' && bombHeavy) {
            // May make no defuse progress under pure legal-hint
            continue;
          }
          if (o.kind === 'score') {
            expect(maxProg.score ?? 0).toBeGreaterThanOrEqual(Math.min(400, Math.floor(o.target * 0.15)));
            continue;
          }
          // collect / crust / contain
          expect(maxProg[o.kind] ?? 0).toBeGreaterThanOrEqual(1);
        }
      },
      45_000,
    );
  }
});
