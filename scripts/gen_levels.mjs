/**
 * Generates the 30 level definitions in src/levels/ from a compact spec.
 *
 * Objective targets that depend on the board (crust cells, bomb count) are COMPUTED
 * from the generated layout rather than hand-counted, so a level can never ship with
 * an unreachable goal. Run: `node scripts/gen_levels.mjs`
 *
 * Difficulty curve follows the research doc: gentle onboarding to establish the loop,
 * then deliberate spikes at the points where a free-to-play title applies economic
 * pressure (levels 8, 15, 22, 28) — see docs/ECONOMY.md.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const OUT = fileURLToPath(new URL('../src/levels/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const ALL = ['ember', 'aurum', 'solar', 'verdant', 'tidal', 'void'];

/** Build a grid of chars via a callback, returning rows as strings. */
const grid = (w, h, fn) =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => fn(x, y) ?? '.').join(''),
  );

// --- layout shapes ---------------------------------------------------------
const plain = (w, h) => grid(w, h, () => '.');

/** A rectangular band of crust `layers` deep, inset from the edges. */
const crustBand = (w, h, layers, inset = 2) =>
  grid(w, h, (x, y) => {
    const onBand =
      (x === inset || x === w - 1 - inset) && y >= inset && y <= h - 1 - inset;
    const onBandY =
      (y === inset || y === h - 1 - inset) && x >= inset && x <= w - 1 - inset;
    return onBand || onBandY ? String(layers) : '.';
  });

/** Crust filling a centred block. */
const crustBlock = (w, h, layers, bw, bh) =>
  grid(w, h, (x, y) => {
    const x0 = Math.floor((w - bw) / 2);
    const y0 = Math.floor((h - bh) / 2);
    return x >= x0 && x < x0 + bw && y >= y0 && y < y0 + bh ? String(layers) : '.';
  });

/** Crust in a diamond, thickest at the centre. */
const crustDiamond = (w, h, r) =>
  grid(w, h, (x, y) => {
    const d = Math.abs(x - (w - 1) / 2) + Math.abs(y - (h - 1) / 2);
    if (d > r) return '.';
    return String(Math.min(3, Math.max(1, Math.ceil(r - d))));
  });

/** Punch holes at the four corners. */
const withCorners = (rows, n) =>
  rows.map((row, y) =>
    row
      .split('')
      .map((c, x) => {
        const w = row.length,
          h = rows.length;
        const corner =
          (x < n && y < n) ||
          (x >= w - n && y < n) ||
          (x < n && y >= h - n) ||
          (x >= w - n && y >= h - n);
        return corner ? '#' : c;
      })
      .join(''),
  );

/** Overwrite specific coordinates with a char. */
const place = (rows, coords, ch) => {
  const out = rows.map((r) => r.split(''));
  for (const [x, y] of coords) if (out[y] && out[y][x] !== undefined) out[y][x] = ch;
  return out.map((r) => r.join(''));
};

const countChar = (rows, pred) =>
  rows.reduce((n, r) => n + [...r].filter(pred).length, 0);

const crustCells = (rows) => countChar(rows, (c) => c === '1' || c === '2' || c === '3');
const bombCells = (rows) => countChar(rows, (c) => c === 'B');

// --- the curve -------------------------------------------------------------
// Each entry: [id, name, w, h, moves, colorCount, layout|null, extras]
const spec = [
  // 1-5 : onboarding, score only. Generous moves, few colours.
  [1, 'First Light', 7, 7, 25, 4, null, { score: 1200 }],
  [2, 'Shallow Seam', 7, 7, 24, 4, null, { score: 2400 }],
  [3, 'The Glittering Cut', 8, 8, 24, 5, null, { score: 4000 }],
  [4, 'Deepening Vein', 8, 8, 22, 5, null, { score: 6000 }],
  [5, 'Pressure Point', 8, 8, 20, 5, null, { score: 8500 }],

  // 6-12 : crust introduced.
  [6, 'Frostbitten', 8, 8, 26, 5, crustBlock(8, 8, 1, 4, 3), {}],
  [7, 'Rime and Ruin', 8, 8, 25, 5, crustBand(8, 8, 1, 2), {}],
  [8, 'The Cold Vault', 8, 8, 20, 5, crustBlock(8, 8, 2, 5, 4), { spike: true }],
  [9, 'Hollow Chamber', 8, 8, 24, 5, withCorners(crustBand(8, 8, 1, 1), 2), {}],
  [10, 'Glacier Heart', 8, 8, 24, 6, crustDiamond(8, 8, 3), {}],
  [11, 'Locked Strata', 9, 8, 24, 6, crustBlock(9, 8, 2, 5, 4), { score: 6000 }],
  [12, 'Permafrost', 9, 8, 22, 6, crustDiamond(9, 8, 4), {}],

  // 13-18 : relics — must be dropped off the bottom row.
  [13, 'Salvage Run', 8, 8, 24, 5, null, { collect: 3 }],
  [14, 'Buried Offerings', 8, 8, 24, 5, null, { collect: 4 }],
  [15, 'The Long Drop', 8, 8, 20, 6, null, { collect: 5, spike: true }],
  [16, 'Ice and Iron', 8, 8, 24, 5, crustBlock(8, 8, 1, 4, 3), { collect: 4 }],
  [17, 'Fractured Floor', 9, 8, 24, 6, withCorners(plain(9, 8), 2), { collect: 5 }],
  [18, 'Reliquary', 9, 8, 22, 6, null, { collect: 7 }],

  // 19-24 : live bombs. Threat mitigation now competes with objective play.
  [19, 'Slow Fuse', 8, 8, 24, 5, place(plain(8, 8), [[2, 3], [5, 4]], 'B'), { fuse: 14 }],
  [20, 'Countdown', 8, 8, 22, 5, place(plain(8, 8), [[1, 2], [4, 5], [6, 3]], 'B'), { fuse: 12 }],
  [21, 'Cold Detonation', 8, 8, 24, 6, place(crustBand(8, 8, 1, 2), [[3, 3], [4, 4]], 'B'), { fuse: 12 }],
  [22, 'Critical Mass', 8, 8, 20, 6, place(plain(8, 8), [[1, 1], [6, 1], [1, 6], [6, 6]], 'B'), { fuse: 10, spike: true }],
  [23, 'Salvage Under Fire', 9, 8, 22, 6, place(plain(9, 8), [[2, 2], [6, 5]], 'B'), { fuse: 12, collect: 3 }],
  [24, 'The Powder Seam', 9, 8, 20, 6, place(withCorners(plain(9, 8), 2), [[2, 2], [6, 2], [2, 5], [6, 5], [4, 4]], 'B'), { fuse: 9 }],

  // 25-30 : creeping shadow. Spreads on a timer; smothered cells stop matching.
  [25, 'First Dark', 8, 8, 26, 5, null, { contain: 10, shadowPeriod: 5 }],
  [26, 'The Spreading', 8, 8, 24, 5, null, { contain: 14, shadowPeriod: 4 }],
  [27, 'Shuttered Depths', 8, 8, 24, 6, crustBlock(8, 8, 1, 4, 3), { contain: 14, shadowPeriod: 4 }],
  [28, 'Lightless', 9, 8, 22, 6, null, { contain: 18, shadowPeriod: 3, collect: 3, spike: true }],
  [29, 'Endgame Protocol', 9, 8, 22, 6, place(plain(9, 8), [[2, 2], [6, 5]], 'B'), { contain: 16, shadowPeriod: 4, fuse: 12 }],
  [30, 'The Living Core', 9, 9, 24, 6, place(withCorners(crustDiamond(9, 9, 3), 2), [[4, 1], [1, 4], [7, 4], [4, 7]], 'B'), { contain: 20, shadowPeriod: 4, fuse: 14, collect: 4, spike: true }],
];

const files = [];

for (const [id, name, w, h, moves, colorCount, layout, extra] of spec) {
  const objectives = [];

  if (layout) {
    const crust = crustCells(layout);
    if (crust > 0) objectives.push({ kind: 'crust', target: crust });
    const bombs = bombCells(layout);
    if (bombs > 0) objectives.push({ kind: 'defuse', target: bombs });
  }
  if (extra.collect) objectives.push({ kind: 'collect', target: extra.collect });
  if (extra.contain) objectives.push({ kind: 'contain', target: extra.contain });
  if (extra.score) objectives.push({ kind: 'score', target: extra.score });

  if (objectives.length === 0) throw new Error(`level ${id} has no objectives`);

  // Star thresholds scale with the work the level demands.
  const base = extra.score ?? Math.round((moves * 420 + objectives.reduce((n, o) => n + o.target * 260, 0)) / 100) * 100;
  const stars = [base, Math.round(base * 1.45), Math.round(base * 2.0)];

  const level = {
    id,
    name,
    width: w,
    height: h,
    moves,
    objectives,
    stars,
    colors: ALL.slice(0, colorCount),
    ...(layout ? { layout } : {}),
    ...(extra.shadowPeriod ? { shadowPeriod: extra.shadowPeriod } : {}),
    ...(extra.fuse ? { bombFuse: extra.fuse } : {}),
  };

  // Sanity: layout dimensions must match the declared board.
  if (layout) {
    if (layout.length !== h) throw new Error(`level ${id}: layout has ${layout.length} rows, expected ${h}`);
    for (const row of layout) {
      if (row.length !== w) throw new Error(`level ${id}: layout row "${row}" is ${row.length} wide, expected ${w}`);
    }
  }

  const file = `${String(id).padStart(2, '0')}.json`;
  writeFileSync(OUT + file, JSON.stringify(level, null, 2) + '\n');
  files.push({ file, id, name, objectives, moves, spike: !!extra.spike });
}

console.log(`Wrote ${files.length} levels to src/levels/\n`);
for (const f of files) {
  const goals = f.objectives.map((o) => `${o.kind}:${o.target}`).join(' ');
  console.log(
    `  ${String(f.id).padStart(2)}  ${f.name.padEnd(22)} ${String(f.moves).padStart(2)} moves  ${goals}${f.spike ? '   <-- difficulty spike' : ''}`,
  );
}
