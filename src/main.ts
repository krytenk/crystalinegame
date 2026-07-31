/**
 * CRYSTALLINE — bootstrap + top-level state machine.
 *
 * Demo / portfolio build: monetization is simulated.
 * Rewarded + interstitial placements play Discworld in 60 Seconds YouTube Shorts.
 */

import { createSession, type Session } from '@engine/board';
import { computeDda } from '@engine/dda';
import type { Coord, ObjectiveKind } from '@engine/types';
import type { GameEvent } from '@engine/events';
import { POWER_NAME, type PowerKind } from '@engine/specials';
import {
  ECONOMY_CONST,
  Economy,
  META_STAGES,
  META_UPGRADES,
  createBrowserStorage,
  type MetaUpgrade,
} from '@economy/index';
import {
  channelUrl,
  nextDiscworldShort,
  youtubeEmbedUrl,
} from '@economy/discworldShorts';
import { AudioDirector } from '@audio/audio';
import { haptic } from '@audio/haptics';
import { Atlas } from '@render/atlas';
import { drawGameBackground, loadBackground } from '@render/background';
import { CanvasView } from '@render/canvas';
import { BoardAnimator } from '@render/boardAnimator';
import { BoardView } from '@render/boardView';
import { assetUrl } from '@render/assetUrl';
import { JuiceSystem } from '@render/juice';
import { tierFromMatch, VfxPlayer } from '@render/vfx';
import {
  AHA_SWAP_B,
  findFireHint,
  seedFirstLightAha,
  type TutorialPhase,
} from '@engine/tutorial';
import { getLevel, LEVEL_COUNT, LEVELS } from './levels';
import {
  COMPANION,
  companionLine,
  dealGeodeSlots,
  type CompanionBeat,
} from './narrative/companion';
import { injectStyles } from './ui/styles';
import { btn, clear, el, setUiTapHook } from './ui/dom';

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
  | 'dashboard';

interface AppState {
  screen: Screen;
  levelId: number;
  session: Session | null;
  lastResult: { status: 'won' | 'lost'; score: number; stars: number } | null;
  adPlacement: 'rewardedLife' | 'rewardedBooster' | 'rewardedContinue' | 'interstitial' | null;
  adReturn: Screen;
  /** Active Discworld Short video id while an ad is showing. */
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
}

const AHA_KEY = 'crystalline.ahaDone';

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
};

const powerLabel = (kind: string): string => {
  if (kind === 'core') return 'Living Core';
  if (kind in POWER_NAME) return POWER_NAME[kind as PowerKind];
  return 'Power Crystal';
};

const economy = new Economy({ storage: createBrowserStorage(), saveDebounceMs: 100 });
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
  collect: 'Drop relics',
  defuse: 'Defuse bombs',
  contain: 'Clear shadow',
};

function pushToast(text: string, color = '#ffe9a8', life = 1600): void {
  toasts.push({ text, born: performance.now(), life, color });
  if (toasts.length > 4) toasts.shift();
}

function mount(): void {
  injectStyles();
  loadBackground();
  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('#app missing');
  clear(appEl);

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
  audio.setEnabled(bootSettings.sfx);
  if (!bootSettings.music) audio.stopPad();
  boardView.glyphs = bootSettings.glyphs;

  setUiTapHook(() => audio.uiTap());

  // Boot splash while atlas loads
  app.screen = 'boot';
  renderOverlay();

  void atlas.load().then(async () => {
    try {
      await vfx.load(atlas.vfx);
    } catch {
      // Procedural fallback bursts still work.
    }
    // Brief branded hold so splash reads as intentional
    window.setTimeout(() => {
      app.screen = 'title';
      app.titleBorn = performance.now();
      titleFxAt = app.titleBorn + 400;
      audio.panelWhoosh();
      renderOverlay();
    }, 480);
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
    if (!frozen && !app.paused) boardAnim.update(now);
    boardView.draw(ctx, snap, atlas, canvasView.dprBucket, now, boardAnim);
    const { originX, originY, cell } = boardView.layout;
    const bw = cell * snap.width;
    const bh = cell * snap.height;
    if (!app.paused) {
      drawBoardDust(ctx, originX, originY, bw, bh, now);
      drawAhaHint(ctx, now);
    } else {
      // Dim board while paused
      ctx.fillStyle = 'rgba(6, 4, 16, 0.35)';
      ctx.fillRect(originX - 4, originY - 4, bw + 8, bh + 8);
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

  // Soft title on canvas (DOM carries the CTA)
  const pulse = reduce ? 1 : 0.92 + 0.08 * Math.sin(age * 0.004);
  ctx.save();
  ctx.translate(w / 2, h * 0.26);
  ctx.scale(pulse, pulse);
  ctx.textAlign = 'center';
  ctx.font = '800 64px "GalacticKnights", "CrystallineDisplay", "Cinzel", serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(30, 16, 60, 0.85)';
  ctx.strokeText('CRYSTALLINE', 0, 0);
  ctx.fillStyle = '#fff6e8';
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = 28;
  ctx.fillText('CRYSTALLINE', 0, 0);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '700 17px "CrystallineBody", "Nunito", sans-serif';
  ctx.fillStyle = 'rgba(220,210,255,0.8)';
  ctx.shadowBlur = 0;
  ctx.fillText('Match · Forge · Cascade · Build', w / 2, h * 0.34);
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

/** Gentle dust over the board pad — keeps the mine “alive” between moves. */
function drawBoardDust(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  bw: number,
  bh: number,
  now: number,
): void {
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const seed = i * 41.7;
    const x = ox + ((Math.sin(seed + now * 0.0003) * 0.5 + 0.5) * bw);
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
  ctx.font = '800 15px "CrystallineDisplay", "Nunito", sans-serif';
  ctx.fillStyle = '#fff6e8';
  ctx.fillText(label, mx, my - 8);
  ctx.font = '700 12px "Nunito", sans-serif';
  ctx.fillStyle = 'rgba(200, 190, 230, 0.9)';
  ctx.fillText(tip, mx, my + 12);
  ctx.restore();
}

function drawChrome(ctx: CanvasRenderingContext2D, now: number): void {
  const snap = economy.getSnapshot();
  const display = '"CrystallineDisplay", "Cinzel", "Palatino Linotype", serif';
  const body = '"CrystallineBody", "Nunito", "Segoe UI", system-ui, sans-serif';
  const reduceMotion = snap.settings.reducedMotion;

  // Soft top bar — studio casual HUD (not a website header)
  ctx.fillStyle = 'rgba(12, 8, 28, 0.88)';
  roundRectPath(ctx, 12, 10, 696, 158, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, 18, 16, 684, 146, 18);
  ctx.stroke();

  // Wordmark with stroke for mobile readability
  ctx.font = `800 30px ${display}`;
  ctx.textAlign = 'left';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(30, 16, 60, 0.9)';
  ctx.strokeText('CRYSTALLINE', 32, 48);
  ctx.fillStyle = '#fff6e8';
  ctx.fillText('CRYSTALLINE', 32, 48);

  drawChip(ctx, 32, 68, `♥ ${snap.lives.count}`, '#ff7a8a', body, 96);
  drawChip(ctx, 140, 68, `◆ ${snap.wallet.shards}`, '#7ecbff', body, 108);
  drawChip(ctx, 260, 68, `✧ ${snap.meta.essence}`, '#ffd24a', body, 118);

  if (app.screen === 'play' && app.session) {
    const s = app.session.snapshot();
    const movesHot = s.movesLeft <= 5;
    if (s.movesLeft !== hudLastMoves) {
      if (s.movesLeft < hudLastMoves && movesHot) hudMovesPulseUntil = now + 520;
      hudLastMoves = s.movesLeft;
    }
    if (s.score > hudScoreShown) {
      hudScorePulseUntil = now + 420;
      hudScoreShown = s.score;
    }

    // Low-moves urgency rim
    if (movesHot && !reduceMotion) {
      const pulse = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(now * 0.012));
      ctx.save();
      ctx.strokeStyle = `rgba(255, 80, 100, ${pulse})`;
      ctx.lineWidth = 4;
      roundRectPath(ctx, 14, 12, 692, 154, 20);
      ctx.stroke();
      ctx.restore();
    }

    const movesPulse = !reduceMotion && now < hudMovesPulseUntil;
    const scorePulse = !reduceMotion && now < hudScorePulseUntil;
    drawStatBadge(
      ctx,
      32,
      108,
      movesHot ? 'MOVES · LOW' : 'MOVES',
      String(s.movesLeft),
      movesHot ? '#ff6a7a' : '#5ec8ff',
      display,
      movesPulse ? 1.08 : 1,
    );
    drawStatBadge(
      ctx,
      200,
      108,
      'SCORE',
      s.score.toLocaleString(),
      '#ffd24a',
      display,
      scorePulse ? 1.1 : 1,
    );

    if (app.pickaxeMode) {
      ctx.fillStyle = '#ffd679';
      ctx.font = `800 14px ${body}`;
      ctx.fillText('TAP A GEM TO SMASH', 380, 128);
    } else {
      drawObjectiveHud(ctx, s.objectives, 380, 104, body, now, reduceMotion);
    }
  } else {
    ctx.fillStyle = '#c4b6d8';
    ctx.font = `800 14px ${body}`;
    ctx.fillText('Match · Forge · Cascade · Build', 32, 132);
    // Reset play HUD trackers off-play
    hudScoreShown = 0;
    hudLastMoves = -1;
  }
  void now;
}

/** Compact objective pills with mini progress bars (in-level HUD). */
function drawObjectiveHud(
  ctx: CanvasRenderingContext2D,
  objectives: readonly { kind: ObjectiveKind; current: number; target: number }[],
  x0: number,
  y0: number,
  font: string,
  now: number,
  reduceMotion: boolean,
): void {
  let x = x0;
  const maxW = 700 - x0 - 16;
  const pillW = Math.min(150, Math.floor(maxW / Math.max(1, objectives.length)) - 6);
  for (const o of objectives) {
    const done = o.current >= o.target;
    const pct = Math.min(1, o.current / Math.max(1, o.target));
    const accent = done ? '#4dde8a' : '#7ed0ff';
    const glow = done && !reduceMotion ? 0.55 + 0.25 * Math.sin(now * 0.008) : 0.4;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRectPath(ctx, x, y0, pillW, 48, 12);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = glow;
    ctx.lineWidth = 1.8;
    roundRectPath(ctx, x, y0, pillW, 48, 12);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `800 9px ${font}`;
    ctx.textAlign = 'left';
    const label = OBJECTIVE_LABEL[o.kind];
    ctx.fillText(label.length > 12 ? label.slice(0, 11) + '…' : label, x + 8, y0 + 13);

    ctx.fillStyle = done ? '#4dde8a' : '#e8f4ff';
    ctx.font = `800 15px ${font}`;
    ctx.fillText(
      done ? '✓' : `${o.current}/${o.target}`,
      x + 8,
      y0 + 30,
    );

    // Progress track
    const trackX = x + 8;
    const trackY = y0 + 36;
    const trackW = pillW - 16;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRectPath(ctx, trackX, trackY, trackW, 5, 3);
    ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = accent;
      roundRectPath(ctx, trackX, trackY, Math.max(4, trackW * pct), 5, 3);
      ctx.fill();
    }

    x += pillW + 6;
    if (x + 40 > 700) break;
  }
}

function drawStatBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string,
  font: string,
  scale = 1,
): void {
  ctx.save();
  if (scale !== 1) {
    const cx = x + 75;
    const cy = y + 18;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRectPath(ctx, x, y, 150, 38, 12);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, 150, 38, 12);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `800 10px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 12, y + 13);
  ctx.fillStyle = color;
  ctx.font = `800 18px ${font}`;
  ctx.shadowColor = color;
  ctx.shadowBlur = scale > 1 ? 12 : 0;
  ctx.fillText(value, x + 12, y + 31);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
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
  ctx.fillStyle = accent;
  ctx.font = `800 15px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 12, y + 21);
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

function bindInput(): void {
  canvas.addEventListener('pointerdown', (e) => {
    if (app.screen !== 'play' || app.paused) return;
    audio.resume();
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
                ? 'Living Core: +2 moves!'
                : claim.reward === 'burst'
                  ? 'Living Core: Geode burst!'
                  : 'Living Core: score surge!';
            pushToast(msg, '#ffe9a8', 2000);
            juice.powerBanner('LIVING CORE!');
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
            window.setTimeout(
              () => finishLevel(ended.status, ended.score, ended.stars, ended.reason),
              400,
            );
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

  canvas.addEventListener('pointerup', (e) => {
    if (app.screen !== 'play' || app.paused || !app.session || app.pickaxeMode) return;
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
    const wait = Math.max(0, Math.min(900, boardAnim.busy ? 550 : 0));
    window.setTimeout(() => {
      finishLevel(ended.status, ended.score, ended.stars, ended.reason);
    }, wait);
  }
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
      juice.burst(cx, cy, col, 10 + tier * 5);
      if (tier >= 4) juice.ring(cx, cy, col, 40 + tier * 10, 380 + tier * 30);
      window.setTimeout(() => {
        juice.scorePop(cx, cy - 12, ev.points, tier >= 4 ? '#ffe9a8' : '#d0e8ff');
      }, 90);

      if (tier >= 6) {
        shakeMs = 320;
        shakeMag = 14;
        juice.requestHitStop(70);
        juice.screenFlash('rgba(255, 240, 200, 0.55)', 260, 0.38);
        haptic('clearBig');
      } else if (tier === 5) {
        shakeMs = 200;
        shakeMag = 8;
        juice.requestHitStop(45);
        juice.screenFlash('rgba(224, 192, 255, 0.45)', 200, 0.28);
        haptic('clearBig');
      } else if (tier === 4) {
        shakeMs = 100;
        shakeMag = 4;
        juice.requestHitStop(28);
        haptic('clear');
      } else {
        haptic('clear');
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
      juice.burst(p.x, p.y, col, 22);
      juice.ring(p.x, p.y, col, 90, 520);
      juice.ring(p.x, p.y, '#fff6e8', 55, 380);
      juice.powerBanner(`${name.toUpperCase()} FORGED`);
      juice.requestHitStop(55);
      juice.screenFlash(
        ev.piece.kind === 'supernova' ? 'rgba(255,255,255,0.4)' : 'rgba(200, 160, 255, 0.35)',
        180,
        0.28,
      );
      haptic('forge');
      if (forged <= 2) pushToast(`${name} forged!`, '#e0c0ff', 1600);
      if (app.ahaPhase === 'forge') advanceTutorialToFire();
    } else if (ev.t === 'coreSpawned') {
      const p = cellToLogical(ev.at);
      juice.burst(p.x, p.y, '#ffe9a8', 24);
      juice.ring(p.x, p.y, '#ffd24a', 100, 600);
      juice.powerBanner('LIVING CORE!');
      juice.screenFlash('rgba(255, 210, 80, 0.4)', 240, 0.3);
      haptic('special');
      pushToast('Living Core! Tap the spinning crystal', '#ffe9a8', 2600);
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
              ? '#ffffff'
              : '#7ed0ff';
      juice.burst(p.x, p.y, powerCol, 28 + tier * 8);
      juice.burst(p.x, p.y, '#fff0c0', 14 + tier * 4);
      juice.ring(p.x, p.y, powerCol, 60 + tier * 14, 480);
      // Secondary pops along affected cells for “board wipe” read
      const sample = ev.affected.slice(0, 12);
      for (const c of sample) {
        const q = cellToLogical(c);
        juice.burst(q.x, q.y, powerCol, 4 + Math.floor(tier / 2));
      }
      haptic('special');
      if (tier >= 5) {
        shakeMs = Math.max(shakeMs, tier >= 6 ? 320 : 180);
        shakeMag = Math.max(shakeMag, tier >= 6 ? 14 : 8);
        juice.requestHitStop(tier >= 6 ? 90 : 55);
        juice.screenFlash(
          tier >= 6 ? 'rgba(255,255,255,0.5)' : 'rgba(255, 200, 120, 0.4)',
          tier >= 6 ? 280 : 200,
          tier >= 6 ? 0.4 : 0.28,
        );
      } else {
        shakeMs = Math.max(shakeMs, 90);
        shakeMag = Math.max(shakeMag, 4);
        juice.requestHitStop(30);
      }
      if (powerFires === 1) {
        juice.powerBanner(powerLabel(ev.kind).toUpperCase());
        pushToast(powerLabel(ev.kind), '#ffe9a8', 1200);
      } else if (powerFires === 2) {
        juice.powerBanner('POWER CASCADE!');
        pushToast('Power cascade!', '#ffb0e0', 1500);
        juice.requestHitStop(60);
      }
      if (app.ahaPhase === 'fire') completeTutorial();
    } else if (ev.t === 'levelEnded') {
      if (ev.status === 'won') haptic('win');
      else haptic('softFail');
    }
  }

  if (maxCascade >= 1) {
    juice.cascadeBanner(maxCascade);
    if (maxCascade >= 2) haptic('cascade');
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
    economy.completeLevel(app.levelId, stars, scalar);
    app.pendingGeode = true;
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
  pushToast(`+${n} moves — finish the geode!`, '#7dffc0', 2200);
  renderOverlay();
}

function acceptContinue(via: 'ad' | 'shards'): void {
  if (!app.session || !app.pendingContinue) return;
  if (via === 'shards') {
    if (!economy.spendShardsForContinue()) {
      pushToast(
        `Need ${ECONOMY_CONST.cost.extraMoves5} shards — or watch a Short`,
        '#ff9a9a',
      );
      return;
    }
    reviveSessionWithMoves(5);
    return;
  }
  // Rewarded Short; moves applied in closeAdSession when grant succeeds.
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
  hudScoreShown = 0;
  hudScorePulseUntil = 0;
  hudMovesPulseUntil = 0;
  hudLastMoves = -1;
  const level = getLevel(id);
  app.session = createSession(level, (Date.now() ^ (id * 9973)) >>> 0, ddaScalar());

  // First Light: two-beat tutorial (forge → fire).
  if (id === 1 && (forceAha || !app.ahaDone)) {
    const hintA = seedFirstLightAha(app.session._state.grid, app.session._state.ids);
    app.ahaHint = { a: hintA, b: AHA_SWAP_B };
    app.ahaPhase = 'forge';
    pushToast('Swap the glowing gems to FORGE a power!', '#ffe9a8', 3200);
  }

  if (prep.seedPrism && economy.consumeBooster('seedPrism').ok) {
    app.session.useSeedPrism();
    pushToast('Opal Prism seeded!', '#e0c0ff');
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
      // Near-miss revive uses continueWithMoves; mid-level continue uses addMoves.
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
    // Interstitials still count as shown even if skipped after the unlock.
    if (placement === 'interstitial') {
      economy.noteInterstitialShown();
    }
    // Declined continue ad → treat as give-up if we still have a lost session.
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

function openAd(
  placement: NonNullable<AppState['adPlacement']>,
  returnTo: Screen,
): void {
  app.adPlacement = placement;
  app.adReturn = returnTo;
  const start = economy.startAd(placement);
  if (!start.ok) {
    app.adVideoId = null;
    app.screen = returnTo;
    renderOverlay();
    return;
  }
  app.adVideoId = nextDiscworldShort().id;
  app.screen = 'ad';
  // Build the player once — ticking only patches timer / skip chrome so the
  // YouTube iframe is not destroyed every frame.
  renderAdShell();
  const tick = () => {
    if (app.screen !== 'ad') return;
    const p = economy.adProgress();
    updateAdChrome(p);
    if (p.finished) {
      // Full Short watched → complete (rewarded pays out; interstitial just closes).
      closeAdSession({ grant: true });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderOverlay(): void {
  clear(overlay);
  if (app.screen === 'boot') {
    overlay.classList.remove('hidden');
    overlay.style.background =
      'radial-gradient(ellipse at 50% 40%, rgba(80,40,140,0.45), rgba(6,4,14,0.96))';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'none';
    const splash = el('div', { class: 'boot-splash' }, [
      el('div', { class: 'boot-logo' }, ['CRYSTALLINE']),
      el('div', { class: 'boot-sub' }, ['Loading the mine…']),
      el('div', { class: 'boot-bar' }, [el('div', { class: 'boot-bar-fill' }, [])]),
    ]);
    overlay.append(splash);
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

    const dock = el('div', { class: 'play-dock' }, []);
    dock.style.pointerEvents = 'auto';
    const snap = economy.getSnapshot();
    const pauseBtn = btn('❚❚', () => {
      app.paused = true;
      app.pickaxeMode = false;
      audio.uiTap();
      renderOverlay();
    }, 'secondary');
    pauseBtn.title = 'Pause';
    pauseBtn.classList.add('play-tool', 'play-pause');
    const reshuffleBtn = btn(
      `⟲ ×${snap.boosters.reshuffle}`,
      () => {
        if (!app.session) return;
        if (economy.consumeBooster('reshuffle').ok) {
          const events = app.session.useReshuffle();
          audio.handle(events);
          boardAnim.sync(app.session.snapshot());
          pushToast('Board reshuffled', '#b8f0ff');
          haptic('forge');
          renderOverlay();
        } else {
          pushToast('No reshuffles — buy in Store', '#ff9a9a');
        }
      },
      'secondary',
      snap.boosters.reshuffle <= 0,
    );
    reshuffleBtn.title = 'Reshuffle board';
    reshuffleBtn.classList.add('play-tool');
    const pickBtn = btn(
      app.pickaxeMode ? '✕' : `⛏ ×${snap.boosters.pickaxe}`,
      () => {
        if (app.pickaxeMode) {
          app.pickaxeMode = false;
          renderOverlay();
          return;
        }
        if (snap.boosters.pickaxe <= 0) {
          pushToast('No pickaxes — buy in Store', '#ff9a9a');
          return;
        }
        app.pickaxeMode = true;
        pushToast('Tap a gem to smash', '#ffd679');
        haptic('special');
        renderOverlay();
      },
      app.pickaxeMode ? 'gold' : 'secondary',
      !app.pickaxeMode && snap.boosters.pickaxe <= 0,
    );
    pickBtn.title = app.pickaxeMode ? 'Cancel pickaxe' : 'Pickaxe';
    pickBtn.classList.add('play-tool');
    if (app.pickaxeMode) pickBtn.classList.add('armed');
    dock.append(
      el('div', { class: 'play-dock-tools' }, [pauseBtn, reshuffleBtn, pickBtn]),
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
  const p = el('div', {
    class: opts.className ? `panel panel-enter ${opts.className}` : 'panel panel-enter',
  }, [
    el('h1', {}, [title]),
    ...body,
    el('div', { class: 'row' }, actions),
  ]);
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
    'linear-gradient(180deg, rgba(10,6,24,0.08) 0%, rgba(10,6,24,0.4) 38%, rgba(8,4,18,0.9) 100%)';
  overlay.style.backdropFilter = 'none';
  overlay.style.justifyContent = 'flex-end';
  overlay.style.paddingBottom = '8%';

  const snap = economy.getSnapshot();
  const progressLine =
    snap.progress.highestUnlocked <= 1 && !app.ahaDone
      ? 'Your first dive awaits'
      : `Chamber ${snap.progress.highestUnlocked} open · ${snap.meta.ownedCount}/${snap.meta.totalCount} cavern pieces`;

  const wrap = el('div', { class: 'panel panel-title' }, []);
  wrap.append(
    el('div', { class: 'title-gems', 'aria-hidden': 'true' }, [
      el('span', { class: 'title-gem g1' }, ['◆']),
      el('span', { class: 'title-gem g2' }, ['✦']),
      el('span', { class: 'title-gem g3' }, ['◇']),
      el('span', { class: 'title-gem g4' }, ['❖']),
    ]),
    el('div', { class: 'title-kicker' }, ['CRYSTAL MINE MATCH-3']),
    el('h1', {}, ['CRYSTALLINE']),
    el('p', { class: 'title-tagline' }, ['Match gems. Forge powers. Build your cavern.']),
    companionBubble(
      !app.ahaDone ? 'titleFirst' : 'title',
      snap.progress.highestUnlocked + snap.meta.ownedCount,
    ),
    el('div', { class: 'title-features' }, [
      el('div', { class: 'title-feat' }, ['Match']),
      el('div', { class: 'title-feat' }, ['Forge']),
      el('div', { class: 'title-feat' }, ['Cascade']),
      el('div', { class: 'title-feat' }, ['Furnish']),
    ]),
    el('p', { class: 'hud-tip title-progress' }, [progressLine]),
    el('div', { class: 'row title-actions' }, [
      btn(
        app.ahaDone ? 'PLAY' : 'BEGIN',
        () => {
          audio.titleSting();
          audio.stopPad();
          // First visit: skip map, drop into Level 1 aha
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
      btn(
        'LEVELS',
        () => {
          audio.resume();
          audio.stopPad();
          app.screen = 'map';
          renderOverlay();
        },
        'secondary',
      ),
    ]),
  );
  overlay.append(wrap);

  // Daily gift modal (once) — more game-like than a toast
  const gift = snap.pendingDailyGift;
  if (gift) {
    requestAnimationFrame(() => showDailyGiftModal(gift));
  }
}

/** In-play pause overlay — resume, mute, quit to results (life spent). */
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
        ? `Level ${app.levelId} · ${s.movesLeft} moves · ${s.score.toLocaleString()} pts`
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
function nextGoalHint(snap: ReturnType<Economy['getSnapshot']>): string {
  const meta = snap.meta;
  if (meta.nextAffordable) {
    return `Ready · place ${meta.nextAffordable.name} in the cavern`;
  }
  if (meta.nextTarget) {
    const need = Math.max(0, meta.nextTarget.cost - meta.essence);
    return `Next · ${need}✧ for ${meta.nextTarget.name}`;
  }
  if (meta.stagesComplete >= 4) {
    return 'Cavern complete · chase ★★★ on every chamber';
  }
  return `Next · clear level ${snap.progress.highestUnlocked}`;
}

function essenceProgressBar(snap: ReturnType<Economy['getSnapshot']>): HTMLElement {
  const target = snap.meta.nextTarget;
  const have = snap.meta.essence;
  const need = target?.cost ?? 100;
  const pct = Math.min(100, Math.floor((have / Math.max(1, need)) * 100));
  const wrap = el('div', { class: 'essence-track-wrap' }, [
    el('div', { class: 'essence-track-label' }, [
      target
        ? `✧ ${have} / ${need} · ${target.name}`
        : `✧ ${have} essence`,
    ]),
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

  const grid = el('div', { class: 'geode-grid' }, []);
  for (let i = 0; i < slots.length; i++) {
    const reward = slots[i]!;
    const isJackpot = reward === Math.max(...slots);
    const cell = el(
      'button',
      {
        class: 'geode-slot',
        type: 'button',
        'aria-label': `Sealed geode ${i + 1}`,
      },
      [
        el('div', { class: 'geode-slot-glyph' }, ['◆']),
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
        el('div', { class: 'geode-slot-glyph' }, [isJackpot ? '❋' : '✦']),
        el('div', { class: 'geode-slot-reward' }, [`+${reward} ✧`]),
      );
      // Reveal siblings as duds (dim)
      for (const sibling of grid.querySelectorAll('.geode-slot')) {
        if (sibling === cell) continue;
        (sibling as HTMLElement).classList.add('miss');
        (sibling as HTMLElement).setAttribute('disabled', 'true');
      }
      pushToast(
        isJackpot ? `Jackpot vein · +${reward}✧!` : `Geode crack · +${reward}✧`,
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
      }, 1100);
    });
    grid.append(cell);
  }

  const modal = el('div', { class: 'geode-crack', id: 'geode-crack-modal' }, [
    el('div', { class: 'geode-crack-card panel-enter' }, [
      companionBubble('geode', app.levelId),
      el('div', { class: 'geode-crack-kicker' }, ['CRACK A GEODE']),
      el('h2', {}, ['Bonus essence']),
      el('p', { class: 'hud-tip', id: 'geode-result-line' }, [
        'Pick one sealed vein — rewards are shuffled.',
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
  overlay.append(modal);
  audio.starDing(0);
}

function showDailyGiftModal(gift: { credits: number; essence: number }): void {
  if (document.getElementById('daily-gift-modal')) return;
  const modal = el('div', { class: 'daily-gift', id: 'daily-gift-modal' }, [
    el('div', { class: 'daily-gift-card panel-enter' }, [
      companionBubble('daily', Number(gift.credits + gift.essence)),
      el('div', { class: 'daily-gift-kicker' }, ['DAILY GIFT']),
      el('h2', {}, ['Welcome back']),
      el('div', { class: 'daily-gift-rewards' }, [
        el('div', { class: 'daily-gift-chip' }, [`+${gift.credits} ¢`]),
        el('div', { class: 'daily-gift-chip gold' }, [`+${gift.essence} ✧`]),
      ]),
      el('p', { class: 'hud-tip' }, ['Credits for the shop · essence for your cavern']),
      btn(
        'CLAIM',
        () => {
          economy.consumeDailyGift();
          audio.starDing(2);
          haptic('forge');
          modal.remove();
          pushToast(`+${gift.credits}¢ · +${gift.essence}✧ claimed`, '#ffd24a', 2200);
        },
        'gold',
      ),
    ]),
  ]);
  overlay.append(modal);
  audio.starDing(0);
}

function boosterChip(
  label: string,
  meta: string,
  on: boolean,
  disabled: boolean,
  onClick: () => void,
): HTMLButtonElement {
  const b = el(
    'button',
    {
      class: `booster-chip${on ? ' on' : ''}`,
      type: 'button',
      disabled: disabled ? true : undefined,
    },
    [label, el('span', { class: 'meta' }, [meta])],
  ) as HTMLButtonElement;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (disabled) return;
    onClick();
  });
  return b;
}

/** Chapter metadata for map depth labels (levels 1–10 / 11–20 / 21+). */
const MAP_CHAPTERS: readonly {
  readonly roman: string;
  readonly title: string;
  readonly depth: string;
  readonly maxId: number;
  readonly minId: number;
}[] = [
  { roman: 'I', title: 'Mouth of the Mine', depth: 'shallow', minId: 1, maxId: 10 },
  { roman: 'II', title: 'Prism Gallery', depth: 'mid', minId: 11, maxId: 20 },
  { roman: 'III', title: 'Deep Geode', depth: 'deep', minId: 21, maxId: 999 },
];

function chapterForLevel(levelId: number): (typeof MAP_CHAPTERS)[number] {
  return (
    MAP_CHAPTERS.find((c) => levelId >= c.minId && levelId <= c.maxId) ?? MAP_CHAPTERS[0]!
  );
}

/** Smooth snake path points for a single chapter grid (5-col zigzag). */
function chapterPathPoints(
  count: number,
  cols = 5,
): { x: number; y: number }[] {
  const rows = Math.max(1, Math.ceil(count / cols));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const c = row % 2 === 1 ? cols - 1 - col : col;
    pts.push({
      x: ((c + 0.5) / cols) * 100,
      y: ((row + 0.5) / rows) * 100,
    });
  }
  return pts;
}

/** Per-chapter trail SVG — aligns with its own grid, not the whole board. */
function buildChapterPathSvg(
  levelCount: number,
  /** How many nodes in this chapter are on the gold progress trail (0..levelCount). */
  progressCount: number,
): SVGSVGElement {
  const pathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  pathSvg.setAttribute('class', 'map-path');
  pathSvg.setAttribute('viewBox', '0 0 100 100');
  pathSvg.setAttribute('preserveAspectRatio', 'none');
  const pts = chapterPathPoints(levelCount);
  if (pts.length < 2) return pathSvg;

  const ptsAttr = (list: { x: number; y: number }[]) =>
    list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const polyAll = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyAll.setAttribute('points', ptsAttr(pts));
  polyAll.setAttribute('class', 'map-path-line map-path-dim');
  pathSvg.appendChild(polyAll);

  const progN = Math.max(0, Math.min(levelCount, progressCount));
  if (progN >= 2) {
    const polyProg = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyProg.setAttribute('points', ptsAttr(pts.slice(0, progN)));
    polyProg.setAttribute('class', 'map-path-line map-path-progress');
    pathSvg.appendChild(polyProg);
  }
  // Milestone dots along the gold trail
  for (let i = 0; i < progN; i++) {
    const p = pts[i]!;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x.toFixed(1));
    dot.setAttribute('cy', p.y.toFixed(1));
    dot.setAttribute('r', i === progN - 1 ? '2.4' : '1.4');
    dot.setAttribute(
      'class',
      i === progN - 1 ? 'map-path-dot map-path-dot-tip' : 'map-path-dot',
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

function renderMap(): void {
  const snap = economy.getSnapshot();
  const cols = 5;
  const board = el('div', { class: 'map-board' }, [
    el('img', {
      class: 'map-board-bg',
      src: assetUrl('ui/map_bg.webp'),
      alt: '',
      decoding: 'async',
    }),
  ]);

  const nextPlayId = snap.progress.highestUnlocked;
  let totalStars = 0;

  for (const ch of MAP_CHAPTERS) {
    const levels = LEVELS.filter((l) => l.id >= ch.minId && l.id <= ch.maxId);
    if (levels.length === 0) continue;

    let chStars = 0;
    let chCleared = 0;
    for (const lvl of levels) {
      const s = starCountForLevel(snap.progress.stars, lvl.id);
      chStars += s;
      if (s > 0) chCleared += 1;
    }
    totalStars += chStars;
    const maxStars = levels.length * 3;
    const starPct = Math.min(100, Math.floor((chStars / Math.max(1, maxStars)) * 100));
    const chapterOpen = levels.some((l) => l.id <= snap.progress.highestUnlocked);
    const chapterDone = levels[levels.length - 1]!.id < snap.progress.highestUnlocked;

    // Progress nodes in this chapter: unlocked through next playable
    const progressInChapter = levels.filter((l) => l.id <= snap.progress.highestUnlocked).length;

    const section = el(
      'div',
      {
        class: `map-section depth-${ch.depth}${chapterOpen ? '' : ' locked'}${chapterDone ? ' done' : ''}`,
      },
      [],
    );
    section.append(
      el('div', { class: 'map-chapter' }, [
        el('div', { class: 'map-chapter-title' }, [
          `${ch.roman} · ${ch.title}`,
          chapterDone ? el('span', { class: 'map-chapter-badge' }, ['✓']) : '',
        ].filter(Boolean) as (string | Node)[]),
        el('div', { class: 'map-chapter-meta' }, [
          `${chCleared}/${levels.length} cleared · ${chStars}/${maxStars}★`,
        ]),
        el('div', { class: 'map-chapter-track' }, [
          el('div', {
            class: 'map-chapter-fill',
            style: `width:${starPct}%`,
          }, []),
        ]),
      ]),
    );

    const gridWrap = el('div', { class: 'map-grid-wrap' }, []);
    gridWrap.append(buildChapterPathSvg(levels.length, progressInChapter));
    const grid = el('div', { class: 'map-grid' }, []);
    for (const lvl of levels) {
      const locked = lvl.id > snap.progress.highestUnlocked;
      const stars = starCountForLevel(snap.progress.stars, lvl.id);
      const isNext = lvl.id === nextPlayId && !locked;
      const starText = stars > 0 ? '★'.repeat(stars) : locked ? '🔒' : '·';
      const kids: (string | Node)[] = [
        `${lvl.id}`,
        el('div', { class: 'level-stars' }, [starText]),
      ];
      if (isNext) {
        kids.push(el('div', { class: 'level-you' }, ['YOU']));
      }
      const b = el(
        'button',
        {
          class: `level-node${locked ? ' locked' : ''}${lvl.id === app.levelId ? ' current' : ''}${stars > 0 ? ' cleared' : ''}${isNext ? ' next-play' : ''}`,
          type: 'button',
          disabled: locked ? true : undefined,
          title: stars > 0 ? `${stars} star${stars === 1 ? '' : 's'}` : locked ? 'Locked' : 'Play',
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
      grid.append(b);
    }
    gridWrap.append(grid);
    section.append(gridWrap);
    board.append(section);
    void cols;
  }

  const meta = snap.meta;
  panel(
    'Levels',
    [
      el('p', {}, ['Clear chambers · collect stars · furnish your cavern']),
      el('div', { class: 'goal-banner' }, [nextGoalHint(snap)]),
      essenceProgressBar(snap),
      board,
      el('div', { class: 'stat-grid' }, [
        stat('Lives', String(snap.lives.count)),
        stat('Stars', `${totalStars}`),
        stat('Essence', String(meta.essence)),
        stat('Cavern', `${meta.ownedCount}/${meta.totalCount}`),
      ]),
    ],
    [
      btn('CAVERN', () => {
        app.screen = 'cavern';
        renderOverlay();
      }, 'gold'),
      btn('SHOP', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
      btn('Settings', () => {
        app.screen = 'settings';
        renderOverlay();
      }, 'secondary'),
    ],
  );
}

function renderPrelevel(): void {
  const level = getLevel(app.levelId);
  const snap = economy.getSnapshot();
  if (snap.boosters.seedPrism <= 0) app.prep.seedPrism = false;
  if (snap.boosters.extraMoves <= 0) app.prep.extraMoves = false;
  const best = starCountForLevel(snap.progress.stars, level.id);
  const ch = chapterForLevel(level.id);

  const bannerArt =
    level.id <= 10
      ? 'ui/prelevel_banner.webp'
      : level.id <= 20
        ? 'ui/prelevel_mid.webp'
        : 'ui/prelevel_deep.webp';
  const banner = el('div', { class: `level-banner depth-${ch.depth}` }, [
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
        el('div', { class: 'level-banner-meta' }, [
          `${level.moves} moves  ·  ${level.width}×${level.height}`,
        ]),
        el('div', { class: 'level-banner-stars' }, [
          best > 0 ? '★'.repeat(best) + '☆'.repeat(3 - best) : '☆☆☆  best',
        ]),
      ]),
    ]),
  ]);

  const goals = el('div', { class: 'goal-row' }, [
    ...level.objectives.map((o) =>
      el('div', { class: 'goal-chip' }, [
        el('span', { class: 'goal-k' }, [OBJECTIVE_LABEL[o.kind]]),
        el('span', { class: 'goal-v' }, [String(o.target)]),
      ]),
    ),
  ]);

  // Soft retention: tie this dive to cavern progress
  const starNudge =
    best < 3
      ? best === 0
        ? 'First clear mints essence · ★★★ pays discovery bonus'
        : `Best ★${best} · push higher for more essence`
      : '★★★ sealed · still farm essence on clears';

  const chips = el('div', { class: 'booster-row' }, [
    boosterChip(
      `Prism seed ${app.prep.seedPrism ? '✓' : ''}`,
      `×${snap.boosters.seedPrism}`,
      app.prep.seedPrism,
      snap.boosters.seedPrism <= 0,
      () => {
        app.prep.seedPrism = !app.prep.seedPrism;
        renderOverlay();
      },
    ),
    boosterChip(
      `+5 moves ${app.prep.extraMoves ? '✓' : ''}`,
      `×${snap.boosters.extraMoves}`,
      app.prep.extraMoves,
      snap.boosters.extraMoves <= 0,
      () => {
        app.prep.extraMoves = !app.prep.extraMoves;
        renderOverlay();
      },
    ),
  ]);

  panel(
    `Level ${level.id}`,
    [
      banner,
      el('div', { class: 'goal-banner soft' }, [nextGoalHint(snap)]),
      essenceProgressBar(snap),
      el('p', { class: 'hud-tip' }, ['Goals']),
      goals,
      el('p', { class: 'hud-tip star-nudge' }, [starNudge]),
      el('p', { class: 'hud-tip' }, ['Boosters (tap to arm)']),
      chips,
      el('p', { class: 'hud-tip' }, [
        `Bag · pickaxe ×${snap.boosters.pickaxe} · reshuffle ×${snap.boosters.reshuffle}`,
      ]),
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
    { className: 'panel-prelevel' },
  );
}

/** Loss-aversion near-miss UI (research) — life not burned until player declines. */
function renderContinueOffer(): void {
  const r = app.lastResult;
  const progress = app.session ? Math.round(objectiveProgressRatio(app.session) * 100) : 0;
  const cost = ECONOMY_CONST.cost.extraMoves5;
  const shards = economy.getSnapshot().wallet.shards;
  panel(
    'So close!',
    [
      el('div', { class: 'continue-hero' }, [
        el('div', { class: 'continue-pct' }, [`${progress}%`]),
        el('div', { class: 'continue-copy' }, [
          el('div', { class: 'continue-title' }, ['Keep going?']),
          el('p', {}, [
            r
              ? `Score ${r.score.toLocaleString()} · almost there`
              : 'Out of moves — one more push?',
          ]),
        ]),
      ]),
      el('p', { class: 'hud-tip' }, [`+5 moves · or walk away (1 life)`]),
    ],
    [
      btn(`+5 MOVES · ${cost}◆`, () => acceptContinue('shards'), 'gold'),
      btn('WATCH · +5', () => acceptContinue('ad')),
      btn('NO THANKS', () => declineContinue(), 'secondary'),
    ],
    { className: 'panel-continue' },
  );
  void shards;
}

function renderResults(): void {
  const r = app.lastResult;
  if (!r) {
    app.screen = 'map';
    renderOverlay();
    return;
  }
  const snap = economy.getSnapshot();
  const essenceLine =
    r.status === 'won' && snap.lastEssenceGain > 0
      ? el('p', { class: 'essence-gain' }, [
          `+${snap.lastEssenceGain} essence → Crystal Cavern`,
        ])
      : null;
  const starsEl = el('div', { class: 'results-burst-stars' }, []);
  const scoreEl = el('div', { class: 'results-burst-score' }, ['0']);
  const burst = el(
    'div',
    { class: r.status === 'won' ? 'results-burst' : 'results-burst fail' },
    [
      el('img', {
        class: 'results-burst-art',
        src: assetUrl(r.status === 'won' ? 'ui/win_banner.webp' : 'ui/fail_banner.webp'),
        alt: '',
        decoding: 'async',
      }),
      el('div', { class: 'results-burst-scrim' }, []),
      el('div', { class: 'results-burst-content' }, [
        starsEl,
        scoreEl,
        el('div', { class: 'results-burst-label' }, ['SCORE']),
      ]),
    ],
  );

  // Win ceremony: stars pop + score count-up
  if (r.status === 'won') {
    const nStars = Math.max(0, Math.min(3, r.stars));
    for (let i = 0; i < 3; i++) {
      const s = el('span', { class: `star-pop${i < nStars ? ' on' : ''}` }, [
        i < nStars ? '★' : '☆',
      ]);
      s.style.animationDelay = `${120 + i * 280}ms`;
      starsEl.append(s);
      if (i < nStars) {
        window.setTimeout(() => audio.starDing(i), 140 + i * 280);
      }
    }
    const target = r.score;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      scoreEl.textContent = Math.floor(target * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
      else scoreEl.textContent = target.toLocaleString();
    };
    requestAnimationFrame(tick);
  } else {
    starsEl.append(el('span', {}, ['◆']));
    scoreEl.textContent = r.score.toLocaleString();
  }

  const nextHint =
    r.status === 'won'
      ? el('div', { class: 'goal-banner soft' }, [
          snap.meta.nextAffordable
            ? `Ready · place ${snap.meta.nextAffordable.name}`
            : nextGoalHint(snap),
        ])
      : null;

  const beat: CompanionBeat =
    r.status === 'won'
      ? r.stars >= 3
        ? 'winPerfect'
        : 'win'
      : 'lose';
  const warden = companionBubble(beat, r.score + r.stars * 11);

  const leaveResults = (screen: typeof app.screen, levelDelta = 0): void => {
    const go = () => {
      app.pendingGeode = false;
      if (levelDelta) app.levelId = Math.min(LEVEL_COUNT, app.levelId + levelDelta);
      app.screen = screen;
      renderOverlay();
    };
    // One last chance to crack if they leave without tapping CRACK GEODE
    if (r.status === 'won' && app.pendingGeode) {
      showGeodeCrackModal(go);
    } else {
      go();
    }
  };

  panel(
    r.status === 'won' ? 'Level Clear!' : 'Almost…',
    [
      burst,
      warden,
      ...(essenceLine ? [essenceLine] : []),
      ...(nextHint ? [nextHint] : []),
      ...(r.status === 'won' ? [essenceProgressBar(snap)] : []),
      ...(r.status === 'won' && r.stars === 1
        ? [el('p', { class: 'hud-tip' }, ['More points or leftover moves → ★★ / ★★★'])]
        : []),
      ...(r.status === 'won' && r.stars === 3
        ? [el('p', { class: 'hud-tip' }, ['Perfect clear · discovery essence banked'])]
        : []),
      ...(r.status === 'lost'
        ? [el('p', {}, ['A life was spent. Try again!'])]
        : []),
    ],
    [
      ...(r.status === 'won' && app.pendingGeode
        ? [
            btn(
              'CRACK A GEODE',
              () => {
                showGeodeCrackModal(() => {
                  if (app.screen === 'results') renderOverlay();
                });
              },
              'gold',
            ),
          ]
        : []),
      btn(
        r.status === 'won' ? (app.pendingGeode ? 'NEXT · SKIP GEODE' : 'NEXT') : 'RETRY',
        () => {
          if (r.status === 'won' && app.levelId < LEVEL_COUNT) {
            // Explicit next can skip geode if they already cracked; else offer then go
            if (app.pendingGeode) {
              // Skip without modal
              app.pendingGeode = false;
            }
            app.levelId = Math.min(LEVEL_COUNT, app.levelId + 1);
            app.screen = 'prelevel';
            renderOverlay();
          } else if (r.status === 'lost') {
            app.screen = 'prelevel';
            renderOverlay();
          } else {
            app.pendingGeode = false;
            app.screen = 'map';
            renderOverlay();
          }
        },
        r.status === 'won' && app.pendingGeode ? 'secondary' : 'gold',
      ),
      ...(r.status === 'won'
        ? [
            btn(
              snap.meta.nextAffordable ? 'PLACE IN CAVERN' : 'CAVERN',
              () => leaveResults('cavern'),
              snap.meta.nextAffordable ? 'primary' : 'secondary',
            ),
          ]
        : []),
      btn('LEVELS', () => leaveResults('map'), 'secondary'),
    ],
    { className: r.status === 'won' ? 'panel-results win' : 'panel-results lose' },
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
    META_STAGES.find((s) => s.id === meta.activeStageId) ?? META_STAGES[0]!;

  // Live-furnished stage: props sit on the mine backdrop
  const stageProps = el('div', { class: 'cavern-props' }, []);
  for (const up of meta.activeStageOwned) {
    const prop = el('div', {
      class: 'cavern-prop',
      title: up.name,
      style: `left:${up.place.left}%;top:${up.place.top}%;transform:translate(-50%,-50%) scale(${up.place.scale ?? 1})`,
    }, [metaArtImg(up.art, up.name, 'cavern-prop-img')]);
    stageProps.append(prop);
  }
  // Ghost slots for unowned pieces in this stage (soft goal)
  for (const up of META_UPGRADES.filter((u) => u.stage === meta.activeStageId && !ownedSet.has(u.id))) {
    const ghost = el('div', {
      class: 'cavern-prop ghost',
      title: up.name,
      style: `left:${up.place.left}%;top:${up.place.top}%;transform:translate(-50%,-50%) scale(${(up.place.scale ?? 1) * 0.85})`,
    }, [metaArtImg(up.art, up.name, 'cavern-prop-img')]);
    stageProps.append(ghost);
  }

  const vista = el('div', { class: 'cavern-vista' }, [
    metaArtImg(activeStage.art, activeStage.name, 'cavern-vista-bg'),
    el('div', { class: 'cavern-vista-scrim' }, []),
    stageProps,
    el('div', { class: 'cavern-depth' }, [
      el('span', { class: 'cavern-label' }, [
        meta.stagesComplete >= 4
          ? 'Deep Geode complete'
          : `Furnishing · ${activeStage.name}`,
      ]),
      el('span', { class: 'cavern-essence' }, [`✧ ${meta.essence}`]),
    ]),
  ]);
  vista.style.setProperty('--cavern-glow', String(Math.min(0.9, glow)));

  const stages = META_STAGES.map((stage) => {
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
    for (const up of META_UPGRADES.filter((u) => u.stage === stage.id).sort(
      (a, b) => a.order - b.order,
    )) {
      list.append(metaUpgradeRow(up, ownedSet.has(up.id), meta.essence, meta.stagesComplete));
    }
    section.append(list);
    return section;
  });

  panel(
    'Your Cavern',
    [
      companionBubble(
        meta.nextAffordable ? 'cavernReady' : 'cavern',
        meta.ownedCount + meta.essence,
      ),
      el('p', {}, [
        'Earn essence from clears. Furnish the living mine — pieces appear in the chamber.',
      ]),
      el('div', { class: 'goal-banner' }, [nextGoalHint(snap)]),
      essenceProgressBar(snap),
      vista,
      el('div', { class: 'stat-grid' }, [
        stat('Essence', String(meta.essence)),
        stat('Placed', `${meta.ownedCount}/${meta.totalCount}`),
        stat('Stages', `${meta.stagesComplete}/4`),
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
 * Reward placement ceremony: mine-set video + the purchased prop flying in.
 * (Generated placement reel in public/cavern/place.webm|.mp4)
 */
function playPlacementCeremony(up: MetaUpgrade, onDone: () => void): void {
  const layer = el('div', { class: 'place-ceremony' }, []);
  const stageArt =
    META_STAGES.find((s) => s.id === up.stage)?.art ?? 'cavern/stages/stage1.webp';

  const vid = document.createElement('video');
  vid.className = 'place-ceremony-video';
  vid.muted = true;
  vid.playsInline = true;
  vid.setAttribute('playsinline', '');
  vid.preload = 'auto';
  // Prefer webm, fall back to mp4
  const sWebm = document.createElement('source');
  sWebm.src = assetUrl('cavern/place.webm');
  sWebm.type = 'video/webm';
  const sMp4 = document.createElement('source');
  sMp4.src = assetUrl('cavern/place.mp4');
  sMp4.type = 'video/mp4';
  vid.append(sWebm, sMp4);
  // Poster = real mine stage so it never feels empty while buffering
  vid.poster = assetUrl(stageArt);

  const prop = metaArtImg(up.art, up.name, 'place-ceremony-prop');
  const caption = el('div', { class: 'place-ceremony-caption' }, [
    el('div', { class: 'place-ceremony-title' }, [up.name]),
    el('div', { class: 'place-ceremony-sub' }, ['Placed in the mine']),
  ]);
  const skip = btn('Continue', () => finish(), 'gold');

  layer.append(vid, prop, caption, skip);
  overlay.append(layer);
  haptic('special');
  // Soft whoosh bed under the placement reel
  try {
    const sfx = new Audio(assetUrl('sfx/whoosh-motion.ogg'));
    sfx.volume = 0.45;
    void sfx.play();
  } catch {
    /* ignore */
  }
  try {
    void vid.play();
  } catch {
    /* autoplay policies */
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    layer.remove();
    onDone();
  };

  vid.addEventListener('ended', () => finish());
  // Safety: never trap the player if media fails
  window.setTimeout(() => finish(), 2800);
}

/**
 * Full-screen stage-complete fanfare (DOM — works over cavern overlay, not only canvas).
 */
function showStageCompleteFanfare(stageId: number, onDone: () => void): void {
  if (document.getElementById('stage-complete-modal')) {
    onDone();
    return;
  }
  const stage = META_STAGES.find((s) => s.id === stageId);
  const next = META_STAGES.find((s) => s.id === stageId + 1);
  const sparks = el('div', { class: 'stage-complete-sparks' }, []);
  for (let i = 0; i < 18; i++) {
    sparks.append(
      el('span', {
        class: 'stage-spark',
        style: `--i:${i};--x:${8 + (i * 37) % 84}%;--delay:${(i % 7) * 0.07}s;--hue:${(i * 23) % 360}`,
      }, ['✦']),
    );
  }

  const layer = el('div', { class: 'stage-complete', id: 'stage-complete-modal' }, [
    sparks,
    el('div', { class: 'stage-complete-card panel-enter' }, [
      stage
        ? metaArtImg(stage.art, stage.name, 'stage-complete-art')
        : el('div', {}, []),
      el('div', { class: 'stage-complete-kicker' }, ['CHAMBER COMPLETE']),
      el('h2', { class: 'stage-complete-title' }, [
        stage ? stage.name : `Stage ${stageId}`,
      ]),
      el('p', { class: 'stage-complete-sub' }, [
        next
          ? `New chamber open · ${next.name}`
          : 'Deep Geode finished · the mine is yours',
      ]),
      btn(
        next ? 'OPEN NEXT CHAMBER' : 'BEHOLD THE MINE',
        () => {
          layer.remove();
          onDone();
        },
        'gold',
      ),
    ]),
  ]);
  overlay.append(layer);
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
      `✧ ${up.cost}`,
      () => {
        const before = economy.getSnapshot().meta.stagesComplete;
        const res = economy.buyMetaUpgrade(up.id);
        if (!res.ok) {
          if (res.reason === 'insufficient') pushToast('Need more essence — clear levels!', '#ff9a9a');
          else if (res.reason === 'stageLocked') pushToast('Chamber still sealed', '#ff9a9a');
          else pushToast('Already placed', '#b0c0e0');
          return;
        }
        haptic('forge');
        const after = economy.getSnapshot().meta.stagesComplete;
        playPlacementCeremony(res.upgrade, () => {
          if (after > before) {
            showStageCompleteFanfare(after, () => {
              pushToast(`Chamber complete · new stage open!`, '#ffd24a', 2800);
              renderOverlay();
            });
          } else {
            pushToast(`${res.upgrade.name} is in the cavern`, '#b8f0ff', 2000);
            renderOverlay();
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

const SKU_GLYPH: Record<string, string> = {
  'shards.pocket': '◆',
  'shards.hoard': '◆◆',
  'shards.vault': '💎',
  'bundle.starter': '✦',
  'lives.refill': '♥',
  'ads.remove': '☁',
};

const SKU_TAG_LABEL: Record<string, string> = {
  bestValue: 'BEST VALUE',
  mostPopular: 'MOST POPULAR',
  limited: 'LIMITED',
};

function renderStore(): void {
  const snap = economy.getSnapshot();
  const wallet = el('div', { class: 'shop-wallet' }, [
    el('div', { class: 'shop-wallet-chip credits' }, [
      el('span', { class: 'shop-wallet-k' }, ['Credits']),
      el('span', { class: 'shop-wallet-v' }, [snap.wallet.credits.toLocaleString()]),
    ]),
    el('div', { class: 'shop-wallet-chip shards' }, [
      el('span', { class: 'shop-wallet-k' }, ['Shards']),
      el('span', { class: 'shop-wallet-v' }, [`◆ ${snap.wallet.shards}`]),
    ]),
  ]);

  const items = snap.availableSkus.map((sku) => {
    const can = snap.wallet.credits >= sku.credits;
    const tagLabel = sku.tag ? SKU_TAG_LABEL[sku.tag] ?? sku.tag : null;
    const grantBits: string[] = [];
    if (sku.grantShards) grantBits.push(`+${sku.grantShards} ◆`);
    if (sku.grantLives) grantBits.push(`+${sku.grantLives} ♥`);
    if (sku.grantBoosters) {
      const n = Object.values(sku.grantBoosters).reduce((a, b) => a + (b ?? 0), 0);
      if (n > 0) grantBits.push(`+${n} tools`);
    }
    const row = el(
      'div',
      {
        class: `sku${sku.tag ? ` tagged-${sku.tag}` : ''}${can ? '' : ' broke'}`,
      },
      [
        el('div', { class: 'sku-glyph' }, [SKU_GLYPH[sku.id] ?? '◇']),
        el('div', { class: 'sku-body' }, [
          el('div', { class: 'name' }, [
            sku.name,
            tagLabel ? el('span', { class: `tag tag-${sku.tag}` }, [tagLabel]) : '',
          ].filter(Boolean) as (string | Node)[]),
          el('div', { class: 'blurb' }, [sku.blurb]),
          grantBits.length
            ? el('div', { class: 'sku-grants' }, [grantBits.join(' · ')])
            : el('div', {}, []),
        ]),
      ],
    );
    const buy = btn(
      `${sku.credits.toLocaleString()}¢`,
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
        pushToast(`Purchased · ${sku.name}`, '#ffd24a', 2000);
        renderOverlay();
      },
      can ? (sku.tag === 'bestValue' || sku.tag === 'limited' ? 'gold' : 'primary') : 'secondary',
      !can,
    );
    row.append(buy);
    return row;
  });

  panel(
    'Shop',
    [
      el('div', { class: 'sim-badge' }, ['simulated · no real money']),
      wallet,
      el('p', { class: 'hud-tip' }, ['Stock up before the next dive · research price ladder']),
      ...items,
    ],
    [
      btn('LEVELS', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
      btn('CAVERN', () => {
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
  panel(
    'Out of Lives',
    [
      el('div', { class: 'lives-hero' }, [
        el('div', { class: 'lives-heart' }, ['♥']),
        el('p', {}, [`Next life in ~${mins} min`]),
      ]),
      el('p', { class: 'hud-tip' }, ['Refill now, or take a breather']),
    ],
    [
      btn(`REFILL · ${ECONOMY_CONST.cost.refillLives}◆`, () => {
        if (economy.refillLivesWithShards()) {
          app.screen = 'prelevel';
          renderOverlay();
        } else {
          pushToast('Need more shards', '#ff9a9a');
        }
      }, 'gold'),
      btn('WATCH · +1♥', () => openAd('rewardedLife', 'lives')),
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

/** Full rebuild of the ad overlay (iframe + chrome). Called once per open. */
function renderAdShell(): void {
  clear(overlay);
  overlay.classList.remove('hidden');
  overlay.classList.add('ad-modal');
  overlay.style.background = 'rgba(2,4,12,0.94)';
  overlay.style.backdropFilter = 'blur(6px)';
  overlay.style.justifyContent = 'center';
  overlay.style.pointerEvents = 'auto';

  const placement = app.adPlacement ?? 'interstitial';
  const videoId = app.adVideoId ?? nextDiscworldShort().id;
  app.adVideoId = videoId;
  const p = economy.adProgress();
  const rewarded = placement !== 'interstitial';

  const title =
    placement === 'interstitial'
      ? 'A moment between chambers…'
      : placement === 'rewardedLife'
        ? 'Watch a Short · +1 Life'
        : placement === 'rewardedBooster'
          ? 'Watch a Short · +1 Booster'
          : 'Watch a Short · +5 Moves';

  const frame = el('iframe', {
    class: 'ad-frame',
    src: youtubeEmbedUrl(videoId),
    title: 'Discworld in 60 seconds',
    allow:
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowfullscreen: true,
    referrerpolicy: 'strict-origin-when-cross-origin',
  });

  const timer = el('div', { class: 'timer', id: 'ad-timer' }, [
    p.finished ? 'Done' : `${Math.ceil(p.remainingMs / 1000)}s`,
  ]);
  const status = el('p', { class: 'ad-status', id: 'ad-status' }, [
    p.canSkip
      ? rewarded
        ? 'Skip available — finish the Short to claim your reward.'
        : 'You may skip.'
      : `Skip in ${Math.max(1, Math.ceil((ECONOMY_CONST.adSkippableAfterMs - p.elapsedMs) / 1000))}s…`,
  ]);

  const skipBtn = btn(
    p.canSkip ? 'Skip' : `Skip in ${Math.max(1, Math.ceil((ECONOMY_CONST.adSkippableAfterMs - p.elapsedMs) / 1000))}s`,
    () => {
      if (!economy.adProgress().canSkip) return;
      closeAdSession({ grant: false });
    },
    'secondary',
    !p.canSkip,
  );
  skipBtn.id = 'ad-skip';

  const claimBtn = btn(
    rewarded ? (p.finished ? 'Claim reward' : 'Watch to claim') : p.finished ? 'Continue' : 'Watch…',
    () => {
      if (!economy.adProgress().finished) return;
      closeAdSession({ grant: true });
    },
    p.finished ? 'primary' : 'secondary',
    !p.finished,
  );
  claimBtn.id = 'ad-claim';

  const sponsor = el('div', { class: 'ad-sponsor' }, [
    el('span', { class: 'ad-sponsor-label' }, ['Sponsored · Discworld in 60 seconds']),
    el(
      'a',
      {
        class: 'ad-channel-link',
        href: channelUrl(),
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      ['@discworldin60seconds'],
    ),
  ]);

  const wrap = el('div', { class: 'panel ad-panel' }, [
    el('div', { class: 'sim-badge' }, ['demo ads · real Shorts · no real money']),
    el('h1', {}, [title]),
    sponsor,
    el('div', { class: 'ad-player' }, [frame]),
    el('p', { class: 'ad-hint' }, [
      'Muted autoplay (browser policy). Tap the player to unmute.',
    ]),
    timer,
    status,
    el('div', { class: 'row' }, [claimBtn, skipBtn]),
  ]);
  overlay.append(wrap);
}

/** Patch timer / skip / claim without tearing down the YouTube iframe. */
function updateAdChrome(p: {
  remainingMs: number;
  elapsedMs: number;
  canSkip: boolean;
  finished: boolean;
}): void {
  const timer = document.getElementById('ad-timer');
  if (timer) {
    timer.textContent = p.finished ? 'Done' : `${Math.ceil(p.remainingMs / 1000)}s`;
  }
  const status = document.getElementById('ad-status');
  const rewarded = app.adPlacement !== 'interstitial';
  if (status) {
    status.textContent = p.finished
      ? rewarded
        ? 'Short finished — claim your reward.'
        : 'Thanks for watching.'
      : p.canSkip
        ? rewarded
          ? 'Skip available — finish the Short to claim your reward.'
          : 'You may skip.'
        : `Skip in ${Math.max(1, Math.ceil((ECONOMY_CONST.adSkippableAfterMs - p.elapsedMs) / 1000))}s…`;
  }
  const skip = document.getElementById('ad-skip') as HTMLButtonElement | null;
  if (skip) {
    const unlockIn = Math.max(1, Math.ceil((ECONOMY_CONST.adSkippableAfterMs - p.elapsedMs) / 1000));
    skip.textContent = p.canSkip ? 'Skip' : `Skip in ${unlockIn}s`;
    skip.disabled = !p.canSkip;
  }
  const claim = document.getElementById('ad-claim') as HTMLButtonElement | null;
  if (claim) {
    claim.disabled = !p.finished;
    claim.textContent = rewarded
      ? p.finished
        ? 'Claim reward'
        : 'Watch to claim'
      : p.finished
        ? 'Continue'
        : 'Watch…';
    // Primary = bare `.btn`; secondary is the muted variant.
    claim.classList.toggle('secondary', !p.finished);
  }
}

function renderAd(): void {
  // renderOverlay → ad: rebuild shell (e.g. after a full overlay refresh).
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
        'Sound, accessibility, and demo tools. Nothing leaves this device.',
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Audio']),
        settingsToggle('Sound effects', 'Glass, whooshes, chimes, UI taps', s.sfx, () => {
          economy.updateSettings({ sfx: !s.sfx });
          audio.setEnabled(!s.sfx);
          if (!s.sfx) audio.uiTap();
          renderOverlay();
        }),
        settingsToggle('Ambient pad', 'Soft title / mine hum when SFX is on', s.music, () => {
          const next = !s.music;
          economy.updateSettings({ music: next });
          if (!next) audio.stopPad();
          else if (s.sfx) audio.resume();
          renderOverlay();
        }),
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Accessibility']),
        settingsToggle('Shape glyphs', 'Extra symbols on crystals for colour-blind play', s.glyphs, () => {
          economy.updateSettings({ glyphs: !s.glyphs });
          boardView.glyphs = !s.glyphs;
          renderOverlay();
        }),
        settingsToggle('Reduced motion', 'Softer HUD pulses and less urgency flash', s.reducedMotion, () => {
          economy.updateSettings({ reducedMotion: !s.reducedMotion });
          renderOverlay();
        }),
      ]),
      el('div', { class: 'settings-section' }, [
        el('div', { class: 'settings-section-title' }, ['Research']),
        el('div', { class: 'settings-about' }, [
          el('div', {}, ['Crystalline v0.1.0 · portfolio demo']),
          el('div', { class: 'hud-tip' }, [
            'Simulated economy · Discworld Shorts ads · local save only',
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

mount();
