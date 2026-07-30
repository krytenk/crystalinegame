/**
 * CRYSTALLINE — flat-array grid abstraction.
 *
 * PURE MODEL CODE. No DOM, no timers.
 *
 * The board is stored in a flat, one-dimensional array. `Grid2D<T>` is the wrapper
 * that maps (x, y) onto `width * y + x` — see `toIndex` / `fromIndex` in types.ts,
 * which this module reuses rather than re-deriving. Nested arrays are deliberately
 * avoided: the flat layout keeps traversal cache-friendly and serialisation trivial.
 */

import { fromIndex, toIndex, type Coord } from './types';

/** The four orthogonal offsets, in a fixed order so iteration is deterministic. */
export const ORTHOGONAL: readonly Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

export class Grid2D<T> {
  readonly width: number;
  readonly height: number;
  private readonly data: T[];

  /**
   * @param fill invoked once per cell, in flat-index order, to produce the value.
   */
  constructor(width: number, height: number, fill: (index: number, coord: Coord) => T) {
    if (!Number.isInteger(width) || width <= 0) {
      throw new RangeError(`Grid2D: width must be a positive integer, got ${width}`);
    }
    if (!Number.isInteger(height) || height <= 0) {
      throw new RangeError(`Grid2D: height must be a positive integer, got ${height}`);
    }
    this.width = width;
    this.height = height;
    const size = width * height;
    this.data = new Array<T>(size);
    for (let i = 0; i < size; i++) {
      this.data[i] = fill(i, fromIndex(width, i));
    }
  }

  /** Builds a grid from an existing flat array (copied, not aliased). */
  static from<T>(width: number, height: number, values: readonly T[]): Grid2D<T> {
    if (values.length !== width * height) {
      throw new RangeError(
        `Grid2D.from: expected ${width * height} values, got ${values.length}`,
      );
    }
    return new Grid2D<T>(width, height, (i) => values[i] as T);
  }

  /** Number of cells. */
  get size(): number {
    return this.data.length;
  }

  /** Direct read-only view of the backing array. Never mutate this. */
  get raw(): readonly T[] {
    return this.data;
  }

  toIndex(x: number, y: number): number {
    return toIndex(this.width, x, y);
  }

  fromIndex(index: number): Coord {
    return fromIndex(this.width, index);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  inBoundsIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.data.length;
  }

  /** Bounds-checked read. Returns `undefined` when out of bounds. */
  get(x: number, y: number): T | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this.data[this.toIndex(x, y)];
  }

  /** Bounds-checked read that throws rather than returning `undefined`. */
  at(x: number, y: number): T {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`Grid2D.at: (${x}, ${y}) is out of bounds`);
    }
    return this.data[this.toIndex(x, y)] as T;
  }

  atIndex(index: number): T {
    if (!this.inBoundsIndex(index)) {
      throw new RangeError(`Grid2D.atIndex: ${index} is out of bounds`);
    }
    return this.data[index] as T;
  }

  /** Bounds-checked write. Throws when out of bounds. */
  set(x: number, y: number, value: T): void {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`Grid2D.set: (${x}, ${y}) is out of bounds`);
    }
    this.data[this.toIndex(x, y)] = value;
  }

  setIndex(index: number, value: T): void {
    if (!this.inBoundsIndex(index)) {
      throw new RangeError(`Grid2D.setIndex: ${index} is out of bounds`);
    }
    this.data[index] = value;
  }

  /** In-bounds orthogonal neighbours, in ORTHOGONAL order (N, E, S, W). */
  neighbors4(x: number, y: number): Coord[] {
    const out: Coord[] = [];
    for (const d of ORTHOGONAL) {
      const nx = x + d.x;
      const ny = y + d.y;
      if (this.inBounds(nx, ny)) out.push({ x: nx, y: ny });
    }
    return out;
  }

  /** Visits every cell in flat-index order. */
  forEach(fn: (value: T, coord: Coord, index: number) => void): void {
    for (let i = 0; i < this.data.length; i++) {
      fn(this.data[i] as T, this.fromIndex(i), i);
    }
  }

  map<U>(fn: (value: T, coord: Coord, index: number) => U): Grid2D<U> {
    return new Grid2D<U>(this.width, this.height, (i, c) => fn(this.data[i] as T, c, i));
  }

  /**
   * Copies the grid. Values are shared by reference unless `copy` is supplied —
   * pass a copier when the element type is mutable (as `Cell` is).
   */
  clone(copy?: (value: T) => T): Grid2D<T> {
    return new Grid2D<T>(this.width, this.height, (i) => {
      const v = this.data[i] as T;
      return copy ? copy(v) : v;
    });
  }
}

/** Manhattan distance between two coordinates. */
export const manhattan = (a: Coord, b: Coord): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Coordinate equality. */
export const coordEq = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

/** Stable sort key so emitted coordinate lists are deterministic. */
export const compareCoords = (a: Coord, b: Coord): number =>
  a.y === b.y ? a.x - b.x : a.y - b.y;

/** Sorts a coordinate list top-to-bottom, left-to-right, in place. */
export const sortCoords = (coords: Coord[]): Coord[] => coords.sort(compareCoords);
