/**
 * Bootstrap + top-level state machine.
 * Product skin: Crystalline (default) or Lantern Harbor via theme pack.
 *
 * Free Play build: shop spends soft/premium currency (no real IAP until Billing).
 * Opt-in free gifts use a short in-app timer — no ad SDK, no YouTube Shorts.
 */

import { createSession, type Session } from '@engine/board';
import { computeDda } from '@engine/dda';
import type { Coord, ObjectiveKind } from '@engine/types';
import type { GameEvent } from '@engine/events';
import { installPowerCopy, type PowerKind } from '@engine/specials';
import {
  ECONOMY_CONST,
  Economy,
  installAlbumTheme,
  installMetaTheme,
  getMetaStages,
  getMetaUpgrades,
  getAlbumCards,
  getAlbumSheet,
  createBrowserStorage,
  type BoosterId,
  type MetaUpgrade,
} from '@economy/index';
import { installEventTheme } from '@economy/hybridEvent';
import { AudioDirector } from '@audio/audio';
import { haptic, hapticCascade, hapticMatchTier, unlockHaptics } from '@audio/haptics';
import { Atlas } from '@render/atlas';
import { drawGameBackground, loadBackground } from '@render/background';
import { CanvasView } from '@render/canvas';
import { BoardAnimator } from '@render/boardAnimator';
import { BoardView, setCoreSheetPath } from '@render/boardView';
import { assetUrl } from '@render/assetUrl';
import { JuiceSystem } from '@render/juice';
import { SandWordmark } from '@render/sandWordmark';
import { tierFromMatch, VfxPlayer } from '@render/vfx';
import { findLegalHint } from '@engine/deadlock';
import {
  AHA_SWAP_B,
  findFireHint,
  seedFirstLightAha,
  type TutorialPhase,
} from '@engine/tutorial';
import { getLevel, isBossLevel, LEVEL_COUNT, LEVELS } from './levels';
import {
  COMPANION,
  companionLine,
  dealGeodeSlots,
  installCompanion,
  type CompanionBeat,
} from './narrative/companion';
import { applyThemeCssVars, injectStyles } from './ui/styles';
import { btn, clear, el, setUiTapHook } from './ui/dom';
import { resolveThemeId, setTheme, theme, themeUi } from './themes';

// --- Theme boot (must run before Economy / save load) ---
const activeTheme = setTheme(resolveThemeId());
installMetaTheme(activeTheme.metaStages, activeTheme.metaUpgrades);
installAlbumTheme(activeTheme.albumSheet, activeTheme.albumCards);
installEventTheme(activeTheme.event);
installPowerCopy(activeTheme.powerNames, activeTheme.comboLabels);
installCompanion(
  {
    id: activeTheme.companion.id,
    name: activeTheme.companion.name,
    role: activeTheme.companion.role,
    art: activeTheme.companion.art,
  },
  activeTheme.companion.lines,
);
if (typeof document !== 'undefined') {
  document.title = activeTheme.productName;
}

type Screen =
  | 'boot'
  | 'title'
  | 'map'
  | 'prelevel'
  | 'play'
  | 'results'
  | 'continue'
  | 'cavern'
  | 'store'
  | 'lives'
  | 'ad'
  | 'settings'
  | 'dashboard'
  | 'album'
  | 'event';

interface AppState {
  screen: Screen;
  levelId: number;
  session: Session | null;
  lastResult: { status: 'won' | 'lost'; score: number; stars: number } | null;
  adPlacement: 'rewardedLife' | 'rewardedBooster' | 'rewardedContinue' | 'interstitial' | null;
  adReturn: Screen;
  /** Reserved (no video creative in free-gift flow). */
  adVideoId: string | null;
  pendingContinue: boolean;
  /** One continue offer per attempt (loss-aversion lever, research). */
  continueUsed: boolean;
  moveTimes: number[];
  lastMoveAt: number;
  /** Pre-level booster toggles (consumed on Play). */
  prep: { seedPrism: boolean; extraMoves: boolean };
  /** In-level pickaxe targeting mode. */
  pickaxeMode: boolean;
  /** Tutorial hints (forge then fire). */
  ahaHint: { a: Coord; b: Coord } | null;
  ahaPhase: TutorialPhase;
  ahaDone: boolean;
  titleBorn: number;
  /** In-level pause (blocks input; session frozen until resume). */
  paused: boolean;
  /** After a win, offer the Geode Warden crack micro-beat once. */
  pendingGeode: boolean;
  /** Soft comfort / ethical auto-hint (not tutorial). */
  softHint: { a: Coord; b: Coord } | null;
  /** Last player input during play (ms) for idle auto-hint. */
  lastInputAt: number;
  /** Comfort Tools: one free reshuffle this level when inventory empty. */
  comfortReshuffleUsed: boolean;
  /** Last cavern prop id placed — pulse on vista after ceremony. */
  lastPlacedId: string | null;
  /**
   * Boot plate phase: studio brand wipe → product load.
   * Departure Bay Digital identity without drowning the title screen.
   */
  bootPhase: 'studio' | 'product';
  /** Wins this session — used for occasional soft studio watermark. */
  sessionWins: number;
  /** Soft brand toast already shown this session. */
  brandNudgeShown: boolean;
  /**
   * Levels map: null = harbor/place overview (retention home).
   * number = index into theme().mapChapters (inside a pier / place walk).
   */
  mapChapterIndex: number | null;
  /** Fire Outer Channels / Under-Crown unlock ceremony once after L150. */
  pendingActIcCeremony: boolean;
  /** Peak specials fired this level (Super Chest / Living Geode) — win recap. */
  levelPeakSpecials: number;
}

const AHA_KEY = activeTheme.ahaKey;

const app: AppState = {
  screen: 'boot',
  levelId: 1,
  session: null,
  lastResult: null,
  adPlacement: null,
  adReturn: 'map',
  adVideoId: null,
  pendingContinue: false,
  continueUsed: false,
  moveTimes: [],
  lastMoveAt: 0,
  prep: { seedPrism: false, extraMoves: false },
  pickaxeMode: false,
  ahaHint: null,
  ahaPhase: 'done',
  ahaDone: typeof localStorage !== 'undefined' && localStorage.getItem(AHA_KEY) === '1',
  titleBorn: 0,
  paused: false,
  pendingGeode: false,
  softHint: null,
  lastInputAt: 0,
  comfortReshuffleUsed: false,
  lastPlacedId: null,
  bootPhase: 'studio',
  sessionWins: 0,
  brandNudgeShown: false,
  mapChapterIndex: null,
  pendingActIcCeremony: false,
  levelPeakSpecials: 0,
};

/** Studio identity — commercial product, not a freebie clone. */
const STUDIO = {
  name: 'Departure Bay Digital',
  short: 'DBD',
  url: 'https://departurebaydigital.ca',
  tagline: 'A Departure Bay Digital title',
  license: 'Licensed product · © Departure Bay Digital',
} as const;

const L = (key: string, fallback = ''): string => theme().labels[key] ?? fallback;

const powerLabel = (kind: string): string => {
  if (kind === 'core') return L('livingCore', 'Living Core');
  const names = theme().powerNames;
  if (kind === 'line' || kind === 'burst' || kind === 'prism' || kind === 'supernova') {
    return names[kind as PowerKind] ?? L('powerCrystal', 'Power Crystal');
  }
  return L('powerCrystal', 'Power Crystal');
};

const economy = new Economy({
  storage: createBrowserStorage(),
  saveDebounceMs: 100,
  saveKey: activeTheme.saveKey,
});
const audio = new AudioDirector();
const atlas = new Atlas();
const vfx = new VfxPlayer();
const juice = new JuiceSystem();
const canvasView = new CanvasView();
const boardView = new BoardView();
const boardAnim = new BoardAnimator();

let root: HTMLElement;
let overlay: HTMLElement;
let canvas: HTMLCanvasElement;
/** Camera shake remaining (ms) for big match rewards. */
let shakeMs = 0;
let shakeMag = 0;
let lastFrame = performance.now();
let titleFxAt = 0;
/** Harbor sand wordmark instance (title only; dispose on leave). */
let titleSand: SandWordmark | null = null;
/** In-play HUD score pulse when points land (Pass 8). */
let hudScoreShown = 0;
let hudScorePulseUntil = 0;
let hudMovesPulseUntil = 0;
let hudLastMoves = -1;

interface Toast {
  text: string;
  born: number;
  life: number;
  color: string;
}
const toasts: Toast[] = [];

const OBJECTIVE_LABEL: Record<ObjectiveKind, string> = {
  score: 'Score',
  crust: 'Break crust',
  collect: 'Drop artifacts',
  defuse: 'Defuse bombs',
  contain: 'Clear shadow',
};

/** Goal icons — always via themeUi so Harbor never loads mine art. */
function objectiveIconPath(kind: ObjectiveKind): string {
  return themeUi(`ui/goals/${kind}.webp`);
}

const goalHudImgs: Partial<Record<string, HTMLImageElement>> = {};

function ensureGoalHudImg(kind: ObjectiveKind): HTMLImageElement {
  const path = objectiveIconPath(kind);
  const key = `${theme().id}:${kind}`;
  let img = goalHudImgs[key];
  if (img) return img;
  img = new Image();
  img.decoding = 'async';
  img.src = assetUrl(path);
  goalHudImgs[key] = img;
  return img;
}

function pushToast(text: string, color = '#ffe9a8', life = 1600): void {
  toasts.push({ text, born: performance.now(), life, color });
  if (toasts.length > 4) toasts.shift();
}

// ---------------------------------------------------------------------------
// Soft-currency (essence / geode) — real art instead of ✧ / ◆ pips
// ---------------------------------------------------------------------------

type EssIconSize = 'xs' | 'sm' | 'md';

/** Living geode thumbnail used next to essence amounts. */
function essIcon(size: EssIconSize = 'sm'): HTMLImageElement {
  const img = el('img', {
    class: `ess-icon ess-icon-${size}`,
    src: assetUrl(theme().bonusCrackArt),
    alt: '',
    decoding: 'async',
    draggable: 'false',
  }) as HTMLImageElement;
  img.onerror = () => {
    img.replaceWith(
      el('span', { class: `ess-icon-fallback ess-icon-${size}` }, [theme().softCurrencyGlyph]),
    );
  };
  return img;
}

/**
 * Inline amount chip: [geode] 246  or  [geode] +35
 * Use inside labels, buttons, chips, and progress rows.
 */
function essFig(
  amount: number | string,
  opts: { sign?: boolean; suffix?: string; size?: EssIconSize } = {},
): HTMLElement {
  const n =
    typeof amount === 'number'
      ? opts.sign && amount > 0
        ? `+${amount}`
        : String(amount)
      : amount;
  return el('span', { class: 'ess-fig' }, [
    essIcon(opts.size ?? 'sm'),
    el('span', { class: 'ess-fig-n' }, [opts.suffix ? `${n}${opts.suffix}` : n]),
  ]);
}

/** Mixed label with optional leading/trailing text around a geode figure. */
function essLine(
  before: string,
  amount: number | string,
  after = '',
  opts: { sign?: boolean; size?: EssIconSize } = {},
): HTMLElement {
  return el('span', { class: 'ess-line' }, [
    before ? document.createTextNode(before) : '',
    essFig(amount, opts),
    after ? document.createTextNode(after) : '',
  ].filter((c) => c !== '') as (Node | string)[]);
}

/** Canvas HUD: cached geode sprite for the essence chip. */
let essHudImg: HTMLImageElement | null = null;
function ensureEssHudImg(): HTMLImageElement {
  if (essHudImg) return essHudImg;
  const img = new Image();
  img.decoding = 'async';
  img.src = assetUrl(theme().bonusCrackArt);
  essHudImg = img;
  return img;
}

function mount(): void {
  injectStyles();
  setCoreSheetPath(assetUrl(theme().livingCorePath));
  loadBackground(theme().bgPath);
  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('#app missing');
  clear(appEl);
  // Shell backdrop: Harbor docks art (never mine cavern on Harbor)
  applyThemeCssVars(theme().cssVars, {
    bgImage: theme().id === 'harbor' ? theme().bgPath : undefined,
  });

  root = el('div', { id: 'game-root' });
  canvas = el('canvas') as HTMLCanvasElement;
  overlay = el('div', { class: 'overlay', id: 'overlay' });
  root.append(canvas, overlay);
  appEl.append(root);

  canvasView.mount(canvas);
  bindInput();
  economy.startSession();
  economy.ensureStarterBoosters();
  const bootSettings = economy.getSnapshot().settings;
  audio.setTheme(theme().id);
  audio.setEnabled(bootSettings.sfx);
  audio.setMusic(bootSettings.music && bootSettings.sfx);
  boardView.glyphs = bootSettings.glyphs;
  boardView.highContrast = bootSettings.highContrast;
  // Peak board fantasy: Harbor Super Chest (+ peek) vs mine Living Geode
  boardView.peakFantasy = theme().id === 'harbor' ? 'superchest' : 'supernova';
  // Harbor feast body — octopus_chest mascot sprite (see SUPER_CHEST_OCTO.md)
  if (theme().id === 'harbor') {
    juice.setKrakenBodySrc(assetUrl('themes/harbor/gen/octopus_chest_128.webp'));
  } else {
    juice.setKrakenBodySrc('');
  }

  setUiTapHook(() => {
    audio.uiTap();
    haptic('tap');
  });
  // Prefetch living-geode icon for HUD chips + DOM essence figures
  ensureEssHudImg();

  // Boot: studio plate wipe → product load while atlas loads
  app.screen = 'boot';
  app.bootPhase = 'studio';
  renderOverlay();

  // Studio identity wipe (~1.1s), then product splash
  window.setTimeout(() => {
    if (app.screen !== 'boot') return;
    app.bootPhase = 'product';
    audio.panelWhoosh();
    renderOverlay();
  }, 1100);

  void atlas.load(theme().genManifestPath).then(async () => {
    try {
      await vfx.load(atlas.vfx);
    } catch {
      // Procedural fallback bursts still work.
    }
    // Hold product splash so brand + load bar read as intentional
    const minProductMs = 900;
    const started = performance.now();
    const goTitle = () => {
      app.screen = 'title';
      app.titleBorn = performance.now();
      titleFxAt = app.titleBorn + 400;
      audio.panelWhoosh();
      renderOverlay();
    };
    const wait = Math.max(0, minProductMs - (performance.now() - started));
    // Don't cut the studio plate short if atlas is instant
    const afterStudio = Math.max(wait, app.bootPhase === 'studio' ? 400 : 0);
    window.setTimeout(goTitle, afterStudio);
  });

  loop();
}

function loop(): void {
  requestAnimationFrame(loop);
  const ctx = canvasView.beginFrame();
  if (!ctx) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  const frozen = juice.frozen;
  if (!frozen) juice.update(dt);

  drawGameBackground(ctx, canvasView.logicalWidth, canvasView.logicalHeight, now);

  // Screen shake for strategic power rewards.
  ctx.save();
  if (!frozen && shakeMs > 0) {
    shakeMs = Math.max(0, shakeMs - 16);
    const falloff = shakeMs / 280;
    const m = shakeMag * falloff;
    ctx.translate((Math.random() - 0.5) * m * 2, (Math.random() - 0.5) * m * 2);
  }

  if (app.screen === 'title') {
    drawTitleCanvas(ctx, now);
  } else {
    drawChrome(ctx, now);
  }

  if (app.screen === 'play' && app.session) {
    const snap = app.session.snapshot();
    boardView.relayout(snap.width, snap.height);
    boardAnim.setLayout(boardView.layout);
    boardView.shimmer = juice.boardShimmer;
    if (!frozen && !app.paused) boardAnim.update(now);
    boardView.draw(ctx, snap, atlas, canvasView.dprBucket, now, boardAnim);
    const { originX, originY, cell } = boardView.layout;
    const bw = cell * snap.width;
    const bh = cell * snap.height;
    if (!app.paused) {
      tickSoftHint(now);
      // Dust only over the playable footprint (skip empty hole cells)
      drawBoardDust(ctx, originX, originY, bw, bh, now, snap);
      drawAhaHint(ctx, now);
      drawSoftHint(ctx, now);
    } else {
      // Dim only playable tiles while paused (not the full rect)
      ctx.fillStyle = 'rgba(6, 4, 16, 0.4)';
      for (let y = 0; y < snap.height; y++) {
        for (let x = 0; x < snap.width; x++) {
          if (!snap.cells[y * snap.width + x]?.playable) continue;
          ctx.fillRect(originX + x * cell, originY + y * cell, cell, cell);
        }
      }
    }
  }

  if (!frozen) vfx.draw(ctx, now, canvasView.logicalWidth, canvasView.logicalHeight);
  else vfx.draw(ctx, Math.min(now, juice.hitStopUntil), canvasView.logicalWidth, canvasView.logicalHeight);

  juice.draw(ctx, now, canvasView.logicalWidth, canvasView.logicalHeight);
  drawToasts(ctx, now);

  ctx.restore();
  canvasView.endFrame();
}

/** Cold-open spectacle behind the title overlay. */
function drawTitleCanvas(ctx: CanvasRenderingContext2D, now: number): void {
  const w = canvasView.logicalWidth;
  const h = canvasView.logicalHeight;
  const age = now - (app.titleBorn || now);
  const reduce = economy.getSnapshot().settings.reducedMotion;

  // Periodic supernova pulse for "wow" while they watch
  if (now >= titleFxAt) {
    vfx.play(6, w / 2, h * 0.38, 420);
    juice.burst(w / 2, h * 0.38, '#e0c0ff', 28);
    juice.burst(w / 2, h * 0.38, '#7ed0ff', 18);
    if (!reduce) {
      juice.ring(w / 2, h * 0.38, '#ffd24a', 140, 700);
      juice.ring(w / 2, h * 0.38, '#7ed0ff', 90, 520);
    }
    titleFxAt = now + 2800 + Math.random() * 1200;
  }

  // Ambient sparkles + floating gem motes
  drawAmbientSparkles(ctx, w, h, now, reduce ? 8 : 22);
  if (!reduce) {
    for (let i = 0; i < 6; i++) {
      const seed = i * 51.3;
      const x = w * (0.12 + 0.76 * ((Math.sin(seed) * 0.5 + 0.5 + now * 0.00004 * (i + 1)) % 1));
      const y = h * (0.12 + 0.45 * (0.5 + 0.5 * Math.sin(now * 0.0011 + seed)));
      const rot = now * 0.001 + seed;
      const a = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(now * 0.003 + seed));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 2 === 0 ? '#7ed0ff' : '#ffd24a';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Soft title on canvas (DOM carries the CTA) — sit higher so the title panel has room
  const pulse = reduce ? 1 : 0.92 + 0.08 * Math.sin(age * 0.004);
  ctx.save();
  ctx.translate(w / 2, h * 0.22);
  ctx.scale(pulse, pulse);
  ctx.textAlign = 'center';
  ctx.font = '700 64px "DragonBlaze", "DragonWarrior", "GalacticKnights", "Cinzel", serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(30, 16, 60, 0.85)';
  const titleWord = theme().productName.toUpperCase();
  ctx.strokeText(titleWord, 0, 0);
  ctx.fillStyle = '#fff6e8';
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = 28;
  ctx.fillText(titleWord, 0, 0);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '700 17px "ScreenTechno", "Nunito", sans-serif';
  ctx.fillStyle = 'rgba(220,210,255,0.8)';
  ctx.shadowBlur = 0;
  ctx.fillText(
    theme().id === 'harbor' ? 'Sort · Signal · Cascade · Restore' : 'Match · Forge · Cascade · Build',
    w / 2,
    h * 0.30,
  );
}

/** Slow floating sparkles for title / idle ambience. */
function drawAmbientSparkles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 97.13;
    const x = ((Math.sin(seed) * 0.5 + 0.5) * w * 0.9 + w * 0.05 + now * 0.008 * ((i % 5) + 1)) % w;
    const y =
      (Math.cos(seed * 1.3) * 0.5 + 0.5) * h * 0.7 +
      h * 0.1 +
      Math.sin(now * 0.001 + seed) * 20;
    const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.003 + seed));
    const r = 1.2 + (i % 4);
    ctx.fillStyle = `rgba(200, 230, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Gentle dust over playable tiles only — skips hole cells outside the shape. */
function drawBoardDust(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  bw: number,
  bh: number,
  now: number,
  snap?: { width: number; height: number; cells: readonly { playable: boolean }[] },
): void {
  ctx.save();
  // Clip to playable cells when we have a snapshot
  if (snap) {
    const cell = boardView.layout.cell;
    ctx.beginPath();
    for (let y = 0; y < snap.height; y++) {
      for (let x = 0; x < snap.width; x++) {
        if (!snap.cells[y * snap.width + x]?.playable) continue;
        const px = ox + x * cell;
        const py = oy + y * cell;
        ctx.rect(px, py, cell, cell);
      }
    }
    ctx.clip();
  }
  for (let i = 0; i < 14; i++) {
    const seed = i * 41.7;
    const x = ox + (Math.sin(seed + now * 0.0003) * 0.5 + 0.5) * bw;
    const y = oy + ((i / 14) * bh + ((now * 0.012 * (0.5 + (i % 3))) % bh));
    const a = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(now * 0.004 + seed));
    ctx.fillStyle = `rgba(180, 210, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAhaHint(ctx: CanvasRenderingContext2D, now: number): void {
  if (!app.ahaHint || app.ahaPhase === 'done') return;
  const { originX, originY, cell } = boardView.layout;
  const pulse = 0.55 + 0.45 * Math.sin(now * 0.008);
  const forge = app.ahaPhase === 'forge';
  const label = forge ? 'SWAP TO FORGE' : 'SWAP TO FIRE';
  const tip = forge ? 'Match 4 in a line' : 'Swap the power into a gem';
  const color = forge
    ? `rgba(255, 220, 90, ${0.55 + pulse * 0.45})`
    : `rgba(120, 255, 200, ${0.55 + pulse * 0.45})`;
  const glow = forge ? '#ffe87a' : '#7dffc0';

  for (const c of [app.ahaHint.a, app.ahaHint.b]) {
    const cx = originX + c.x * cell + cell / 2;
    const cy = originY + c.y * cell + cell / 2;
    ctx.save();
    // Soft fill pulse under gem
    const g = ctx.createRadialGradient(cx, cy, cell * 0.1, cx, cy, cell * 0.55);
    g.addColorStop(0, forge ? `rgba(255, 220, 80, ${0.25 + pulse * 0.2})` : `rgba(80, 255, 180, ${0.22 + pulse * 0.2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5 + pulse * 2;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
    roundRectPath(ctx, cx - cell * 0.42, cy - cell * 0.42, cell * 0.84, cell * 0.84, 14);
    ctx.stroke();
    ctx.restore();
  }
  const a = app.ahaHint.a;
  const b = app.ahaHint.b;
  const x0 = originX + a.x * cell + cell / 2;
  const y0 = originY + a.y * cell + cell / 2;
  const x1 = originX + b.x * cell + cell / 2;
  const y1 = originY + b.y * cell + cell / 2;
  const mx = (x0 + x1) / 2;
  const my = Math.min(y0, y1) - cell * 0.72;

  // Connector
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -now * 0.02;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  // Arrow head
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 12 * Math.cos(ang - 0.4), y1 - 12 * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - 12 * Math.cos(ang + 0.4), y1 - 12 * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  // Studio callout pill
  const pillW = 220;
  const pillH = 52;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(18, 12, 36, 0.94)';
  roundRectPath(ctx, mx - pillW / 2, my - pillH / 2, pillW, pillH, 16);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 0;
  roundRectPath(ctx, mx - pillW / 2, my - pillH / 2, pillW, pillH, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px "ScreenTechno", "Nunito", sans-serif';
  ctx.fillStyle = '#fff6e8';
  ctx.fillText(label, mx, my - 8);
  ctx.font = '700 12px "Nunito", sans-serif';
  ctx.fillStyle = 'rgba(200, 190, 230, 0.9)';
  ctx.fillText(tip, mx, my + 12);
  ctx.restore();
}

function drawChrome(ctx: CanvasRenderingContext2D, now: number): void {
  const snap = economy.getSnapshot();
  const isHarbor = theme().id === 'harbor';
  const title = isHarbor
    ? '"Tidepop", "Fredoka", "ScreenTechno", system-ui, sans-serif'
    : '"DragonBlaze", "DragonWarrior", "GalacticKnights", "Cinzel", serif';
  // Numbers MUST use a full digit face — never Tidepop alone (crude glyphs / missing marks).
  const body = isHarbor
    ? '"Fredoka", "ScreenTechno", "Segoe UI", system-ui, sans-serif'
    : '"Nunito", "Segoe UI", system-ui, sans-serif';
  const reduceMotion = snap.settings.reducedMotion;
  const hudWord = theme().productName.toUpperCase();

  if (app.screen === 'play' && app.session) {
    // In-dive HUD: only what changes the next tap (moves, goals, score, lives).
    // No product wordmark, no Tideglass/shards frames — those live on map / docks.
    const s = app.session.snapshot();
    const movesHot = s.movesLeft <= 5;
    const bossDive = isBossLevel(app.levelId);
    if (s.movesLeft !== hudLastMoves) {
      if (s.movesLeft < hudLastMoves && movesHot) hudMovesPulseUntil = now + 520;
      hudLastMoves = s.movesLeft;
    }
    if (s.score > hudScoreShown) {
      hudScorePulseUntil = now + 420;
      hudScoreShown = s.score;
    }

    // Dense top band: optical scale for lives/goals without growing PLAY_HUD_TOP
    const uiFace = '"ScreenTechno", "Fredoka", "Segoe UI", system-ui, sans-serif';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `700 14px ${uiFace}`;
    ctx.fillStyle = 'rgba(255,246,232,0.55)';
    ctx.fillText(`Lv ${app.levelId}`, 360, 22);
    if (bossDive) {
      const bw = 54;
      const bx = 360 - bw / 2;
      const by = 28;
      ctx.fillStyle = 'rgba(180, 30, 55, 0.92)';
      roundPill(ctx, bx, by, bw, 17);
      ctx.strokeStyle = 'rgba(255, 160, 140, 0.75)';
      ctx.lineWidth = 1.5;
      roundPill(ctx, bx, by, bw, 17);
      ctx.stroke();
      ctx.font = `700 11px ${uiFace}`;
      ctx.fillStyle = '#fff6e8';
      ctx.fillText('BOSS', 360, by + 12);
    }
    ctx.restore();

    // Lives — slightly larger (optical), same band
    drawFreeIconValue(
      ctx,
      16,
      16,
      themeUi('ui/icon_lives.webp'),
      String(snap.lives.count),
      '#ff7a8a',
      body,
      { icon: 28, fontPx: 18 },
    );

    // Moves (critical) · Score — compact so goals can sit lower in the same shelf
    const movesPulse = !reduceMotion && now < hudMovesPulseUntil;
    const scorePulse = !reduceMotion && now < hudScorePulseUntil;
    drawFloatStat(
      ctx,
      16,
      52,
      'MOVES',
      String(s.movesLeft),
      movesHot ? '#ff6a7a' : '#7ed0ff',
      body,
      movesPulse ? 1.1 : 1,
    );
    drawFloatStat(
      ctx,
      560,
      52,
      'SCORE',
      s.score.toLocaleString('en-US'),
      '#ffd24a',
      body,
      scorePulse ? 1.08 : 1,
      true,
    );

    if (movesHot && !reduceMotion) {
      const pulse = 0.2 + 0.15 * (0.5 + 0.5 * Math.sin(now * 0.012));
      ctx.save();
      ctx.strokeStyle = `rgba(255, 80, 100, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(56, 72, 24 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (app.pickaxeMode) {
      ctx.fillStyle = '#ffd679';
      ctx.font = `700 14px ${body}`;
      ctx.textAlign = 'center';
      ctx.fillText('Tap a gem', 360, 112);
      ctx.textAlign = 'left';
    } else {
      // Goals — ~52px optical (auto-shrinks when many goals); y packed under boss row
      drawObjectiveHud(ctx, s.objectives, 160, 38, body, now, reduceMotion);
    }
  } else {
    // Meta screens: compact wallet bar (still a light panel for non-play)
    ctx.fillStyle = 'rgba(12, 8, 28, 0.72)';
    roundRectPath(ctx, 12, 10, 696, 120, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.4)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, 12, 10, 696, 120, 20);
    ctx.stroke();

    ctx.font = `700 28px ${title}`;
    ctx.textAlign = 'left';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(30, 16, 60, 0.9)';
    ctx.strokeText(hudWord, 32, 46);
    ctx.fillStyle = '#fff6e8';
    ctx.fillText(hudWord, 32, 46);

    drawIconChip(ctx, 32, 62, themeUi('ui/icon_lives.webp'), String(snap.lives.count), '#ff7a8a', body, 96);
    drawIconChip(ctx, 140, 62, themeUi('ui/icon_shards.webp'), String(snap.wallet.shards), '#7ecbff', body, 108);
    drawEssChip(ctx, 260, 62, snap.meta.essence, '#ffd24a', body, 124);
    ctx.fillStyle = '#c4b6d8';
    ctx.font = `800 13px ${body}`;
    ctx.fillText(
      theme().id === 'harbor' ? 'Sort · Signal · Cascade · Restore' : 'Match · Forge · Cascade · Build',
      400,
      84,
    );
    hudScoreShown = 0;
    hudLastMoves = -1;
  }
  void now;
}

/** Lightweight free-floating label+value (no framed badge box). */
function drawFloatStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string,
  font: string,
  scale = 1,
  rightAlign = false,
): void {
  ctx.save();
  if (scale !== 1) {
    ctx.translate(x + 40, y + 16);
    ctx.scale(scale, scale);
    ctx.translate(-(x + 40), -(y + 16));
  }
  ctx.textAlign = rightAlign ? 'right' : 'left';
  const tx = rightAlign ? x + 100 : x;
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.font = `700 10px ${font}`;
  ctx.fillText(label, tx, y);
  ctx.fillStyle = color;
  ctx.font = `700 22px ${font}`;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3;
  ctx.fillText(value, tx, y + 22);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** Icon + value with no pill frame (play HUD). */
function drawFreeIconValue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  iconPath: string,
  value: string,
  accent: string,
  font: string,
  opts: { icon?: number; fontPx?: number } = {},
): void {
  const img = ensureHudIcon(iconPath);
  const icon = opts.icon ?? 28;
  const fontPx = opts.fontPx ?? 18;
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, icon, icon);
  }
  // Soft contact shadow only — reads larger without a frame
  ctx.fillStyle = accent;
  ctx.font = `700 ${fontPx}px ${font}`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3;
  ctx.fillText(value, x + icon + 6, y + Math.floor(icon * 0.68));
  ctx.shadowBlur = 0;
}

/**
 * In-level goals as free-floating icons (no boxes).
 * Optical ~52px when 1–2 goals; auto-shrinks for 3–4 so multi-boss stays clean.
 */
function drawObjectiveHud(
  ctx: CanvasRenderingContext2D,
  objectives: readonly { kind: ObjectiveKind; current: number; target: number }[],
  x0: number,
  y0: number,
  font: string,
  now: number,
  reduceMotion: boolean,
): void {
  const n = Math.max(1, objectives.length);
  // 1–2 goals: 52px · 3: 50 · 4+: 46 — stay inside the fixed HUD shelf
  const icon = n <= 2 ? 52 : n === 3 ? 50 : 46;
  const slot = Math.min(88, Math.floor(400 / n));
  const totalW = slot * n;
  let x = 360 - totalW / 2;
  for (const o of objectives) {
    const done = o.current >= o.target;
    const accent = done ? '#4dde8a' : '#e8f4ff';
    const img = ensureGoalHudImg(o.kind);
    const ix = x + Math.floor((slot - icon) / 2);
    const iy = y0;

    // Soft glow only — no framed goal boxes
    const pulse = done && !reduceMotion ? 0.65 + 0.2 * Math.sin(now * 0.008) : 0.45;
    const glow = ctx.createRadialGradient(
      ix + icon / 2,
      iy + icon / 2,
      2,
      ix + icon / 2,
      iy + icon / 2,
      icon * 0.72,
    );
    glow.addColorStop(0, done ? `rgba(80, 220, 140, ${0.38 * pulse})` : `rgba(255, 210, 100, ${0.26 * pulse})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ix + icon / 2, iy + icon / 2, icon * 0.72, 0, Math.PI * 2);
    ctx.fill();

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, ix, iy, icon, icon);
    }

    ctx.textAlign = 'center';
    ctx.font = `700 16px ${font}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10, 6, 24, 0.85)';
    const tx = x + slot / 2;
    const ty = iy + icon + 17;
    if (done) {
      const check = ensureHudIcon(themeUi('ui/icon_check.webp'));
      if (check.complete && check.naturalWidth > 0) {
        ctx.drawImage(check, tx - 11, ty - 15, 22, 22);
      } else {
        ctx.fillStyle = accent;
        ctx.fillText('OK', tx, ty);
      }
    } else {
      const label = `${o.current}/${o.target}`;
      ctx.strokeText(label, tx, ty);
      ctx.fillStyle = accent;
      ctx.fillText(label, tx, ty);
    }

    x += slot;
  }
  ctx.textAlign = 'left';
  void x0;
}

const hudIconCache = new Map<string, HTMLImageElement>();

function ensureHudIcon(path: string): HTMLImageElement {
  let img = hudIconCache.get(path);
  if (img) return img;
  img = new Image();
  img.decoding = 'async';
  img.src = assetUrl(path);
  hudIconCache.set(path, img);
  return img;
}

/** HUD chip with a real icon image + number (replaces ♥ / ◆ text). */
function drawIconChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  iconPath: string,
  value: string,
  accent: string,
  font = '"Nunito", system-ui, sans-serif',
  w = 112,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundPill(ctx, x, y, w, 32);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const img = ensureHudIcon(iconPath);
  const icon = 20;
  const ix = x + 8;
  const iy = y + (32 - icon) / 2;
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ix, iy, icon, icon);
  } else {
    // No unicode hearts/gems — simple letter if art still loading
    ctx.fillStyle = accent;
    ctx.font = `800 13px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillText('o', ix + 4, y + 21);
  }
  ctx.fillStyle = accent;
  ctx.font = `800 15px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(value, x + 8 + icon + 6, y + 21);
}

/** Essence chip with living geode art (not ✧ glyph). */
function drawEssChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  amount: number,
  accent: string,
  font = '"Nunito", system-ui, sans-serif',
  w = 124,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundPill(ctx, x, y, w, 32);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const img = ensureEssHudImg();
  const icon = 22;
  const ix = x + 8;
  const iy = y + (32 - icon) / 2;
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ix + icon / 2, iy + icon / 2, icon / 2, 0, Math.PI * 2);
    ctx.closePath();
    // soft glow
    ctx.shadowColor = 'rgba(126, 208, 255, 0.55)';
    ctx.shadowBlur = 8;
    ctx.drawImage(img, ix, iy, icon, icon);
    ctx.restore();
  } else {
    // Letter fallback only (never unicode gem / emoji boxes)
    const letter = (theme().softCurrencyName[0] ?? theme().softCurrencyGlyph ?? 'E').toUpperCase();
    ctx.fillStyle = accent;
    ctx.font = `800 14px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillText(letter, ix + 4, y + 21);
  }

  ctx.fillStyle = accent;
  ctx.font = `800 15px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(String(amount), x + 8 + icon + 6, y + 21);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function roundPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawToasts(ctx: CanvasRenderingContext2D, now: number): void {
  let y = 210;
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i]!;
    const age = now - t.born;
    if (age > t.life) {
      toasts.splice(i, 1);
      continue;
    }
    const fade =
      age < 120 ? age / 120 : age > t.life - 280 ? Math.max(0, (t.life - age) / 280) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = '800 22px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const label = t.text;
    const tw = ctx.measureText(label).width;
    roundPill(ctx, 360 - tw / 2 - 16, y - 18, tw + 32, 36);
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12;
    ctx.fillText(label, 360, y + 6);
    ctx.restore();
    y += 42;
  }
}

function notePlayInput(): void {
  app.lastInputAt = performance.now();
  app.softHint = null;
}

/** Soft colour wash on board felt — rotates each level so clears feel new. */
function chamberTintForLevel(id: number): string {
  // Harbor: teal / amber / navy docks palette. Crystalline: gem chambers.
  const harbor = [
    'rgba(20, 120, 140, 0.3)',
    'rgba(42, 143, 154, 0.28)',
    'rgba(170, 100, 30, 0.26)',
    'rgba(15, 80, 120, 0.3)',
    'rgba(200, 120, 50, 0.24)',
    'rgba(30, 90, 110, 0.3)',
    'rgba(80, 140, 100, 0.26)',
    'rgba(100, 70, 140, 0.22)',
  ];
  const mine = [
    'rgba(110, 40, 170, 0.28)',
    'rgba(25, 100, 180, 0.3)',
    'rgba(15, 130, 75, 0.28)',
    'rgba(170, 90, 15, 0.28)',
    'rgba(150, 25, 80, 0.28)',
    'rgba(20, 120, 140, 0.3)',
    'rgba(120, 50, 190, 0.3)',
    'rgba(180, 120, 20, 0.28)',
    'rgba(40, 70, 160, 0.28)',
    'rgba(160, 50, 40, 0.28)',
    'rgba(60, 140, 100, 0.28)',
    'rgba(140, 70, 130, 0.28)',
  ];
  const tints = theme().id === 'harbor' ? harbor : mine;
  return tints[(Math.max(1, id) - 1) % tints.length]!;
}

function chamberFlashForLevel(id: number): string {
  const harbor = [
    'rgba(90, 220, 230, 0.72)',
    'rgba(255, 180, 80, 0.75)',
    'rgba(100, 200, 180, 0.7)',
    'rgba(120, 190, 255, 0.72)',
    'rgba(255, 140, 90, 0.7)',
    'rgba(80, 200, 160, 0.7)',
  ];
  const mine = [
    'rgba(200, 130, 255, 0.75)',
    'rgba(100, 190, 255, 0.75)',
    'rgba(100, 240, 170, 0.7)',
    'rgba(255, 190, 80, 0.75)',
    'rgba(255, 120, 170, 0.7)',
    'rgba(90, 235, 235, 0.7)',
    'rgba(210, 140, 255, 0.75)',
    'rgba(255, 220, 100, 0.75)',
    'rgba(120, 150, 255, 0.72)',
    'rgba(255, 110, 100, 0.72)',
    'rgba(120, 240, 180, 0.7)',
    'rgba(255, 140, 220, 0.72)',
  ];
  const flashes = theme().id === 'harbor' ? harbor : mine;
  return flashes[(Math.max(1, id) - 1) % flashes.length]!;
}

/** Ethical ease-of-play: soft hint after idle. Comfort Tools shortens the wait. */
function tickSoftHint(now: number): void {
  if (!app.session || app.paused || app.pickaxeMode) return;
  if (app.ahaPhase !== 'done') return; // tutorial owns the board
  if (boardAnim.busy) return;
  if (app.softHint) return;
  const snap = economy.getSnapshot();
  const delay = snap.settings.reducedMotion
    ? 14_000
    : snap.comfortOwned
      ? 4_500
      : 10_000;
  if (app.lastInputAt <= 0) app.lastInputAt = now;
  if (now - app.lastInputAt < delay) return;
  const hint = findLegalHint(app.session._state.grid);
  if (hint) {
    app.softHint = hint;
    if (snap.comfortOwned) haptic('tap');
  }
}

function drawSoftHint(ctx: CanvasRenderingContext2D, now: number): void {
  if (!app.softHint || app.ahaPhase !== 'done') return;
  const { originX, originY, cell } = boardView.layout;
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.007);
  const color = `rgba(160, 220, 255, ${0.45 + pulse * 0.4})`;
  for (const c of [app.softHint.a, app.softHint.b]) {
    const cx = originX + c.x * cell + cell / 2;
    const cy = originY + c.y * cell + cell / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 + pulse * 1.5;
    ctx.shadowColor = '#7ed0ff';
    ctx.shadowBlur = 12;
    roundRectPath(ctx, cx - cell * 0.4, cy - cell * 0.4, cell * 0.8, cell * 0.8, 12);
    ctx.stroke();
    ctx.restore();
  }
  const a = app.softHint.a;
  const b = app.softHint.b;
  const mx = originX + ((a.x + b.x) / 2) * cell + cell / 2;
  const my = originY + ((a.y + b.y) / 2) * cell + cell / 2 - cell * 0.55;
  ctx.save();
  ctx.font = '800 12px "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200, 230, 255, 0.9)';
  ctx.fillText(economy.getSnapshot().comfortOwned ? 'HINT' : 'TRY THIS', mx, my);
  ctx.restore();
}

function bindInput(): void {
  // Mobile: prevent browser scroll/zoom stealing swipe swaps
  canvas.style.touchAction = 'none';
  // Unlock vibration on first gesture anywhere (Pages / WebView)
  const prime = () => unlockHaptics();
  window.addEventListener('pointerdown', prime, { once: true, passive: true });
  window.addEventListener('touchstart', prime, { once: true, passive: true });

  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (app.screen === 'play') e.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener('pointerdown', (e) => {
    unlockHaptics();
    if (app.screen !== 'play' || app.paused) return;
    notePlayInput();
    audio.resume();
    haptic('tap');
    canvas.setPointerCapture(e.pointerId);
    const p = canvasView.clientToLogical(e.clientX, e.clientY);

    // Tap Living Core to claim
    if (app.session && !app.pickaxeMode) {
      const cell = boardView.screenToCell(p.x, p.y);
      if (cell) {
        const piece = app.session.snapshot().cells[cell.y * app.session.snapshot().width + cell.x]?.piece;
        if (piece?.kind === 'core') {
          const events = app.session.claimCore(cell);
          audio.handle(events);
          playMatchVfx(events);
          boardAnim.sync(app.session.snapshot());
          boardAnim.play(events, app.session.snapshot(), performance.now());
          const claim = events.find((e) => e.t === 'coreClaimed');
          if (claim && claim.t === 'coreClaimed') {
            const msg =
              claim.reward === 'moves'
                ? L('livingCore', 'Living Core') + ': +2 moves!'
                : claim.reward === 'burst'
                  ? L('livingCore', 'Living Core') + ': burst!'
                  : L('livingCore', 'Living Core') + ': score surge!';
            pushToast(msg, '#ffe9a8', 2000);
            juice.powerBanner((L('livingCore', 'Living Core') + '!').toUpperCase());
          }
          const ended = events.find((ev) => ev.t === 'levelEnded');
          if (ended && ended.t === 'levelEnded') {
            scheduleFinishAfterBoard(ended.status, ended.score, ended.stars, ended.reason);
          }
          renderOverlay();
          return;
        }
      }
    }

    if (app.pickaxeMode && app.session) {
      const cell = boardView.screenToCell(p.x, p.y);
      if (cell) {
        if (economy.consumeBooster('pickaxe').ok) {
          const events = app.session.usePickaxe(cell);
          audio.handle(events);
          playMatchVfx(events);
          boardAnim.sync(app.session.snapshot());
          boardAnim.play(events, app.session.snapshot(), performance.now());
          const ended = events.find((ev) => ev.t === 'levelEnded');
          if (ended && ended.t === 'levelEnded') {
            scheduleFinishAfterBoard(ended.status, ended.score, ended.stars, ended.reason);
          }
          pushToast('Pickaxe!', '#ffd679');
        } else {
          pushToast('No pickaxes left', '#ff9a9a');
        }
      }
      app.pickaxeMode = false;
      renderOverlay();
      return;
    }

    boardView.onPress(p.x, p.y);
  });

  // Mid-swipe commit: more sensitive on phone — fire when drag clears threshold
  canvas.addEventListener('pointermove', (e) => {
    if (app.screen !== 'play' || app.paused || !app.session || app.pickaxeMode) return;
    if (!boardView.hasPress) return;
    // Mouse: require button down; touch/pen always while captured
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    const p = canvasView.clientToLogical(e.clientX, e.clientY);
    const swap = boardView.peekSwap(p.x, p.y);
    if (!swap) return;
    boardView.cancelPress();
    doSwap(swap.a, swap.b);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (app.screen !== 'play' || app.paused || !app.session || app.pickaxeMode) return;
    if (!boardView.hasPress) return;
    const p = canvasView.clientToLogical(e.clientX, e.clientY);
    const swap = boardView.completeSwap(p.x, p.y);
    if (!swap) return;
    doSwap(swap.a, swap.b);
  });

  canvas.addEventListener('pointercancel', () => boardView.cancelPress());
}

function doSwap(a: Coord, b: Coord): void {
  if (!app.session || app.paused) return;
  // Let the current drop-in settle so cascades read cleanly.
  if (boardAnim.busy) return;

  const now = performance.now();
  if (app.lastMoveAt > 0) {
    app.moveTimes.push((now - app.lastMoveAt) / 1000);
    if (app.moveTimes.length > 30) app.moveTimes.shift();
  }
  app.lastMoveAt = now;

  // Snapshot *before* the resolve so the animator starts from the live board.
  const snapBefore = app.session.snapshot();
  boardAnim.setLayout(boardView.layout);
  boardAnim.sync(snapBefore);

  const events = app.session.trySwap(a, b);
  audio.handle(events);
  playMatchVfx(events);

  // Model already applied gravity + top-refill; play the drop-in motion.
  const snapAfter = app.session.snapshot();
  boardAnim.play(events, snapAfter, now);

  const ended = events.find((ev) => ev.t === 'levelEnded');
  if (ended && ended.t === 'levelEnded') {
    scheduleFinishAfterBoard(ended.status, ended.score, ended.stars, ended.reason);
  }
}

/**
 * Wait for the board animator (and win sugar-crush) to settle before results.
 * Wins can carry long cascade event streams — poll until idle, with a hard cap.
 */
function scheduleFinishAfterBoard(
  status: 'won' | 'lost',
  score: number,
  stars: number,
  reason?: 'objectivesMet' | 'outOfMoves' | 'bombExpired',
): void {
  const born = performance.now();
  // Wins with flourish need longer; losses can flip faster.
  // Spectacle timing on win flourishes can run 8–14s of staged detonations.
  const minWait = status === 'won' ? 1600 : 350;
  const maxWait = status === 'won' ? 18_000 : 1400;

  const tryFinish = (): void => {
    const age = performance.now() - born;
    if (age < minWait || (boardAnim.busy && age < maxWait)) {
      window.setTimeout(tryFinish, 80);
      return;
    }
    finishLevel(status, score, stars, reason);
  };
  window.setTimeout(tryFinish, minWait);
}

/**
 * Pick up to 8 board cells for peak-special pull FX (Super Chest arms or
 * Supernova crystal rays). Gem ghost colors from theme palette.
 */
function pickKrakenPrey(
  origin: Coord,
  affected: readonly Coord[],
  cellToLogical: (c: Coord) => { x: number; y: number; cell: number },
  palette: Readonly<Record<string, string>>,
): { x: number; y: number; color: string }[] {
  const candidates = affected.filter(
    (c) => !(c.x === origin.x && c.y === origin.y),
  );
  if (candidates.length === 0) return [];

  const ranked = candidates
    .map((c) => ({
      c,
      angle: Math.atan2(c.y - origin.y, c.x - origin.x),
      dist: Math.hypot(c.x - origin.x, c.y - origin.y),
    }))
    .sort((a, b) => a.angle - b.angle);

  const max = 8;
  const picks: Coord[] = [];
  if (ranked.length <= max) {
    for (const r of ranked) picks.push(r.c);
  } else {
    for (let i = 0; i < max; i++) {
      picks.push(ranked[Math.floor((i * ranked.length) / max)]!.c);
    }
  }

  const colorCycle = ['tidal', 'ember', 'aurum', 'solar', 'verdant', 'void'] as const;
  return picks.map((c, i) => {
    const L = cellToLogical(c);
    const key = colorCycle[i % colorCycle.length]!;
    return {
      x: L.x,
      y: L.y,
      color: palette[key] ?? '#7ec8ff',
    };
  });
}

/** Fire escalating visual rewards + juice for power crystals and combos. */
function playMatchVfx(events: readonly GameEvent[]): void {
  const cellToLogical = (c: Coord) => {
    const { originX, originY, cell } = boardView.layout;
    return {
      x: originX + c.x * cell + cell / 2,
      y: originY + c.y * cell + cell / 2,
      cell,
    };
  };

  let forged = 0;
  let powerFires = 0;
  let maxCascade = 0;
  let matchHits = 0;
  const palette = atlas.palette();

  for (const ev of events) {
    if (ev.t === 'swapRejected') {
      haptic('reject');
    } else if (ev.t === 'relicCollected') {
      const p = cellToLogical(ev.at);
      juice.burst(p.x, p.y, '#ffd679', 22);
      juice.burst(p.x, p.y, '#fff6c8', 12);
      juice.ring(p.x, p.y, '#ffd24a', 70, 480);
      juice.scorePop(p.x, p.y - 10, 300, '#ffe9a8');
      juice.shimmerBoard('rgba(255, 210, 100, 1)', 0.55, 420);
      haptic('relic');
      pushToast(`Artifact secured! ${ev.total}`, '#ffd679', 1400);
    } else if (ev.t === 'winFlourish') {
      // Sugar-crush victory banner — leftover moves become free fireworks (slow show)
      juice.powerBanner(
        ev.leftoverMoves > 0
          ? `BONUS ×${ev.leftoverMoves}!`
          : 'VICTORY CASCADE!',
      );
      juice.shimmerBoard('rgba(255, 230, 140, 1)', 1, 1400);
      juice.screenFlash('rgba(255, 240, 180, 0.65)', 620, 0.55);
      juice.ring(
        canvasView.logicalWidth / 2,
        canvasView.logicalHeight * 0.48,
        '#ffd24a',
        280,
        1200,
      );
      juice.ring(
        canvasView.logicalWidth / 2,
        canvasView.logicalHeight * 0.48,
        '#ffffff',
        160,
        900,
      );
      haptic('win');
      if (ev.specialsForged > 0) {
        pushToast(
          `${ev.specialsForged} free power${ev.specialsForged === 1 ? '' : 's'}!`,
          '#ffe9a8',
          2400,
        );
      } else {
        pushToast('Victory cascade!', '#ffe9a8', 1600);
      }
    } else if (ev.t === 'match') {
      const tier = tierFromMatch(ev.shape, ev.cells.length);
      vfx.playAtCells(tier, ev.cells, cellToLogical);
      maxCascade = Math.max(maxCascade, ev.cascadeStep);
      matchHits++;

      // Centroid for juice
      let sx = 0;
      let sy = 0;
      for (const c of ev.cells) {
        const p = cellToLogical(c);
        sx += p.x;
        sy += p.y;
      }
      const n = Math.max(1, ev.cells.length);
      const cx = sx / n;
      const cy = sy / n;
      const col = palette[ev.color] ?? '#a0d0ff';
      // Particles at t≈0; score pop slightly delayed to ~0.1s of the clear beat.
      juice.burst(cx, cy, col, 22 + tier * 14 + ev.cascadeStep * 6);
      juice.burst(cx, cy, '#ffffff', 10 + tier * 5);
      juice.burst(cx, cy, '#ffe9a8', 6 + tier * 3);
      juice.ring(cx, cy, col, 44 + tier * 18 + ev.cascadeStep * 10, 400 + tier * 50);
      if (tier >= 4) {
        juice.ring(cx, cy, '#ffffff', 28 + tier * 10, 320 + tier * 30);
      }
      // Board-wide shimmer through ALL gems on every clear — stronger on chains
      const shimmerA = 0.45 + tier * 0.1 + Math.min(0.4, ev.cascadeStep * 0.14);
      juice.shimmerBoard(
        tier >= 5
          ? 'rgba(255, 230, 160, 1)'
          : tier >= 4
            ? 'rgba(220, 180, 255, 1)'
            : 'rgba(160, 220, 255, 1)',
        shimmerA,
        420 + tier * 70 + ev.cascadeStep * 60,
      );
      window.setTimeout(() => {
        juice.scorePop(cx, cy - 12, ev.points, tier >= 4 ? '#ffe9a8' : '#d0e8ff');
      }, 90);

      hapticMatchTier(tier);
      if (tier >= 6) {
        shakeMs = Math.max(shakeMs, 520);
        shakeMag = Math.max(shakeMag, 24);
        juice.requestHitStop(110);
        juice.screenFlash('rgba(255, 240, 200, 0.85)', 380, 0.58);
        juice.explode(cx, cy, col, 1.6);
      } else if (tier === 5) {
        shakeMs = Math.max(shakeMs, 340);
        shakeMag = Math.max(shakeMag, 16);
        juice.requestHitStop(80);
        juice.screenFlash('rgba(224, 192, 255, 0.72)', 300, 0.5);
        juice.explode(cx, cy, col, 1.1);
      } else if (tier === 4) {
        shakeMs = Math.max(shakeMs, 200);
        shakeMag = Math.max(shakeMag, 10);
        juice.requestHitStop(55);
        juice.screenFlash('rgba(120, 210, 255, 0.52)', 220, 0.38);
      } else {
        shakeMs = Math.max(shakeMs, 90);
        shakeMag = Math.max(shakeMag, 4.5);
        juice.requestHitStop(28);
      }

      // Tutorial beat 1 → 2 after forging match
      if (app.ahaPhase === 'forge' && (tier >= 4 || ev.shape === 'four')) {
        advanceTutorialToFire();
      }
    } else if (ev.t === 'spawnSpecial') {
      forged++;
      const name = powerLabel(ev.piece.kind);
      const p = cellToLogical(ev.at);
      const col = ev.piece.kind === 'supernova' ? '#ffffff' : '#e0c0ff';
      juice.explode(p.x, p.y, col, 1.2);
      juice.ring(p.x, p.y, col, 110, 620);
      juice.ring(p.x, p.y, '#fff6e8', 70, 480);
      juice.shimmerBoard('rgba(230, 200, 255, 1)', 0.75, 520);
      juice.powerBanner(`${name.toUpperCase()} FORGED`);
      juice.requestHitStop(75);
      juice.screenFlash(
        ev.piece.kind === 'supernova' ? 'rgba(255,255,255,0.55)' : 'rgba(200, 160, 255, 0.5)',
        240,
        0.4,
      );
      haptic('forge');
      if (forged <= 2) pushToast(`${name} forged!`, '#e0c0ff', 1600);
      if (app.ahaPhase === 'forge') advanceTutorialToFire();
    } else if (ev.t === 'coreSpawned') {
      const p = cellToLogical(ev.at);
      juice.explode(p.x, p.y, '#ffe9a8', 1.4);
      juice.ring(p.x, p.y, '#ffd24a', 120, 700);
      juice.shimmerBoard('rgba(255, 220, 120, 1)', 0.8, 600);
      juice.powerBanner((L('livingCore', 'Living Core') + '!').toUpperCase());
      juice.screenFlash('rgba(255, 210, 80, 0.55)', 300, 0.42);
      haptic('specialBig');
      pushToast(
        L('livingCore', 'Living Core') +
          (theme().id === 'harbor' ? '! Tap the spinning beacon' : '! Tap the spinning crystal'),
        '#ffe9a8',
        2600,
      );
    } else if (ev.t === 'specialTriggered') {
      powerFires++;
      const tier =
        ev.kind === 'supernova' ? 6 : ev.kind === 'prism' ? 6 : ev.kind === 'burst' ? 5 : 4;
      vfx.playAtCells(tier, ev.affected, cellToLogical);
      const p = cellToLogical(ev.at);
      const powerCol =
        ev.kind === 'prism'
          ? '#e0c0ff'
          : ev.kind === 'burst'
            ? '#ffc878'
            : ev.kind === 'supernova' || ev.kind === 'core'
              ? '#7ec8ff'
              : '#7ed0ff';
      // Peak special: Super Chest + octopus feast (Harbor) or Living Geode (Crystalline)
      if (ev.kind === 'supernova') {
        app.levelPeakSpecials += 1;
        const prey = pickKrakenPrey(ev.at, ev.affected, cellToLogical, atlas.palette());
        const peakStyle = theme().id === 'harbor' ? 'kraken' : 'supernova';
        juice.peakSpecialFeast(peakStyle, p.x, p.y, prey, {
          cell: p.cell,
          color: peakStyle === 'kraken' ? '#7ec8ff' : '#ffe56a',
        });
        juice.powerBanner(
          (theme().id === 'harbor' ? 'SUPER CHEST' : powerLabel(ev.kind)).toUpperCase(),
        );
        // Soft pops only — full-board sparkle would fight the pull read
        const sample = ev.affected.slice(0, 12);
        for (const c of sample) {
          const q = cellToLogical(c);
          juice.burst(q.x, q.y, powerCol, 4);
        }
      } else {
        // Heavy explosion feedback for every other power fire
        juice.explode(p.x, p.y, powerCol, 1.2 + tier * 0.45);
        juice.burst(p.x, p.y, '#fff0c0', 28 + tier * 12);
        juice.burst(p.x, p.y, '#ffffff', 16 + tier * 6);
        juice.ring(p.x, p.y, powerCol, 100 + tier * 28, 620);
        juice.ring(p.x, p.y, '#ffffff', 60 + tier * 16, 480);
        const sample = ev.affected.slice(0, 40);
        for (const c of sample) {
          const q = cellToLogical(c);
          juice.burst(q.x, q.y, powerCol, 10 + Math.floor(tier / 2));
          if (tier >= 5) juice.burst(q.x, q.y, '#ffffff', 4);
        }
      }
      juice.shimmerBoard(
        tier >= 6 ? 'rgba(255,255,255,1)' : 'rgba(255, 210, 140, 1)',
        0.85 + tier * 0.04,
        600 + tier * 50,
      );
      if (tier >= 5) {
        haptic('explode');
        if (tier >= 6) haptic('specialBig');
        shakeMs = Math.max(shakeMs, tier >= 6 ? 580 : 400);
        shakeMag = Math.max(shakeMag, tier >= 6 ? 26 : 18);
        juice.requestHitStop(tier >= 6 ? 140 : 95);
        juice.screenFlash(
          tier >= 6 ? 'rgba(255,255,255,0.8)' : 'rgba(255, 200, 120, 0.7)',
          tier >= 6 ? 420 : 320,
          tier >= 6 ? 0.65 : 0.52,
        );
      } else {
        haptic('specialBig');
        shakeMs = Math.max(shakeMs, 240);
        shakeMag = Math.max(shakeMag, 12);
        juice.requestHitStop(70);
        juice.screenFlash('rgba(120, 210, 255, 0.55)', 260, 0.42);
      }
      if (powerFires === 1) {
        juice.powerBanner(powerLabel(ev.kind).toUpperCase());
        pushToast(powerLabel(ev.kind), '#ffe9a8', 1200);
      } else if (powerFires === 2) {
        juice.powerBanner('POWER CASCADE!');
        pushToast('Power cascade!', '#ffb0e0', 1500);
        juice.requestHitStop(90);
        haptic('specialBig');
      }
      if (app.ahaPhase === 'fire') completeTutorial();
    } else if (ev.t === 'bombDefused') {
      const p = cellToLogical(ev.at);
      juice.explode(p.x, p.y, '#7ed0ff', 0.9);
      juice.ring(p.x, p.y, '#a8e0ff', 70, 480);
      juice.burst(p.x, p.y, '#ffffff', 12);
      haptic('specialBig');
      pushToast(`Defused! (${ev.total})`, '#a8e0ff', 1100);
    } else if (ev.t === 'levelEnded') {
      if (ev.status === 'won') haptic('win');
      else haptic('softFail');
    }
  }

  if (maxCascade >= 1) {
    juice.cascadeBanner(maxCascade);
    hapticCascade(maxCascade);
    // Extra full-board shimmer on multi-step chains
    if (maxCascade >= 2) {
      juice.shimmerBoard('rgba(200, 240, 255, 1)', 0.55 + Math.min(0.4, maxCascade * 0.1), 480 + maxCascade * 60);
      shakeMs = Math.max(shakeMs, 80 + maxCascade * 30);
      shakeMag = Math.max(shakeMag, 3 + maxCascade);
    }
  }

  // Conveyor belt feedback (mid/deep levels) + board chrome
  for (const ev of events) {
    if (ev.t === 'conveyor') {
      boardView.conveyor = {
        row: ev.row,
        direction: ev.direction,
        until: performance.now() + 900,
      };
      pushToast(
        `Conveyor ${ev.direction === 'left' ? 'LEFT' : 'RIGHT'}`,
        '#a8d8ff',
        700,
      );
    }
  }

  // Combo end fanfare — when a multi-step cascade fully resolves
  for (const ev of events) {
    if (ev.t === 'cascadeEnd' && ev.steps >= 3) {
      const cx = canvasView.logicalWidth / 2;
      const cy = canvasView.logicalHeight * 0.45;
      juice.powerBanner(ev.steps >= 5 ? 'UNSTOPPABLE!' : 'COMBO CLEAR!');
      juice.burst(cx, cy, '#ffe9a8', 20 + ev.steps * 4);
      juice.ring(cx, cy, '#ffd24a', 120 + ev.steps * 18, 620);
      juice.ring(cx, cy, '#7ed0ff', 70 + ev.steps * 10, 480);
      juice.screenFlash('rgba(255, 210, 100, 0.4)', 220 + ev.steps * 20, 0.3);
      juice.requestHitStop(40 + ev.steps * 8);
      shakeMs = Math.max(shakeMs, 120 + ev.steps * 20);
      shakeMag = Math.max(shakeMag, 5 + ev.steps);
      audio.starDing(Math.min(2, ev.steps - 1));
      haptic('cascade');
    }
  }
  void matchHits;
}

/** After forge: re-hint to fire the new power. */
function advanceTutorialToFire(): void {
  if (app.ahaPhase !== 'forge' || !app.session) return;
  app.ahaPhase = 'fire';
  // Wait a tick so the special is on the board after resolve/anim settle
  window.setTimeout(() => {
    if (!app.session || app.ahaPhase !== 'fire') return;
    const hint = findFireHint(app.session._state.grid);
    if (hint) {
      app.ahaHint = { a: hint.power, b: hint.target };
      pushToast('Now FIRE it — swap the power into a gem!', '#7dffc0', 3200);
    } else {
      completeTutorial();
    }
  }, 700);
}

function completeTutorial(): void {
  app.ahaHint = null;
  app.ahaPhase = 'done';
  if (!app.ahaDone) {
    app.ahaDone = true;
    try {
      localStorage.setItem(AHA_KEY, '1');
    } catch {
      /* private mode */
    }
    pushToast('Powers clear big areas — combo two for chaos!', '#ffe9a8', 3000);
  }
}

function meanMoveTime(): number {
  if (app.moveTimes.length === 0) return 0;
  return app.moveTimes.reduce((a, b) => a + b, 0) / app.moveTimes.length;
}

function ddaScalar(): number {
  const d = economy.getSnapshot().dda;
  const history = d.history;
  const wins = history.filter(Boolean).length;
  const winRatio = history.length === 0 ? 0.5 : wins / history.length;
  return computeDda({
    failStreak: d.failStreak,
    winRatio,
    meanMoveTime: meanMoveTime(),
  });
}

let finishing = false;

/** Objective completion ratio 0–1 for near-miss detection (loss aversion). */
function objectiveProgressRatio(session: Session): number {
  const objs = session.snapshot().objectives;
  if (objs.length === 0) return 0;
  let sum = 0;
  for (const o of objs) {
    sum += o.target <= 0 ? 1 : Math.min(1, o.current / o.target);
  }
  return sum / objs.length;
}

function finishLevel(
  status: 'won' | 'lost',
  score: number,
  stars: number,
  reason?: 'objectivesMet' | 'outOfMoves' | 'bombExpired',
): void {
  // Guard against double levelEnded / delayed timeout after quit.
  if (finishing) return;
  finishing = true;

  // Near-miss continue: out of moves, meaningful progress, one offer per attempt.
  if (
    status === 'lost' &&
    reason === 'outOfMoves' &&
    app.session &&
    !app.continueUsed &&
    objectiveProgressRatio(app.session) >= 0.45
  ) {
    app.pendingContinue = true;
    app.lastResult = { status, score, stars };
    app.screen = 'continue';
    overlay.style.background = '';
    overlay.style.backdropFilter = '';
    overlay.style.justifyContent = '';
    overlay.style.pointerEvents = '';
    renderOverlay();
    finishing = false;
    return;
  }

  const scalar = ddaScalar();
  if (status === 'won') {
    const unlockedBefore = economy.getSnapshot().progress.highestUnlocked;
    economy.completeLevel(app.levelId, stars, scalar);
    app.pendingGeode = true;
    app.sessionWins += 1;
    // Act I-C gate: first time highest unlock crosses into L151+
    const unlockedAfter = economy.getSnapshot().progress.highestUnlocked;
    const actIcKey = `${theme().storagePrefix}.actIcUnlock`;
    const alreadySeen =
      typeof localStorage !== 'undefined' && localStorage.getItem(actIcKey) === '1';
    if (!alreadySeen && unlockedBefore < 151 && unlockedAfter >= 151) {
      app.pendingActIcCeremony = true;
      try {
        localStorage.setItem(actIcKey, '1');
      } catch {
        /* ignore quota */
      }
    }
    // Soft studio reminder every few clears — commercial product, not a nag.
    if (!app.brandNudgeShown && app.sessionWins > 0 && app.sessionWins % 5 === 0) {
      app.brandNudgeShown = true;
      window.setTimeout(() => {
        pushToast(`${STUDIO.short} · ${STUDIO.name}`, '#8ec8e8', 2200);
      }, 900);
      // Allow another nudge later in a long session
      window.setTimeout(() => {
        app.brandNudgeShown = false;
      }, 120_000);
    }
  } else {
    economy.failLevel(scalar);
    app.pendingGeode = false;
  }
  app.lastResult = { status, score, stars };
  app.session = null;
  app.pendingContinue = false;
  app.continueUsed = false;

  if (economy.shouldShowInterstitial()) {
    openAd('interstitial', 'results');
    finishing = false;
    return;
  }
  app.screen = 'results';
  renderOverlay();
  finishing = false;
}

function reviveSessionWithMoves(n = 5): void {
  if (!app.session) return;
  const events = app.session.continueWithMoves(n);
  if (events.length === 0) return;
  app.continueUsed = true;
  app.pendingContinue = false;
  audio.handle(events);
  boardAnim.sync(app.session.snapshot());
  app.screen = 'play';
  haptic('forge');
  pushToast(
    `+${n} moves — finish the ${theme().id === 'harbor' ? 'sort' : 'chamber'}!`,
    '#7dffc0',
    2200,
  );
  renderOverlay();
}

function acceptContinue(via: 'ad' | 'shards'): void {
  if (!app.session || !app.pendingContinue) return;
  if (via === 'shards') {
    if (!economy.spendShardsForContinue()) {
      pushToast(
        `Need ${ECONOMY_CONST.cost.extraMoves5} ${theme().premiumCurrencyName.toLowerCase()} — or claim a free gift`,
        '#ff9a9a',
      );
      return;
    }
    reviveSessionWithMoves(5);
    return;
  }
  // Free gift continue; moves applied in closeAdSession when grant succeeds.
  app.continueUsed = true;
  openAd('rewardedContinue', 'play');
}

function declineContinue(): void {
  app.pendingContinue = false;
  app.continueUsed = false;
  const r = app.lastResult;
  const scalar = ddaScalar();
  economy.failLevel(scalar);
  app.session = null;
  if (economy.shouldShowInterstitial()) {
    openAd('interstitial', 'results');
    return;
  }
  app.screen = 'results';
  if (r) app.lastResult = r;
  renderOverlay();
}

function startLevel(
  id: number,
  prep: { seedPrism?: boolean; extraMoves?: boolean } = {},
  forceAha = false,
): void {
  const lives = economy.getSnapshot().lives;
  if (lives.count <= 0) {
    app.screen = 'lives';
    renderOverlay();
    return;
  }
  if (!economy.beginLevel(id)) {
    app.screen = 'lives';
    renderOverlay();
    return;
  }
  app.levelId = id;
  app.moveTimes = [];
  app.lastMoveAt = 0;
  app.pickaxeMode = false;
  app.paused = false;
  app.ahaHint = null;
  app.ahaPhase = 'done';
  app.softHint = null;
  app.lastInputAt = performance.now();
  app.comfortReshuffleUsed = false;
  app.levelPeakSpecials = 0;
  boardView.conveyor = null;
  hudScoreShown = 0;
  hudScorePulseUntil = 0;
  hudMovesPulseUntil = 0;
  hudLastMoves = -1;
  const level = getLevel(id);
  app.session = createSession(level, (Date.now() ^ (id * 9973)) >>> 0, ddaScalar());

  // Visibly different chamber per level (felt tint + entry flash + ring)
  boardView.chamberTint = chamberTintForLevel(id);
  juice.screenFlash(chamberFlashForLevel(id), 560, 0.52);
  juice.shimmerBoard(chamberFlashForLevel(id), 0.85, 720);
  juice.ring(canvasView.logicalWidth / 2, canvasView.logicalHeight * 0.48, chamberFlashForLevel(id), 220, 700);
  haptic('special');

  // First Light: two-beat tutorial (forge → fire).
  if (id === 1 && (forceAha || !app.ahaDone)) {
    const hintA = seedFirstLightAha(app.session._state.grid, app.session._state.ids);
    app.ahaHint = { a: hintA, b: AHA_SWAP_B };
    app.ahaPhase = 'forge';
    pushToast('Swap the glowing gems to FORGE a power!', '#ffe9a8', 3200);
  }

  if (prep.seedPrism && economy.consumeBooster('seedPrism').ok) {
    app.session.useSeedPrism();
    pushToast(`${powerLabel('prism')} seeded!`, '#e0c0ff');
  }
  app.continueUsed = false;
  app.pendingContinue = false;
  if (prep.extraMoves && economy.consumeBooster('extraMoves').ok) {
    app.session.addMoves(5);
    pushToast('+5 moves!', '#b8f0ff');
  }

  boardView.relayout(level.width, level.height);
  boardAnim.setLayout(boardView.layout);
  boardAnim.sync(app.session.snapshot());
  app.screen = 'play';
  overlay.style.background = '';
  overlay.style.backdropFilter = '';
  overlay.style.justifyContent = '';
  overlay.style.paddingBottom = '';
  renderOverlay();
}

function closeAdSession(opts: { grant: boolean }): void {
  const placement = app.adPlacement ?? 'interstitial';
  if (opts.grant) {
    const res = economy.completeAd();
    if (res.ok && placement === 'rewardedContinue' && app.session) {
      if (app.session.snapshot().status === 'lost') {
        reviveSessionWithMoves(5);
        app.adVideoId = null;
        return;
      }
      app.session.addMoves(5);
      pushToast('+5 moves!', '#7dffc0', 1800);
    }
    if (placement === 'interstitial') {
      economy.noteInterstitialShown();
    }
  } else {
    economy.dismissAd();
    if (placement === 'interstitial') {
      economy.noteInterstitialShown();
    }
    if (placement === 'rewardedContinue' && app.session?.snapshot().status === 'lost') {
      app.adVideoId = null;
      declineContinue();
      return;
    }
  }
  app.adVideoId = null;
  app.screen = app.adReturn;
  renderOverlay();
}

/** Opt-in free gift (short wait). No ad SDK / no YouTube. */
function openAd(
  placement: NonNullable<AppState['adPlacement']>,
  returnTo: Screen,
  booster: BoosterId = 'pickaxe',
): void {
  // Interstitials disabled for free Play build
  if (placement === 'interstitial') {
    app.screen = returnTo;
    renderOverlay();
    return;
  }
  app.adPlacement = placement;
  app.adReturn = returnTo;
  const start = economy.startAd(placement, booster);
  if (!start.ok) {
    app.adVideoId = null;
    app.screen = returnTo;
    if (placement === 'rewardedBooster') {
      pushToast('Free gifts capped for today — buy with shards in Shop', '#ffd679', 2400);
    } else if (placement === 'rewardedLife') {
      pushToast('Free lives capped for today — wait for regen or visit Shop', '#ffd679', 2400);
    } else {
      pushToast('Free gift unavailable — try shards in Shop', '#ffd679', 2200);
    }
    renderOverlay();
    return;
  }
  app.adVideoId = null;
  app.screen = 'ad';
  renderAdShell();
  const tick = () => {
    if (app.screen !== 'ad') return;
    const p = economy.adProgress();
    updateAdChrome(p);
    if (p.finished) {
      closeAdSession({ grant: true });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderOverlay(): void {
  // Kill sand wordmark when leaving title (canvas not in DOM after clear)
  if (titleSand && app.screen !== 'title') {
    titleSand.dispose();
    titleSand = null;
  }
  clear(overlay);
  if (app.screen === 'boot') {
    overlay.classList.remove('hidden');
    overlay.style.backdropFilter = 'none';
    overlay.style.justifyContent = 'center';
    if (app.bootPhase === 'studio') {
      // Departure Bay Digital plate — wipe-up commercial identity
      overlay.style.background =
        'radial-gradient(ellipse at 50% 45%, rgba(30, 90, 140, 0.35), rgba(4, 8, 16, 0.98))';
      const plate = el('div', { class: 'boot-studio' }, [
        el('div', { class: 'boot-studio-mark', 'aria-hidden': 'true' }, [STUDIO.short]),
        el('div', { class: 'boot-studio-name' }, [STUDIO.name.toUpperCase()]),
        el('div', { class: 'boot-studio-line' }, ['Interactive entertainment']),
      ]);
      overlay.append(plate);
    } else {
      overlay.style.background =
        'radial-gradient(ellipse at 50% 40%, rgba(80,40,140,0.45), rgba(6,4,14,0.96))';
      const splash = el('div', { class: 'boot-splash' }, [
        el('div', { class: 'boot-studio-kicker' }, [STUDIO.tagline]),
        el('div', { class: 'boot-logo' }, [theme().productName.toUpperCase()]),
        el('div', { class: 'boot-sub' }, [
          theme().id === 'harbor' ? 'Lighting the docks…' : 'Loading the mine…',
        ]),
        el('div', { class: 'boot-bar' }, [el('div', { class: 'boot-bar-fill' }, [])]),
      ]);
      overlay.append(splash);
    }
    return;
  }
  if (app.screen === 'title') {
    renderTitle();
    return;
  }
  if (app.screen === 'play') {
    overlay.classList.remove('hidden');
    overlay.style.background = 'transparent';
    overlay.style.backdropFilter = 'none';
    overlay.style.justifyContent = 'flex-end';
    overlay.style.pointerEvents = 'none';

    if (app.paused) {
      renderPauseMenu();
      return;
    }

    // Free-floating bottom tools — no dock box (reshuffle | pause | pickaxe)
    const dock = el('div', { class: 'play-dock play-dock-float' }, []);
    dock.style.pointerEvents = 'auto';
    const snap = economy.getSnapshot();
    const pauseBtn = btn('II', () => {
      app.paused = true;
      app.pickaxeMode = false;
      audio.uiTap();
      renderOverlay();
    }, 'secondary');
    pauseBtn.title = 'Pause';
    pauseBtn.classList.add('play-tool', 'play-pause', 'play-pause-float');
    const comfortFree =
      snap.comfortOwned &&
      snap.boosters.reshuffle <= 0 &&
      !app.comfortReshuffleUsed;

    const toolBtn = (
      iconSrc: string,
      countLabel: string,
      title: string,
      onClick: () => void,
      opts: { armed?: boolean; disabled?: boolean; free?: boolean } = {},
    ): HTMLElement => {
      const b = el(
        'button',
        {
          class: `play-tool play-tool-art play-tool-float${opts.armed ? ' armed' : ''}${opts.disabled ? ' is-disabled' : ''}${opts.free ? ' free' : ''}`,
          type: 'button',
          title,
          disabled: opts.disabled ? true : undefined,
        },
        [
          el('img', {
            class: 'play-tool-img',
            src: assetUrl(iconSrc),
            alt: '',
            decoding: 'async',
            draggable: 'false',
          }),
          el('span', { class: 'play-tool-count' }, [countLabel]),
        ],
      ) as HTMLButtonElement;
      if (!opts.disabled) b.addEventListener('click', onClick);
      return b;
    };

    const runReshuffle = (comfort: boolean): void => {
      if (!app.session || boardAnim.busy) return;
      // Capture pre-shuffle board for spiral-out, then mutate engine
      boardAnim.sync(app.session.snapshot());
      const events = app.session.useReshuffle();
      audio.handle(events);
      boardAnim.playReshuffle(app.session.snapshot(), performance.now());
      juice.shimmerBoard('rgba(160, 220, 255, 1)', 0.85, 900);
      juice.screenFlash('rgba(140, 200, 255, 0.45)', 420, 0.35);
      juice.ring(
        canvasView.logicalWidth / 2,
        canvasView.logicalHeight * 0.48,
        'rgba(120, 200, 255, 0.9)',
        200,
        700,
      );
      juice.powerBanner(comfort ? 'COMFORT SHUFFLE' : 'BOARD SHUFFLE');
      pushToast(comfort ? 'Comfort reshuffle · once this dive' : 'Board reshuffled', '#b8f0ff', 2000);
      haptic('special');
      notePlayInput();
      renderOverlay();
    };

    const reshuffleBtn = toolBtn(
      'ui/tools/reshuffle.webp',
      comfortFree ? 'FREE' : `×${snap.boosters.reshuffle}`,
      comfortFree ? 'Comfort Tools free reshuffle' : 'Reshuffle board',
      () => {
        if (!app.session) return;
        if (boardAnim.busy) {
          pushToast('Wait for the board…', '#b0c0e0', 900);
          return;
        }
        if (economy.consumeBooster('reshuffle').ok) {
          runReshuffle(false);
        } else if (comfortFree) {
          app.comfortReshuffleUsed = true;
          runReshuffle(true);
        } else if (snap.comfortOwned) {
          pushToast('Comfort free reshuffle already used', '#ff9a9a');
        } else {
          offerBoosterRestock('reshuffle', 'play');
        }
      },
      { disabled: snap.boosters.reshuffle <= 0 && !comfortFree, free: comfortFree },
    );

    const pickBtn = toolBtn(
      'ui/tools/pickaxe.webp',
      app.pickaxeMode ? 'ON' : `×${snap.boosters.pickaxe}`,
      app.pickaxeMode ? 'Cancel pickaxe' : 'Pickaxe',
      () => {
        if (app.pickaxeMode) {
          app.pickaxeMode = false;
          renderOverlay();
          return;
        }
        if (snap.boosters.pickaxe <= 0) {
          offerBoosterRestock('pickaxe', 'play');
          return;
        }
        app.pickaxeMode = true;
        pushToast('Tap a gem to smash', '#ffd679');
        haptic('special');
        renderOverlay();
      },
      {
        armed: app.pickaxeMode,
        disabled: !app.pickaxeMode && snap.boosters.pickaxe <= 0,
      },
    );

    // Order: reshuffle left · pause center · pickaxe right
    dock.append(
      el('div', { class: 'play-dock-tools play-dock-tools-float' }, [
        reshuffleBtn,
        pauseBtn,
        pickBtn,
      ]),
    );
    overlay.append(dock);
    return;
  }
  overlay.style.background = '';
  overlay.style.backdropFilter = '';
  overlay.style.justifyContent = '';
  overlay.style.pointerEvents = '';
  overlay.classList.remove('hidden');

  switch (app.screen) {
    case 'map':
      renderMap();
      break;
    case 'prelevel':
      renderPrelevel();
      break;
    case 'results':
      renderResults();
      break;
    case 'continue':
      renderContinueOffer();
      break;
    case 'cavern':
      renderCavern();
      break;
    case 'album':
      renderAlbum();
      break;
    case 'event':
      renderHybridEvent();
      break;
    case 'store':
      renderStore();
      break;
    case 'lives':
      renderLivesGate();
      break;
    case 'ad':
      renderAd();
      break;
    case 'settings':
      renderSettings();
      break;
    case 'dashboard':
      renderDashboard();
      break;
    default:
      break;
  }
}

function panel(
  title: string,
  body: HTMLElement[],
  actions: HTMLElement[] = [],
  opts: { className?: string; scrollTop?: boolean } = {},
): HTMLElement {
  const kids: (string | Node)[] = [];
  if (title.trim()) kids.push(el('h1', {}, [title]));
  kids.push(...body);
  if (actions.length) kids.push(el('div', { class: 'row' }, actions));
  const p = el('div', {
    class: opts.className ? `panel panel-enter ${opts.className}` : 'panel panel-enter',
  }, kids);
  overlay.append(p);
  audio.panelWhoosh();
  if (opts.scrollTop) {
    // Ensure tall catalogues start at the title, not mid-list.
    requestAnimationFrame(() => {
      overlay.scrollTop = 0;
      p.scrollIntoView({ block: 'start' });
    });
  }
  return p;
}

function renderTitle(): void {
  overlay.classList.remove('hidden');
  overlay.style.background =
    'linear-gradient(180deg, rgba(10,6,24,0.06) 0%, rgba(10,6,24,0.35) 42%, rgba(8,4,18,0.92) 100%)';
  overlay.style.backdropFilter = 'none';
  overlay.style.justifyContent = 'flex-end';
  overlay.style.paddingBottom = '7%';

  const snap = economy.getSnapshot();
  const nextId = Math.min(LEVEL_COUNT, Math.max(1, snap.progress.highestUnlocked));
  const chOpen = chapterForLevel(nextId);
  // Finished product: one progress line, no feature-chip laundry list.
  const progressLine = !app.ahaDone
    ? theme().id === 'harbor'
      ? 'Your first sort awaits'
      : 'Your first dive awaits'
    : `Level ${nextId} · ${chOpen.title}` +
      (snap.daily.winStreak > 1 ? ` · Streak ${snap.daily.winStreak}` : '');

  const wrap = el('div', { class: 'panel panel-title panel-title-clean' }, []);
  wrap.append(
    el('div', { class: 'title-gems', 'aria-hidden': 'true' }, [
      el('img', {
        class: 'title-gem g1',
        src: assetUrl(themeUi('ui/title/tidal.webp')),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
      el('img', {
        class: 'title-gem g2',
        src: assetUrl(themeUi('ui/title/aurum.webp')),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
      el('img', {
        class: 'title-gem g3',
        src: assetUrl(themeUi('ui/title/void.webp')),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
      el('img', {
        class: 'title-gem g4',
        src: assetUrl(themeUi('ui/title/ember.webp')),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
    ]),
    el('div', { class: 'title-studio' }, [STUDIO.tagline]),
    el('div', { class: 'title-kicker' }, [
      theme().id === 'harbor' ? 'COZY HARBOR MATCH-3' : 'CRYSTAL MINE MATCH-3',
    ]),
  );
  // Studio signature: Harbor sand / Crystalline ore material wordmarks (hero only)
  {
    titleSand?.dispose();
    const reduce =
      economy.getSnapshot().settings.reducedMotion ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const host = el('div', { class: 'title-sand-host' }, []);
    wrap.append(host);
    const isHarbor = theme().id === 'harbor';
    titleSand = new SandWordmark({
      text: theme().productName.toUpperCase(),
      width: 340,
      height: 72,
      profile: isHarbor ? 'sand' : 'ore',
      reducedMotion: reduce,
      font: isHarbor
        ? '800 40px "Tidepop", "Fredoka", system-ui, sans-serif'
        : '800 38px "DragonBlaze", "Fredoka", system-ui, sans-serif',
      fill: isHarbor ? '#e8c48a' : '#d0a8ff',
      waterTint: isHarbor ? 'rgba(90, 200, 210, 0.32)' : 'rgba(160, 120, 255, 0.38)',
      onScoop: () => {
        const res = economy.claimMaterialScoop();
        if (res.granted > 0) {
          audio.starDing(0);
          haptic('forge');
          pushToast(
            isHarbor
              ? `Sand scoop · +${res.granted} ${theme().softCurrencyName}`
              : `Ore chip · +${res.granted} ${theme().softCurrencyName}`,
            isHarbor ? '#7ed0ff' : '#e0c0ff',
            1800,
          );
        }
      },
    });
    titleSand.mount(host);
  }
  wrap.append(el('p', { class: 'title-tagline' }, [theme().tagline]));
  // Guide only on first open — returning players get straight to PLAY.
  if (!app.ahaDone) {
    wrap.append(
      companionBubble('titleFirst', snap.progress.highestUnlocked + snap.meta.ownedCount),
    );
  }
  wrap.append(
    el('p', { class: 'hud-tip title-progress' }, [progressLine]),
    el('div', { class: 'row title-actions title-actions-stack' }, [
      btn(
        app.ahaDone ? L('playCta', 'PLAY') : 'BEGIN',
        () => {
          audio.titleSting();
          // Ambient bed stays on (ducks under SFX) — quieter mine/dock air, not silence
          if (!app.ahaDone) {
            app.levelId = 1;
            startLevel(1, {}, true);
          } else {
            app.screen = 'map';
            renderOverlay();
          }
        },
        'gold',
      ),
    ]),
    el('p', { class: 'studio-foot' }, [STUDIO.short + ' · ' + STUDIO.name]),
  );
  overlay.append(wrap);

  const gift = snap.pendingDailyGift;
  if (gift) {
    requestAnimationFrame(() => showDailyGiftModal(gift));
  }
}

/** In-play pause overlay — resume, mute, quit to results (life spent on quit). */
function renderPauseMenu(): void {
  overlay.style.pointerEvents = 'auto';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(4, 2, 12, 0.72)';
  overlay.style.backdropFilter = 'blur(6px)';

  const snap = economy.getSnapshot();
  const s = app.session?.snapshot();
  const level = getLevel(app.levelId);

  const card = el('div', { class: 'pause-card panel-enter' }, [
    el('div', { class: 'pause-kicker' }, ['PAUSED']),
    el('h2', {}, [level.name]),
    el('p', { class: 'hud-tip' }, [
      s
        ? `Level ${app.levelId} · ${s.movesLeft} moves · ${s.score.toLocaleString('en-US')} pts`
        : `Level ${app.levelId}`,
    ]),
    el('div', { class: 'pause-actions' }, [
      btn(
        'RESUME',
        () => {
          app.paused = false;
          audio.uiTap();
          renderOverlay();
        },
        'gold',
      ),
      btn(
        snap.settings.sfx ? 'SFX: On' : 'SFX: Off',
        () => {
          economy.updateSettings({ sfx: !snap.settings.sfx });
          audio.setEnabled(!snap.settings.sfx);
          renderOverlay();
        },
        'secondary',
      ),
      btn(
        'QUIT LEVEL',
        () => {
          app.paused = false;
          app.session = null;
          app.pickaxeMode = false;
          economy.failLevel(ddaScalar());
          audio.lifeSpent();
          app.lastResult = { status: 'lost', score: 0, stars: 0 };
          app.screen = 'results';
          overlay.style.background = '';
          overlay.style.backdropFilter = '';
          overlay.style.justifyContent = '';
          overlay.style.pointerEvents = '';
          renderOverlay();
        },
        'danger',
      ),
    ]),
  ]);
  overlay.append(card);
}

/** Soft retention prompts for map / cavern / prelevel. */
function nextGoalHint(snap: ReturnType<Economy['getSnapshot']>): HTMLElement {
  const meta = snap.meta;
  if (meta.nextAffordable) {
    return el('span', { class: 'ess-line' }, [
      `Ready · place ${meta.nextAffordable.name} in the ${theme().metaHubName.toLowerCase()}`,
    ]);
  }
  if (meta.nextTarget) {
    const need = Math.max(0, meta.nextTarget.cost - meta.essence);
    return essLine('Next · ', need, ` for ${meta.nextTarget.name}`);
  }
  const maxStage = getMetaStages().reduce((m, s) => Math.max(m, s.id), 1);
  if (meta.stagesComplete >= maxStage) {
    return el('span', { class: 'ess-line' }, [
      theme().metaHubName +
        ' complete · chase 3 stars on every ' +
        (theme().id === 'harbor' ? 'dock' : 'chamber'),
    ]);
  }
  return el('span', { class: 'ess-line' }, [
    `Next · clear level ${snap.progress.highestUnlocked}`,
  ]);
}

function essenceProgressBar(snap: ReturnType<Economy['getSnapshot']>): HTMLElement {
  const target = snap.meta.nextTarget;
  const have = snap.meta.essence;
  const need = target?.cost ?? 100;
  const pct = Math.min(100, Math.floor((have / Math.max(1, need)) * 100));
  const label = target
    ? el('span', { class: 'ess-line' }, [
        essFig(have, { size: 'xs' }),
        document.createTextNode(' / '),
        essFig(need, { size: 'xs' }),
        document.createTextNode(` · ${target.name}`),
      ])
    : el('span', { class: 'ess-line' }, [
        essFig(have, { size: 'xs' }),
        document.createTextNode(` ${theme().softCurrencyName.toLowerCase()}`),
      ]);
  const wrap = el('div', { class: 'essence-track-wrap' }, [
    el('div', { class: 'essence-track-label' }, [label]),
    el('div', { class: 'essence-track' }, [
      el('div', { class: 'essence-track-fill', style: `width:${pct}%` }, []),
    ]),
  ]);
  return wrap;
}

/** Geode Warden speech bubble + portrait (thin narrator chrome). */
function companionBubble(beat: CompanionBeat, salt = 0): HTMLElement {
  const line = companionLine(beat, salt);
  return el('div', { class: 'companion-bubble' }, [
    el('img', {
      class: 'companion-portrait',
      src: assetUrl(COMPANION.art),
      alt: COMPANION.name,
      decoding: 'async',
    }),
    el('div', { class: 'companion-body' }, [
      el('div', { class: 'companion-name' }, [COMPANION.name]),
      el('div', { class: 'companion-line' }, [line]),
    ]),
  ]);
}

/** Living sealed-vein / chest art for a bonus-crack pick (not glyph pips). */
function geodeSlotArt(index: number, state: 'sealed' | 'cracked' | 'miss'): HTMLElement {
  const stage = el('div', {
    class: `geode-slot-art ${state}`,
    style: `--vein-i:${index};--float-delay:${index * 0.18}s`,
  }, []);
  stage.append(el('div', { class: 'geode-slot-aura', 'aria-hidden': 'true' }, []));
  const img = el('img', {
    class: 'geode-slot-img',
    src: assetUrl(theme().bonusCrackArt),
    alt: '',
    decoding: 'async',
    draggable: 'false',
  }) as HTMLImageElement;
  img.onerror = () => {
    // Art missing: blank pill (never crystal glyphs on Harbor)
    img.replaceWith(el('div', { class: 'geode-slot-glyph geode-slot-glyph-empty' }, []));
  };
  stage.append(img);
  if (state === 'sealed') {
    const sparks = el('div', { class: 'geode-slot-sparks', 'aria-hidden': 'true' }, []);
    for (let s = 0; s < 4; s++) {
      sparks.append(
        el('span', {
          class: 'geode-spark',
          style: `--i:${s};--delay:${s * 0.4 + index * 0.12}s`,
        }, []),
      );
    }
    stage.append(sparks);
  }
  return stage;
}

/**
 * Post-win micro-beat: pick one of three sealed geodes for bonus essence.
 * Variable reward (10 / 18 / 40) — not a second game mode.
 */
function showGeodeCrackModal(onDone?: () => void): void {
  if (document.getElementById('geode-crack-modal')) return;
  if (!app.pendingGeode) {
    onDone?.();
    return;
  }

  const slots = dealGeodeSlots(
    (Date.now() ^ (app.levelId * 7919) ^ (app.lastResult?.score ?? 0)) >>> 0,
  );
  let picked = false;
  const isHarbor = theme().id === 'harbor';
  const sealedWord = isHarbor ? 'chest' : 'vein';

  const grid = el('div', { class: 'geode-grid' }, []);
  for (let i = 0; i < slots.length; i++) {
    const reward = slots[i]!;
    const isJackpot = reward === Math.max(...slots);
    const cell = el(
      'button',
      {
        class: 'geode-slot',
        type: 'button',
        'aria-label': `Sealed ${sealedWord} ${i + 1}`,
      },
      [
        geodeSlotArt(i, 'sealed'),
        el('div', { class: 'geode-slot-label' }, ['Sealed']),
      ],
    ) as HTMLButtonElement;
    cell.addEventListener('click', () => {
      if (picked) return;
      picked = true;
      app.pendingGeode = false;
      economy.grantBonusEssence(reward);
      audio.starDing(isJackpot ? 2 : 1);
      haptic(isJackpot ? 'special' : 'forge');
      cell.classList.add('cracked', isJackpot ? 'jackpot' : 'hit');
      cell.replaceChildren(
        geodeSlotArt(i, 'cracked'),
        el('div', { class: 'geode-slot-reward' }, [
          essFig(reward, { sign: true, size: 'sm' }),
        ]),
        el('div', { class: 'geode-slot-label cracked-label' }, [
          isJackpot ? 'Jackpot' : 'Cracked',
        ]),
      );
      // Reveal siblings as duds (dim) — keep their art, greyscale via CSS
      for (const sibling of grid.querySelectorAll('.geode-slot')) {
        if (sibling === cell) continue;
        const sEl = sibling as HTMLElement;
        sEl.classList.add('miss');
        sEl.setAttribute('disabled', 'true');
        const art = sEl.querySelector('.geode-slot-art');
        if (art) art.classList.add('miss');
        const lab = sEl.querySelector('.geode-slot-label');
        if (lab) lab.textContent = 'Dormant';
      }
      pushToast(
        isJackpot
          ? `Jackpot · +${reward} ${theme().softCurrencyName.toLowerCase()}!`
          : `${L('bonusCrack', 'Geode crack')} · +${reward} ${theme().softCurrencyName.toLowerCase()}`,
        isJackpot ? '#ffd24a' : '#b8f0ff',
        2200,
      );
      const resultLine = companionLine(
        'geodeResult',
        reward + (isJackpot ? 40 : 0),
      );
      const resultEl = document.getElementById('geode-result-line');
      if (resultEl) resultEl.textContent = resultLine;
      window.setTimeout(() => {
        modal.remove();
        onDone?.();
      }, 1200);
    });
    grid.append(cell);
  }

  const modal = el('div', { class: 'geode-crack ceremony-root-layer', id: 'geode-crack-modal' }, [
    el('div', { class: 'geode-crack-card panel-enter' }, [
      companionBubble('geode', app.levelId),
      el('div', { class: 'geode-crack-kicker' }, [
        isHarbor ? 'CRACK A CHEST' : 'CRACK A GEODE',
      ]),
      el('h2', {}, ['Bonus ' + theme().softCurrencyName.toLowerCase()]),
      el('p', { class: 'hud-tip', id: 'geode-result-line' }, [
        isHarbor
          ? 'Pick a sealed lantern — rewards are shuffled.'
          : 'Pick a living geode — one hides a richer crack.',
      ]),
      grid,
      btn(
        'SKIP',
        () => {
          app.pendingGeode = false;
          modal.remove();
          onDone?.();
        },
        'secondary',
      ),
    ]),
  ]);
  mountCeremonyLayer(modal);
  audio.starDing(0);
}

function showDailyGiftModal(gift: { credits: number; essence: number }): void {
  if (document.getElementById('daily-gift-modal')) return;
  const modal = el('div', { class: 'daily-gift ceremony-root-layer', id: 'daily-gift-modal' }, [
    el('div', { class: 'daily-gift-card panel-enter' }, [
      companionBubble('daily', Number(gift.credits + gift.essence)),
      el('div', { class: 'daily-gift-kicker' }, ['DAILY GIFT']),
      el('h2', {}, ['Welcome back']),
      el('div', { class: 'daily-gift-rewards' }, [
        el('div', { class: 'daily-gift-chip' }, [`+${gift.credits} ¢`]),
        el('div', { class: 'daily-gift-chip gold ess-chip' }, [
          essFig(gift.essence, { sign: true, size: 'md' }),
        ]),
      ]),
      el('p', { class: 'hud-tip' }, ['Credits for the shop · ' + theme().softCurrencyName.toLowerCase() + ' for your ' + theme().metaHubName.toLowerCase()]),
      btn(
        'CLAIM',
        () => {
          economy.consumeDailyGift();
          audio.starDing(2);
          haptic('forge');
          modal.remove();
          pushToast(
            `+${gift.credits}¢ · +${gift.essence} ${theme().softCurrencyName.toLowerCase()} claimed`,
            '#ffd24a',
            2200,
          );
        },
        'gold',
      ),
    ]),
  ]);
  mountCeremonyLayer(modal);
  audio.starDing(0);
}

function boosterChip(
  label: string,
  meta: string,
  on: boolean,
  disabled: boolean,
  onClick: () => void,
  art?: string,
): HTMLButtonElement {
  const kids: (Node | string)[] = [];
  if (art) {
    const img = el('img', {
      class: 'booster-chip-art',
      src: assetUrl(art),
      alt: '',
      decoding: 'async',
      draggable: 'false',
    }) as HTMLImageElement;
    img.onerror = () => {
      img.style.display = 'none';
    };
    kids.push(img);
  }
  kids.push(
    el('span', { class: 'booster-chip-body' }, [
      el('span', { class: 'booster-chip-label' }, [label]),
      el('span', { class: 'meta' }, [meta]),
    ]),
  );
  const b = el(
    'button',
    {
      class: `booster-chip${on ? ' on' : ''}${art ? ' has-art' : ''}`,
      type: 'button',
      disabled: disabled ? true : undefined,
    },
    kids,
  ) as HTMLButtonElement;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (disabled) return;
    onClick();
  });
  return b;
}

/** Player-facing names for the four boosters (core tools mid-band). */
const BOOSTER_LABEL: Record<BoosterId, string> = {
  seedPrism: 'Prism seed',
  extraMoves: '+5 moves',
  pickaxe: 'Pickaxe',
  reshuffle: 'Reshuffle',
};

const BOOSTER_COST = () => ECONOMY_CONST.cost.booster;

/** Spend shards for one booster unit. */
function tryBuyBooster(id: BoosterId, returnScreen?: Screen): boolean {
  const res = economy.buyBooster(id, 1);
  if (res.ok) {
    audio.starDing(1);
    haptic('forge');
    pushToast(`${BOOSTER_LABEL[id]} +1 · ${res.shardsSpent} shards`, '#ffd24a', 1800);
    if (returnScreen) {
      app.screen = returnScreen;
    }
    renderOverlay();
    return true;
  }
  if (res.reason === 'insufficientShards') {
    pushToast(
      `Need ${BOOSTER_COST()} ${theme().premiumCurrencyName.toLowerCase()} — or claim a free gift`,
      '#ff9a9a',
      2200,
    );
  } else {
    pushToast('Could not buy tool', '#ff9a9a');
  }
  return false;
}

/** Free gift timer for +1 of a specific booster. */
function watchForBooster(id: BoosterId, returnTo: Screen): void {
  openAd('rewardedBooster', returnTo, id);
}

/**
 * When inventory is empty, offer buy (shards) or free gift.
 * Used from pre-level, play tools, and shop.
 */
function offerBoosterRestock(id: BoosterId, returnTo: Screen): void {
  const cost = BOOSTER_COST();
  const shards = economy.getSnapshot().wallet.shards;
  const name = BOOSTER_LABEL[id];
  // Prefer a quick buy if they can afford it; otherwise open the ad path.
  // Always show both via toast + small choice panel when empty mid-play.
  if (shards >= cost) {
    // Mid-play: buy immediately is least friction.
    if (returnTo === 'play') {
      tryBuyBooster(id);
      return;
    }
  }
  // Pre-level / shop: show a mini choice
  clear(overlay);
  overlay.classList.remove('hidden');
  overlay.style.background = 'rgba(4,8,18,0.72)';
  overlay.style.backdropFilter = 'blur(8px)';
  overlay.style.justifyContent = 'center';
  overlay.style.pointerEvents = 'auto';
  const premium = theme().premiumCurrencyName;
  panel(
    name,
    [
      el('p', { class: 'hud-tip' }, [
        `Out of stock. Buy for ${cost} ${premium.toLowerCase()}, or claim a free gift.`,
      ]),
      el('p', { class: 'hud-tip' }, [`You have ${shards} ${premium.toLowerCase()}.`]),
    ],
    [
      btn(
        `BUY · ${cost}`,
        () => {
          if (tryBuyBooster(id, returnTo)) return;
          // stay on restock if broke
        },
        shards >= cost ? 'gold' : 'secondary',
        shards < cost,
      ),
      btn(`FREE · +1`, () => watchForBooster(id, returnTo), 'primary'),
      btn('BACK', () => {
        app.screen = returnTo;
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-booster-restock' },
  );
}

function chapterForLevel(levelId: number) {
  const chapters = theme().mapChapters;
  return chapters.find((c) => levelId >= c.minId && levelId <= c.maxId) ?? chapters[0]!;
}

function chapterIndexForLevel(levelId: number): number {
  const chapters = theme().mapChapters;
  const i = chapters.findIndex((c) => levelId >= c.minId && levelId <= c.maxId);
  return i >= 0 ? i : 0;
}

/**
 * Scenic art for a map place postcard / pier.
 * Stages 1–4 = classic early map; Act I-C (XVI–XXX, index ≥15) maps across
 * stages 5–8 so expanded caverns/docks match the 300-level catalogue.
 */
function chapterPlaceArt(chapterIndex: number): string {
  const stages = theme().metaStages;
  const ch = theme().mapChapters[chapterIndex];
  const n = stages.length;
  if (n === 0) return themeUi('ui/map_bg.webp');

  // Act I-C: XVI–XXX (indices 15–29) → stages 5–8 when present
  if (n >= 8 && chapterIndex >= 15) {
    // 15–18→5, 19–22→6, 23–26→7, 27–29→8
    const band = Math.min(3, Math.floor((chapterIndex - 15) / 4));
    const si = 4 + band;
    if (stages[si]?.art) return stages[si]!.art;
  } else if (n >= 6 && chapterIndex >= 15) {
    const si = chapterIndex < 23 ? 4 : 5;
    if (stages[si]?.art) return stages[si]!.art;
  }

  // Early chapters: 1:1 with meta stages when available
  if (stages[chapterIndex]?.art) return stages[chapterIndex]!.art;

  // Mid band: cycle by depth so postcards stay varied
  const depthToStage: Record<string, number> = {
    shallow: 0,
    mid: 1,
    deep: Math.min(2, n - 1),
    core: Math.min(3, n - 1),
  };
  const si = depthToStage[ch?.depth ?? 'shallow'] ?? chapterIndex % n;
  if (stages[si]?.art) return stages[si]!.art;
  return themeUi('ui/map_bg.webp');
}

/**
 * Floating marker positions along a pier / place walk (percent of pier stage).
 * Gentle S-curve so balls feel like lanterns along a dock, not a grid.
 */
function pierMarkerPoints(count: number): { x: number; y: number }[] {
  if (count <= 0) return [];
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = 10 + t * 80;
    const wave = Math.sin(t * Math.PI * 2.2) * 18;
    const lane = i % 2 === 0 ? -10 : 12;
    const y = 48 + wave + lane;
    pts.push({
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(18, Math.min(82, y)),
    });
  }
  return pts;
}

/**
 * Smooth pier path — dim trail + progress glow + optional Act I-C lantern dots.
 * `region`: '' early · 'channel' Outer/Under · 'treaty' Treaty/Regent
 */
function buildPierPathSvg(
  points: readonly { x: number; y: number }[],
  progressCount: number,
  region: '' | 'channel' | 'treaty' = '',
): SVGSVGElement {
  const pathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  pathSvg.setAttribute(
    'class',
    `pier-path${region ? ` pier-path-${region}` : ''}`,
  );
  pathSvg.setAttribute('viewBox', '0 0 100 100');
  pathSvg.setAttribute('preserveAspectRatio', 'none');
  if (points.length < 2) return pathSvg;

  // Catmull-Rom-ish smooth path via quadratic midpoints (reads as rope / water trail)
  const smoothD = (list: readonly { x: number; y: number }[]): string => {
    if (list.length < 2) return '';
    let d = `M ${list[0]!.x.toFixed(1)} ${list[0]!.y.toFixed(1)}`;
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]!;
      const cur = list[i]!;
      const mx = (prev.x + cur.x) / 2;
      const my = (prev.y + cur.y) / 2;
      d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      if (i === list.length - 1) {
        d += ` T ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
      }
    }
    return d;
  };

  // Soft under-glow for Act I-C regions
  if (region) {
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('d', smoothD(points));
    glow.setAttribute('class', 'map-path-line map-path-glow');
    pathSvg.appendChild(glow);
  }

  const pathAll = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathAll.setAttribute('d', smoothD(points));
  pathAll.setAttribute('class', 'map-path-line map-path-dim');
  pathSvg.appendChild(pathAll);

  const progN = Math.max(0, Math.min(points.length, progressCount));
  if (progN >= 2) {
    const pathProg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathProg.setAttribute('d', smoothD(points.slice(0, progN)));
    pathProg.setAttribute('class', 'map-path-line map-path-progress');
    pathSvg.appendChild(pathProg);
  }

  // Lantern / gem dots along the path (progress filled)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const lit = i < progressCount;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x.toFixed(1));
    dot.setAttribute('cy', p.y.toFixed(1));
    dot.setAttribute('r', region ? '1.35' : '1.1');
    dot.setAttribute(
      'class',
      lit ? 'map-path-dot map-path-dot-lit' : 'map-path-dot map-path-dot-dim',
    );
    pathSvg.appendChild(dot);
  }

  return pathSvg;
}

function starCountForLevel(
  stars: Record<number, number> | Record<string, number>,
  levelId: number,
): number {
  return Number(
    stars[levelId as keyof typeof stars] ??
      stars[String(levelId) as keyof typeof stars] ??
      0,
  );
}

function chapterStats(ch: { minId: number; maxId: number }, snap: ReturnType<Economy['getSnapshot']>) {
  const levels = LEVELS.filter((l) => l.id >= ch.minId && l.id <= ch.maxId);
  let chStars = 0;
  let chCleared = 0;
  for (const lvl of levels) {
    const s = starCountForLevel(snap.progress.stars, lvl.id);
    chStars += s;
    if (s > 0) chCleared += 1;
  }
  const open = levels.some((l) => l.id <= snap.progress.highestUnlocked);
  const done =
    levels.length > 0 && levels[levels.length - 1]!.id < snap.progress.highestUnlocked;
  return { levels, chStars, chCleared, open, done, maxStars: levels.length * 3 };
}

/** Compact retention badges — claimable daily / idle only shout; rest are quiet doors. */
function mapRetentionStrip(snap: ReturnType<Economy['getSnapshot']>): HTMLElement {
  const strip = el('div', { class: 'map-retention-strip' }, []);
  const daily = snap.daily;
  const idle = snap.idle;

  const dailyB = el(
    'button',
    {
      class: `map-ret-chip${daily.claimReady ? ' hot' : ''}`,
      type: 'button',
      title: 'Daily goal',
    },
    [
      daily.claimReady
        ? el('span', { class: 'map-ret-hot' }, ['CLAIM'])
        : document.createTextNode(
            `Daily ${Math.min(daily.clears, daily.target)}/${daily.target}`,
          ),
    ],
  ) as HTMLButtonElement;
  dailyB.addEventListener('click', () => {
    if (daily.claimReady) {
      const n = economy.claimDailyGoal();
      if (n > 0) {
        audio.starDing(2);
        haptic('forge');
        pushToast(
          `Daily · +${n} ${theme().softCurrencyName.toLowerCase()}`,
          '#ffd24a',
          2200,
        );
      }
      renderOverlay();
      return;
    }
    pushToast(
      daily.claimed
        ? `Streak ${daily.winStreak} · daily claimed`
        : `${daily.clears}/${daily.target} clears for daily`,
      '#ffc878',
      1800,
    );
  });

  const idleB = el(
    'button',
    {
      class: `map-ret-chip${idle.pending > 0 ? ' hot' : ''}`,
      type: 'button',
      title: L('idleClaim', 'Idle'),
    },
    idle.pending > 0
      ? [
          document.createTextNode('Idle '),
          essFig(idle.pending, { sign: true, size: 'xs' }),
        ]
      : [document.createTextNode(theme().id === 'harbor' ? 'Docks' : 'Idle')],
  ) as HTMLButtonElement;
  idleB.addEventListener('click', () => {
    if (idle.pending > 0) {
      const n = economy.claimIdleEssence();
      if (n > 0) {
        audio.starDing(1);
        pushToast(
          `${L('idleClaim', 'Idle')} · +${n} ${theme().softCurrencyName.toLowerCase()}`,
          '#b8f0ff',
          2000,
        );
      }
      renderOverlay();
      return;
    }
    app.screen = 'cavern';
    renderOverlay();
  });

  const moreB = el(
    'button',
    { class: 'map-ret-chip', type: 'button', title: 'Album & event' },
    ['More'],
  ) as HTMLButtonElement;
  moreB.addEventListener('click', () => {
    // Quick door — album first; event from album/footer elsewhere
    app.screen = 'album';
    renderOverlay();
  });

  strip.append(dailyB, idleB, moreB);
  return strip;
}

function makeLevelMarkerBall(
  lvl: (typeof LEVELS)[number],
  snap: ReturnType<Economy['getSnapshot']>,
  nextPlayId: number,
  pos: { x: number; y: number },
): HTMLButtonElement {
  const locked = lvl.id > snap.progress.highestUnlocked;
  const stars = starCountForLevel(snap.progress.stars, lvl.id);
  const isNext = lvl.id === nextPlayId && !locked;
  const boss = isBossLevel(lvl.id);
  const starKids: (string | Node)[] = locked
    ? []
    : stars > 0
      ? [0, 1, 2].slice(0, Math.min(3, stars)).map(() =>
          el('img', {
            class: 'level-star-img',
            src: assetUrl(themeUi('ui/icon_star_on.webp')),
            alt: '',
            decoding: 'async',
            draggable: 'false',
          }),
        )
      : [];
  const kids: (string | Node)[] = [
    el('span', { class: 'level-num' }, [String(lvl.id)]),
  ];
  if (starKids.length) kids.push(el('div', { class: 'level-stars' }, starKids));
  if (boss) kids.push(el('div', { class: 'level-boss-tag' }, ['BOSS']));
  if (isNext) kids.push(el('div', { class: 'level-you' }, ['YOU']));

  const b = el(
    'button',
    {
      class: `level-node pier-ball${locked ? ' locked' : ''}${lvl.id === app.levelId ? ' current' : ''}${stars > 0 ? ' cleared' : ''}${isNext ? ' next-play' : ''}${boss ? ' boss' : ''}`,
      type: 'button',
      disabled: locked ? true : undefined,
      style: `left:${pos.x}%;top:${pos.y}%`,
      title:
        (boss ? 'Boss · ' : '') +
        (stars > 0 ? `${stars} star${stars === 1 ? '' : 's'}` : locked ? 'Locked' : 'Play'),
    },
    kids,
  ) as HTMLButtonElement;
  if (!locked) {
    b.addEventListener('click', () => {
      app.levelId = lvl.id;
      app.screen = 'prelevel';
      renderOverlay();
    });
  }
  return b;
}

/** Retention home: places as postcards + fat PLAY → prelevel (fast session start). */
function renderHarborOverview(): void {
  const snap = economy.getSnapshot();
  const nextPlayId = Math.min(LEVEL_COUNT, snap.progress.highestUnlocked);
  const nextCh = chapterForLevel(nextPlayId);
  const nextIdx = chapterIndexForLevel(nextPlayId);
  const placeList = el('div', { class: 'place-list' }, []);
  const chapters = theme().mapChapters;

  // Finished-product window: don't dump every locked chapter — show current
  // neighborhood (≈6 cards) so mid-campaign still scrolls like Harbor, not a spreadsheet.
  const WINDOW = 6;
  const start = Math.max(0, Math.min(chapters.length - WINDOW, nextIdx - 2));
  const end = Math.min(chapters.length, Math.max(start + WINDOW, nextIdx + 2));
  if (start > 0) {
    placeList.append(
      el('div', { class: 'place-list-more' }, [
        `Earlier · ${start} place${start === 1 ? '' : 's'} cleared behind you`,
      ]),
    );
  }

  for (let index = start; index < end; index++) {
    const ch = chapters[index]!;
    const { levels, chStars, chCleared, open, done } = chapterStats(ch, snap);
    if (levels.length === 0) continue;
    const isCurrent = index === nextIdx;
    // Act I-C region (XVI–XXX) — new postcard art + soft "OUTER" / "CROWN" pill
    const isActIc = index >= 15;
    const regionPill =
      isActIc && open
        ? el(
            'span',
            { class: 'place-card-region-pill' },
            [theme().id === 'harbor' ? (index < 23 ? 'CHANNEL' : 'TREATY') : index < 23 ? 'UNDER' : 'REGENT'],
          )
        : null;
    const card = el(
      'button',
      {
        class: `place-card depth-${ch.depth}${open ? '' : ' locked'}${done ? ' done' : ''}${isCurrent ? ' current' : ''}${isActIc ? ' region-new' : ''}`,
        type: 'button',
        disabled: open ? undefined : true,
      },
      [
        el('img', {
          class: 'place-card-art',
          src: assetUrl(chapterPlaceArt(index)),
          alt: '',
          decoding: 'async',
          draggable: 'false',
        }),
        el('div', { class: 'place-card-scrim' }, []),
        el('div', { class: 'place-card-body' }, [
          el('div', { class: 'place-card-kicker' }, [
            ch.roman + (done ? ' · done' : isCurrent ? ' · here' : open ? '' : ' · locked'),
            ...(regionPill ? [regionPill] : []),
          ]),
          el('div', { class: 'place-card-title' }, [ch.title]),
          el('div', { class: 'place-card-meta' }, [
            open
              ? el('span', { class: 'place-card-meta-stars' }, [
                  document.createTextNode(`${chCleared}/${levels.length} · ${chStars}`),
                  el('img', {
                    class: 'inline-star',
                    src: assetUrl(themeUi('ui/icon_star_on.webp')),
                    alt: '',
                    decoding: 'async',
                  }),
                ])
              : theme().id === 'harbor'
                ? 'Reach this dock'
                : 'Reach this chamber',
          ]),
        ]),
      ],
    ) as HTMLButtonElement;
    if (open) {
      card.addEventListener('click', () => {
        app.mapChapterIndex = index;
        audio.panelWhoosh();
        renderOverlay();
      });
    }
    placeList.append(card);
  }

  if (end < chapters.length) {
    placeList.append(
      el('div', { class: 'place-list-more' }, [
        `Further out · ${chapters.length - end} place${chapters.length - end === 1 ? '' : 's'} ahead`,
      ]),
    );
  }

  // Scroll current place into view after paint
  requestAnimationFrame(() => {
    placeList.querySelector('.place-card.current')?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  });

  const playLabel = `${L('playCta', 'PLAY')} · ${nextPlayId}`;
  const homeTitle = L('mapTitle', theme().id === 'harbor' ? 'The Harbor' : 'The Mine');
  const isHarbor = theme().id === 'harbor';

  // Act I-C spotlight — show once the player can reach Outer Channels / Under-Crown
  const actIcOpen = nextPlayId >= 151;
  const actIcCh = chapters[15] ?? chapters[Math.min(chapters.length - 1, 15)];
  let actIcSpotlight: HTMLElement | null = null;
  if (actIcOpen && actIcCh) {
    const regionArt = chapterPlaceArt(15);
    actIcSpotlight = el(
      'button',
      {
        class: 'actic-spotlight',
        type: 'button',
      },
      [
        el('img', {
          class: 'actic-spotlight-art',
          src: assetUrl(regionArt),
          alt: '',
          decoding: 'async',
          draggable: 'false',
        }),
        el('div', { class: 'actic-spotlight-scrim' }, []),
        el('div', { class: 'actic-spotlight-body' }, [
          el('div', { class: 'actic-spotlight-k' }, [
            isHarbor ? 'OUTER CHANNELS' : 'UNDER-CROWN',
          ]),
          el('div', { class: 'actic-spotlight-v' }, [actIcCh.title]),
          el('div', { class: 'actic-spotlight-meta' }, [
            nextPlayId >= 151 && nextPlayId <= 300
              ? `Your run · L${nextPlayId}`
              : 'Chapters XVI–XXX · open',
          ]),
        ]),
      ],
    ) as HTMLButtonElement;
    actIcSpotlight.addEventListener('click', () => {
      app.mapChapterIndex = Math.min(chapters.length - 1, Math.max(15, nextIdx));
      audio.panelWhoosh();
      renderOverlay();
    });
  }

  const foot = el('div', { class: 'map-foot' }, [
    btn(playLabel, () => {
      app.levelId = nextPlayId;
      app.mapChapterIndex = nextIdx;
      app.screen = 'prelevel';
      audio.titleSting();
      renderOverlay();
    }, 'gold'),
    el('div', { class: 'map-foot-secondary' }, [
      btn(isHarbor ? 'DOCKS' : 'CAVERN', () => {
        app.screen = 'cavern';
        renderOverlay();
      }, 'secondary'),
      btn('SHOP', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
      btn('SET', () => {
        app.screen = 'settings';
        renderOverlay();
      }, 'secondary'),
    ]),
  ]);

  panel(
    homeTitle,
    [
      el('div', { class: 'map-home-hud' }, [
        el('div', { class: 'map-home-lives' }, [
          el('img', {
            class: 'map-home-icon',
            src: assetUrl(themeUi('ui/icon_lives.webp')),
            alt: '',
            decoding: 'async',
          }),
          el('span', {}, [String(snap.lives.count)]),
        ]),
        el('div', { class: 'map-home-next' }, [
          el('span', { class: 'map-home-next-k' }, [nextCh.title]),
          el('span', { class: 'map-home-next-v' }, [`Level ${nextPlayId}`]),
        ]),
        el('div', { class: 'map-home-currency' }, [
          essFig(snap.meta.essence, { size: 'sm' }),
        ]),
      ]),
      mapRetentionStrip(snap),
      ...(actIcSpotlight ? [actIcSpotlight] : []),
      placeList,
      foot,
    ],
    [],
    { className: 'panel-map-home' },
  );
}

/** Inside a place: scenic pier/walk with floating level markers. */
function renderChapterPier(chapterIndex: number): void {
  const snap = economy.getSnapshot();
  const chapters = theme().mapChapters;
  const ch = chapters[chapterIndex] ?? chapters[0]!;
  const { levels, chStars, chCleared, maxStars } = chapterStats(ch, snap);
  const nextPlayId = Math.min(LEVEL_COUNT, snap.progress.highestUnlocked);
  const points = pierMarkerPoints(levels.length);
  const progressInChapter = levels.filter((l) => l.id <= snap.progress.highestUnlocked).length;

  const actIc = chapterIndex >= 15;
  const region: '' | 'channel' | 'treaty' = !actIc
    ? ''
    : chapterIndex < 23
      ? 'channel'
      : 'treaty';
  const stage = el(
    'div',
    {
      class: `pier-stage depth-${ch.depth}${region ? ` pier-region-${region}` : ''}`,
    },
    [
      el('img', {
        class: 'pier-stage-art',
        src: assetUrl(chapterPlaceArt(chapterIndex)),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
      el('div', { class: 'pier-stage-scrim' }, []),
    ],
  );
  // Soft floating lantern/spark motes on Act I-C piers
  if (region) {
    const motes = el('div', { class: 'pier-motes', 'aria-hidden': 'true' }, []);
    for (let i = 0; i < 8; i++) {
      motes.append(
        el('span', {
          class: 'pier-mote',
          style: `--i:${i};--x:${12 + (i * 11) % 76}%;--delay:${(i % 5) * 0.35}s`,
        }, []),
      );
    }
    stage.append(motes);
  }
  stage.append(buildPierPathSvg(points, progressInChapter, region));

  const markers = el('div', { class: 'pier-markers' }, []);
  levels.forEach((lvl, i) => {
    const pos = points[i] ?? { x: 50, y: 50 };
    const ball = makeLevelMarkerBall(lvl, snap, nextPlayId, pos);
    if (region) ball.classList.add(`pier-ball-${region}`);
    markers.append(ball);
  });
  stage.append(markers);

  const playThis =
    nextPlayId >= ch.minId && nextPlayId <= ch.maxId
      ? nextPlayId
      : levels.find((l) => l.id <= snap.progress.highestUnlocked && starCountForLevel(snap.progress.stars, l.id) === 0)?.id
        ?? levels.filter((l) => l.id <= snap.progress.highestUnlocked).slice(-1)[0]?.id
        ?? ch.minId;

  const pierFoot = el('div', { class: 'map-foot' }, [
    btn(
      `PLAY · ${playThis}`,
      () => {
        app.levelId = playThis;
        app.screen = 'prelevel';
        audio.titleSting();
        renderOverlay();
      },
      'gold',
      playThis > snap.progress.highestUnlocked,
    ),
    el('div', { class: 'map-foot-secondary' }, [
      btn('PLACES', () => {
        app.mapChapterIndex = null;
        audio.panelWhoosh();
        renderOverlay();
      }, 'secondary'),
    ]),
  ]);

  const regionLabel =
    region === 'channel'
      ? theme().id === 'harbor'
        ? 'Outer Channel'
        : 'Under-Crown'
      : region === 'treaty'
        ? theme().id === 'harbor'
          ? 'Storm Treaty'
          : 'Regent Peak'
        : '';

  panel(
    `${ch.roman} · ${ch.title}`,
    [
      el('div', { class: 'pier-meta pier-meta-stars' }, [
        document.createTextNode(`${chCleared}/${levels.length} cleared · ${chStars}/${maxStars}`),
        el('img', {
          class: 'inline-star',
          src: assetUrl(themeUi('ui/icon_star_on.webp')),
          alt: 'stars',
          decoding: 'async',
        }),
        ...(regionLabel
          ? [el('span', { class: `pier-region-tag pier-region-tag-${region}` }, [regionLabel])]
          : []),
      ]),
      stage,
      pierFoot,
    ],
    [],
    { className: `panel-pier${region ? ` panel-pier-${region}` : ''}` },
  );
}

function renderMap(): void {
  if (app.mapChapterIndex !== null) {
    const n = theme().mapChapters.length;
    const i = Math.max(0, Math.min(n - 1, app.mapChapterIndex));
    app.mapChapterIndex = i;
    renderChapterPier(i);
    return;
  }
  renderHarborOverview();
}

function renderPrelevel(): void {
  const level = getLevel(app.levelId);
  const snap = economy.getSnapshot();
  if (snap.boosters.seedPrism <= 0) app.prep.seedPrism = false;
  if (snap.boosters.extraMoves <= 0) app.prep.extraMoves = false;
  const best = starCountForLevel(snap.progress.stars, level.id);
  const ch = chapterForLevel(level.id);

  // Harbor Outer Channels / Treaty bands get dedicated prelevel banners when present
  const bannerArt =
    theme().id === 'harbor' && level.id >= 251
      ? themeUi('ui/prelevel_treaty.webp')
      : theme().id === 'harbor' && level.id >= 151
        ? themeUi('ui/prelevel_outer.webp')
        : level.id <= 10
          ? themeUi('ui/prelevel_banner.webp')
          : level.id <= 40
            ? themeUi('ui/prelevel_mid.webp')
            : themeUi('ui/prelevel_deep.webp');
  const boss = level.boss === true || isBossLevel(level.id);
  const banner = el('div', { class: `level-banner depth-${ch.depth}${boss ? ' boss' : ''}` }, [
    el('img', {
      class: 'level-banner-art',
      src: assetUrl(bannerArt),
      alt: '',
      decoding: 'async',
    }),
    el('div', { class: 'level-banner-scrim' }, []),
    el('div', { class: 'level-banner-content' }, [
      el('div', { class: 'level-banner-num' }, [`${level.id}`]),
      el('div', { class: 'level-banner-body' }, [
        el('div', { class: 'level-banner-chapter' }, [`${ch.roman} · ${ch.title}`]),
        el('div', { class: 'level-banner-name' }, [level.name]),
        el('div', { class: 'level-banner-meta' }, [`${level.moves} moves`]),
      ]),
    ]),
  ]);

  // Free goal icons — no how-to walls inside form chips
  const goals = el('div', { class: 'goal-row goal-row-free' }, [
    ...level.objectives.map((o) =>
      el('div', { class: 'goal-chip goal-chip-free' }, [
        el('img', {
          class: 'goal-icon',
          src: assetUrl(objectiveIconPath(o.kind)),
          alt: OBJECTIVE_LABEL[o.kind],
          decoding: 'async',
          draggable: 'false',
        }),
        el('span', { class: 'goal-v' }, [`×${o.target}`]),
      ]),
    ),
  ]);

  // Prelevel: banner + goals + optional boosters + PLAY. Rest lives on docks / shop.
  const prismEmpty = snap.boosters.seedPrism <= 0;
  const movesEmpty = snap.boosters.extraMoves <= 0;
  const chips = el('div', { class: 'booster-row' }, [
    boosterChip(
      `Prism ${app.prep.seedPrism ? 'ON' : ''}`,
      prismEmpty ? 'GET' : `×${snap.boosters.seedPrism}`,
      app.prep.seedPrism,
      false,
      () => {
        if (prismEmpty) {
          offerBoosterRestock('seedPrism', 'prelevel');
          return;
        }
        app.prep.seedPrism = !app.prep.seedPrism;
        renderOverlay();
      },
      themeUi('ui/booster_prism.webp'),
    ),
    boosterChip(
      `+5 moves ${app.prep.extraMoves ? 'ON' : ''}`,
      movesEmpty ? 'GET' : `×${snap.boosters.extraMoves}`,
      app.prep.extraMoves,
      false,
      () => {
        if (movesEmpty) {
          offerBoosterRestock('extraMoves', 'prelevel');
          return;
        }
        app.prep.extraMoves = !app.prep.extraMoves;
        renderOverlay();
      },
      themeUi('ui/booster_moves.webp'),
    ),
  ]);

  const titleKids: (string | Node)[] = [
    el('span', { class: 'prelevel-title-num' }, [`Level ${level.id}`]),
  ];
  if (boss) {
    titleKids.push(el('span', { class: 'prelevel-boss-badge' }, ['BOSS']));
  }
  // Act I-C region badge on prelevel
  if (level.id >= 151) {
    const regionName =
      theme().id === 'harbor'
        ? level.id >= 251
          ? 'STORM TREATY'
          : 'OUTER CHANNEL'
        : level.id >= 251
          ? 'REGENT PEAK'
          : 'UNDER-CROWN';
    titleKids.push(
      el(
        'span',
        {
          class: `prelevel-region-badge${level.id >= 251 ? ' treaty' : ' channel'}`,
        },
        [regionName],
      ),
    );
  }

  panel(
    '', // custom title row below (clear BOSS type, not display-face S/8 mix-up)
    [
      el('div', { class: 'prelevel-title-row' }, titleKids),
      banner,
      goals,
      ...(best > 0
        ? [
            el('div', { class: 'prelevel-best-stars' }, [
              ...[0, 1, 2].map((i) =>
                el('img', {
                  class: 'level-star-img',
                  src: assetUrl(
                    themeUi(i < best ? 'ui/icon_star_on.webp' : 'ui/icon_star_off.webp'),
                  ),
                  alt: '',
                  decoding: 'async',
                }),
              ),
            ]),
          ]
        : []),
      chips,
    ],
    [
      btn('PLAY', () => {
        startLevel(app.levelId, { ...app.prep });
        app.prep = { seedPrism: false, extraMoves: false };
      }, 'gold'),
      btn('BACK', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: `panel-prelevel${boss ? ' is-boss' : ''}` },
  );
}

/** Loss-aversion near-miss UI — life is only burned if the player declines. */
function renderContinueOffer(): void {
  const r = app.lastResult;
  const progress = app.session ? Math.round(objectiveProgressRatio(app.session) * 100) : 0;
  const cost = ECONOMY_CONST.cost.extraMoves5;
  const canPay = economy.getSnapshot().wallet.shards >= cost;
  const isHarbor = theme().id === 'harbor';

  // Peak loss-aversion moment: big progress, one gold rescue, quiet exit.
  panel(
    '',
    [
      el('div', { class: 'continue-ceremony' }, [
        el('div', { class: 'continue-kicker' }, [
          isHarbor ? 'SO CLOSE' : 'SO CLOSE',
        ]),
        el('div', { class: 'continue-pct-ring' }, [
          el('div', { class: 'continue-pct' }, [`${progress}%`]),
          el('div', { class: 'continue-pct-label' }, ['cleared']),
        ]),
        el('div', { class: 'continue-title' }, ['One more push?']),
        el('p', { class: 'continue-sub' }, [
          r
            ? `Score ${r.score.toLocaleString('en-US')} · +5 moves to finish`
            : '+5 moves to finish the board',
        ]),
      ]),
    ],
    [
      btn(
        canPay ? `+5 MOVES · ${cost}` : `+5 MOVES · ${cost} (need tokens)`,
        () => acceptContinue('shards'),
        'gold',
        !canPay,
      ),
      btn('FREE · +5 MOVES', () => acceptContinue('ad'), 'primary'),
      btn(
        isHarbor ? 'WALK AWAY · lose a life' : 'GIVE UP · lose a life',
        () => declineContinue(),
        'secondary',
      ),
    ],
    { className: 'panel-continue' },
  );
}

/** One big reward chip for the results ceremony (currency / streak only as chips). */
function resultsRewardChip(
  kind: 'currency' | 'streak',
  title: string,
  valueNode: string | Node | (string | Node)[],
): HTMLElement {
  const kids: (string | Node)[] = [];
  if (kind === 'currency') {
    kids.push(
      el('img', {
        class: 'results-reward-icon',
        src: assetUrl(theme().bonusCrackArt),
        alt: '',
        decoding: 'async',
      }),
    );
  } else {
    kids.push(
      el('img', {
        class: 'results-reward-icon',
        src: assetUrl(themeUi('ui/icon_streak.webp')),
        alt: '',
        decoding: 'async',
      }),
    );
  }
  kids.push(
    el('div', { class: 'results-reward-text' }, [
      el('div', { class: 'results-reward-k' }, [title]),
      el(
        'div',
        { class: 'results-reward-v' },
        Array.isArray(valueNode) ? valueNode : [valueNode],
      ),
    ]),
  );
  return el('div', { class: `results-reward-chip kind-${kind}` }, kids);
}

/**
 * Win-screen album hero tray — full crystal atlas faces + names.
 * Board gem sheet (1024×640 @ 128px cells); display 72px via scaled background.
 */
function resultsAlbumLootStrip(
  granted: readonly { readonly id: string; readonly rarity: string }[],
  rareCount: number,
): HTMLElement {
  const sheet = getAlbumSheet();
  const sheetUrl = assetUrl(sheet);
  // Display size / frame size
  const facePx = 72;
  const frame = 128;
  const scale = facePx / frame;
  const sheetW = Math.round(1024 * scale);
  const sheetH = Math.round(640 * scale);

  const wrap = el('div', { class: 'results-album-loot results-album-loot-hero' }, [
    el('div', { class: 'results-album-loot-head' }, [
      el('img', {
        class: 'results-album-loot-icon',
        src: assetUrl(theme().livingCorePath),
        alt: '',
        decoding: 'async',
      }),
      el('div', { class: 'results-album-loot-k' }, [
        rareCount > 0
          ? `Album · ${rareCount} rare pull${rareCount === 1 ? '' : 's'}`
          : `Album · +${granted.length} keepsake${granted.length === 1 ? '' : 's'}`,
      ]),
    ]),
  ]);
  const row = el('div', { class: 'results-album-row' }, []);
  const show = granted.slice(0, 6);
  show.forEach((g, i) => {
    const def = getAlbumCards().find((c) => c.id === g.id);
    const face = el('div', {
      class: `results-album-face rarity-${g.rarity}`,
      style: `--i:${i};--shard-glow:${def?.glow ?? '#ffd24a'}`,
      title: def?.name ?? g.id,
    }, []) as HTMLElement;

    if (def) {
      const bx = Math.round(def.atlas.x * scale);
      const by = Math.round(def.atlas.y * scale);
      face.append(
        el('div', {
          class: 'results-album-sprite',
          style: [
            `background-image:url(${sheetUrl})`,
            `background-size:${sheetW}px ${sheetH}px`,
            `background-position:-${bx}px -${by}px`,
          ].join(';'),
        }, []),
      );
      face.append(
        el('div', { class: 'results-album-face-glow', 'aria-hidden': 'true' }, []),
      );
      if (g.rarity === 'rare' || g.rarity === 'uncommon') {
        face.append(
          el(
            'span',
            { class: `results-album-rare-tag tag-${g.rarity}` },
            [g.rarity === 'rare' ? 'RARE' : 'UNCM'],
          ),
        );
      }
      face.append(el('span', { class: 'results-album-name' }, [def.name]));
    } else {
      // Last-resort: still try essence art, never a bare letter chip if we can help it
      face.append(
        el('img', {
          class: 'results-album-sprite-img',
          src: assetUrl(theme().bonusCrackArt),
          alt: g.id,
          decoding: 'async',
        }),
      );
    }
    row.append(face);
  });
  if (granted.length > show.length) {
    row.append(
      el('div', { class: 'results-album-more' }, [`+${granted.length - show.length}`]),
    );
  }
  wrap.append(row);
  wrap.append(
    el('button', {
      class: 'results-album-open',
      type: 'button',
    }, ['View album']) as HTMLButtonElement,
  );
  const openBtn = wrap.querySelector('.results-album-open') as HTMLButtonElement;
  openBtn?.addEventListener('click', () => {
    app.pendingGeode = false;
    app.screen = 'album';
    renderOverlay();
  });
  return wrap;
}

/** PLACE CTA with prop art when docks/cavern placement is ready (not a form chip). */
function resultsPlaceCta(upgrade: { name: string; art: string }, isHarbor: boolean): HTMLElement {
  const b = el(
    'button',
    {
      class: 'btn gold results-place-cta',
      type: 'button',
    },
    [
      el('img', {
        class: 'results-place-cta-art',
        src: assetUrl(upgrade.art),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
      el('span', { class: 'results-place-cta-copy' }, [
        el('span', { class: 'results-place-cta-k' }, [
          isHarbor ? 'Ready on the docks' : 'Ready in the cavern',
        ]),
        el('span', { class: 'results-place-cta-v' }, [upgrade.name]),
      ]),
    ],
  ) as HTMLButtonElement;
  b.addEventListener('click', () => {
    app.pendingGeode = false;
    app.screen = 'cavern';
    renderOverlay();
  });
  return b;
}

function renderResults(): void {
  const r = app.lastResult;
  if (!r) {
    app.screen = 'map';
    renderOverlay();
    return;
  }
  const snap = economy.getSnapshot();
  const isHarbor = theme().id === 'harbor';
  const nStars = Math.max(0, Math.min(3, r.stars));
  const perfect = r.status === 'won' && nStars >= 3;

  const afterWinExit = (then: () => void): void => {
    if (app.pendingActIcCeremony) {
      app.pendingActIcCeremony = false;
      showActIcUnlockCeremony(then);
      return;
    }
    then();
  };

  const leaveResults = (screen: typeof app.screen): void => {
    const go = () => {
      app.pendingGeode = false;
      afterWinExit(() => {
        app.screen = screen;
        renderOverlay();
      });
    };
    // Leaving with unclaimed chest still offers the bonus once
    if (r.status === 'won' && app.pendingGeode) {
      showGeodeCrackModal(go);
    } else {
      go();
    }
  };

  const goNextLevel = (skipChest: boolean): void => {
    if (skipChest) app.pendingGeode = false;
    if (r.status === 'won' && app.levelId < LEVEL_COUNT) {
      const advance = () => {
        app.levelId = Math.min(LEVEL_COUNT, app.levelId + 1);
        app.screen = 'prelevel';
        renderOverlay();
      };
      if (app.pendingGeode && !skipChest) {
        showGeodeCrackModal(() => {
          app.pendingGeode = false;
          afterWinExit(advance);
        });
        return;
      }
      app.pendingGeode = false;
      afterWinExit(advance);
      return;
    }
    if (r.status === 'lost') {
      app.screen = 'prelevel';
      renderOverlay();
      return;
    }
    leaveResults('map');
  };

  // ---- LOSE: short, clear, one recovery path ----
  if (r.status === 'lost') {
    panel(
      'Almost…',
      [
        el('div', { class: 'results-fail-hero' }, [
          el('img', {
            class: 'life-spent-icon',
            src: assetUrl(themeUi('ui/icon_life_spent.webp')),
            alt: '',
            decoding: 'async',
          }),
          el('div', { class: 'results-fail-score' }, [r.score.toLocaleString('en-US')]),
          el('div', { class: 'results-burst-label' }, ['SCORE']),
          el('p', { class: 'results-fail-copy' }, ['A life was spent. You’ve got this.']),
        ]),
      ],
      [
        btn('RETRY', () => goNextLevel(true), 'gold'),
        btn('LEVELS', () => leaveResults('map'), 'secondary'),
      ],
      { className: 'panel-results lose' },
    );
    return;
  }

  // ---- WIN: ceremony first, then fat rewards, then one primary CTA ----
  const headline =
    perfect
      ? isHarbor
        ? 'PERFECT SORT!'
        : 'PERFECT CLEAR!'
      : nStars === 2
        ? 'GREAT CLEAR!'
        : isHarbor
          ? 'DOCK CLEAR!'
          : 'LEVEL CLEAR!';

  const starsEl = el('div', { class: 'results-burst-stars results-stars-hero' }, []);
  const scoreEl = el('div', { class: 'results-burst-score' }, ['0']);
  const titleEl = el('div', { class: 'results-hero-title' }, [headline]);

  const burst = el('div', { class: `results-burst results-ceremony${perfect ? ' perfect' : ''}` }, [
    el('img', {
      class: 'results-burst-art',
      src: assetUrl(themeUi('ui/win_banner.webp')),
      alt: '',
      decoding: 'async',
    }),
    el('div', { class: 'results-burst-scrim' }, []),
    el('div', { class: 'results-burst-content' }, [
      titleEl,
      starsEl,
      scoreEl,
      el('div', { class: 'results-burst-label' }, ['SCORE']),
    ]),
  ]);

  // Star pop + score count-up (slightly longer = bigger deal)
  for (let i = 0; i < 3; i++) {
    const on = i < nStars;
    const s = el('img', {
      class: `star-pop-img results-star-lg${on ? ' on' : ''}`,
      src: assetUrl(themeUi(on ? 'ui/icon_star_on.webp' : 'ui/icon_star_off.webp')),
      alt: on ? 'star' : '',
      decoding: 'async',
      draggable: 'false',
    }) as HTMLImageElement;
    s.style.animationDelay = `${180 + i * 320}ms`;
    starsEl.append(s);
    if (on) {
      window.setTimeout(() => {
        audio.starDing(i);
        if (i === nStars - 1) haptic(perfect ? 'specialBig' : 'forge');
      }, 200 + i * 320);
    }
  }
  {
    const target = r.score;
    const start = performance.now();
    const dur = perfect ? 1200 : 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      scoreEl.textContent = Math.floor(target * eased).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(tick);
      else scoreEl.textContent = target.toLocaleString('en-US');
    };
    requestAnimationFrame(tick);
  }

  if (snap.lastAlbumRareCount > 0) {
    window.setTimeout(() => audio.albumRare(), 500);
    juice.powerBanner(
      snap.lastAlbumRareCount > 1 ? 'RARE ALBUM PULLS!' : 'RARE ALBUM CARD!',
    );
  }
  if (perfect) {
    window.setTimeout(() => {
      juice.screenFlash('rgba(255, 220, 100, 0.45)', 420, 0.4);
      juice.powerBanner(isHarbor ? 'THREE STARS!' : 'PERFECT!');
    }, 900);
  }

  // Loot tray: currency + streak chips; album as visual faces; place is a CTA (not a form chip)
  const rewards = el('div', { class: 'results-rewards' }, []);
  if (snap.lastEssenceGain > 0) {
    rewards.append(
      resultsRewardChip(
        'currency',
        theme().softCurrencyName,
        `+${snap.lastEssenceGain.toLocaleString('en-US')}`,
      ),
    );
  }
  if (snap.daily.winStreak > 1) {
    rewards.append(
      resultsRewardChip('streak', 'Streak', String(snap.daily.winStreak)),
    );
  }

  // Peak special recap — Super Chest / Living Geode count this clear
  let peakRecap: HTMLElement | null = null;
  if (app.levelPeakSpecials > 0) {
    const peakName = isHarbor ? 'Super Chest' : 'Living Geode';
    const peakArt = isHarbor
      ? 'themes/harbor/gen/octopus_chest_128.webp'
      : theme().livingCorePath;
    peakRecap = el('div', { class: 'results-peak-recap' }, [
      el('img', {
        class: 'results-peak-icon',
        src: assetUrl(peakArt),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
      el('div', { class: 'results-peak-text' }, [
        el('div', { class: 'results-peak-k' }, [
          app.levelPeakSpecials === 1
            ? isHarbor
              ? 'FEAST FIRED'
              : 'GEODE FIRED'
            : isHarbor
              ? 'FEAST FRENZY'
              : 'GEODE STORM',
        ]),
        el('div', { class: 'results-peak-v' }, [
          app.levelPeakSpecials === 1
            ? `1× ${peakName}`
            : `${app.levelPeakSpecials}× ${peakName}`,
        ]),
      ]),
    ]);
  }

  const albumLoot =
    snap.lastAlbumGranted.length > 0
      ? resultsAlbumLootStrip(snap.lastAlbumGranted, snap.lastAlbumRareCount)
      : null;

  // One optional soft line from the companion (short celebration, not a wall)
  const beat: CompanionBeat = perfect
    ? 'winPerfect'
    : snap.daily.winStreak >= 3
      ? 'streak'
      : 'win';
  const cheer = el('p', { class: 'results-cheer' }, [
    companionLine(beat, r.score + r.stars * 11 + snap.daily.winStreak),
  ]);

  // CTAs: chest first when open; NEXT primary; place as art-forward secondary when ready
  const actions: HTMLElement[] = [];
  if (app.pendingGeode) {
    actions.push(
      btn(
        isHarbor ? 'CRACK CHEST' : 'CRACK GEODE',
        () => {
          showGeodeCrackModal(() => {
            if (app.screen === 'results') renderOverlay();
          });
        },
        'gold',
      ),
    );
    actions.push(btn('NEXT', () => goNextLevel(true), 'secondary'));
  } else {
    actions.push(
      btn(
        app.levelId < LEVEL_COUNT ? 'NEXT LEVEL' : L('mapTitle', 'LEVELS'),
        () => goNextLevel(false),
        'gold',
      ),
    );
    if (snap.meta.nextAffordable) {
      actions.push(resultsPlaceCta(snap.meta.nextAffordable, isHarbor));
    } else {
      actions.push(btn('MAP', () => leaveResults('map'), 'secondary'));
    }
  }

  panel(
    `Level ${app.levelId}`,
    [
      burst,
      ...(peakRecap ? [peakRecap] : []),
      ...(rewards.childNodes.length > 0 ? [rewards] : []),
      ...(albumLoot ? [albumLoot] : []),
      cheer,
    ],
    actions,
    { className: `panel-results win${perfect ? ' perfect' : ''}` },
  );
}

/**
 * Crystal Cavern meta hub — long-term visual ownership after match-3 wins.
 * Playrix dual-loop: puzzle → soft currency → decorate persistent space.
 */
function metaArtImg(src: string, alt: string, cls: string): HTMLImageElement {
  const img = el('img', {
    class: cls,
    src: assetUrl(src),
    alt,
    loading: 'lazy',
    decoding: 'async',
  }) as HTMLImageElement;
  img.onerror = () => {
    img.style.display = 'none';
  };
  return img;
}

function renderCavern(): void {
  const snap = economy.getSnapshot();
  const meta = snap.meta;
  const ownedSet = new Set(meta.owned);

  const glow =
    0.22 +
    meta.stagesComplete * 0.14 +
    (meta.ownedCount / Math.max(1, meta.totalCount)) * 0.28;

  const activeStage =
    getMetaStages().find((s) => s.id === meta.activeStageId) ?? getMetaStages()[0]!;

  // Live-furnished stage: props sit on the mine backdrop
  const stageProps = el('div', { class: 'cavern-props' }, []);
  for (const up of meta.activeStageOwned) {
    const just = app.lastPlacedId === up.id;
    const prop = el('div', {
      class: `cavern-prop${just ? ' just-placed' : ''}`,
      title: up.name,
      'data-prop-id': up.id,
      style: `left:${up.place.left}%;top:${up.place.top}%;transform:translate(-50%,-50%) scale(${up.place.scale ?? 1})`,
    }, [metaArtImg(up.art, up.name, 'cavern-prop-img')]);
    stageProps.append(prop);
  }
  // Ghost slots for unowned pieces in this stage (soft goal)
  for (const up of getMetaUpgrades().filter((u) => u.stage === meta.activeStageId && !ownedSet.has(u.id))) {
    const ghost = el('div', {
      class: 'cavern-prop ghost',
      title: up.name,
      'data-prop-id': up.id,
      style: `left:${up.place.left}%;top:${up.place.top}%;transform:translate(-50%,-50%) scale(${(up.place.scale ?? 1) * 0.85})`,
    }, [metaArtImg(up.art, up.name, 'cavern-prop-img')]);
    stageProps.append(ghost);
  }

  const vista = el('div', { class: 'cavern-vista', id: 'cavern-vista' }, [
    metaArtImg(activeStage.art, activeStage.name, 'cavern-vista-bg'),
    el('div', { class: 'cavern-vista-scrim' }, []),
    stageProps,
    el('div', { class: 'cavern-depth' }, [
      el('span', { class: 'cavern-label' }, [
        meta.stagesComplete >= getMetaStages().reduce((m, s) => Math.max(m, s.id), 1)
          ? (getMetaStages().find((s) => s.id === meta.stagesComplete)?.name ?? 'Finale') +
            ' complete'
          : `Furnishing · ${activeStage.name}`,
      ]),
      el('span', { class: 'cavern-essence' }, [essFig(meta.essence, { size: 'sm' })]),
    ]),
  ]);
  vista.style.setProperty('--cavern-glow', String(Math.min(0.9, glow)));

  const stages = getMetaStages().map((stage) => {
    const open = stage.id === 1 || meta.stagesComplete >= stage.id - 1;
    const complete = meta.stagesComplete >= stage.id;
    const section = el(
      'div',
      {
        class: `cavern-stage${open ? '' : ' locked'}${complete ? ' complete' : ''}`,
      },
      [
        el('div', { class: 'cavern-stage-head' }, [
          metaArtImg(stage.art, stage.name, 'cavern-stage-thumb'),
          el('div', {}, [
            el('h2', {}, [
              complete ? `✓ ${stage.name}` : open ? stage.name : `🔒 ${stage.name}`,
            ]),
            el('p', { class: 'hud-tip' }, [stage.tagline]),
          ]),
        ]),
      ],
    );
    if (!open) {
      section.append(
        el('p', { class: 'hud-tip' }, ['Complete every piece in the previous chamber first.']),
      );
      return section;
    }
    const list = el('div', { class: 'cavern-shop' }, []);
    for (const up of getMetaUpgrades().filter((u) => u.stage === stage.id).sort(
      (a, b) => a.order - b.order,
    )) {
      list.append(metaUpgradeRow(up, ownedSet.has(up.id), meta.essence, meta.stagesComplete));
    }
    section.append(list);
    return section;
  });

  const idleSnap = snap.idle;
  const idleCard = el('div', { class: 'idle-card' }, [
    el('div', { class: 'idle-card-title' }, ['Cozy idle drip']),
    el('p', { class: 'hud-tip ess-line-wrap' }, [
      essFig(idleSnap.ratePerHour, { size: 'xs' }),
      document.createTextNode(
        `/hour from furnishings · cap ${idleSnap.cap} · no login punishment`,
      ),
    ]),
    idleSnap.pending > 0
      ? btn(
          [
            document.createTextNode('CLAIM · '),
            essFig(idleSnap.pending, { sign: true, size: 'sm' }),
          ],
          () => {
            const n = economy.claimIdleEssence();
            if (n > 0) {
              audio.starDing(1);
              haptic('forge');
              pushToast(
                `Idle cavern · +${n} ${theme().softCurrencyName.toLowerCase()}`,
                '#b8f0ff',
                2200,
              );
            }
            renderOverlay();
          },
          'gold',
        )
      : el('p', { class: 'hud-tip' }, [
          theme().id === 'harbor'
            ? 'Come back later — the tide keeps rolling.'
            : 'Come back later — the mine keeps humming.',
        ]),
  ]);

  panel(
    theme().metaHubCta,
    [
      companionBubble(
        meta.nextAffordable ? 'cavernReady' : 'cavern',
        meta.ownedCount + meta.essence,
      ),
      el('p', {}, [
        'Earn ' + theme().softCurrencyName.toLowerCase() + ' from clears. Furnish the ' + theme().metaHubName.toLowerCase() + ' — pieces appear in the vista.',
      ]),
      idleCard,
      el('div', { class: 'goal-banner' }, [nextGoalHint(snap)]),
      essenceProgressBar(snap),
      vista,
      el('div', { class: 'stat-grid' }, [
        statIcon(theme().bonusCrackArt, theme().softCurrencyName, String(meta.essence)),
        stat('Placed', `${meta.ownedCount}/${meta.totalCount}`),
        stat(
          'Stages',
          `${meta.stagesComplete}/${getMetaStages().reduce((m, s) => Math.max(m, s.id), 1)}`,
        ),
        stat('Spent', String(meta.totalSpent)),
      ]),
      ...stages,
    ],
    [
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'gold'),
      btn('SHOP', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-cavern', scrollTop: true },
  );
}

/**
 * Pin a full-bleed ceremony layer to the game root (not the scrollable overlay),
 * so placement / stage-complete always fills the visible phone frame.
 */
function mountCeremonyLayer(layer: HTMLElement): void {
  // Reset overlay scroll so any follow-up cavern UI starts at the top/vista
  overlay.scrollTop = 0;
  layer.classList.add('ceremony-root-layer');
  // Prefer game-root so absolute inset matches the 720×1280 stage, not the page.
  (root ?? overlay).append(layer);
}

function scrollCavernVistaIntoView(opts?: { highlightId?: string | null }): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const vista = document.getElementById('cavern-vista');
      if (vista) {
        vista.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        overlay.scrollTop = 0;
      }
      const id = opts?.highlightId ?? app.lastPlacedId;
      if (id) {
        const safe =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(id)
            : id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const prop = document.querySelector(`.cavern-prop[data-prop-id="${safe}"]`);
        if (prop) {
          prop.classList.add('just-placed');
          window.setTimeout(() => prop.classList.remove('just-placed'), 2200);
        }
      }
    });
  });
}

/**
 * Reward placement ceremony: stage still + the purchased prop flying in.
 * A single shared place.webm was wrong (always showed the crystal lamp first).
 * Only use theme video when both paths are set AND we have no better option —
 * currently crystalline uses still + prop only.
 */
function playPlacementCeremony(up: MetaUpgrade, onDone: () => void): void {
  // Snap scroll to top immediately so the player sees the ceremony, not mid-list
  overlay.scrollTop = 0;
  const isHarbor = theme().id === 'harbor';
  const layer = el('div', { class: 'place-ceremony place-pride' }, []);
  const stageArt =
    getMetaStages().find((s) => s.id === up.stage)?.art ?? getMetaStages()[0]!.art;
  const ceremony = theme().placeCeremony;
  const stageName =
    getMetaStages().find((s) => s.id === up.stage)?.name ?? theme().metaHubName;

  const mediaEl = metaArtImg(
    stageArt,
    theme().metaHubName,
    'place-ceremony-video place-ceremony-still',
  );

  const sparks = el('div', { class: 'place-pride-sparks', 'aria-hidden': 'true' }, []);
  for (let i = 0; i < 14; i++) {
    sparks.append(
      el('span', {
        class: 'place-pride-spark',
        style: `--i:${i};--x:${10 + (i * 41) % 80}%;--delay:${(i % 6) * 0.08}s`,
      }, []),
    );
  }

  const prop = metaArtImg(up.art, up.name, 'place-ceremony-prop');
  const caption = el('div', { class: 'place-ceremony-caption' }, [
    el('div', { class: 'place-pride-kicker' }, [
      isHarbor ? 'YOURS ON THE DOCKS' : 'YOURS IN THE MINE',
    ]),
    el('div', { class: 'place-ceremony-title' }, [up.name]),
    el('div', { class: 'place-ceremony-sub' }, [
      `${stageName} · ${ceremony.caption}`,
    ]),
  ]);
  const skip = btn(
    isHarbor ? 'SEE MY DOCKS' : 'SEE MY CAVERN',
    () => finish(),
    'gold',
  );

  layer.append(mediaEl, sparks, prop, caption, skip);
  mountCeremonyLayer(layer);
  haptic('specialBig');
  audio.starDing(2);
  juice.screenFlash(
    isHarbor ? 'rgba(100, 200, 220, 0.4)' : 'rgba(180, 140, 255, 0.35)',
    480,
    0.35,
  );
  try {
    const sfx = new Audio(assetUrl('sfx/whoosh-motion.ogg'));
    sfx.volume = 0.5;
    void sfx.play();
  } catch {
    /* ignore */
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    layer.remove();
    pushToast(
      isHarbor
        ? `${up.name} stands on your docks`
        : `${up.name} lights your cavern`,
      '#ffe56a',
      2600,
    );
    onDone();
  };

  // Longer pride hold so placement feels like a second win
  window.setTimeout(() => finish(), 2800);
}

/**
 * First unlock of Act I-C (L151+) — Outer Channels / Under-Crown region ceremony.
 * Once per save (localStorage). Shown after L150 clear before map/prelevel.
 */
function showActIcUnlockCeremony(onDone: () => void): void {
  if (document.getElementById('actic-unlock-modal')) {
    onDone();
    return;
  }
  const isHarbor = theme().id === 'harbor';
  // Stage 5 art = Outer Channel / Under-Crown vista
  const stages = getMetaStages();
  const art =
    stages.find((s) => s.id === 5)?.art ??
    stages[stages.length - 1]?.art ??
    themeUi('ui/map_bg.webp');
  const sparks = el('div', { class: 'actic-sparks', 'aria-hidden': 'true' }, []);
  for (let i = 0; i < 16; i++) {
    sparks.append(
      el('span', {
        class: 'actic-spark',
        style: `--i:${i};--x:${6 + (i * 41) % 88}%;--delay:${(i % 6) * 0.09}s`,
      }, []),
    );
  }
  const layer = el('div', { class: 'actic-unlock ceremony-root-layer', id: 'actic-unlock-modal' }, [
    sparks,
    el('div', { class: 'actic-unlock-card panel-enter' }, [
      metaArtImg(art, isHarbor ? 'Outer Channel' : 'Under-Crown', 'actic-unlock-art'),
      el('div', { class: 'actic-unlock-kicker' }, [
        isHarbor ? 'NEW WATERS' : 'NEW DEPTHS',
      ]),
      el('h2', { class: 'actic-unlock-title' }, [
        isHarbor ? 'Outer Channels open' : 'Under-Crown opens',
      ]),
      el('p', { class: 'actic-unlock-sub' }, [
        isHarbor
          ? 'Beyond the festival — fog fleets, rival buoys, and the Storm Treaty await.'
          : 'The mountain answers back — fault lanterns, glass seams, and the Regent Peak.',
      ]),
      el('div', { class: 'actic-unlock-meta' }, [
        isHarbor ? 'Chapters XVI–XXX · L151–300' : 'Chapters XVI–XXX · L151–300',
      ]),
      btn(
        isHarbor ? 'ENTER THE CHANNEL' : 'ENTER THE CROWN',
        () => {
          layer.remove();
          // Drop them on Act I-C map chapter XVI
          app.mapChapterIndex = 15;
          onDone();
        },
        'gold',
      ),
    ]),
  ]);
  mountCeremonyLayer(layer);
  haptic('specialBig');
  audio.starDing(0);
  window.setTimeout(() => audio.starDing(1), 160);
  window.setTimeout(() => audio.starDing(2), 320);
  juice.screenFlash(
    isHarbor ? 'rgba(90, 200, 210, 0.45)' : 'rgba(160, 100, 255, 0.4)',
    480,
    0.4,
  );
  try {
    const sfx = new Audio(assetUrl('sfx/whoosh-cinematic.ogg'));
    sfx.volume = 0.55;
    void sfx.play();
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    if (document.getElementById('actic-unlock-modal')) {
      layer.remove();
      app.mapChapterIndex = 15;
      onDone();
    }
  }, 9000);
}

/**
 * Full-screen stage-complete fanfare (DOM — works over cavern overlay, not only canvas).
 */
function showStageCompleteFanfare(stageId: number, onDone: () => void): void {
  if (document.getElementById('stage-complete-modal')) {
    onDone();
    return;
  }
  const stage = getMetaStages().find((s) => s.id === stageId);
  const next = getMetaStages().find((s) => s.id === stageId + 1);
  const sparks = el('div', { class: 'stage-complete-sparks' }, []);
  for (let i = 0; i < 18; i++) {
    sparks.append(
      el('span', {
        class: 'stage-spark',
        style: `--i:${i};--x:${8 + (i * 37) % 84}%;--delay:${(i % 7) * 0.07}s;--hue:${(i * 23) % 360}`,
      }, []),
    );
  }

  const layer = el('div', { class: 'stage-complete', id: 'stage-complete-modal' }, [
    sparks,
    el('div', { class: 'stage-complete-card panel-enter' }, [
      stage
        ? metaArtImg(stage.art, stage.name, 'stage-complete-art')
        : el('div', {}, []),
      el('div', { class: 'stage-complete-kicker' }, [
        theme().id === 'harbor' ? 'DOCK COMPLETE' : 'CHAMBER COMPLETE',
      ]),
      el('h2', { class: 'stage-complete-title' }, [
        stage ? stage.name : `Stage ${stageId}`,
      ]),
      el('p', { class: 'stage-complete-sub' }, [
        next
          ? `New ${theme().id === 'harbor' ? 'dock' : 'chamber'} open · ${next.name}`
          : (() => {
              const last =
                getMetaStages().find(
                  (s) => s.id === getMetaStages().reduce((m, x) => Math.max(m, x.id), 1),
                )?.name ?? 'Finale';
              return theme().id === 'harbor'
                ? `${last} finished · the docks are yours`
                : `${last} finished · the mine is yours`;
            })(),
      ]),
      btn(
        next
          ? theme().id === 'harbor'
            ? 'OPEN NEXT DOCK'
            : 'OPEN NEXT CHAMBER'
          : theme().id === 'harbor'
            ? 'BEHOLD THE DOCKS'
            : 'BEHOLD THE MINE',
        () => {
          layer.remove();
          onDone();
        },
        'gold',
      ),
    ]),
  ]);
  mountCeremonyLayer(layer);
  haptic('special');
  audio.starDing(0);
  window.setTimeout(() => audio.starDing(1), 180);
  window.setTimeout(() => audio.starDing(2), 360);
  try {
    const sfx = new Audio(assetUrl('sfx/whoosh-cinematic.ogg'));
    sfx.volume = 0.5;
    void sfx.play();
  } catch {
    /* ignore */
  }
  // Safety auto-dismiss
  window.setTimeout(() => {
    if (document.getElementById('stage-complete-modal')) {
      layer.remove();
      onDone();
    }
  }, 8000);
}

function metaUpgradeRow(
  up: MetaUpgrade,
  owned: boolean,
  essence: number,
  stagesCompleteBefore = 0,
): HTMLElement {
  const thumb = el('div', { class: 'cavern-item-art' }, [
    metaArtImg(up.art, up.name, 'cavern-item-img'),
  ]);
  const row = el('div', { class: `cavern-item${owned ? ' owned' : ''}` }, [
    thumb,
    el('div', { class: 'cavern-item-body' }, [
      el('div', { class: 'name' }, [up.name]),
      el('div', { class: 'blurb' }, [up.blurb]),
    ]),
  ]);
  if (owned) {
    row.append(el('div', { class: 'cavern-item-status' }, ['Placed']));
  } else {
    const can = essence >= up.cost;
    const buy = btn(
      [essFig(up.cost, { size: 'sm' })],
      () => {
        const before = economy.getSnapshot().meta.stagesComplete;
        const res = economy.buyMetaUpgrade(up.id);
        if (!res.ok) {
          if (res.reason === 'insufficient') pushToast('Need more ' + theme().softCurrencyName.toLowerCase() + ' — clear levels!', '#ff9a9a');
          else if (res.reason === 'stageLocked') pushToast('Chamber still sealed', '#ff9a9a');
          else pushToast('Already placed', '#b0c0e0');
          return;
        }
        haptic('forge');
        const after = economy.getSnapshot().meta.stagesComplete;
        app.lastPlacedId = res.upgrade.id;
        // Jump camera to the mine vista before / after ceremony
        overlay.scrollTop = 0;
        playPlacementCeremony(res.upgrade, () => {
          if (after > before) {
            showStageCompleteFanfare(after, () => {
              pushToast(`Chamber complete · new stage open!`, '#ffd24a', 2800);
              renderOverlay();
              scrollCavernVistaIntoView({ highlightId: res.upgrade.id });
              window.setTimeout(() => {
                app.lastPlacedId = null;
              }, 2400);
            });
          } else {
            pushToast(`${res.upgrade.name} is in the cavern`, '#b8f0ff', 2000);
            renderOverlay();
            scrollCavernVistaIntoView({ highlightId: res.upgrade.id });
            window.setTimeout(() => {
              app.lastPlacedId = null;
            }, 2400);
          }
        });
      },
      can ? 'primary' : 'secondary',
      !can,
    );
    row.append(buy);
  }
  void stagesCompleteBefore;
  return row;
}

/** Real shop tile art for every SKU (no letter / ASCII glyphs). */
function skuIconPath(id: string): string {
  const map: Record<string, string> = {
    'shards.pocket': 'ui/shop/shards_pocket.webp',
    'shards.hoard': 'ui/shop/shards_hoard.webp',
    'shards.vault': 'ui/shop/shards_vault.webp',
    'bundle.starter': 'ui/shop/bundle_starter.webp',
    'lives.refill': 'ui/icon_lives.webp',
    'ads.pass7': 'ui/shop/clear_skies_7.webp',
    'ads.pass30': 'ui/shop/clear_skies_30.webp',
    'ads.remove': 'ui/shop/clear_skies_forever.webp',
    'ease.comfort': 'ui/shop/comfort_tools.webp',
  };
  return themeUi(map[id] ?? 'ui/icon_shards.webp');
}

const SKU_TAG_LABEL: Record<string, string> = {
  bestValue: 'BEST VALUE',
  mostPopular: 'MOST POPULAR',
  limited: 'LIMITED',
};

/** Living crystal shard tile — real atlas gems + glow + fill progress. */
function albumShardStage(slot: {
  id: string;
  name: string;
  glyph: string;
  rarity: string;
  count: number;
  need: number;
  complete: boolean;
  atlas: { x: number; y: number; w: number; h: number };
  glow: string;
  glowSoft: string;
}): HTMLElement {
  const pct = Math.min(100, Math.floor((slot.count / Math.max(1, slot.need)) * 100));
  const empty = slot.count <= 0;
  const stage = el('div', {
    class: `album-shard-stage rarity-${slot.rarity}${slot.complete ? ' done' : ''}${empty ? ' empty' : ''}`,
    style: `--shard-glow:${slot.glow};--shard-glow-soft:${slot.glowSoft}`,
  }, []);

  // Soft coloured aura
  stage.append(el('div', { class: 'album-shard-aura' }, []));

  // Real crystal sprite from board atlas
  const sprite = el('div', {
    class: 'album-shard-sprite',
    style: [
      `background-image:url(${assetUrl(getAlbumSheet())})`,
      'background-size:1024px 640px',
      `background-position:-${slot.atlas.x}px -${slot.atlas.y}px`,
    ].join(';'),
  }, []) as HTMLElement;
  // Warden uses Living Core sheet as an extra living layer
  if (slot.id === 'warden') {
    const core = el('img', {
      class: 'album-shard-core',
      src: assetUrl(theme().livingCorePath),
      alt: '',
      decoding: 'async',
    }) as HTMLImageElement;
    core.onerror = () => {
      core.style.display = 'none';
    };
    stage.append(core);
  }
  stage.append(sprite);

  // Sparkle motes
  const sparks = el('div', { class: 'album-shard-sparks', 'aria-hidden': 'true' }, []);
  for (let i = 0; i < 5; i++) {
    sparks.append(
      el('span', {
        class: 'album-spark',
        style: `--i:${i};--delay:${i * 0.35}s`,
      }, []),
    );
  }
  stage.append(sparks);

  // Collection fill (how many shards banked toward need)
  stage.append(
    el('div', { class: 'album-shard-meter' }, [
      el('div', { class: 'album-shard-meter-fill', style: `width:${pct}%` }, []),
    ]),
  );

  return stage;
}

function renderAlbum(): void {
  const snap = economy.getSnapshot();
  const a = snap.album;
  const grid = el('div', { class: 'album-grid' }, []);
  for (const slot of a.slots) {
    const delay = (getAlbumCards().findIndex((c) => c.id === slot.id) % 9) * 0.12;
    const card = el(
      'div',
      {
        class: `album-slot rarity-${slot.rarity}${slot.complete ? ' done' : ''}${slot.count <= 0 ? ' locked' : ''}`,
        title: slot.blurb,
        style: `--float-delay:${delay}s;--shard-glow:${slot.glow}`,
      },
      [
        el('div', { class: `album-rarity-tag ${slot.rarity}` }, [slot.rarity]),
        albumShardStage(slot),
        el('div', { class: 'album-name' }, [slot.name]),
        el(
          'div',
          { class: 'album-count' },
          slot.complete
            ? [
                el('img', {
                  class: 'inline-check',
                  src: assetUrl(themeUi('ui/icon_check.webp')),
                  alt: '',
                  decoding: 'async',
                }),
                document.createTextNode(' sealed'),
              ]
            : [document.createTextNode(`${slot.count}/${slot.need}`)],
        ),
      ],
    );
    grid.append(card);
  }
  const albumHeroArt =
    getMetaStages().find((s) => s.id === Math.min(4, Math.max(1, snap.meta.activeStageId)))?.art ??
    themeUi('ui/map_bg.webp');

  panel(
    L('albumTitle', 'Endless Album'),
    [
      el('div', { class: 'album-hero' }, [
        el('img', {
          class: 'album-hero-art',
          src: assetUrl(albumHeroArt),
          alt: '',
          decoding: 'async',
          draggable: 'false',
        }),
        el('div', { class: 'album-hero-scrim' }, []),
        el('div', { class: 'album-hero-body' }, [
          el('div', { class: 'album-hero-k' }, [
            theme().id === 'harbor' ? 'KEEPSAKE SHELF' : 'SHARD CABINET',
          ]),
          el('div', { class: 'album-hero-v' }, [
            `Cycle ${a.cycle + 1} · ${a.completeCount}/${a.totalSlots}`,
          ]),
        ]),
      ]),
      companionBubble('cavern', a.cycle + a.completeCount),
      el('div', { class: 'essence-track-wrap' }, [
        el('div', { class: 'essence-track-label' }, [`${a.pct}% sealed`]),
        el('div', { class: 'essence-track' }, [
          el('div', { class: 'essence-track-fill', style: `width:${a.pct}%` }, []),
        ]),
      ]),
      grid,
    ],
    [
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'gold'),
      btn('EVENT', () => {
        app.screen = 'event';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-album', scrollTop: true },
  );
}

/** Milestone face art — rotates soft theme icons (no ASCII). */
function eventMileIconPath(index: number, done: boolean, claimed: boolean): string {
  if (claimed || done) return themeUi('ui/icon_check.webp');
  const isHarbor = theme().id === 'harbor';
  const pool = isHarbor
    ? [
        themeUi('ui/icon_shards.webp'),
        theme().bonusCrackArt,
        themeUi('ui/icon_streak.webp'),
        themeUi('ui/booster_prism.webp'),
        themeUi('ui/icon_lives.webp'),
      ]
    : [
        theme().bonusCrackArt,
        theme().livingCorePath,
        themeUi('ui/icon_shards.webp'),
        themeUi('ui/booster_prism.webp'),
        themeUi('ui/icon_streak.webp'),
      ];
  return pool[index % pool.length]!;
}

function renderHybridEvent(): void {
  const snap = economy.getSnapshot();
  const ev = snap.event;
  const days = Math.max(0, Math.ceil(ev.msLeft / 86_400_000));
  const rows = ev.milestones.map((m, mi) =>
    el('div', { class: `event-mile${m.done ? ' done' : ''}${m.claimed ? ' claimed' : ''}` }, [
      el('div', { class: 'event-mile-icon-wrap' }, [
        el('img', {
          class: `event-mile-icon${m.claimed ? ' claimed' : m.done ? ' ready' : ''}`,
          src: assetUrl(eventMileIconPath(mi, m.done, m.claimed)),
          alt: '',
          decoding: 'async',
          draggable: 'false',
        }),
      ]),
      el('div', { class: 'event-mile-at' }, [`${m.at}`]),
      el('div', { class: 'event-mile-body' }, [
        el('div', { class: 'name' }, [m.label]),
        el('div', { class: 'blurb ess-line-wrap' }, [
          m.claimed
            ? document.createTextNode('Claimed')
            : m.done
              ? document.createTextNode('Ready · auto-claimed on clear')
              : el('span', { class: 'ess-line' }, [
                  essFig(m.essence, { sign: true, size: 'xs' }),
                  document.createTextNode(` · +${m.shards} tokens`),
                ]),
        ]),
      ]),
      el(
        'div',
        {
          class: `event-mile-flag${m.claimed ? ' claimed' : m.done ? ' ready' : ''}`,
        },
        m.claimed || m.done
          ? [
              el('img', {
                class: 'event-mile-check',
                src: assetUrl(themeUi('ui/icon_check.webp')),
                alt: m.claimed ? 'claimed' : 'ready',
                decoding: 'async',
              }),
            ]
          : [el('span', { class: 'event-mile-dot' }, [])],
      ),
    ]),
  );
  const eventArt =
    theme().id === 'harbor'
      ? themeUi('ui/prelevel_outer.webp')
      : getMetaStages().find((s) => s.id === 3)?.art ?? themeUi('ui/map_bg.webp');

  panel(
    ev.name || L('eventName', 'Mine Rush'),
    [
      el('div', { class: 'event-hero event-hero-artful' }, [
        el('img', {
          class: 'event-hero-bg',
          src: assetUrl(eventArt),
          alt: '',
          decoding: 'async',
          draggable: 'false',
        }),
        el('div', { class: 'event-hero-scrim' }, []),
        el('div', { class: 'event-hero-pts' }, [String(ev.personal)]),
        el('div', { class: 'event-hero-copy' }, [
          el('div', { class: 'event-hero-label' }, ['Personal points']),
          el('div', { class: 'event-hero-sub' }, [
            `#${ev.leagueRank} ${ev.leagueLabel} · ~${days}d`,
          ]),
        ]),
      ]),
      el('p', { class: 'event-tagline' }, [ev.tagline]),
      ...rows,
      ev.nextMilestone
        ? el('div', { class: 'goal-banner soft' }, [
            `Next · ${ev.nextMilestone.at - ev.personal} pts to ${ev.nextMilestone.label}`,
          ])
        : el('div', { class: 'goal-banner soft' }, ['All personal milestones sealed this week']),
    ],
    [
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'gold'),
      btn('ALBUM', () => {
        app.screen = 'album';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-event', scrollTop: true },
  );
}

function renderStore(): void {
  const snap = economy.getSnapshot();
  const wallet = el('div', { class: 'shop-wallet' }, [
    el('div', { class: 'shop-wallet-chip credits' }, [
      el('img', {
        class: 'shop-wallet-icon',
        src: assetUrl(themeUi('ui/shop/credits.webp')),
        alt: '',
        decoding: 'async',
      }),
      el('span', { class: 'shop-wallet-k' }, ['Credits']),
      el('span', { class: 'shop-wallet-v' }, [snap.wallet.credits.toLocaleString('en-US')]),
    ]),
    el('div', { class: 'shop-wallet-chip shards' }, [
      el('img', {
        class: 'shop-wallet-icon',
        src: assetUrl(themeUi('ui/icon_shards.webp')),
        alt: '',
        decoding: 'async',
      }),
      el('span', { class: 'shop-wallet-k' }, [theme().premiumCurrencyName]),
      el('span', { class: 'shop-wallet-v' }, [String(snap.wallet.shards)]),
    ]),
  ]);

  const items = snap.availableSkus.map((sku) => {
    const overlay = theme().storeCopy[sku.id];
    const displayName = overlay?.name ?? sku.name;
    const displayBlurb = overlay?.blurb ?? sku.blurb;
    const can = snap.wallet.credits >= sku.credits;
    const tagLabel = sku.tag ? SKU_TAG_LABEL[sku.tag] ?? sku.tag : null;
    const grantBits: string[] = [];
    if (sku.grantShards) grantBits.push(`+${sku.grantShards} shards`);
    if (sku.grantLives) grantBits.push(`+${sku.grantLives} lives`);
    if (sku.grantBoosters) {
      const n = Object.values(sku.grantBoosters).reduce((a, b) => a + (b ?? 0), 0);
      if (n > 0) grantBits.push(`+${n} tools`);
    }
    const iconPath = skuIconPath(sku.id);
    const glyphNode = el('div', { class: 'sku-glyph sku-glyph-art' }, [
      el('img', {
        class: 'sku-glyph-img',
        src: assetUrl(iconPath),
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }),
    ]);
    const row = el(
      'div',
      {
        class: `sku${sku.tag ? ` tagged-${sku.tag}` : ''}${can ? '' : ' broke'}`,
      },
      [
        glyphNode,
        el('div', { class: 'sku-body' }, [
          el('div', { class: 'name' }, [
            displayName,
            tagLabel ? el('span', { class: `tag tag-${sku.tag}` }, [tagLabel]) : '',
          ].filter(Boolean) as (string | Node)[]),
          el('div', { class: 'blurb' }, [displayBlurb]),
          grantBits.length
            ? el('div', { class: 'sku-grants' }, [grantBits.join(' · ')])
            : el('div', {}, []),
        ]),
      ],
    );
    const buy = btn(
      `${sku.credits.toLocaleString('en-US')}¢`,
      () => {
        const res = economy.purchase(sku.id);
        if (!res.ok) {
          if (res.reason === 'insufficientCredits') {
            pushToast('Not enough credits', '#ff9a9a');
          } else if (res.reason === 'alreadyOwned') {
            pushToast('Already owned', '#b0c0e0');
          } else {
            pushToast('Unavailable', '#ff9a9a');
          }
          return;
        }
        audio.starDing(1);
        haptic('forge');
        pushToast(`Purchased · ${displayName}`, '#ffd24a', 2000);
        renderOverlay();
      },
      can ? (sku.tag === 'bestValue' || sku.tag === 'limited' ? 'gold' : 'primary') : 'secondary',
      !can,
    );
    row.append(buy);
    return row;
  });

  const ethics = el('div', { class: 'ethics-banner' }, [
    snap.adsFreeActive
      ? `Gift prompts off${snap.adsFreeUntil && !snap.ownedSkus.includes('ads.remove') ? ` · until ${new Date(snap.adsFreeUntil).toLocaleDateString()}` : ' · permanent'}`
      : 'Free gifts use a short wait · daily cap · no video ads',
    snap.comfortOwned ? ' · Comfort tools on' : '',
  ]);

  // Core tools: buy with shards or claim free gift (daily capped).
  const toolCost = BOOSTER_COST();
  const toolIds: BoosterId[] = ['pickaxe', 'reshuffle', 'seedPrism', 'extraMoves'];
  const toolArt: Partial<Record<BoosterId, string>> = {
    pickaxe: themeUi('ui/tools/pickaxe.webp'),
    reshuffle: themeUi('ui/tools/reshuffle.webp'),
    seedPrism: themeUi('ui/booster_prism.webp'),
    extraMoves: themeUi('ui/booster_moves.webp'),
  };
  const toolsSection = el('div', { class: 'shop-tools' }, [
    el('p', { class: 'hud-tip shop-tools-head' }, [
      `Dive tools · ${toolCost} ${theme().premiumCurrencyName.toLowerCase()} each · or free gift`,
    ]),
    ...toolIds.map((id) => {
      const owned = snap.boosters[id];
      const can = snap.wallet.shards >= toolCost;
      const row = el('div', { class: `sku shop-tool-sku${can ? '' : ' broke'}` }, [
        el('div', { class: 'sku-glyph sku-glyph-art' }, [
          el('img', {
            class: 'sku-glyph-img',
            src: assetUrl(toolArt[id] ?? themeUi('ui/icon_shards.webp')),
            alt: '',
            decoding: 'async',
            draggable: 'false',
          }),
        ]),
        el('div', { class: 'sku-body' }, [
          el('div', { class: 'name' }, [BOOSTER_LABEL[id]]),
          el('div', { class: 'blurb' }, [`Owned ×${owned}`]),
          el('div', { class: 'sku-grants' }, [`+1 for ${toolCost} shards`]),
        ]),
      ]);
      const actions = el('div', { class: 'shop-tool-actions' }, [
        btn(
          `${toolCost}`,
          () => {
            tryBuyBooster(id, 'store');
          },
          can ? 'gold' : 'secondary',
          !can,
        ),
        btn('FREE', () => watchForBooster(id, 'store'), 'secondary'),
      ]);
      row.append(actions);
      return row;
    }),
  ]);

  panel(
    'Shop',
    [
      el('div', { class: 'sim-badge sim-badge-show' }, ['soft currency only · no real money yet']),
      wallet,
      ethics,
      el('p', { class: 'hud-tip' }, [
        'Ease of play over dark patterns · pay to skip friction, not to exist',
      ]),
      toolsSection,
      el('p', { class: 'hud-tip' }, ['Credits packs & passes']),
      ...items,
    ],
    [
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
      btn(theme().id === 'harbor' ? 'DOCKS' : 'CAVERN', () => {
        app.screen = 'cavern';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-shop' },
  );
}

function renderLivesGate(): void {
  const snap = economy.getSnapshot();
  const mins = Math.max(1, Math.ceil(snap.lives.msUntilNext / 60000));
  const cost = ECONOMY_CONST.cost.refillLives;
  panel(
    'Out of Lives',
    [
      el('div', { class: 'lives-hero' }, [
        el('img', {
          class: 'lives-heart-img',
          src: assetUrl(themeUi('ui/icon_lives.webp')),
          alt: 'Lives',
          decoding: 'async',
          draggable: 'false',
        }),
        el('p', {}, [`Next life in ~${mins} min`]),
      ]),
      el('p', { class: 'hud-tip' }, ['Refill now, or take a breather']),
    ],
    [
      btn(
        [
          el('img', {
            class: 'btn-inline-icon',
            src: assetUrl(themeUi('ui/icon_shards.webp')),
            alt: '',
            decoding: 'async',
          }),
          document.createTextNode(` REFILL · ${cost}`),
        ],
        () => {
          if (economy.refillLivesWithShards()) {
            app.screen = 'prelevel';
            renderOverlay();
          } else {
            pushToast('Need more shards', '#ff9a9a');
          }
        },
        'gold',
      ),
      btn(
        [
          el('img', {
            class: 'btn-inline-icon',
            src: assetUrl(themeUi('ui/icon_lives.webp')),
            alt: '',
            decoding: 'async',
          }),
          document.createTextNode(' FREE · +1'),
        ],
        () => openAd('rewardedLife', 'lives'),
      ),
      btn('SHOP', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-lives' },
  );
}

/** Free-gift overlay (timer only — no video / no ad network). */
function renderAdShell(): void {
  clear(overlay);
  overlay.classList.remove('hidden');
  overlay.classList.add('ad-modal');
  overlay.style.background = 'rgba(2,4,12,0.94)';
  overlay.style.backdropFilter = 'blur(6px)';
  overlay.style.justifyContent = 'center';
  overlay.style.pointerEvents = 'auto';

  const placement = app.adPlacement ?? 'rewardedLife';
  const p = economy.adProgress();

  const title =
    placement === 'rewardedLife'
      ? 'Free gift · +1 Life'
      : placement === 'rewardedBooster'
        ? 'Free gift · +1 Booster'
        : placement === 'rewardedContinue'
          ? 'Free gift · +5 Moves'
          : 'A moment…';

  const rewardLine =
    placement === 'rewardedLife'
      ? 'Rest a moment — then claim an extra life.'
      : placement === 'rewardedBooster'
        ? 'Rest a moment — then claim a dive tool.'
        : 'Rest a moment — then claim five more moves.';

  const timer = el('div', { class: 'timer', id: 'ad-timer' }, [
    p.finished ? 'Ready' : `${Math.ceil(p.remainingMs / 1000)}s`,
  ]);
  const status = el('p', { class: 'ad-status', id: 'ad-status' }, [
    p.finished
      ? 'Gift ready — claim it.'
      : p.canSkip
        ? 'You can cancel, or wait to claim.'
        : `Gift ready in ${Math.max(1, Math.ceil((ECONOMY_CONST.adSkippableAfterMs - p.elapsedMs) / 1000))}s…`,
  ]);

  const skipBtn = btn(
    p.canSkip ? 'Cancel' : `Wait…`,
    () => {
      if (!economy.adProgress().canSkip) return;
      closeAdSession({ grant: false });
    },
    'secondary',
    !p.canSkip,
  );
  skipBtn.id = 'ad-skip';

  const claimBtn = btn(
    p.finished ? 'Claim gift' : 'Preparing…',
    () => {
      if (!economy.adProgress().finished) return;
      closeAdSession({ grant: true });
    },
    p.finished ? 'primary' : 'secondary',
    !p.finished,
  );
  claimBtn.id = 'ad-claim';

  const wrap = el('div', { class: 'panel ad-panel' }, [
    el('h1', {}, [title]),
    el('p', { class: 'ad-hint' }, [rewardLine]),
    el('div', { class: 'ad-player ad-player-gift' }, [
      el('div', { class: 'ad-gift-orb', 'aria-hidden': 'true' }, ['✦']),
      el('p', { class: 'ad-gift-label' }, ['Daily free gifts · limited']),
    ]),
    timer,
    status,
    el('div', { class: 'row' }, [claimBtn, skipBtn]),
  ]);
  overlay.append(wrap);
}

function updateAdChrome(p: {
  remainingMs: number;
  elapsedMs: number;
  canSkip: boolean;
  finished: boolean;
}): void {
  const timer = document.getElementById('ad-timer');
  if (timer) {
    timer.textContent = p.finished ? 'Ready' : `${Math.ceil(p.remainingMs / 1000)}s`;
  }
  const status = document.getElementById('ad-status');
  if (status) {
    status.textContent = p.finished
      ? 'Gift ready — claim it.'
      : p.canSkip
        ? 'You can cancel, or wait to claim.'
        : `Gift ready in ${Math.max(1, Math.ceil((ECONOMY_CONST.adSkippableAfterMs - p.elapsedMs) / 1000))}s…`;
  }
  const skip = document.getElementById('ad-skip') as HTMLButtonElement | null;
  if (skip) {
    skip.textContent = p.canSkip ? 'Cancel' : 'Wait…';
    skip.disabled = !p.canSkip;
  }
  const claim = document.getElementById('ad-claim') as HTMLButtonElement | null;
  if (claim) {
    claim.disabled = !p.finished;
    claim.textContent = p.finished ? 'Claim gift' : 'Preparing…';
    claim.classList.toggle('secondary', !p.finished);
  }
}

function renderAd(): void {
  renderAdShell();
}

function settingsToggle(
  label: string,
  hint: string,
  on: boolean,
  onClick: () => void,
): HTMLElement {
  const row = el('button', {
    class: `settings-toggle${on ? ' on' : ''}`,
    type: 'button',
  }, [
    el('div', { class: 'settings-toggle-copy' }, [
      el('div', { class: 'settings-toggle-label' }, [label]),
      el('div', { class: 'settings-toggle-hint' }, [hint]),
    ]),
    el('div', { class: 'settings-switch', 'aria-hidden': 'true' }, [
      el('div', { class: 'settings-switch-knob' }, []),
    ]),
  ]) as HTMLButtonElement;
  row.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });
  return row;
}

function renderSettings(): void {
  const snap = economy.getSnapshot();
  const s = snap.settings;
  panel(
    'Settings',
    [
      el('p', { class: 'hud-tip' }, [
        'Sound, accessibility, and comfort. Progress stays on this device.',
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Audio']),
        settingsToggle('Sound effects', 'Glass, whooshes, chimes, UI taps', s.sfx, () => {
          economy.updateSettings({ sfx: !s.sfx });
          audio.setEnabled(!s.sfx);
          if (!s.sfx) audio.uiTap();
          renderOverlay();
        }),
        settingsToggle('Ambient pad', 'Soft mine / dock bed under menus and play', s.music, () => {
          const next = !s.music;
          economy.updateSettings({ music: next });
          audio.setMusic(next && s.sfx);
          if (next && s.sfx) audio.resume();
          renderOverlay();
        }),
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Accessibility']),
        settingsToggle(
          'Colour-blind shapes',
          'Distinct symbols on each gem (flame, ring, star, leaf, drop, moon) — on by default',
          s.glyphs,
          () => {
            economy.updateSettings({ glyphs: !s.glyphs });
            boardView.glyphs = !s.glyphs;
            renderOverlay();
          },
        ),
        settingsToggle(
          'High contrast',
          'Thicker rims + larger shape symbols for low-vision / colour-blind play',
          s.highContrast,
          () => {
            economy.updateSettings({ highContrast: !s.highContrast });
            boardView.highContrast = !s.highContrast;
            renderOverlay();
          },
        ),
        settingsToggle('Reduced motion', 'Softer HUD pulses and less urgency flash', s.reducedMotion, () => {
          economy.updateSettings({ reducedMotion: !s.reducedMotion });
          renderOverlay();
        }),
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Session status']),
        el('div', { class: 'settings-about' }, [
          el('div', {}, [
            snap.comfortOwned
              ? 'Comfort Tools · on (fast hints + free reshuffle / dive)'
              : 'Comfort Tools · off (shop)',
          ]),
          el('div', { class: 'hud-tip' }, [
            snap.adsFreeActive
              ? 'Ad-free active'
              : 'Interstitials on · 7d/30d passes in Shop',
          ]),
          el('div', { class: 'hud-tip' }, [
            `Win streak ${snap.daily.winStreak} · best ${snap.daily.bestStreak} · today ${snap.daily.clears}/${snap.daily.target}`,
          ]),
        ]),
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Studio']),
        el('div', { class: 'settings-about' }, [
          el('div', {}, [STUDIO.name]),
          el('div', { class: 'hud-tip' }, [STUDIO.license]),
          el('div', { class: 'hud-tip' }, [STUDIO.url.replace('https://', '')]),
          el('div', { class: 'hud-tip' }, [theme().versionLabel]),
          el('div', { class: 'hud-tip' }, [
            'Soft currency shop · free gifts · local save only',
          ]),
        ]),
      ]),
    ],
    [
      btn('Publisher Dashboard', () => {
        app.screen = 'dashboard';
        renderOverlay();
      }, 'primary'),
      btn('Reset research profile', () => {
        if (confirm('Wipe local save and start fresh?')) {
          economy.resetProfile();
          app.screen = 'map';
          renderOverlay();
        }
      }, 'danger'),
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
    { className: 'panel-settings' },
  );
}

function renderDashboard(): void {
  const snap = economy.getSnapshot();
  const m = snap.metrics;
  const d = snap.dashboard;
  panel(
    'Publisher Dashboard',
    [
      el('p', {}, [
        'Single-player metrics from local play only — not a cohort. The research document\'s benchmarks: D1≈40%, D7≈20%, D30≈10%; ~96% never spend.',
      ]),
      el('div', { class: 'stat-grid' }, [
        stat('Sessions', String(m.sessions)),
        stat('Days active', String(m.daysActive)),
        stat('D1 / D7 / D30', `${m.retention.d1 ? 'Y' : 'n'} / ${m.retention.d7 ? 'Y' : 'n'} / ${m.retention.d30 ? 'Y' : 'n'}`),
        stat('Levels W/A', `${m.levelsWon}/${m.levelsAttempted}`),
        stat('ARPDAU (sim)', m.arpdau.toFixed(1)),
        stat('ARPPU (sim)', d.arppu.toFixed(1)),
        stat('Payer?', m.isPayer ? 'yes' : 'no'),
        stat('DDA scalar', m.ddaScalar.toFixed(2)),
        stat('Credits spent', String(m.creditsSpent)),
        stat('Ads watched', String(m.adsWatched)),
        stat('Win rate', (d.winRate * 100).toFixed(0) + '%'),
        stat('Fail streak', String(snap.dda.failStreak)),
      ]),
    ],
    [
      btn('Back', () => {
        app.screen = 'settings';
        renderOverlay();
      }, 'secondary'),
    ],
  );
}

function stat(k: string, v: string): HTMLElement {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'k' }, [k]),
    el('div', { class: 'v' }, [v]),
  ]);
}

/** Map / hub stat chip with real art (no emoji / unicode gems). Kept for docks / settings. */
function statIcon(iconPath: string, k: string, v: string): HTMLElement {
  const img = el('img', {
    class: 'stat-icon',
    src: assetUrl(iconPath),
    alt: '',
    decoding: 'async',
    draggable: 'false',
  }) as HTMLImageElement;
  img.onerror = () => {
    img.style.display = 'none';
  };
  return el('div', { class: 'stat stat-with-icon' }, [
    el('div', { class: 'stat-icon-row' }, [
      img,
      el('div', { class: 'stat-text' }, [
        el('div', { class: 'k' }, [k]),
        el('div', { class: 'v' }, [v]),
      ]),
    ]),
  ]);
}
mount();
