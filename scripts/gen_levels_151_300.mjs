/**
 * Expand catalogue from 150 → 300 levels (Act I-C: Outer Channels / Under-Crown).
 * Writes only src/levels/151.json … 300.json (does not rewrite 1–150).
 *
 * Board policy: non-boss ≤ 7×7, boss ≤ 8×7
 * Boss every 5th: 155, 160, … 300
 *
 * Run: node scripts/gen_levels_151_300.mjs
 *
 * Story map: docs/CAMPAIGN_ARC.md (chapters XVI–XXX).
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

const crustCross = (w, h, layers = 1) =>
  grid(w, h, (x, y) => {
    const mx = Math.floor(w / 2);
    const my = Math.floor(h / 2);
    return x === mx || y === my ? String(layers) : '.';
  });

const count = (rows, pred) =>
  rows.reduce((n, r) => n + [...r].filter(pred).length, 0);
const crustN = (rows) => count(rows, (c) => '123'.includes(c));
const bombN = (rows) => count(rows, (c) => c === 'B');

/** Outer Channels / Under-Crown archetypes — dual threat default late. */
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
  'dual',
  'boss_full',
];

const NAMES = {
  score: ['Open Channel', 'Clear Ledger', 'Soft Current', 'Glass Reach', 'Quiet Tide'],
  crust: ['Rime Mouth', 'Pack Shelf', 'Stone Ledger', 'Frost Gate', 'Hard Channel'],
  collect: ['Salvage Mouth', 'Relic Channel', 'Bottom Ledger', 'Deep Salvage', 'Cargo Reach'],
  defuse: ['Live Buoy', 'Hot Seam', 'Short Fuse', 'Powder Channel', 'Tick Ledger'],
  contain: ['First Fog', 'Creeping Night', 'Umbral Channel', 'Night Ledger', 'Shutter Reach'],
  crust_score: ['Iced Ledger', 'Plate Channel', 'Hard Count', 'Rime Score'],
  collect_score: ['Treasure Channel', 'Haul Pace', 'Relic Tally'],
  defuse_crust: ['Cold Charge', 'Ice Fuse', 'Sealed Buoy'],
  compound: ['Mixed Signal', 'Stacked Channel', 'Live Wire', 'Fault Mix', 'Compound Reach'],
  dual: ['Twin Tide', 'Double Seam', 'Rival Pressure', 'Two Hands', 'Cross Current'],
  boss_full: [
    'Channel Mouth',
    'Storm Ledger',
    'Rival Buoy',
    'Fog Choir',
    'Outer Road',
    'Quiet Slip',
    'Twin Tide',
    'Blackwater Reach',
    'Beacon Reply',
    'Apex Approach',
    'Treaty Draft',
    'Festival Storm',
    'Tide Voice',
    'Last Quay',
    'Channel Close',
    'Harbor Apex II',
  ],
};

function nameFor(arch, id) {
  const list = NAMES[arch] || NAMES.score;
  return `${list[id % list.length]} ${id}`;
}

function layoutFor(arch, w, h, id) {
  const s = id * 19;
  const bombs2 = [
    [2, 2],
    [w - 3, h - 3],
  ];
  const bombs3 = [
    [1 + (s % 2), 2],
    [w - 2 - (s % 2), 3],
    [Math.floor(w / 2), h - 2],
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
        s % 3 === 0
          ? crustCross(w, h, 1 + (s % 2))
          : s % 2 === 0
            ? crustBlock(w, h, 1 + (s % 2), 4, 3)
            : crustBand(w, h, 1 + (s % 2), 1),
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
      return place(withCorners(crustBlock(w, h, 1 + (s % 2), 3, 3), 1), bombs2, 'B');
    case 'compound':
    case 'dual':
      return place(
        withCorners(
          s % 3 === 0 ? crustDiamond(w, h, 2 + (s % 2)) : crustBand(w, h, 1 + (s % 2), 1),
          1,
        ),
        s % 2 === 0 ? bombs3 : bombs4.slice(0, 3),
        'B',
      );
    case 'boss_full':
      return place(
        withCorners(crustDiamond(w, h, 3), 1),
        s % 2 === 0 ? bombs4.slice(0, 3) : bombs3,
        'B',
      );
    default:
      return withCorners(plain(w, h), 1);
  }
}

function buildLevel(id) {
  const boss = id % 5 === 0; // 155, 160, … 300
  const w = boss ? 8 : 7;
  const h = 7;
  // Difficulty ramp 151→300 (harder than 101–150, still fair fuses)
  const t = (id - 151) / 149; // 0..1
  const arch = boss
    ? 'boss_full'
    : ARCH[Math.floor((id * 5 + 2) % (ARCH.length - 1))];

  const layout = layoutFor(arch, w, h, id);
  const crust = crustN(layout);
  const bombs = bombN(layout);

  let moves = Math.round(25 - t * 7); // 25 → 18
  if (boss) moves = Math.round(28 - t * 5); // 28 → 23
  if (arch === 'score') moves = Math.max(moves, 20);
  if (bombs > 0) moves = Math.max(moves, 21);
  if (arch === 'dual' || arch === 'compound') moves = Math.max(moves, 22);

  let fuse = bombs > 0 ? Math.max(5, Math.round(7 - t * 2)) : undefined;
  if (fuse !== undefined && moves < fuse) moves = fuse + 2;

  const shadowPeriod =
    arch === 'contain' ||
    arch === 'compound' ||
    arch === 'dual' ||
    arch === 'boss_full' ||
    (t > 0.35 && id % 7 === 0)
      ? Math.max(2, Math.round(4 - t * 1.5))
      : undefined;

  const objectives = [];
  if (
    crust > 0 &&
    ['crust', 'crust_score', 'defuse_crust', 'compound', 'dual', 'boss_full'].includes(arch)
  ) {
    objectives.push({ kind: 'crust', target: crust });
  }
  if (bombs > 0) {
    objectives.push({ kind: 'defuse', target: bombs });
  }
  if (['collect', 'collect_score', 'compound', 'dual', 'boss_full'].includes(arch)) {
    const c = arch === 'boss_full' ? 3 + Math.floor(t * 2) : 2 + Math.floor(t * 2);
    objectives.push({ kind: 'collect', target: Math.min(6, c) });
  }
  if (shadowPeriod !== undefined) {
    const contain = arch === 'boss_full' ? 11 + Math.floor(t * 5) : 8 + Math.floor(t * 5);
    objectives.push({ kind: 'contain', target: contain });
  }
  // Late Act I: dual pressure default — ensure score sink when single-obj
  if (
    ['score', 'crust_score', 'collect_score', 'boss_full', 'dual'].includes(arch) ||
    objectives.length === 0 ||
    (t > 0.5 && objectives.length === 1)
  ) {
    const score = Math.round(2500 + t * 6500 + (boss ? 2000 : 0));
    if (!objectives.some((o) => o.kind === 'score')) {
      objectives.push({ kind: 'score', target: score });
    }
  }

  const base = Math.round(moves * 95 + objectives.length * 450);
  const stars = [base, Math.round(base * 1.55), Math.round(base * 2.35)];

  const name = boss
    ? NAMES.boss_full[Math.floor((id - 155) / 5) % NAMES.boss_full.length]
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

  const def = level.objectives.find((o) => o.kind === 'defuse');
  if (def) def.target = bombs;
  const cr = level.objectives.find((o) => o.kind === 'crust');
  if (cr) cr.target = crust;

  return level;
}

const written = [];
for (let id = 151; id <= 300; id++) {
  const lvl = buildLevel(id);
  const path = `${OUT}/${id}.json`;
  writeFileSync(path, JSON.stringify(lvl, null, 2) + '\n');
  written.push(id);
}

console.log(`Wrote levels ${written[0]}–${written[written.length - 1]} (${written.length} files)`);
