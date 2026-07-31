/**
 * CRYSTALLINE — engine event stream.
 *
 * FROZEN CONTRACT. This is the seam between Model and View.
 *
 * The engine resolves a move to completion in microseconds and emits an *ordered*
 * list of events describing what happened. The renderer then choreographs that list
 * over real time at its own pace. The engine never waits for an animation, and the
 * board state is mathematically absolute at every point.
 *
 * Events are plain data and must stay serialisable — a recorded stream is replayable,
 * which is what makes the determinism soak test in tests/ possible.
 */

import type {
  ClearCause,
  Coord,
  CrystalColor,
  LevelStatus,
  MatchShape,
  ObjectiveProgress,
  Piece,
} from './types';

/** One piece falling from `from` to `to`. */
export interface FallMove {
  readonly pieceId: number;
  readonly from: Coord;
  readonly to: Coord;
}

/** A newly generated piece entering from above the top row. */
export interface SpawnRef {
  readonly piece: Piece;
  readonly to: Coord;
  /** Rows above the board it falls from, so the view can stagger entry. */
  readonly fromAbove: number;
}

export type GameEvent =
  // -- player input -------------------------------------------------------
  /** A legal swap was committed. */
  | { readonly t: 'swap'; readonly a: Coord; readonly b: Coord }
  /**
   * An illegal swap. The view plays the elastic rejection animation.
   * No move is consumed — this is deliberate error prevention, not a penalty.
   */
  | {
      readonly t: 'swapRejected';
      readonly a: Coord;
      readonly b: Coord;
      readonly reason: 'notAdjacent' | 'noMatch' | 'immovable' | 'notPlaying';
    }
  | { readonly t: 'movesChanged'; readonly left: number }

  // -- resolution ---------------------------------------------------------
  /**
   * A colour match was detected. `cascadeStep` is 0 for the player's own move and
   * increments for each self-resolving wave after it; the audio layer raises the
   * clear SFX by one semitone per step.
   */
  | {
      readonly t: 'match';
      readonly cells: readonly Coord[];
      readonly color: CrystalColor;
      readonly shape: MatchShape;
      readonly cascadeStep: number;
      readonly points: number;
    }
  /** Cells emptied. Always follows the `match` or trigger event that caused it. */
  | {
      readonly t: 'clear';
      readonly cells: readonly Coord[];
      readonly cause: ClearCause;
      readonly cascadeStep: number;
    }
  | { readonly t: 'spawnSpecial'; readonly at: Coord; readonly piece: Piece }
  | {
      readonly t: 'specialTriggered';
      readonly at: Coord;
      readonly kind: 'line' | 'burst' | 'prism' | 'supernova' | 'core';
      readonly affected: readonly Coord[];
    }
  /** Living Core appeared after a strong cascade. */
  | { readonly t: 'coreSpawned'; readonly at: Coord; readonly piece: Piece }
  /** Living Core claimed (tap or swap). */
  | {
      readonly t: 'coreClaimed';
      readonly at: Coord;
      readonly reward: 'moves' | 'burst' | 'shards';
    }
  | { readonly t: 'crustDamaged'; readonly at: Coord; readonly layersLeft: number }
  | { readonly t: 'shadowSpread'; readonly cells: readonly Coord[] }
  | { readonly t: 'shadowCleared'; readonly cells: readonly Coord[] }
  | { readonly t: 'bombTick'; readonly at: Coord; readonly fuse: number }
  | { readonly t: 'bombExploded'; readonly at: Coord }
  | { readonly t: 'relicCollected'; readonly at: Coord; readonly total: number }

  // -- board motion -------------------------------------------------------
  | { readonly t: 'fall'; readonly moves: readonly FallMove[] }
  | { readonly t: 'spawn'; readonly spawns: readonly SpawnRef[] }
  | {
      readonly t: 'cascadeEnd';
      readonly steps: number;
      readonly totalPoints: number;
    }
  | { readonly t: 'reshuffle'; readonly reason: 'deadlock' }
  /** Sort-inspired edge belt: one playable row shifts after a spent move. */
  | {
      readonly t: 'conveyor';
      readonly row: number;
      readonly direction: 'left' | 'right';
      readonly cells: number;
    }

  // -- session ------------------------------------------------------------
  | { readonly t: 'scoreChanged'; readonly score: number; readonly delta: number }
  | { readonly t: 'objectives'; readonly progress: readonly ObjectiveProgress[] }
  | {
      readonly t: 'levelEnded';
      readonly status: Exclude<LevelStatus, 'playing'>;
      readonly score: number;
      readonly stars: number;
      readonly reason: 'objectivesMet' | 'outOfMoves' | 'bombExpired';
    };

export type GameEventType = GameEvent['t'];

/** Narrowing helper: `if (is(ev, 'match')) { ev.color }`. */
export const is = <K extends GameEventType>(
  ev: GameEvent,
  t: K,
): ev is Extract<GameEvent, { t: K }> => ev.t === t;

/** Sink the engine writes to. The renderer supplies the implementation. */
export type EventSink = (events: readonly GameEvent[]) => void;
