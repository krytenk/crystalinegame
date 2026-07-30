/**
 * CRYSTALLINE — match detection.
 *
 * PURE MODEL CODE. No DOM, no timers, no randomness.
 *
 * Two entry points:
 *
 *  - {@link findMatchesAt} is the "smart scan". After a swap only two coordinates
 *    changed, so we sweep exactly the horizontal and vertical lines radiating out
 *    from those two cells rather than re-reading the whole board. This is the hot
 *    path — it runs once per swap validation and once per deadlock probe, which is
 *    hundreds of times per player move.
 *
 *  - {@link findAllMatches} is the full-board pass, needed after gravity and refill
 *    (new pieces land in unpredictable alignments) and when generating a board.
 *
 * Overlapping runs are merged into a single {@link MatchGroup} so an L or T scores
 * and rewards once rather than twice.
 *
 * A cell whose `shadow >= 2` cannot match — shadow smothers it. That check lives in
 * `matchColorOf` (tile.ts) so every detection path shares it.
 */

import { compareCoords, coordEq, type Grid2D } from './grid';
import { matchColorOf } from './tile';
import type { Cell, Coord, CrystalColor, MatchGroup, MatchShape } from './types';

/** A maximal straight line of >= 3 same-coloured, matchable cells. */
export interface Run {
  readonly dir: 'h' | 'v';
  readonly color: CrystalColor;
  readonly cells: readonly Coord[];
}

const runKey = (grid: Grid2D<Cell>, run: Run): string => {
  const head = run.cells[0] as Coord;
  return `${run.dir}:${grid.toIndex(head.x, head.y)}:${run.cells.length}`;
};

/**
 * The maximal run through (x, y) along (dx, dy), or `null` when shorter than 3.
 * Bounds are handled by `Grid2D.get` returning `undefined`, which never matches.
 */
const runThrough = (
  grid: Grid2D<Cell>,
  x: number,
  y: number,
  dx: number,
  dy: number,
): Run | null => {
  const color = matchColorOf(grid.get(x, y));
  if (color === null) return null;

  let lo = 0;
  while (matchColorOf(grid.get(x + dx * (lo - 1), y + dy * (lo - 1))) === color) lo--;
  let hi = 0;
  while (matchColorOf(grid.get(x + dx * (hi + 1), y + dy * (hi + 1))) === color) hi++;

  const length = hi - lo + 1;
  if (length < 3) return null;

  const cells: Coord[] = [];
  for (let s = lo; s <= hi; s++) cells.push({ x: x + dx * s, y: y + dy * s });
  return { dir: dx === 0 ? 'v' : 'h', color, cells };
};

/** Every maximal run on the board, horizontal first then vertical. */
export const findAllRuns = (grid: Grid2D<Cell>): Run[] => {
  const runs: Run[] = [];

  // Horizontal.
  for (let y = 0; y < grid.height; y++) {
    let x = 0;
    while (x < grid.width) {
      const color = matchColorOf(grid.get(x, y));
      if (color === null) {
        x++;
        continue;
      }
      let end = x;
      while (end + 1 < grid.width && matchColorOf(grid.get(end + 1, y)) === color) end++;
      if (end - x + 1 >= 3) {
        const cells: Coord[] = [];
        for (let i = x; i <= end; i++) cells.push({ x: i, y });
        runs.push({ dir: 'h', color, cells });
      }
      x = end + 1;
    }
  }

  // Vertical.
  for (let x = 0; x < grid.width; x++) {
    let y = 0;
    while (y < grid.height) {
      const color = matchColorOf(grid.get(x, y));
      if (color === null) {
        y++;
        continue;
      }
      let end = y;
      while (end + 1 < grid.height && matchColorOf(grid.get(x, end + 1)) === color) end++;
      if (end - y + 1 >= 3) {
        const cells: Coord[] = [];
        for (let i = y; i <= end; i++) cells.push({ x, y: i });
        runs.push({ dir: 'v', color, cells });
      }
      y = end + 1;
    }
  }

  return runs;
};

/**
 * Smart scan: only the rows and columns through `origins` are swept.
 * `origins` is normally the two coordinates a swap modified.
 */
export const findRunsAt = (grid: Grid2D<Cell>, origins: readonly Coord[]): Run[] => {
  const seen = new Set<string>();
  const runs: Run[] = [];
  for (const o of origins) {
    if (!grid.inBounds(o.x, o.y)) continue;
    const h = runThrough(grid, o.x, o.y, 1, 0);
    if (h) {
      const k = runKey(grid, h);
      if (!seen.has(k)) {
        seen.add(k);
        runs.push(h);
      }
    }
    const v = runThrough(grid, o.x, o.y, 0, 1);
    if (v) {
      const k = runKey(grid, v);
      if (!seen.has(k)) {
        seen.add(k);
        runs.push(v);
      }
    }
  }
  return runs;
};

// ---------------------------------------------------------------------------
// Run -> MatchGroup
// ---------------------------------------------------------------------------

interface Cluster {
  readonly runs: Run[];
  readonly indices: Set<number>;
}

/** Merges runs that share any cell into clusters. */
const clusterRuns = (grid: Grid2D<Cell>, runs: readonly Run[]): Cluster[] => {
  const clusters: Cluster[] = [];

  for (const run of runs) {
    const idx = run.cells.map((c) => grid.toIndex(c.x, c.y));
    const hits: Cluster[] = [];
    for (const cluster of clusters) {
      if (idx.some((i) => cluster.indices.has(i))) hits.push(cluster);
    }

    if (hits.length === 0) {
      clusters.push({ runs: [run], indices: new Set(idx) });
      continue;
    }

    // Fold every touched cluster into the first one.
    const target = hits[0] as Cluster;
    target.runs.push(run);
    for (const i of idx) target.indices.add(i);
    for (let h = 1; h < hits.length; h++) {
      const other = hits[h] as Cluster;
      target.runs.push(...other.runs);
      for (const i of other.indices) target.indices.add(i);
      clusters.splice(clusters.indexOf(other), 1);
    }
  }

  return clusters;
};

/**
 * The intersection of a horizontal and a vertical run in the same cluster, or
 * `null` when the cluster is a single straight line.
 */
const findPivot = (cluster: Cluster): { pivot: Coord; h: Run; v: Run } | null => {
  const hs = cluster.runs.filter((r) => r.dir === 'h');
  const vs = cluster.runs.filter((r) => r.dir === 'v');
  for (const h of hs) {
    for (const v of vs) {
      for (const hc of h.cells) {
        for (const vc of v.cells) {
          if (coordEq(hc, vc)) return { pivot: hc, h, v };
        }
      }
    }
  }
  return null;
};

/** True when `c` sits at either end of `run`. */
const isEndpoint = (run: Run, c: Coord): boolean => {
  const first = run.cells[0] as Coord;
  const last = run.cells[run.cells.length - 1] as Coord;
  return coordEq(first, c) || coordEq(last, c);
};

const longestRunLength = (cluster: Cluster): number =>
  cluster.runs.reduce((m, r) => Math.max(m, r.cells.length), 0);

/**
 * Resolves a cluster into the shape that determines its reward.
 *
 * Precedence: a run of five or more always wins (it is the rarest and most valuable
 * reward), then an intersection produces L or T, then length alone decides.
 * L when the pivot is an endpoint of BOTH runs (a corner); T otherwise — the pivot
 * sits mid-run on at least one axis, which covers the `+` cross too.
 */
const shapeOf = (cluster: Cluster): { shape: MatchShape; pivot: Coord | null } => {
  const longest = longestRunLength(cluster);
  if (longest >= 5) {
    const run = cluster.runs.find((r) => r.cells.length === longest) as Run;
    return { shape: 'five', pivot: run.cells[Math.floor(run.cells.length / 2)] as Coord };
  }

  const cross = findPivot(cluster);
  if (cross) {
    const corner = isEndpoint(cross.h, cross.pivot) && isEndpoint(cross.v, cross.pivot);
    return { shape: corner ? 'L' : 'T', pivot: cross.pivot };
  }

  if (longest >= 4) return { shape: 'four', pivot: null };
  return { shape: 'three', pivot: null };
};

/**
 * Converts clusters into groups.
 *
 * `preferred` are the coordinates the player just touched; when a group contains one
 * of them it becomes the group's `origin`, so the reward spawns under the player's
 * finger. Cascades have no preferred cell, so the run's midpoint is used — a stable,
 * deterministic choice.
 */
const toGroups = (
  grid: Grid2D<Cell>,
  clusters: readonly Cluster[],
  preferred: readonly Coord[],
): MatchGroup[] => {
  const groups: MatchGroup[] = [];

  for (const cluster of clusters) {
    const cells: Coord[] = [];
    for (const i of cluster.indices) cells.push(grid.fromIndex(i));
    cells.sort(compareCoords);
    if (cells.length < 3) continue;

    const color = (cluster.runs[0] as Run).color;
    const { shape, pivot } = shapeOf(cluster);

    let origin: Coord;
    if (shape === 'L' || shape === 'T') {
      origin = pivot as Coord;
    } else {
      const touched = preferred.find((p) => cluster.indices.has(grid.toIndex(p.x, p.y)));
      if (touched) origin = touched;
      else if (pivot) origin = pivot;
      else {
        const run = cluster.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
        origin = run.cells[Math.floor(run.cells.length / 2)] as Coord;
      }
    }

    groups.push({ cells, color, shape, origin });
  }

  // Deterministic emission order: top-left group first.
  groups.sort((a, b) => compareCoords(a.cells[0] as Coord, b.cells[0] as Coord));
  return groups;
};

/**
 * Smart scan. Only the lines through `origins` are swept — do not call
 * {@link findAllMatches} on every move.
 */
export const findMatchesAt = (
  grid: Grid2D<Cell>,
  origins: readonly Coord[],
): MatchGroup[] => toGroups(grid, clusterRuns(grid, findRunsAt(grid, origins)), origins);

/** Full-board pass. Needed after refill and for board generation / deadlock checks. */
export const findAllMatches = (
  grid: Grid2D<Cell>,
  preferred: readonly Coord[] = [],
): MatchGroup[] => toGroups(grid, clusterRuns(grid, findAllRuns(grid)), preferred);

/** Cheap predicate for board generation: is there any run of 3 anywhere? */
export const hasAnyMatch = (grid: Grid2D<Cell>): boolean => findAllRuns(grid).length > 0;

/**
 * The axis a straight group lies on. Used to orient the `line` special awarded for a
 * run of four. Returns `'h'` for a single-row group, `'v'` otherwise.
 */
export const groupOrientation = (group: MatchGroup): 'h' | 'v' => {
  const first = group.cells[0] as Coord;
  return group.cells.every((c) => c.y === first.y) ? 'h' : 'v';
};

/**
 * Would placing `color` at (x, y) immediately complete a run of three?
 * Used by the spawner to suppress runaway self-clearing boards, and by board
 * generation to guarantee a match-free opening position.
 */
export const wouldFormRun = (
  grid: Grid2D<Cell>,
  x: number,
  y: number,
  color: CrystalColor,
): boolean => {
  const sameAt = (cx: number, cy: number): boolean => matchColorOf(grid.get(cx, cy)) === color;

  // Horizontal: XX_, X_X, _XX around (x, y).
  if (sameAt(x - 1, y) && sameAt(x - 2, y)) return true;
  if (sameAt(x - 1, y) && sameAt(x + 1, y)) return true;
  if (sameAt(x + 1, y) && sameAt(x + 2, y)) return true;
  // Vertical.
  if (sameAt(x, y - 1) && sameAt(x, y - 2)) return true;
  if (sameAt(x, y - 1) && sameAt(x, y + 1)) return true;
  if (sameAt(x, y + 1) && sameAt(x, y + 2)) return true;

  return false;
};
