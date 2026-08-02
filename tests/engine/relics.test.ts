import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/engine/board';
import { collectRelics } from '../../src/engine/blockers';
import { getLevel } from '../../src/levels/index';
import type { LevelDef } from '../../src/engine/types';

const miniCollect = (target: number): LevelDef => ({
  id: 900,
  name: 'Relic Test',
  width: 5,
  height: 5,
  moves: 40,
  colors: ['ember', 'aurum', 'solar', 'verdant'],
  objectives: [{ kind: 'collect', target }],
  stars: [100, 200, 300],
  layout: ['.....', '.....', '.....', '.....', '.....'],
});

describe('collect / relic spawn', () => {
  it('seeds gold artifacts on collect levels so the goal is reachable', () => {
    const s = createSession(miniCollect(3), 42);
    let relics = 0;
    s._state.grid.forEach((c) => {
      if (c.piece?.kind === 'relic') relics += 1;
    });
    expect(relics).toBeGreaterThanOrEqual(1);
    expect(relics).toBeLessThanOrEqual(3);
  });

  it('level 13 (Salvage Run) has a collect goal and seeds artifacts', () => {
    const level = getLevel(13);
    expect(level.objectives.some((o) => o.kind === 'collect')).toBe(true);
    const s = createSession(level, 7);
    let relics = 0;
    s._state.grid.forEach((c) => {
      if (c.piece?.kind === 'relic') relics += 1;
    });
    expect(relics).toBeGreaterThanOrEqual(1);
  });
});

describe('collectRelics', () => {
  it('picks up relics on the lowest playable cell', () => {
    const s = createSession(miniCollect(2), 11);
    const y = s._state.grid.height - 1;
    for (let x = 0; x < s._state.grid.width; x++) {
      s._state.grid.at(x, y).piece = null;
    }
    s._state.grid.at(1, y).piece = { id: 500, kind: 'relic', color: null };
    const events = collectRelics(s._state.grid, s._state.counters);
    expect(events.some((e) => e.t === 'relicCollected')).toBe(true);
    expect(s._state.counters.relicsCollected).toBe(1);
    expect(s._state.grid.at(1, y).piece).toBeNull();
  });
});
