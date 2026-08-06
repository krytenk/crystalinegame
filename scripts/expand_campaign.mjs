/**
 * Expand campaign to 100 levels for launch depth.
 *
 * Keeps hand-tuned levels 01–40 untouched. Writes only 41–100.
 * Board policy (matches src/levels/index.ts):
 *   non-boss ≤ 7×7, boss ≤ 8×7
 *
 * Run: node scripts/expand_campaign.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const OUT = fileURLToPath(new URL('../src/levels/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const ALL = ['ember', 'aurum', 'solar', 'verdant', 'tidal', 'void'];

const grid = (w, h, fn) =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => fn(x, y) ?? '.').join(''),
  );

const plain = (w, h) => grid(w, h, () => '.');

const withCorners = (rows, n) =>
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

const withHoles = (rows, coords) => {
  const out = rows.map((r) => r.split(''));
  for (const [x, y] of coords) {
    if (out[y]?.[x] !== undefined) out[y][x] = '#';
  }
  return out.map((r) => r.join(''));
};

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

const crustDiamond = (w, h, r) =>
  grid(w, h, (x, y) => {
    const d = Math.abs(x - (w - 1) / 2) + Math.abs(y - (h - 1) / 2);
    if (d > r) return '.';
    return String(Math.min(3, Math.max(1, Math.ceil(r - d + 0.5))));
  });

const crustBand = (w, h, layers, inset = 1) =>
  grid(w, h, (x, y) => {
    const onBand =
      ((x === inset || x === w - 1 - inset) && y >= inset && y <= h - 1 - inset) ||
      ((y === inset || y === h - 1 - inset) && x >= inset && x <= w - 1 - inset);
    return onBand ? String(layers) : '.';
  });

const countChar = (rows, pred) =>
  rows.reduce((n, r) => n + [...r].filter(pred).length, 0);
const crustCells = (rows) => countChar(rows, (c) => c === '1' || c === '2' || c === '3');
const bombCells = (rows) => countChar(rows, (c) => c === 'B');
const playable = (rows) => countChar(rows, (c) => c !== '#');

// --- name pools (mine / crystal tone) ---
const NAMES = {
  score: [
    'Echo Chamber',
    'Resonant Vein',
    'Spark Gallery',
    'Bright Fault',
    'Cascade Hall',
    'Gleam Road',
    'Shard March',
    'Prism Path',
  ],
  crust: [
    'Rimed Passage',
    'Iron Frost',
    'Locked Gallery',
    'Crystal Jacket',
    'Hardpack Seam',
    'Glaze Gate',
    'Stone Rime',
    'Frozen Rib',
  ],
  collect: [
    'Artifact Drift',
    'Goldfall',
    'Relic Ladder',
    'Offering Pit',
    'Salvage Spine',
    'Treasure Drop',
    'Buried Signal',
    'Claim Run',
  ],
  defuse: [
    'Live Wire',
    'Fuse Corridor',
    'Hot Seam',
    'Charge Line',
    'Blast Gallery',
    'Ticking Vein',
    'Detonator Row',
    'Powder Hall',
  ],
  contain: [
    'Night Bleed',
    'Creeping Dark',
    'Shade Rib',
    'Umbral Gate',
    'Shadow Flue',
    'Dim Vein',
    'Blackwater',
    'Eclipse Path',
  ],
  multi: [
    'Compound Threat',
    'Stacked Odds',
    'Mixed Signal',
    'Crossfire',
    'Double Bind',
    'Triple Fault',
    'Gauntlet Rib',
    'Pressure Cage',
  ],
  boss: [
    'Chapter Warden',
    'Geode Tyrant',
    'Fault Sovereign',
    'Spire Sentinel',
    'Crown of Rime',
    'Void Bailiff',
    'Living Vault',
    'Apex Heart',
    'Crystal Regent',
    'Core of Cores',
    'Eternal Seam',
    'Last Light',
  ],
};

const namePick = (pool, id) => pool[(id * 7) % pool.length];

/** Deterministic pseudo-layout variants from level id. */
const variant = (id) => id % 4;

function layoutFor(id, kind, w, h, boss) {
  const v = variant(id);
  const corners = v === 0 ? 1 : v === 1 ? 2 : 1;

  if (kind === 'score' || kind === 'contain') {
    if (v === 0) return withCorners(plain(w, h), corners);
    if (v === 1) return withHoles(plain(w, h), [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]);
    if (v === 2) return withCorners(plain(w, h), 2);
    return plain(w, h);
  }

  if (kind === 'crust') {
    if (v === 0) return withCorners(crustBlock(w, h, 2, 5, 4), 1);
    if (v === 1) return crustDiamond(w, h, boss ? 3 : 2);
    if (v === 2) return withCorners(crustBand(w, h, 2, 1), 1);
    return crustBlock(w, h, boss ? 2 : 1, 5, 5);
  }

  if (kind === 'collect') {
    if (v === 0) return withCorners(plain(w, h), 2);
    if (v === 1) return withHoles(plain(w, h), [[3, 0], [3, h - 1], [0, 3], [w - 1, 3]].filter(([x, y]) => x < w && y < h));
    if (v === 2) return withCorners(plain(w, h), 1);
    return plain(w, h);
  }

  if (kind === 'defuse') {
    // Bomb placements — keep reachable neighbors; prefer mid/top for skill challenge
    const bombs =
      v === 0
        ? [
            [1, 0],
            [w - 2, 2],
            [Math.floor(w / 2), Math.floor(h / 2)],
          ]
        : v === 1
          ? [
              [2, 1],
              [w - 3, 1],
              [2, h - 2],
              [w - 3, h - 2],
            ]
          : v === 2
            ? [
                [1, 1],
                [w - 2, 1],
                [Math.floor(w / 2), h - 2],
              ]
            : [
                [Math.floor(w / 2), 0],
                [1, Math.floor(h / 2)],
                [w - 2, Math.floor(h / 2)],
                [Math.floor(w / 2), h - 1],
              ];
    const base = withCorners(plain(w, h), v === 3 ? 0 : 1);
    return place(base, bombs.slice(0, boss ? 4 : 3), 'B');
  }

  // multi / boss compound layouts
  let base = withCorners(crustDiamond(w, h, boss ? 3 : 2), 1);
  if (kind === 'multi' || boss) {
    const bombs =
      id % 3 === 0
        ? [
            [1, 0],
            [w - 2, 2],
            [Math.floor(w / 2), h - 2],
          ]
        : [
            [2, 1],
            [w - 3, 1],
            [Math.floor(w / 2), Math.floor(h / 2)],
          ];
    base = place(base, bombs, 'B');
  }
  return base;
}

function buildLevel(id) {
  const isBoss = id % 5 === 0; // 45,50,...,100
  const band = Math.floor((id - 1) / 10); // 4..9 for 41-100
  const w = isBoss ? 8 : 7;
  const h = 7;

  // Difficulty scales with id
  const late = id >= 80;
  const mid = id >= 60;
  const movesBase = isBoss ? 22 : late ? 16 : mid ? 17 : 18;
  const moves = movesBase + (id % 3 === 0 ? 1 : 0) - (late && !isBoss ? 0 : 0);

  // Archetype rotation with multi-obj late
  const phase = (id - 41) % 8;
  let kind;
  if (isBoss) kind = 'boss';
  else if (phase === 0) kind = 'score';
  else if (phase === 1) kind = 'crust';
  else if (phase === 2) kind = 'collect';
  else if (phase === 3) kind = 'defuse';
  else if (phase === 4) kind = 'contain';
  else if (phase === 5) kind = 'multi';
  else if (phase === 6) kind = mid ? 'multi' : 'crust';
  else kind = late ? 'multi' : 'defuse';

  const layout = layoutFor(id, kind === 'boss' ? 'multi' : kind, w, h, isBoss);
  if (playable(layout) < 9) throw new Error(`L${id}: too few playable cells`);

  const objectives = [];
  const crust = crustCells(layout);
  const bombs = bombCells(layout);

  // Objective targets scaled by band
  const collectT = late ? 5 : mid ? 4 : 3;
  const containT = late ? 12 : mid ? 10 : 8;
  const scoreT = 4000 + band * 400 + (isBoss ? 800 : 0);

  if (kind === 'score') {
    objectives.push({ kind: 'score', target: scoreT });
  } else if (kind === 'crust') {
    if (crust <= 0) throw new Error(`L${id}: crust layout empty`);
    objectives.push({ kind: 'crust', target: crust });
    if (mid && id % 2 === 0) objectives.push({ kind: 'score', target: Math.round(scoreT * 0.7) });
  } else if (kind === 'collect') {
    objectives.push({ kind: 'collect', target: collectT });
    if (late) objectives.push({ kind: 'score', target: Math.round(scoreT * 0.55) });
  } else if (kind === 'defuse') {
    if (bombs <= 0) throw new Error(`L${id}: no bombs`);
    objectives.push({ kind: 'defuse', target: bombs });
    if (mid && crust > 0) objectives.push({ kind: 'crust', target: crust });
  } else if (kind === 'contain') {
    objectives.push({ kind: 'contain', target: containT });
    if (isBoss || mid) objectives.push({ kind: 'score', target: Math.round(scoreT * 0.65) });
  } else if (kind === 'multi' || kind === 'boss') {
    if (crust > 0) objectives.push({ kind: 'crust', target: crust });
    if (bombs > 0) objectives.push({ kind: 'defuse', target: bombs });
    if (isBoss || phase === 5 || late) {
      objectives.push({ kind: 'collect', target: Math.max(2, collectT - 1) });
    }
    if (isBoss || phase === 6 || late) {
      objectives.push({ kind: 'contain', target: containT });
    }
    if (isBoss) {
      objectives.push({ kind: 'score', target: Math.round(scoreT * 0.75) });
    }
    // Ensure at least 2 goals on multi
    if (objectives.length < 2) {
      objectives.push({ kind: 'score', target: scoreT });
    }
  }

  // Deduplicate kinds keeping first
  const seen = new Set();
  const uniq = [];
  for (const o of objectives) {
    if (seen.has(o.kind)) continue;
    seen.add(o.kind);
    uniq.push(o);
  }

  if (uniq.length === 0) throw new Error(`L${id}: no objectives`);

  // Fuse / shadow
  let bombFuse;
  let shadowPeriod;
  if (bombs > 0 || uniq.some((o) => o.kind === 'defuse')) {
    bombFuse = late ? 4 : mid ? 5 : 6;
    if (isBoss) bombFuse = Math.max(3, bombFuse - 1);
  }
  if (uniq.some((o) => o.kind === 'contain')) {
    shadowPeriod = late ? 2 : mid ? 3 : 3;
    if (isBoss) shadowPeriod = 2;
  }

  // Stars
  const objWeight = uniq.reduce((n, o) => {
    if (o.kind === 'score') return n + o.target * 0.15;
    if (o.kind === 'crust') return n + o.target * 80;
    if (o.kind === 'collect') return n + o.target * 120;
    if (o.kind === 'defuse') return n + o.target * 100;
    if (o.kind === 'contain') return n + o.target * 60;
    return n;
  }, 0);
  const expected = Math.round((moves * 200 + objWeight) / 100) * 100;
  const scoreObj = uniq.find((o) => o.kind === 'score');
  const one = scoreObj
    ? Math.round((scoreObj.target * 0.85) / 100) * 100
    : Math.round((expected * 0.45) / 100) * 100;
  const stars = [
    Math.max(400, one),
    Math.round((Math.max(400, one) * 1.55) / 100) * 100,
    Math.round((Math.max(400, one) * 2.3) / 100) * 100,
  ];

  const pool =
    kind === 'boss'
      ? NAMES.boss
      : kind === 'multi'
        ? NAMES.multi
        : NAMES[kind] ?? NAMES.multi;
  // Unique-ish titles: pool pick + Roman chapter beat so map rows don't clone names.
  const beat = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'][(id - 41) % 8];
  const baseName = isBoss ? namePick(NAMES.boss, Math.floor(id / 5)) : namePick(pool, id);
  const name = isBoss ? baseName : `${baseName} ${beat}`;

  const colors = ALL.slice(0, 6); // late campaign always full palette

  // Validate layout size
  if (layout.length !== h) throw new Error(`L${id} height`);
  for (const row of layout) {
    if (row.length !== w) throw new Error(`L${id} width ${row.length}!=${w}`);
  }

  // Crust/defuse must match layout counts
  for (const o of uniq) {
    if (o.kind === 'crust' && o.target !== crustCells(layout)) {
      o.target = crustCells(layout);
    }
    if (o.kind === 'defuse' && o.target !== bombCells(layout)) {
      o.target = bombCells(layout);
    }
  }

  // Drop empty defuse/crust if layout lost pieces
  const finalObj = uniq.filter((o) => {
    if (o.kind === 'crust' || o.kind === 'defuse') return o.target > 0;
    return true;
  });
  if (finalObj.length === 0) finalObj.push({ kind: 'score', target: scoreT });

  return {
    id,
    name,
    width: w,
    height: h,
    moves,
    objectives: finalObj,
    stars,
    colors,
    layout,
    ...(shadowPeriod ? { shadowPeriod } : {}),
    ...(bombFuse && bombCells(layout) > 0 ? { bombFuse } : {}),
    ...(isBoss ? { boss: true } : { boss: false }),
  };
}

const START = 41;
const END = 100;
const written = [];

for (let id = START; id <= END; id++) {
  const level = buildLevel(id);
  // Strip boss:false for cleaner JSON (optional field)
  if (level.boss === false) delete level.boss;
  const file = `${String(id).padStart(2, '0')}.json`;
  // 3-digit ids after 99 use pad 2 still works for 100 → "100.json" with padStart(2) is "100"
  // padStart(2) on "100" stays "100". Good.
  // For id 100 we need "100.json" - padStart(3) for consistency above 99?
  // Existing uses 01-40 with 2 digits. Level 100 → "100.json" is fine.
  writeFileSync(OUT + file, JSON.stringify(level, null, 2) + '\n');
  written.push(level);
}

console.log(`Wrote levels ${START}–${END} (${written.length} files)\n`);
for (const l of written) {
  const goals = l.objectives.map((o) => `${o.kind}:${o.target}`).join(' ');
  console.log(
    `  ${String(l.id).padStart(3)}  ${l.name.padEnd(24)} ${l.width}x${l.height}  ${String(l.moves).padStart(2)}m  ${goals}${l.boss ? '  BOSS' : ''}`,
  );
}
