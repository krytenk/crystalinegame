/**
 * Act I-C LEVEL_PASS — levels 151–300 (Outer Channels / Under-Crown).
 *
 * Gates:
 *  - fuse / layout integrity for every level
 *  - multi-seed session smoke (opens playing + legal move)
 *  - legal-hint playability on checkpoint bosses + decade samples
 *
 * Run: `npx vitest run tests/levels/l151_300_pass.test.ts`
 */
import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import { findLegalHint, hasLegalMove } from '../../src/engine/deadlock';
import { getLevel, isBossLevel, LEVEL_COUNT } from '../../src/levels/index';

const IDS = Array.from({ length: 150 }, (_, i) => i + 151); // 151..300
const SMOKE_SEEDS = [1, 42, 99, 1337, 9001];

/** Checkpoints + decade samples for expensive playability. */
const PLAY_SAMPLE = [
  151, 155, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 295, 300,
];

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
  return { snap: s.snapshot(), steps };
}

describe('L151–300 catalogue present', () => {
  it('launch catalogue includes full Act I-C', () => {
    expect(LEVEL_COUNT).toBeGreaterThanOrEqual(300);
    expect(getLevel(151).id).toBe(151);
    expect(getLevel(300).id).toBe(300);
  });
});

describe('L151–300 integrity', () => {
  for (const id of IDS) {
    it(`L${id} fuse/layout integrity`, () => {
      const lvl = getLevel(id);
      expect(lvl.moves).toBeGreaterThan(0);
      expect(lvl.stars[0]).toBeLessThan(lvl.stars[1]);
      expect(lvl.stars[1]).toBeLessThan(lvl.stars[2]);

      if (!lvl.layout) return;
      expect(lvl.layout).toHaveLength(lvl.height);

      let crust = 0;
      let bombs = 0;
      for (const row of lvl.layout) {
        expect(row).toHaveLength(lvl.width);
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
        // Multi-bomb LEVEL_PASS rules
        if (bombs >= 2) {
          expect(lvl.bombFuse!).toBeGreaterThanOrEqual(4);
          expect(lvl.moves).toBeGreaterThanOrEqual(lvl.bombFuse! + 6);
        }
        if (bombs >= 3) {
          expect(lvl.moves).toBeGreaterThanOrEqual(lvl.bombFuse! + 8);
        }
      }

      if (lvl.objectives.some((o) => o.kind === 'contain')) {
        expect(lvl.shadowPeriod).toBeDefined();
        expect(lvl.shadowPeriod!).toBeGreaterThanOrEqual(2);
      }

      // Multi-obj budget
      if (lvl.objectives.length >= 4) {
        expect(lvl.moves).toBeGreaterThanOrEqual(22);
      }
      if (lvl.boss && lvl.objectives.length >= 4) {
        expect(lvl.moves).toBeGreaterThanOrEqual(26);
        expect(isBossLevel(id)).toBe(true);
      }
    });
  }
});

describe('L151–300 session smoke', () => {
  for (const id of IDS) {
    it(`L${id} opens playable multi-seed`, () => {
      const lvl = getLevel(id);
      for (const seed of SMOKE_SEEDS) {
        const s = createSession(lvl, seed * 9973 + id);
        const snap = s.snapshot();
        expect(snap.status).toBe('playing');
        expect(hasLegalMove(s._state.grid)).toBe(true);
        expect(snap.objectives.every((o) => o.done)).toBe(false);
      }
    });
  }
});

describe('L151–300 playability sample (legal-hint)', () => {
  for (const id of PLAY_SAMPLE) {
    it(
      `L${id} wins or makes objective progress`,
      () => {
        const lvl = getLevel(id);
        const nSeeds = 24;
        let wins = 0;
        let crashes = 0;
        const maxProg: Record<string, number> = {};
        for (const o of lvl.objectives) maxProg[o.kind] = 0;

        for (let seed = 1; seed <= nSeeds; seed++) {
          try {
            const s = createSession(lvl, seed * 7919 + id * 13 + seed * 17);
            const { snap } = playLegal(s, lvl.moves + 50);
            for (const o of snap.objectives) {
              maxProg[o.kind] = Math.max(maxProg[o.kind] ?? 0, o.current);
            }
            if (snap.status === 'won') wins++;
          } catch {
            crashes++;
          }
        }

        expect(crashes).toBe(0);

        if (wins >= 1) return;

        const hasDefuse = lvl.objectives.some((o) => o.kind === 'defuse');
        const multiObj = lvl.objectives.length > 1;
        const bombHeavy = hasDefuse && multiObj;

        for (const o of lvl.objectives) {
          if (o.kind === 'defuse' && bombHeavy) continue;
          if (o.kind === 'score') {
            expect(maxProg.score ?? 0).toBeGreaterThanOrEqual(
              Math.min(400, Math.floor(o.target * 0.12)),
            );
            continue;
          }
          expect(maxProg[o.kind] ?? 0).toBeGreaterThanOrEqual(1);
        }
      },
      60_000,
    );
  }
});
