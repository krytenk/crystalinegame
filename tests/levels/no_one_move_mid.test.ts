import { describe, it, expect } from 'vitest';
import { getLevel, LEVEL_COUNT } from '../../src/levels/index';
import { createSession } from '../../src/engine/board';
import { swapWouldResolve } from '../../src/engine/deadlock';

/** Ship gate: first legal swap must never complete the whole level (mid band). */
describe('no free one-move wins L26–40', () => {
  for (const id of [26, 27, 28, 29, 30, 35, 38, 40]) {
    it(`L${id} cannot win on first swap`, () => {
      if (id > LEVEL_COUNT) return;
      const lvl = getLevel(id);
      let one = 0;
      for (let seed = 1; seed <= 80; seed++) {
        const base = seed * 7919 + id;
        const s0 = createSession(lvl, base);
        const g = s0._state.grid;
        for (let y = 0; y < g.height && one === 0; y++) {
          for (let x = 0; x < g.width && one === 0; x++) {
            for (const b of [
              { x: x + 1, y },
              { x, y: y + 1 },
            ]) {
              if (!g.inBounds(b.x, b.y)) continue;
              if (!swapWouldResolve(g, { x, y }, b)) continue;
              const s = createSession(lvl, base);
              s.trySwap({ x, y }, b);
              if (s.snapshot().status === 'won') one++;
            }
          }
        }
      }
      expect(one).toBe(0);
    });
  }
});
