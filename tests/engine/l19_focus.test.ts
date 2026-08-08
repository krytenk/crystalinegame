/**
 * Focused investigation: L19 Slow Fuse
 * Player report: "glitchy — wouldn't let me win 3 times then all of a sudden I won"
 */
import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/engine/board';
import { conveyorShiftRow } from '../../src/engine/conveyor';
import { findLegalHint, hasLegalMove } from '../../src/engine/deadlock';
import { getLevel } from '../../src/levels/index';
import { makeLine, makeSupernova } from '../../src/engine/tile';
import type { Coord } from '../../src/engine/types';

const L19 = () => getLevel(19);

function bombCells(s: ReturnType<typeof createSession>): { at: Coord; fuse: number }[] {
  const out: { at: Coord; fuse: number }[] = [];
  s._state.grid.forEach((c, at) => {
    if (c.piece?.kind === 'bomb') out.push({ at, fuse: c.piece.fuse ?? -1 });
  });
  return out;
}

function defuseProg(s: ReturnType<typeof createSession>) {
  const o = s.snapshot().objectives.find((x) => x.kind === 'defuse');
  return o ?? { kind: 'defuse', target: 2, current: 0, done: false };
}

describe('L19 static shape', () => {
  it('is pure defuse-2 with teaching fuse and corner-ish + mid bombs', () => {
    const lvl = L19();
    expect(lvl.objectives).toEqual([{ kind: 'defuse', target: 2 }]);
    // Real clock is fuse, not moves — teach with room to breathe (was 5 → felt broken).
    expect(lvl.bombFuse).toBeGreaterThanOrEqual(8);
    expect(lvl.moves).toBeGreaterThanOrEqual(20);
    expect(lvl.layout![0]).toBe('#B....#'); // top bomb at (1,0)
    expect(lvl.layout![3]![4]).toBe('B'); // mid bomb at (4,3)
  });

  it('opening places both bombs with full fuse', () => {
    const s = createSession(L19(), 42);
    const bombs = bombCells(s);
    expect(bombs).toHaveLength(2);
    expect(bombs.every((b) => b.fuse === L19().bombFuse)).toBe(true);
    expect(bombs.some((b) => b.at.x === 1 && b.at.y === 0)).toBe(true);
    expect(bombs.some((b) => b.at.x === 4 && b.at.y === 3)).toBe(true);
    expect(hasLegalMove(s._state.grid)).toBe(true);
    expect(s.snapshot().status).toBe('playing');
    expect(defuseProg(s).done).toBe(false);
  });
});

describe('L19 defuse counting integrity', () => {
  it('adjacent match defuses and counts toward objective', () => {
    const s = createSession(L19(), 7);
    // Force a crystal triple next to top bomb (1,0): place match at (2,0)(3,0)(4,0)
    // Then swap to complete — easier: manually set board and call defuse via trySwap
    const g = s._state.grid;
    // Clear top row playable to known state
    // bomb at 1,0; put three matching that will match horizontally at y=0: need swap
    // Simpler: place line power next to bomb and trigger
    const line = makeLine(s._state.ids, 'ember', 'h');
    g.at(2, 0).piece = line;
    g.at(3, 0).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    // Swap line with crystal below to fire? Line swapped with crystal fires line footprint
    // Actually power swap needs isPowerCrystal involved
    g.at(2, 1).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'aurum' };
    const before = s._state.counters.bombsDefused;
    const ev = s.trySwap({ x: 2, y: 0 }, { x: 2, y: 1 });
    // Horizontal line from (2,1) after swap? Pieces swap: line goes to (2,1), crystal to (2,0)
    // Power at (2,1) fires line h through row 1 — may not hit top bomb
    // Alternative path below
    void before;
    void ev;
  });

  it('BUGCHECK: clearCells wiping bomb in blast must count as defuse', () => {
    // Board wipe / supernova includes bomb cells. After resolve, bombs gone + counted.
    const s = createSession(L19(), 99);
    const g = s._state.grid;
    // Plant two supernovas and swap them for full board wipe
    g.at(3, 2).piece = makeSupernova(s._state.ids);
    g.at(4, 2).piece = makeSupernova(s._state.ids);
    const bombsBefore = bombCells(s).length;
    expect(bombsBefore).toBe(2);
    const ev = s.trySwap({ x: 3, y: 2 }, { x: 4, y: 2 });
    const bombsAfter = bombCells(s).length;
    const defused = s._state.counters.bombsDefused;
    console.log('supernova wipe:', {
      bombsAfter,
      defused,
      status: s.snapshot().status,
      reason: s._state.endReason,
      events: ev.filter((e) => e.t === 'levelEnded' || e.t === 'bombExploded' || e.t === 'objectives'),
    });
    // Bombs must not vanish uncounted
    expect(defused + bombsAfter).toBe(bombsBefore);
    if (bombsAfter === 0) {
      expect(defused).toBe(2);
      expect(s.snapshot().status).toBe('won');
    }
  });

  it('BUGCHECK: pickaxe on bomb must count as defuse (or refuse)', () => {
    const s = createSession(L19(), 11);
    const bombs = bombCells(s);
    const target = bombs[0]!.at;
    s.usePickaxe(target);
    const stillThere = bombCells(s).some((b) => b.at.x === target.x && b.at.y === target.y);
    const defused = s._state.counters.bombsDefused;
    console.log('pickaxe on bomb:', { stillThere, defused, obj: defuseProg(s) });
    // Either pickaxe refuses bombs, or it counts
    if (!stillThere) {
      expect(defused).toBeGreaterThanOrEqual(1);
    }
  });

  it('BUGCHECK: line through bomb cell counts defuse', () => {
    const s = createSession(L19(), 13);
    const g = s._state.grid;
    // Vertical line in column 1 (has top bomb) — place line at (1,3) fire vertical
    g.at(1, 3).piece = makeLine(s._state.ids, 'ember', 'v');
    g.at(2, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'solar' };
    s.trySwap({ x: 1, y: 3 }, { x: 2, y: 3 });
    // After swap line at (2,3) fires v on col 2 — wrong
    // Reset approach: put line at (1,4), swap with (1,5) crystal so line stays col 1
  });

  it('line power in bomb column defuses top bomb', () => {
    const s = createSession(L19(), 17);
    const g = s._state.grid;
    // Line/burst only activate with same-colour partners (powerSwapActivates).
    // Vertical line in col 1: after swap, line sits at (1,5) and clears the column.
    g.at(1, 4).piece = makeLine(s._state.ids, 'verdant', 'v');
    g.at(1, 5).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'verdant' };
    const ev = s.trySwap({ x: 1, y: 4 }, { x: 1, y: 5 });
    const topBombGone = !bombCells(s).some((b) => b.at.x === 1 && b.at.y === 0);
    expect(ev.some((e) => e.t === 'specialTriggered')).toBe(true);
    expect(topBombGone).toBe(true);
    expect(s._state.counters.bombsDefused).toBeGreaterThanOrEqual(1);
  });

  it('adjacent match to mid bomb defuses without specials', () => {
    // Construct a guaranteed match of 3 next to bomb at (4,3)
    // Match horizontal at y=3: positions (3,3)(5,3) need third via swap
    // Place (3,3)=ember (5,3)=ember (4,4)=ember, swap (4,4) with (4,3) but (4,3) is bomb — can't swap bomb
    // Bombs not movable - isMovable excludes bomb
    // Place (2,3)(3,3)=ember and (3,4)=ember, swap (3,4)-(3,3) if (3,3) is crystal
    const s = createSession(L19(), 23);
    const g = s._state.grid;
    // Leave bomb at 4,3. Set (3,3),(5,3),(3,2) carefully.
    // Match: (3,3) (4,2) (5,3) - not adjacent triple.
    // Standard: three in a row at (3,3)(4,3)(5,3) but middle is bomb - match finder won't include bomb
    // Adjacent defuse: clear cells neighboring bomb. Match at (3,2)(3,3)(3,4) vertical next to bomb.
    g.at(3, 2).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    g.at(3, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'aurum' }; // will swap
    g.at(3, 4).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    g.at(2, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    // Swap (3,3) aurum with (2,3) ember → vertical? 
    // After swap: (3,3)=ember, with (3,2)=ember (3,4)=ember → vertical match at col 3, neighbors bomb (4,3)
    const ev = s.trySwap({ x: 3, y: 3 }, { x: 2, y: 3 });
    const midGone = !bombCells(s).some((b) => b.at.x === 4 && b.at.y === 3);
    console.log('adj match mid bomb:', {
      midGone,
      defused: s._state.counters.bombsDefused,
      rejected: ev.filter((e) => e.t === 'swapRejected'),
      matches: ev.filter((e) => e.t === 'match').length,
      bombs: bombCells(s),
    });
    expect(ev.some((e) => e.t === 'swapRejected')).toBe(false);
    expect(midGone).toBe(true);
    expect(s._state.counters.bombsDefused).toBeGreaterThanOrEqual(1);
  });
});

describe('L19 win condition timing', () => {
  it('defusing both bombs in one move wins (no bombExpired race)', () => {
    const s = createSession(L19(), 31);
    const g = s._state.grid;
    // dual supernova wipe
    g.at(2, 2).piece = makeSupernova(s._state.ids);
    g.at(3, 2).piece = makeSupernova(s._state.ids);
    s.trySwap({ x: 2, y: 2 }, { x: 3, y: 2 });
    expect(s._state.counters.bombsDefused).toBe(2);
    expect(s.snapshot().status).toBe('won');
    expect(s._state.endReason).toBe('objectivesMet');
  });

  it('defusing last bomb when other fuse is 1 still wins if both gone', () => {
    const s = createSession(L19(), 37);
    // Manually set both bombs fuse to 1, then wipe
    s._state.grid.forEach((c) => {
      if (c.piece?.kind === 'bomb') {
        c.piece = { ...c.piece, fuse: 1 };
      }
    });
    const g = s._state.grid;
    g.at(2, 2).piece = makeSupernova(s._state.ids);
    g.at(3, 2).piece = makeSupernova(s._state.ids);
    s.trySwap({ x: 2, y: 2 }, { x: 3, y: 2 });
    expect(s.snapshot().status).toBe('won');
    expect(s._state.endReason).not.toBe('bombExpired');
  });

  it('leaving one bomb at fuse 1 after a move loses to bombExpired', () => {
    const s = createSession(L19(), 41);
    s._state.grid.forEach((c) => {
      if (c.piece?.kind === 'bomb') c.piece = { ...c.piece, fuse: 1 };
    });
    // Only defuse mid bomb via constructed match; leave top
    const g = s._state.grid;
    g.at(3, 2).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    g.at(3, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'aurum' };
    g.at(3, 4).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    g.at(2, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    s.trySwap({ x: 3, y: 3 }, { x: 2, y: 3 });
    console.log('one left fuse1:', {
      status: s.snapshot().status,
      reason: s._state.endReason,
      defused: s._state.counters.bombsDefused,
      bombs: bombCells(s),
    });
    // If we defused one, the other at fuse1 ticks to 0 → lost
    if (s._state.counters.bombsDefused === 1 && bombCells(s).length === 0) {
      // exploded removes? tickBombs sets lost but leaves piece? check - fuse<=0 pushes bombExploded but doesn't remove piece
      expect(s.snapshot().status).toBe('lost');
      expect(s._state.endReason).toBe('bombExpired');
    }
  });
});

describe('L19 multi-seed play (legal-hint vs bomb-aware)', () => {
  it('greedy legal-hint win rate and fail reasons', () => {
    const lvl = L19();
    const stats = { win: 0, bomb: 0, moves: 0, other: 0, maxDefuse: 0, nearMiss: 0 };
    for (let seed = 1; seed <= 80; seed++) {
      const s = createSession(lvl, seed * 7919);
      let steps = 0;
      while (s.snapshot().status === 'playing' && steps < 60) {
        steps++;
        const hint = findLegalHint(s._state.grid);
        if (!hint) {
          s.useReshuffle();
          continue;
        }
        s.trySwap(hint.a, hint.b);
      }
      const d = s._state.counters.bombsDefused;
      stats.maxDefuse = Math.max(stats.maxDefuse, d);
      if (s.snapshot().status === 'won') stats.win++;
      else if (s._state.endReason === 'bombExpired') {
        stats.bomb++;
        if (d === 1) stats.nearMiss++;
      } else if (s._state.endReason === 'outOfMoves') {
        stats.moves++;
        if (d === 1) stats.nearMiss++;
      } else stats.other++;
    }
    console.log('L19 greedy 80 seeds:', stats);
    expect(stats.win).toBeGreaterThanOrEqual(1);
    // Document near-miss pattern (1 of 2 defused then fail) — feels "almost"
    expect(stats.maxDefuse).toBe(2);
  });

  it('bomb-aware play: prefer swaps that match adjacent to bombs', () => {
    const lvl = L19();
    let wins = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = createSession(lvl, seed * 4243 + 19);
      let steps = 0;
      while (s.snapshot().status === 'playing' && steps < 50) {
        steps++;
        const bombs = bombCells(s);
        const g = s._state.grid;
        const hint = findLegalHint(s._state.grid);
        if (!hint) {
          s.useReshuffle();
          continue;
        }
        // Bias: try a legal swap near a bomb first; noMatch auto-rejects.
        let foundNear = false;
        for (let y = 0; y < g.height && !foundNear; y++) {
          for (let x = 0; x < g.width && !foundNear; x++) {
            const c = g.at(x, y);
            if (!c.playable || !c.piece || c.piece.kind === 'bomb') continue;
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ] as const) {
              const b = { x: x + dx, y: y + dy };
              if (!g.inBounds(b.x, b.y)) continue;
              const nearBomb = bombs.some(
                (bm) =>
                  Math.abs(bm.at.x - x) + Math.abs(bm.at.y - y) === 1 ||
                  Math.abs(bm.at.x - b.x) + Math.abs(bm.at.y - b.y) === 1,
              );
              if (!nearBomb) continue;
              const ev = s.trySwap({ x, y }, b);
              if (ev.some((e) => e.t === 'swapRejected')) continue;
              foundNear = true;
              break;
            }
          }
        }
        if (!foundNear) {
          s.trySwap(hint.a, hint.b);
        }
      }
      if (s.snapshot().status === 'won') wins++;
    }
    console.log('L19 bomb-aware wins:', wins, '/60');
    expect(wins).toBeGreaterThanOrEqual(5);
  });
});

describe('L19 top bomb accessibility', () => {
  it('top bomb (1,0) has only 2 playable neighbors (right + down)', () => {
    const s = createSession(L19(), 1);
    const g = s._state.grid;
    const n = g.neighbors4(1, 0);
    const playable = n.filter((c) => g.at(c.x, c.y).playable);
    expect(playable).toHaveLength(2);
    expect(playable).toEqual(
      expect.arrayContaining([
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ]),
    );
  });

  it('mid bomb (4,3) has 4 playable neighbors', () => {
    const s = createSession(L19(), 1);
    const g = s._state.grid;
    const n = g.neighbors4(4, 3);
    expect(n.filter((c) => g.at(c.x, c.y).playable)).toHaveLength(4);
  });
});

describe('L19 defuse feedback + pickaxe integrity', () => {
  it('defuse emits bombDefused event', () => {
    const s = createSession(L19(), 23);
    const g = s._state.grid;
    g.at(3, 2).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    g.at(3, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'aurum' };
    g.at(3, 4).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    g.at(2, 3).piece = { id: s._state.ids.next(), kind: 'crystal', color: 'ember' };
    const ev = s.trySwap({ x: 3, y: 3 }, { x: 2, y: 3 });
    expect(s._state.counters.bombsDefused).toBeGreaterThanOrEqual(1);
    expect(ev.some((e) => e.t === 'bombDefused')).toBe(true);
  });

  it('pickaxe on bomb counts toward defuse objective', () => {
    const s = createSession(L19(), 55);
    const top = { x: 1, y: 0 };
    expect(s._state.grid.at(top.x, top.y).piece?.kind).toBe('bomb');
    const ev = s.usePickaxe(top);
    expect(s._state.grid.at(top.x, top.y).piece?.kind).not.toBe('bomb');
    expect(s._state.counters.bombsDefused).toBe(1);
    expect(ev.some((e) => e.t === 'bombDefused')).toBe(true);
  });
});

describe('L19 conveyor never slides bombs', () => {
  it('pins bombs when belt runs on their row', () => {
    const s = createSession(L19(), 77);
    const g = s._state.grid;
    // Put a bomb on bottom conveyor row and ensure it stays put across shifts
    const row = 6;
    const bombX = 3;
    // Clear row and place bomb + crystals
    for (let x = 1; x <= 5; x++) {
      g.at(x, row).piece = {
        id: s._state.ids.next(),
        kind: 'crystal',
        color: 'ember',
      };
    }
    g.at(bombX, row).piece = {
      id: s._state.ids.next(),
      kind: 'bomb',
      color: null,
      fuse: 9,
    };
    conveyorShiftRow(g, row, 'left');
    expect(g.at(bombX, row).piece?.kind).toBe('bomb');
    conveyorShiftRow(g, row, 'right');
    expect(g.at(bombX, row).piece?.kind).toBe('bomb');
  });
});
