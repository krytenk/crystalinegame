/**
 * LEVEL_PASS auto-fairness for Act I-C (levels 151–300).
 *
 * Rules (from docs/LEVEL_PASS.md Harbor metrics):
 *   - bombs present → bombFuse defined; moves >= fuse
 *   - bombs ≥ 2 → fuse ≥ 4; moves ≥ fuse + 6
 *   - bombs ≥ 3 → moves ≥ fuse + 8
 *   - multi-obj (≥4) → moves ≥ 22
 *   - boss multi-obj (≥4) → moves ≥ 26
 *   - contain without shadowPeriod → period 2
 *   - crust/defuse targets re-synced from layout
 *
 * Run: node scripts/fairness_151_300.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const DIR = fileURLToPath(new URL('../src/levels/', import.meta.url));

const count = (layout, pred) =>
  (layout ?? []).reduce((n, r) => n + [...r].filter(pred).length, 0);

let changed = 0;
const log = [];

for (let id = 151; id <= 300; id++) {
  const path = `${DIR}/${id}.json`;
  const L = JSON.parse(readFileSync(path, 'utf8'));
  const layout = L.layout ?? [];
  const bombs = count(layout, (c) => c === 'B');
  const crust = count(layout, (c) => '123'.includes(c));
  const before = JSON.stringify(L);

  // Sync objective targets
  for (const o of L.objectives ?? []) {
    if (o.kind === 'defuse') o.target = bombs;
    if (o.kind === 'crust') o.target = crust;
  }
  // Drop empty crust/defuse
  L.objectives = (L.objectives ?? []).filter((o) => {
    if (o.kind === 'defuse' && bombs === 0) return false;
    if (o.kind === 'crust' && crust === 0) return false;
    return true;
  });

  if (bombs > 0) {
    let fuse = typeof L.bombFuse === 'number' ? L.bombFuse : 5;
    if (bombs >= 2) fuse = Math.max(4, fuse);
    if (bombs >= 3) fuse = Math.max(5, fuse);
    // Late Act I: slightly safer fuses
    if (id >= 250) fuse = Math.max(fuse, 5);
    L.bombFuse = fuse;
    let moves = L.moves;
    moves = Math.max(moves, fuse);
    if (bombs >= 2) moves = Math.max(moves, fuse + 6);
    if (bombs >= 3) moves = Math.max(moves, fuse + 8);
    L.moves = moves;
  } else {
    delete L.bombFuse;
  }

  const nobj = (L.objectives ?? []).length;
  if (nobj >= 4) L.moves = Math.max(L.moves, 22);
  if (L.boss && nobj >= 4) L.moves = Math.max(L.moves, 26);
  if (L.boss && id >= 280) L.moves = Math.max(L.moves, 28);

  const hasContain = (L.objectives ?? []).some((o) => o.kind === 'contain');
  if (hasContain) {
    L.shadowPeriod = Math.max(2, Math.min(4, L.shadowPeriod ?? 2));
  }

  // Soft score ease on brutal multi-obj late bosses (still a sink)
  if (L.boss && nobj >= 4) {
    for (const o of L.objectives) {
      if (o.kind === 'score' && o.target > 9000) {
        o.target = Math.round(o.target * 0.92);
      }
      if (o.kind === 'contain' && o.target > 14) {
        o.target = 14;
      }
    }
  }

  // Recompute stars gently from moves + obj count
  const base = Math.round(L.moves * 95 + nobj * 450);
  L.stars = [base, Math.round(base * 1.55), Math.round(base * 2.35)];

  if (JSON.stringify(L) !== before) {
    writeFileSync(path, JSON.stringify(L, null, 2) + '\n');
    changed++;
    log.push(id);
  }
}

console.log(`Fairness pass: updated ${changed} levels among 151–300`);
if (log.length) console.log('ids:', log.join(', '));
