/**
 * Expand catalogue from 100 → 150 levels.
 * Writes only src/levels/101.json … 150.json (does not rewrite 1–100).
 *
 * Run: node scripts/gen_levels_101_150.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const OUT = fileURLToPath(new URL('../src/levels/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const ALL6 = ['ember', 'aurum', 'solar', 'verdant', 'tidal', 'void'];

const grid = (w, h, fn) =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => fn(x, y) ?? '.').join(''),
  );

const plain = (w, h) => grid(w, h, () => '.');

const withCorners = (rows, n = 1) =>
  rows.map((row, y) =>
    row
      .split('')
      .map((c, x) => {
        const w = row.length;
        const h = rows.length;
        const corner =
          (x < n && y < n) ||
          (x >= w - n && y < n) ||
          (x < n && y >= h - n) ||
          (x >= w - n && y >= h - n);
        return corner ? '#' : c;
      })
      .join(''),
  );

const place = (rows, coords, ch) => {
  const out = rows.map((r) => r.split(''));
  for (const [x, y] of coords) {
    if (out[y]?.[x] !== undefined && out[y][x] !== '#') out[y][x] = ch;
  }
  return out.map((r) => r.join(''));
};

const crustBlock = (w, h, layers, bw, bh) =>
  grid(w, h, (x, y) => {
    const x0 = Math.floor((w - bw) / 2);
    const y0 = Math.floor((h - bh) / 2);
    return x >= x0 && x < x0 + bw && y >= y0 && y < y0 + bh ? String(layers) : '.';
  });

const crustBand = (w, h, layers, inset = 1) =>
  grid(w, h, (x, y) => {
    const on =
      ((x === inset || x === w - 1 - inset) && y >= inset && y <= h - 1 - inset) ||
      ((y === inset || y === h - 1 - inset) && x >= inset && x <= w - 1 - inset);
    return on ? String(layers) : '.';
  });

const crustDiamond = (w, h, r) =>
  grid(w, h, (x, y) => {
    const d = Math.abs(x - (w - 1) / 2) + Math.abs(y - (h - 1) / 2);
    if (d > r) return '.';
    return String(Math.min(3, Math.max(1, Math.ceil(r - d + 0.1))));
  });

const count = (rows, pred) =>
  rows.reduce((n, r) => n + [...r].filter(pred).length, 0);
const crustN = (rows) => count(rows, (c) => '123'.includes(c));
const bombN = (rows) => count(rows, (c) => c === 'B');

/** Rotate archetype by id for variety. */
const ARCH = [
  'score',
  'crust',
  'collect',
  'defuse',
  'contain',
  'crust_score',
  'collect_score',
  'defuse_crust',
  'compound',
  'boss_full',
];

const NAMES = {
  score: [
    'Open Water',
    'Calm Current',
    'Glass Horizon',
    'Soft Tide',
    'Clear Run',
  ],
  crust: ['Rime Shelf', 'Pack Ice', 'Stone Shelf', 'Frost Plate', 'Hard Pan'],
  collect: ['Salvage Drift', 'Relic Fall', 'Bottom Catch', 'Deep Haul', 'Cargo Drop'],
  defuse: ['Short Fuse', 'Live Charge', 'Hot Seam', 'Powder Row', 'Tick Line'],
  contain: ['First Fog', 'Creeping Dark', 'Umbral Edge', 'Night Creep', 'Shutter'],
  crust_score: ['Iced Score', 'Plate & Points', 'Hard Count', 'Rime Run'],
  collect_score: ['Treasure Tally', 'Haul & High', 'Relic Pace'],
  defuse_crust: ['Cold Charge', 'Ice & Fuse', 'Sealed Bomb'],
  compound: ['Mixed Signal', 'Stacked Odds', 'Live Wire', 'Compound Bay', 'Fault Mix'],
  boss_full: [
    'Spire Regent',
    'Deep Warden',
    'Tide Sovereign',
    'Core Crown',
    'Abyss Heart',
    'Final Vault',
    'Crystal Throne',
    'Night Regent',
    'Seam Lord',
    'Harbor Apex',
  ],
};

function nameFor(arch, id) {
  const list = NAMES[arch] || NAMES.score;
  return `${list[id % list.length]} ${id}`;
}

function layoutFor(arch, w, h, id) {
  const s = id * 17;
  const bombs3 = [
    [1 + (s % 2), 2],
    [w - 2 - (s % 2), 3],
    [Math.floor(w / 2), h - 2],
  ];
  const bombs2 = [
    [2, 2],
    [w - 3, h - 3],
  ];
  const bombs4 = [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
  ];

  switch (arch) {
    case 'score':
      return withCorners(plain(w, h), 1);
    case 'crust':
    case 'crust_score':
      return withCorners(
        s % 2 === 0 ? crustBlock(w, h, 1 + (s % 2), 4, 3) : crustBand(w, h, 1, 1),
        1,
      );
    case 'collect':
    case 'collect_score':
      return withCorners(plain(w, h), 1);
    case 'defuse':
      return place(withCorners(plain(w, h), 1), bombs3, 'B');
    case 'contain':
      return withCorners(plain(w, h), 1);
    case 'defuse_crust':
      return place(withCorners(crustBlock(w, h, 1, 3, 3), 1), bombs2, 'B');
    case 'compound':
      return place(
        withCorners(s % 3 === 0 ? crustDiamond(w, h, 2) : crustBand(w, h, 1, 1), 1),
        bombs3,
        'B',
      );
    case 'boss_full':
      return place(
        withCorners(crustDiamond(w, h, 3), 1),
        s % 2 === 0 ? bombs3 : bombs4.slice(0, 3),
        'B',
      );
    default:
      return withCorners(plain(w, h), 1);
  }
}

function buildLevel(id) {
  const boss = id % 5 === 0; // 105, 110, … 150
  const w = boss ? 8 : 7;
  const h = 7;
  // Difficulty ramp 101→150
  const t = (id - 101) / 49; // 0..1
  const arch = boss
    ? 'boss_full'
    : ARCH[Math.floor((id * 3 + 1) % (ARCH.length - 1))]; // skip boss_full for non-boss

  const layout = layoutFor(arch, w, h, id);
  const crust = crustN(layout);
  const bombs = bombN(layout);

  // Moves: generous enough for fuses
  let moves = Math.round(26 - t * 6); // 26 → 20
  if (boss) moves = Math.round(28 - t * 4); // 28 → 24
  if (arch === 'score') moves = Math.max(moves, 22);
  if (bombs > 0) moves = Math.max(moves, 22);

  let fuse = bombs > 0 ? Math.max(5, Math.round(7 - t * 2)) : undefined; // 7→5
  if (fuse !== undefined && moves < fuse) moves = fuse + 2;

  const shadowPeriod =
    arch === 'contain' || arch === 'compound' || arch === 'boss_full'
      ? Math.max(2, Math.round(4 - t * 1.5))
      : undefined;

  const objectives = [];
  if (crust > 0 && ['crust', 'crust_score', 'defuse_crust', 'compound', 'boss_full'].includes(arch)) {
    objectives.push({ kind: 'crust', target: crust });
  }
  if (bombs > 0) {
    objectives.push({ kind: 'defuse', target: bombs });
  }
  if (['collect', 'collect_score', 'compound', 'boss_full'].includes(arch)) {
    const c = arch === 'boss_full' ? 3 + Math.floor(t * 2) : 2 + Math.floor(t * 2);
    objectives.push({ kind: 'collect', target: Math.min(5, c) });
  }
  if (shadowPeriod !== undefined) {
    const contain = arch === 'boss_full' ? 10 + Math.floor(t * 4) : 8 + Math.floor(t * 4);
    objectives.push({ kind: 'contain', target: contain });
  }
  if (['score', 'crust_score', 'collect_score', 'boss_full'].includes(arch) || objectives.length === 0) {
    const score = Math.round(2000 + t * 5000 + (boss ? 1500 : 0));
    objectives.push({ kind: 'score', target: score });
  }

  // Stars calibrated for ~60 pts/crystal, cascade ~1.5×
  const base = Math.round(moves * 90 + objectives.length * 400);
  const stars = [base, Math.round(base * 1.55), Math.round(base * 2.3)];

  const name = boss
    ? NAMES.boss_full[Math.floor((id - 105) / 5) % NAMES.boss_full.length]
    : nameFor(arch, id);

  const level = {
    id,
    name,
    width: w,
    height: h,
    moves,
    objectives,
    stars,
    colors: ALL6,
    layout,
    ...(shadowPeriod !== undefined ? { shadowPeriod } : {}),
    ...(fuse !== undefined ? { bombFuse: fuse } : {}),
    ...(boss ? { boss: true } : {}),
  };

  // Final safety: defuse target matches bombs
  const def = level.objectives.find((o) => o.kind === 'defuse');
  if (def) def.target = bombs;
  const cr = level.objectives.find((o) => o.kind === 'crust');
  if (cr) cr.target = crust;

  return level;
}

const written = [];
for (let id = 101; id <= 150; id++) {
  const lvl = buildLevel(id);
  const path = `${OUT}/${id}.json`;
  writeFileSync(path, JSON.stringify(lvl, null, 2) + '\n');
  written.push(id);
}

console.log(`Wrote levels ${written[0]}–${written[written.length - 1]} (${written.length} files)`);
