/**
 * CRYSTALLINE — save/load for the simulated economy.
 *
 * ===========================================================================
 *  THE ONLY MODULE IN `src/economy/` PERMITTED TO NAME `localStorage`.
 *  Everything else takes the {@link Storage} interface below by injection, so
 *  the whole economy is testable with zero DOM.
 *
 *  There is no network here. There is no network anywhere in this subsystem.
 *  A save is a JSON blob on the player's own device and nothing else.
 * ===========================================================================
 *
 * Robustness rules this module guarantees:
 *  1. A missing save yields a fresh save.
 *  2. Corrupt JSON yields a fresh save — it never throws, never bricks the game.
 *  3. A save from an older `version` is migrated forward.
 *  4. A save from a *newer* version (player rolled the build back) is discarded
 *     in favour of a fresh save, because we cannot know its shape.
 *  5. Any individual field that is missing or the wrong type is repaired from
 *     the fresh-save defaults, so a partially-written blob still loads.
 */

import {
  ECONOMY_CONST,
  SAVE_VERSION,
  type BoosterId,
  type Metrics,
  type SaveData,
  type SkuId,
} from './api';
import { dayKey, safeCount, type Clock } from './time';

// ---------------------------------------------------------------------------
// Storage seam
// ---------------------------------------------------------------------------

/**
 * The three methods of `window.localStorage` we actually use. Injecting this
 * (rather than reaching for the global) is what keeps every other economy
 * module DOM-free and unit-testable.
 */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Alias for consumers that would rather not shadow the DOM's `Storage`. */
export type EconomyStorage = Storage;

/** Injectable timer seam, so debounced writes can be driven by a fake clock. */
export interface Timer {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const systemTimer: Timer = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** In-memory `Storage`, used by every test and as the fallback when the DOM is absent. */
export function createMemoryStorage(seed?: Readonly<Record<string, string>>): Storage {
  const map = new Map<string, string>(seed ? Object.entries(seed) : []);
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/**
 * `localStorage`-backed storage. This is the one and only reference to the
 * browser storage global in the entire economy subsystem. If the global is
 * unavailable (SSR, tests, a locked-down browser) we silently fall back to
 * memory rather than throwing.
 */
export function createBrowserStorage(): Storage {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return createMemoryStorage();
    // Probe: Safari private mode throws on write rather than on read.
    const probe = '__crystalline_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
    };
  } catch {
    return createMemoryStorage();
  }
}

// ---------------------------------------------------------------------------
// The persisted shape
// ---------------------------------------------------------------------------

export const SAVE_KEY = 'crystalline.save';

/**
 * Bookkeeping the economy needs but `SaveData` (a frozen contract) has no home
 * for. It rides along as an extra property on the same blob: `PersistedSave` is
 * a structural supertype of `SaveData`, so anything typed `SaveData` still
 * accepts it and `api.ts` stays untouched.
 */
export interface EconomyAux {
  /** Wall-clock of the player's first level failure — gates `bundle.starter`. */
  readonly firstFailAt: number | null;
  readonly levelsFailed: number;
  /** Level completions *and* fails; drives the interstitial cadence. */
  readonly totalPlays: number;
  readonly interstitialsShown: number;
  /** Rewarded-video daily cap bookkeeping. */
  readonly rewardedDay: string;
  readonly rewardedToday: number;
  /** Day the daily stipend was last claimed, or `null` if never. */
  readonly stipendDay: string | null;
  readonly lastSessionAt: number;
}

export interface PersistedSave extends SaveData {
  readonly aux: EconomyAux;
}

const BOOSTER_IDS: readonly BoosterId[] = ['seedPrism', 'extraMoves', 'pickaxe', 'reshuffle'];
const SKU_IDS: readonly SkuId[] = [
  'shards.pocket',
  'shards.hoard',
  'shards.vault',
  'bundle.starter',
  'lives.refill',
  'ads.remove',
];

export function freshMetrics(now: number): Metrics {
  return {
    installedAt: now,
    sessions: 0,
    daysActive: 0,
    retention: { d1: false, d7: false, d30: false },
    levelsAttempted: 0,
    levelsWon: 0,
    totalPlaytimeMs: 0,
    creditsSpent: 0,
    purchases: 0,
    adsWatched: 0,
    arpdau: 0,
    isPayer: false,
    ddaScalar: 0,
  };
}

export function freshAux(now: number): EconomyAux {
  return {
    firstFailAt: null,
    levelsFailed: 0,
    totalPlays: 0,
    interstitialsShown: 0,
    rewardedDay: dayKey(now),
    rewardedToday: 0,
    stipendDay: null,
    lastSessionAt: 0,
  };
}

/** A brand-new player: seeded from `ECONOMY_CONST`, full lives, nothing owned. */
export function freshSave(now: number): PersistedSave {
  return {
    version: SAVE_VERSION,
    wallet: { credits: ECONOMY_CONST.startingCredits, shards: ECONOMY_CONST.startingShards },
    lives: { count: ECONOMY_CONST.maxLives, nextRegenAt: null },
    boosters: {
      seedPrism: ECONOMY_CONST.startingBoosters.seedPrism,
      extraMoves: ECONOMY_CONST.startingBoosters.extraMoves,
      pickaxe: ECONOMY_CONST.startingBoosters.pickaxe,
      reshuffle: ECONOMY_CONST.startingBoosters.reshuffle,
    },
    ownedSkus: [],
    progress: { highestUnlocked: 1, stars: {} },
    metrics: freshMetrics(now),
    settings: { glyphs: false, reducedMotion: false, sfx: true, music: true },
    dda: { scalar: 0, failStreak: 0, history: [] },
    lastSeenDay: dayKey(now),
    aux: freshAux(now),
  };
}

// ---------------------------------------------------------------------------
// Repair / migration
// ---------------------------------------------------------------------------

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

const nullableNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * Migration table. Each entry upgrades a blob from version `k` to `k + 1`.
 * `SAVE_VERSION` is currently 1, so the only historical shape is the
 * pre-versioned `0` blob; the repair pass below handles its gaps. New entries
 * go here as the schema evolves — never a `throw`, always a best effort.
 */
const MIGRATIONS: Readonly<Record<number, (blob: Dict) => Dict>> = {
  // 0 -> 1: pre-versioned blobs. Nothing structural to move; `repair()` fills
  // in every field introduced by v1 from the fresh-save defaults.
  0: (blob) => ({ ...blob, version: 1 }),
};

/** Deep-repair an arbitrary blob into a valid `PersistedSave`. Never throws. */
export function repair(raw: unknown, now: number): PersistedSave {
  const base = freshSave(now);
  if (!isDict(raw)) return base;

  const wallet = isDict(raw['wallet']) ? raw['wallet'] : {};
  const lives = isDict(raw['lives']) ? raw['lives'] : {};
  const boostersRaw = isDict(raw['boosters']) ? raw['boosters'] : {};
  const progress = isDict(raw['progress']) ? raw['progress'] : {};
  const metrics = isDict(raw['metrics']) ? raw['metrics'] : {};
  const retention = isDict(metrics['retention']) ? metrics['retention'] : {};
  const settings = isDict(raw['settings']) ? raw['settings'] : {};
  const dda = isDict(raw['dda']) ? raw['dda'] : {};
  const aux = isDict(raw['aux']) ? raw['aux'] : {};

  const boosters: Record<BoosterId, number> = { ...base.boosters };
  for (const id of BOOSTER_IDS) boosters[id] = safeCount(boostersRaw[id], 0);

  const stars: Record<number, number> = {};
  if (isDict(progress['stars'])) {
    for (const [k, v] of Object.entries(progress['stars'])) {
      const level = Number(k);
      if (Number.isFinite(level)) stars[level] = Math.min(3, safeCount(v, 0));
    }
  }

  const ownedRaw = raw['ownedSkus'];
  const ownedSkus = Array.isArray(ownedRaw)
    ? SKU_IDS.filter((id) => (ownedRaw as unknown[]).includes(id))
    : [];

  const historyRaw = dda['history'];
  const history = Array.isArray(historyRaw)
    ? (historyRaw as unknown[]).filter((h): h is boolean => typeof h === 'boolean')
    : [];

  return {
    version: SAVE_VERSION,
    wallet: {
      credits: safeCount(wallet['credits'], base.wallet.credits),
      shards: safeCount(wallet['shards'], base.wallet.shards),
    },
    lives: {
      count: Math.min(ECONOMY_CONST.maxLives, safeCount(lives['count'], base.lives.count)),
      nextRegenAt: nullableNum(lives['nextRegenAt']),
    },
    boosters,
    ownedSkus,
    progress: {
      highestUnlocked: Math.max(1, safeCount(progress['highestUnlocked'], 1)),
      stars,
    },
    metrics: {
      installedAt: num(metrics['installedAt'], now),
      sessions: safeCount(metrics['sessions'], 0),
      daysActive: safeCount(metrics['daysActive'], 0),
      retention: {
        d1: bool(retention['d1'], false),
        d7: bool(retention['d7'], false),
        d30: bool(retention['d30'], false),
      },
      levelsAttempted: safeCount(metrics['levelsAttempted'], 0),
      levelsWon: safeCount(metrics['levelsWon'], 0),
      totalPlaytimeMs: safeCount(metrics['totalPlaytimeMs'], 0),
      creditsSpent: safeCount(metrics['creditsSpent'], 0),
      purchases: safeCount(metrics['purchases'], 0),
      adsWatched: safeCount(metrics['adsWatched'], 0),
      arpdau: num(metrics['arpdau'], 0),
      isPayer: bool(metrics['isPayer'], false),
      ddaScalar: num(metrics['ddaScalar'], 0),
    },
    settings: {
      glyphs: bool(settings['glyphs'], base.settings.glyphs),
      reducedMotion: bool(settings['reducedMotion'], base.settings.reducedMotion),
      sfx: bool(settings['sfx'], base.settings.sfx),
      music: bool(settings['music'], base.settings.music),
    },
    dda: {
      scalar: num(dda['scalar'], 0),
      failStreak: safeCount(dda['failStreak'], 0),
      history,
    },
    lastSeenDay: str(raw['lastSeenDay'], base.lastSeenDay),
    aux: {
      firstFailAt: nullableNum(aux['firstFailAt']),
      levelsFailed: safeCount(aux['levelsFailed'], 0),
      totalPlays: safeCount(aux['totalPlays'], 0),
      interstitialsShown: safeCount(aux['interstitialsShown'], 0),
      rewardedDay: str(aux['rewardedDay'], base.aux.rewardedDay),
      rewardedToday: safeCount(aux['rewardedToday'], 0),
      stipendDay: typeof aux['stipendDay'] === 'string' ? aux['stipendDay'] : null,
      lastSessionAt: safeCount(aux['lastSessionAt'], 0),
    },
  };
}

/**
 * Parse + migrate + repair. Returns `{ save, recovered }`, where `recovered` is
 * true when the stored blob could not be used as-is (absent, corrupt, or from a
 * future version) and a fresh save was substituted.
 */
export function decodeSave(text: string | null, now: number): { save: PersistedSave; recovered: boolean } {
  if (text === null || text === '') return { save: freshSave(now), recovered: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Corrupt JSON must not brick the game.
    return { save: freshSave(now), recovered: true };
  }

  if (!isDict(parsed)) return { save: freshSave(now), recovered: true };

  const version = typeof parsed['version'] === 'number' ? parsed['version'] : 0;

  // A blob from a *newer* build: we cannot know its shape, so start clean
  // rather than guess and corrupt the player's state further.
  if (version > SAVE_VERSION) return { save: freshSave(now), recovered: true };

  let blob: Dict = parsed;
  try {
    for (let v = Math.max(0, Math.floor(version)); v < SAVE_VERSION; v++) {
      const step = MIGRATIONS[v];
      blob = step ? step(blob) : { ...blob, version: v + 1 };
    }
    return { save: repair(blob, now), recovered: version !== SAVE_VERSION };
  } catch {
    return { save: freshSave(now), recovered: true };
  }
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

export interface SaveStoreOptions {
  readonly storage?: Storage;
  readonly now?: Clock;
  readonly timer?: Timer;
  /** Coalescing window for writes. Play generates a lot of small mutations. */
  readonly debounceMs?: number;
  readonly key?: string;
}

/**
 * Debounced, schema-versioned save store. `save()` coalesces bursts of writes;
 * `flush()` forces the pending write out (call it on session end).
 */
export class SaveStore {
  private readonly storage: Storage;
  private readonly timer: Timer;
  private readonly debounceMs: number;
  private readonly key: string;
  private readonly now: Clock;

  private pending: PersistedSave | null = null;
  private handle: unknown = null;
  /** True when the last `load()` had to fall back to a fresh save. */
  public recovered = false;
  /** Diagnostic counter — how many times the blob actually hit storage. */
  public writes = 0;

  constructor(opts: SaveStoreOptions = {}) {
    this.storage = opts.storage ?? createMemoryStorage();
    this.timer = opts.timer ?? systemTimer;
    this.debounceMs = opts.debounceMs ?? 400;
    this.key = opts.key ?? SAVE_KEY;
    this.now = opts.now ?? (() => Date.now());
  }

  load(): PersistedSave {
    let text: string | null = null;
    try {
      text = this.storage.getItem(this.key);
    } catch {
      text = null;
    }
    const { save, recovered } = decodeSave(text, this.now());
    this.recovered = recovered;
    return save;
  }

  /** Queue a write. Repeated calls inside the debounce window collapse into one. */
  save(data: PersistedSave): void {
    this.pending = data;
    if (this.handle !== null) return;
    if (this.debounceMs <= 0) {
      this.flush();
      return;
    }
    this.handle = this.timer.setTimeout(() => {
      this.handle = null;
      this.flush();
    }, this.debounceMs);
  }

  /** Write immediately, cancelling any queued write. */
  flush(): void {
    if (this.handle !== null) {
      this.timer.clearTimeout(this.handle);
      this.handle = null;
    }
    const data = this.pending;
    this.pending = null;
    if (data === null) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      this.writes++;
    } catch {
      // Quota exceeded or storage disabled. The game keeps running in memory.
    }
  }

  /** Wipe the save. Used by the dashboard's "reset research profile" control. */
  clear(): void {
    if (this.handle !== null) {
      this.timer.clearTimeout(this.handle);
      this.handle = null;
    }
    this.pending = null;
    try {
      this.storage.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}
