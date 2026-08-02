import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/engine/board';
import type { LevelDef } from '../../src/engine/types';

const easyWin: LevelDef = {
  id: 901,
  name: 'Flourish Test',
  width: 6,
  height: 6,
  moves: 8,
  colors: ['ember', 'aurum', 'solar', 'verdant'],
  objectives: [{ kind: 'score', target: 1 }],
  stars: [100, 500, 2000],
  layout: [
    '......',
    '......',
    '......',
    '......',
    '......',
    '......',
  ],
};

describe('win flourish', () => {
  it('runs a sugar-crush cascade when the goal is met', () => {
    const s = createSession(easyWin, 12345);
    // Score objective of 1 — first scoring match should win + flourish
    // Force win by setting score past target via a legal path:
    // Manually mark objectives done by inflating score then resolving a null cascade path
    // Easier: use pickaxe? not available without booster.
    // Set score directly then call end path through a reshuffle-safe internal:
    s._state.score = 50;
    s._state.objectives = [
      { kind: 'score', target: 1, current: 1, done: true },
    ];
    // Simulate endIfNeeded via trySwap that no-ops... instead use public path:
    // inject a match by swapping after forcing score objective
    // Directly invoke after-move end by using continue-like: call useReshuffle then
    // apply a fake move through trySwap on a known match if any.

    // Force win flourish by scoring: find a legal swap that produces events with win
    // Guaranteed: set score high, then call claimCore no; use pickaxe on crystal
    // pickaxe requires playable piece and triggers resolve + endIfNeeded
    const grid = s._state.grid;
    let at = { x: 0, y: 0 };
    grid.forEach((cell, coord) => {
      if (cell.playable && cell.piece?.kind === 'crystal') at = coord;
    });
    // usePickaxe clears and ends if objectives met
    const events = s.usePickaxe(at);
    expect(events.some((e) => e.t === 'winFlourish')).toBe(true);
    expect(events.some((e) => e.t === 'levelEnded' && e.status === 'won')).toBe(true);
    const flourish = events.find((e) => e.t === 'winFlourish');
    if (flourish && flourish.t === 'winFlourish') {
      expect(flourish.leftoverMoves).toBeGreaterThanOrEqual(0);
    }
    // Score should have grown from leftover-move cashout and explosions
    expect(s.snapshot().score).toBeGreaterThan(50);
    expect(s.snapshot().status).toBe('won');
  });

  it('only plays the flourish once', () => {
    const s = createSession(easyWin, 99);
    s._state.score = 9999;
    s._state.objectives = [
      { kind: 'score', target: 1, current: 1, done: true },
    ];
    let at = { x: 1, y: 1 };
    s._state.grid.forEach((cell, coord) => {
      if (cell.playable && cell.piece) at = coord;
    });
    const e1 = s.usePickaxe(at);
    const flourishCount = e1.filter((e) => e.t === 'winFlourish').length;
    expect(flourishCount).toBe(1);
    expect(s._state.winFlourishPlayed).toBe(true);
  });
});
