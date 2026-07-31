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
import { JuiceSystem } from '@render/juice';
import { tierFromMatch, VfxPlayer } from '@render/vfx';
import {
  AHA_SWAP_B,
  findFireHint,
  seedFirstLightAha,
  type TutorialPhase,
} from '@engine/tutorial';
import { getLevel, LEVEL_COUNT, LEVELS } from './levels';
import { injectStyles } from './ui/styles';
import { btn, clear, el } from './ui/dom';

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
  audio.setEnabled(economy.getSnapshot().settings.sfx);
  boardView.glyphs = economy.getSnapshot().settings.glyphs;

  void atlas.load().then(async () => {
    try {
      await vfx.load(atlas.vfx);
    } catch {
      // Procedural fallback bursts still work.
    }
    app.screen = 'title';
    app.titleBorn = performance.now();
    titleFxAt = app.titleBorn + 400;
    renderOverlay();
  });

  loop();
  renderOverlay();
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
    if (!frozen) boardAnim.update(now);
    boardView.draw(ctx, snap, atlas, canvasView.dprBucket, now, boardAnim);
    drawAhaHint(ctx, now);
  }

  if (!frozen) vfx.draw(ctx, now, canvasView.logicalWidth, canvasView.logicalHeight);
  else vfx.draw(ctx, Math.min(now, juice.hitStopUntil), canvasView.logicalWidth, canvasView.logicalHeight);

  juice.draw(ctx, now, canvasView.logicalWidth);
  drawToasts(ctx, now);

  ctx.restore();
  canvasView.endFrame();
}

/** Cold-open spectacle behind the title overlay. */
function drawTitleCanvas(ctx: CanvasRenderingContext2D, now: number): void {
  const w = canvasView.logicalWidth;
  const h = canvasView.logicalHeight;
  const age = now - (app.titleBorn || now);

  // Periodic supernova pulse for "wow" while they watch
  if (now >= titleFxAt) {
    vfx.play(6, w / 2, h * 0.42, 420);
    juice.burst(w / 2, h * 0.42, '#e0c0ff', 28);
    juice.burst(w / 2, h * 0.42, '#7ed0ff', 18);
    titleFxAt = now + 2800 + Math.random() * 1200;
  }

  // Soft title on canvas (DOM carries the CTA)
  const pulse = 0.92 + 0.08 * Math.sin(age * 0.004);
  ctx.save();
  ctx.translate(w / 2, h * 0.28);
  ctx.scale(pulse, pulse);
  ctx.textAlign = 'center';
  ctx.font = '800 64px "GalacticKnights", "CrystallineDisplay", "Cinzel", serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('Crystalline', 3, 3);
  ctx.fillStyle = '#dff4ff';
  ctx.shadowColor = '#7ed0ff';
  ctx.shadowBlur = 28;
  ctx.fillText('Crystalline', 0, 0);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '600 18px "CrystallineBody", "Nunito", sans-serif';
  ctx.fillStyle = 'rgba(200,220,255,0.75)';
  ctx.shadowBlur = 0;
  ctx.fillText('Deep under the mountain, living crystals remember every match.', w / 2, h * 0.36);
}

function drawAhaHint(ctx: CanvasRenderingContext2D, now: number): void {
  if (!app.ahaHint || app.ahaPhase === 'done') return;
  const { originX, originY, cell } = boardView.layout;
  const pulse = 0.55 + 0.45 * Math.sin(now * 0.008);
  const label = app.ahaPhase === 'forge' ? 'SWAP → FORGE' : 'SWAP → FIRE!';
  const color =
    app.ahaPhase === 'forge'
      ? `rgba(255, 230, 120, ${0.45 + pulse * 0.5})`
      : `rgba(180, 255, 220, ${0.5 + pulse * 0.45})`;
  for (const c of [app.ahaHint.a, app.ahaHint.b]) {
    const cx = originX + c.x * cell + cell / 2;
    const cy = originY + c.y * cell + cell / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.shadowColor = app.ahaPhase === 'forge' ? '#ffe87a' : '#7dffc0';
    ctx.shadowBlur = 14;
    ctx.strokeRect(cx - cell * 0.42, cy - cell * 0.42, cell * 0.84, cell * 0.84);
    ctx.restore();
  }
  const a = app.ahaHint.a;
  const b = app.ahaHint.b;
  const x0 = originX + a.x * cell + cell / 2;
  const y0 = originY + a.y * cell + cell / 2;
  const x1 = originX + b.x * cell + cell / 2;
  const y1 = originY + b.y * cell + cell / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.font = '800 15px "CrystallineDisplay", "Nunito", sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(label, (x0 + x1) / 2, Math.min(y0, y1) - cell * 0.55);
  ctx.restore();
}

function drawChrome(ctx: CanvasRenderingContext2D, now: number): void {
  const snap = economy.getSnapshot();
  const display = '"CrystallineDisplay", "Cinzel", "Palatino Linotype", serif';
  const body = '"CrystallineBody", "Nunito", "Segoe UI", system-ui, sans-serif';

  // Compact HUD so the board can claim more vertical space
  const hg = ctx.createLinearGradient(0, 0, 0, 168);
  hg.addColorStop(0, 'rgba(10, 14, 28, 0.82)');
  hg.addColorStop(1, 'rgba(10, 14, 28, 0.08)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, 720, 168);

  ctx.fillStyle = '#c9ecff';
  ctx.font = `700 28px ${display}`;
  ctx.textAlign = 'left';
  ctx.fillText('Crystalline', 24, 38);

  ctx.fillStyle = 'rgba(255, 220, 170, 0.5)';
  ctx.font = `600 11px ${body}`;
  ctx.fillText('demo · no real purchases', 26, 56);

  drawChip(ctx, 24, 72, `♥  ${snap.lives.count}/5`, '#ff7a8a', body);
  drawChip(ctx, 146, 72, `◆  ${snap.wallet.shards}`, '#7ecbff', body);
  drawChip(ctx, 286, 72, `¢  ${snap.wallet.credits}`, '#ffd679', body);

  if (app.screen === 'play' && app.session) {
    const s = app.session.snapshot();
    // Oversized moves/score — primary pattern-recognition resources stay free.
    const movesHot = s.movesLeft <= 5;
    ctx.fillStyle = movesHot ? '#ffb0b8' : '#eef3ff';
    ctx.font = `800 22px ${display}`;
    ctx.fillText(`Moves  ${s.movesLeft}`, 24, 128);
    ctx.fillStyle = '#eef3ff';
    ctx.fillText(`Score  ${s.score.toLocaleString()}`, 200, 128);
    if (app.pickaxeMode) {
      ctx.fillStyle = '#ffd679';
      ctx.font = `700 14px ${body}`;
      ctx.fillText('Pickaxe ready — tap a gem to smash it', 24, 154);
    } else {
      const obj = s.objectives
        .map((o) => `${OBJECTIVE_LABEL[o.kind]}  ${o.current}/${o.target}`)
        .join('   ·   ');
      ctx.font = `700 14px ${body}`;
      ctx.fillStyle = '#c4d4f0';
      ctx.fillText(obj, 24, 154);
    }
  } else {
    ctx.fillStyle = '#b0c0e0';
    ctx.font = `700 14px ${body}`;
    ctx.fillText('Match gems · forge power crystals · chain combos', 24, 130);
  }
  void now;
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accent: string,
  font = '"Nunito", system-ui, sans-serif',
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundPill(ctx, x, y, 112, 30);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.font = `800 14px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 12, y + 20);
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
    if (app.screen !== 'play') return;
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
    if (app.screen !== 'play' || !app.session || app.pickaxeMode) return;
    const p = canvasView.clientToLogical(e.clientX, e.clientY);
    const swap = boardView.completeSwap(p.x, p.y);
    if (!swap) return;
    doSwap(swap.a, swap.b);
  });

  canvas.addEventListener('pointercancel', () => boardView.cancelPress());
}

function doSwap(a: Coord, b: Coord): void {
  if (!app.session) return;
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
      window.setTimeout(() => {
        juice.scorePop(cx, cy - 12, ev.points, tier >= 4 ? '#ffe9a8' : '#d0e8ff');
      }, 90);

      if (tier >= 6) {
        shakeMs = 320;
        shakeMag = 14;
        juice.requestHitStop(70);
        haptic('clearBig');
      } else if (tier === 5) {
        shakeMs = 200;
        shakeMag = 8;
        juice.requestHitStop(45);
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
      juice.powerBanner(`${name.toUpperCase()} FORGED`);
      juice.requestHitStop(55);
      haptic('forge');
      if (forged <= 2) pushToast(`${name} forged!`, '#e0c0ff', 1600);
      if (app.ahaPhase === 'forge') advanceTutorialToFire();
    } else if (ev.t === 'coreSpawned') {
      const p = cellToLogical(ev.at);
      juice.burst(p.x, p.y, '#ffe9a8', 24);
      juice.powerBanner('LIVING CORE!');
      haptic('special');
      pushToast('Living Core! Tap the spinning crystal', '#ffe9a8', 2600);
    } else if (ev.t === 'specialTriggered') {
      powerFires++;
      const tier =
        ev.kind === 'supernova' ? 6 : ev.kind === 'prism' ? 6 : ev.kind === 'burst' ? 5 : 4;
      vfx.playAtCells(tier, ev.affected, cellToLogical);
      const p = cellToLogical(ev.at);
      juice.burst(p.x, p.y, '#fff0c0', 20 + tier * 6);
      haptic('special');
      if (tier >= 5) {
        shakeMs = Math.max(shakeMs, tier >= 6 ? 280 : 160);
        shakeMag = Math.max(shakeMag, tier >= 6 ? 12 : 7);
        juice.requestHitStop(tier >= 6 ? 80 : 50);
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
  } else if (matchHits > 0 && maxCascade === 0) {
    /* single clear haptics already fired */
  }
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
  } else {
    economy.failLevel(scalar);
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
  app.ahaHint = null;
  app.ahaPhase = 'done';
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
    overlay.classList.add('hidden');
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
    const bar = el('div', { class: 'row' }, []);
    bar.style.pointerEvents = 'auto';
    bar.style.marginBottom = '16px';
    bar.style.justifyContent = 'center';
    const snap = economy.getSnapshot();
    const reshuffleBtn = btn(
      `Reshuffle ×${snap.boosters.reshuffle}`,
      () => {
        if (!app.session) return;
        if (economy.consumeBooster('reshuffle').ok) {
          const events = app.session.useReshuffle();
          audio.handle(events);
          boardAnim.sync(app.session.snapshot());
          pushToast('Board reshuffled', '#b8f0ff');
          renderOverlay();
        } else {
          pushToast('No reshuffles — buy in Store', '#ff9a9a');
        }
      },
      'secondary',
      snap.boosters.reshuffle <= 0,
    );
    const pickBtn = btn(
      app.pickaxeMode ? 'Cancel pickaxe' : `Pickaxe ×${snap.boosters.pickaxe}`,
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
        renderOverlay();
      },
      app.pickaxeMode ? 'gold' : 'secondary',
      !app.pickaxeMode && snap.boosters.pickaxe <= 0,
    );
    bar.append(
      reshuffleBtn,
      pickBtn,
      btn('Quit', () => {
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
      }, 'danger'),
    );
    overlay.append(bar);
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

function panel(title: string, body: HTMLElement[], actions: HTMLElement[] = []): HTMLElement {
  const p = el('div', { class: 'panel' }, [
    el('div', { class: 'sim-badge' }, ['demo build · no real money']),
    el('h1', {}, [title]),
    ...body,
    el('div', { class: 'row' }, actions),
  ]);
  overlay.append(p);
  return p;
}

function renderTitle(): void {
  overlay.classList.remove('hidden');
  overlay.style.background =
    'linear-gradient(180deg, rgba(4,8,18,0.15) 0%, rgba(4,8,18,0.55) 45%, rgba(4,8,18,0.82) 100%)';
  overlay.style.backdropFilter = 'none';
  overlay.style.justifyContent = 'flex-end';
  overlay.style.paddingBottom = '12%';

  const wrap = el('div', { class: 'panel' }, []);
  wrap.style.background =
    'linear-gradient(165deg, rgba(30,40,80,0.55), rgba(10,14,28,0.88))';
  wrap.style.border = '1px solid rgba(160,210,255,0.35)';
  wrap.style.textAlign = 'center';
  wrap.append(
    el('p', {}, ['Deep under the mountain, living crystals remember every match.']),
    el('p', { class: 'hud-tip' }, [
      'Match 4+ to forge Power Crystals. Swap powers together for chain reactions.',
    ]),
    el('div', { class: 'row' }, [
      btn(
        'DIVE IN',
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
        'Saga Map',
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

  // Sting once when title first shows
  if (app.titleBorn && performance.now() - app.titleBorn < 80) {
    /* wait for user gesture for audio */
  }
  // One-shot auto VFX is on canvas; try soft pad after first interaction via DIVE
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

function renderMap(): void {
  const snap = economy.getSnapshot();
  const nodes = LEVELS.map((lvl) => {
    const locked = lvl.id > snap.progress.highestUnlocked;
    // Stars may be stored under numeric or string keys depending on JSON parse.
    const stars = Number(snap.progress.stars[lvl.id] ?? snap.progress.stars[String(lvl.id) as unknown as number] ?? 0);
    const starText = stars > 0 ? '★'.repeat(stars) : locked ? '' : '·';
    const b = el(
      'button',
      {
        class: `level-node${locked ? ' locked' : ''}${lvl.id === app.levelId ? ' current' : ''}`,
        type: 'button',
        disabled: locked ? true : undefined,
        title: stars > 0 ? `${stars} star${stars === 1 ? '' : 's'}` : locked ? 'Locked' : 'No stars yet',
      },
      [`${lvl.id}`, el('div', { class: 'level-stars' }, [starText])],
    ) as HTMLButtonElement;
    if (!locked) {
      b.addEventListener('click', () => {
        app.levelId = lvl.id;
        app.screen = 'prelevel';
        renderOverlay();
      });
    }
    return b;
  });

  const meta = snap.meta;
  panel(
    'Crystal Saga',
    [
      el('p', {}, [
        `${LEVEL_COUNT} chambers deep in the living mine. Match gems, forge powers, chain combos.`,
      ]),
      el('div', { class: 'map-grid' }, nodes),
      el('div', { class: 'stat-grid' }, [
        stat('Lives', String(snap.lives.count)),
        stat('Shards', String(snap.wallet.shards)),
        stat('Essence', String(meta.essence)),
        stat('Cavern', `${meta.ownedCount}/${meta.totalCount}`),
      ]),
    ],
    [
      btn('Crystal Cavern', () => {
        app.screen = 'cavern';
        renderOverlay();
      }, 'gold'),
      btn('Store', () => {
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
  // Clamp toggles if inventory ran dry
  if (snap.boosters.seedPrism <= 0) app.prep.seedPrism = false;
  if (snap.boosters.extraMoves <= 0) app.prep.extraMoves = false;

  const chips = el('div', { class: 'booster-row' }, [
    boosterChip(
      `Opal seed ${app.prep.seedPrism ? '✓' : ''}`,
      `×${snap.boosters.seedPrism} · start with a Prism`,
      app.prep.seedPrism,
      snap.boosters.seedPrism <= 0,
      () => {
        app.prep.seedPrism = !app.prep.seedPrism;
        renderOverlay();
      },
    ),
    boosterChip(
      `+5 moves ${app.prep.extraMoves ? '✓' : ''}`,
      `×${snap.boosters.extraMoves} · extra turns`,
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
      el('h2', {}, [level.name]),
      el('p', {}, [`${level.width}×${level.height} · ${level.moves} moves`]),
      el('p', {}, [
        level.objectives
          .map((o) => `${OBJECTIVE_LABEL[o.kind]}: ${o.target}`)
          .join(' · '),
      ]),
      el('p', {}, [
        'Match 4 → Seam Rift · L/T → Geode Burst · 5+ → Opal Prism. Swap powers together!',
      ]),
      el('p', {}, ['Boosters for this dive (tap to arm):']),
      chips,
      el('p', { class: 'hud-tip' }, [
        `Bag: pickaxe ×${snap.boosters.pickaxe} · reshuffle ×${snap.boosters.reshuffle} · buy more in the Store (${ECONOMY_CONST.cost.booster}◆ each)`,
      ]),
    ],
    [
      btn('Play!', () => {
        startLevel(app.levelId, { ...app.prep });
        app.prep = { seedPrism: false, extraMoves: false };
      }, 'gold'),
      btn(
        `Buy reshuffle (${ECONOMY_CONST.cost.booster}◆)`,
        () => {
          const r = economy.buyBooster('reshuffle');
          if (r.ok) pushToast('Reshuffle +1', '#b8f0ff');
          else pushToast('Need more shards', '#ff9a9a');
          renderOverlay();
        },
        'secondary',
      ),
      btn(
        `Buy pickaxe (${ECONOMY_CONST.cost.booster}◆)`,
        () => {
          const r = economy.buyBooster('pickaxe');
          if (r.ok) pushToast('Pickaxe +1', '#ffd679');
          else pushToast('Need more shards', '#ff9a9a');
          renderOverlay();
        },
        'secondary',
      ),
      btn('Back', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
  );
}

/** Loss-aversion near-miss UI (research) — life not burned until player declines. */
function renderContinueOffer(): void {
  const r = app.lastResult;
  const progress = app.session ? Math.round(objectiveProgressRatio(app.session) * 100) : 0;
  const cost = ECONOMY_CONST.cost.extraMoves5;
  const shards = economy.getSnapshot().wallet.shards;
  panel(
    'So close…',
    [
      el('p', {}, [
        r
          ? `Score ${r.score.toLocaleString()} · objectives ~${progress}% done. One more push?`
          : 'Out of moves — keep the chamber open?',
      ]),
      el('p', { class: 'hud-tip' }, [
        'Simulated offer. +5 moves now, or walk away (spend a life). Demo · no real money.',
      ]),
    ],
    [
      btn(`+5 Moves · ${cost} shards`, () => acceptContinue('shards'), 'gold'),
      btn('Watch Short · +5 Moves', () => acceptContinue('ad')),
      btn('Give up', () => declineContinue(), 'secondary'),
    ],
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
  const starLine =
    r.status === 'won'
      ? `${'★'.repeat(Math.max(0, r.stars))}${'☆'.repeat(Math.max(0, 3 - r.stars))}  ·  ${r.stars}/3 stars`
      : null;
  const essenceLine =
    r.status === 'won' && snap.lastEssenceGain > 0
      ? el('p', { class: 'essence-gain' }, [
          `+${snap.lastEssenceGain} essence → Crystal Cavern`,
        ])
      : null;
  panel(
    r.status === 'won' ? 'Geode Cleared!' : 'Fracture…',
    [
      el('p', {}, [
        r.status === 'won'
          ? `Score ${r.score.toLocaleString()}`
          : `Score ${r.score.toLocaleString()}. A life was spent. The research clock is ticking.`,
      ]),
      ...(starLine ? [el('h2', {}, [starLine])] : []),
      ...(essenceLine ? [essenceLine] : []),
      ...(r.status === 'won' && r.stars === 1
        ? [el('p', {}, ['Objective complete — clear with more points or moves left for ★★ / ★★★.'])]
        : []),
    ],
    [
      btn(r.status === 'won' ? 'Next' : 'Retry', () => {
        if (r.status === 'won' && app.levelId < LEVEL_COUNT) {
          app.levelId += 1;
          app.screen = 'prelevel';
        } else {
          app.screen = r.status === 'lost' ? 'prelevel' : 'map';
        }
        renderOverlay();
      }),
      ...(r.status === 'won'
        ? [
            btn(
              'Furnish Cavern',
              () => {
                app.screen = 'cavern';
                renderOverlay();
              },
              'gold',
            ),
          ]
        : []),
      btn('Map', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
      btn('Store', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
    ],
  );
}

/**
 * Crystal Cavern meta hub — long-term visual ownership after match-3 wins.
 * Playrix dual-loop: puzzle → soft currency → decorate persistent space.
 */
function renderCavern(): void {
  const snap = economy.getSnapshot();
  const meta = snap.meta;
  const ownedSet = new Set(meta.owned);

  const glow =
    0.18 +
    meta.stagesComplete * 0.14 +
    (meta.ownedCount / Math.max(1, meta.totalCount)) * 0.25;

  const accents = el('div', { class: 'cavern-accents' }, []);
  for (const up of META_UPGRADES) {
    if (!ownedSet.has(up.id)) continue;
    const chip = el('span', { class: 'cavern-chip', title: up.name }, [up.glyph]);
    accents.append(chip);
  }

  const vista = el('div', { class: 'cavern-vista' }, [
    el('div', { class: 'cavern-depth' }, [
      el('span', { class: 'cavern-label' }, [
        meta.stagesComplete >= 4
          ? 'Deep Geode complete'
          : `Furnishing stage ${Math.min(4, meta.stagesComplete + 1)}`,
      ]),
      el('span', { class: 'cavern-essence' }, [`✧ ${meta.essence} essence`]),
    ]),
    accents,
  ]);
  vista.style.setProperty('--cavern-glow', String(Math.min(0.85, glow)));

  const stages = META_STAGES.map((stage) => {
    const open = stage.id === 1 || meta.stagesComplete >= stage.id - 1;
    const complete = meta.stagesComplete >= stage.id;
    const section = el(
      'div',
      {
        class: `cavern-stage${open ? '' : ' locked'}${complete ? ' complete' : ''}`,
      },
      [
        el('h2', {}, [
          complete ? `✓ ${stage.name}` : open ? stage.name : `🔒 ${stage.name}`,
        ]),
        el('p', { class: 'hud-tip' }, [stage.tagline]),
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
      list.append(metaUpgradeRow(up, ownedSet.has(up.id), meta.essence));
    }
    section.append(list);
    return section;
  });

  panel(
    'Crystal Cavern',
    [
      el('p', {}, [
        'Wins mint essence. Spend it to furnish the living mine — a home that stays after the board clears.',
      ]),
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
      btn('Play levels', () => {
        app.screen = 'map';
        renderOverlay();
      }),
      btn('Store', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
    ],
  );
}

function metaUpgradeRow(up: MetaUpgrade, owned: boolean, essence: number): HTMLElement {
  const row = el('div', { class: `cavern-item${owned ? ' owned' : ''}` }, [
    el('div', { class: 'cavern-item-glyph' }, [up.glyph]),
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
        const res = economy.buyMetaUpgrade(up.id);
        if (!res.ok) {
          if (res.reason === 'insufficient') pushToast('Need more essence — clear levels!', '#ff9a9a');
          else if (res.reason === 'stageLocked') pushToast('Chamber still sealed', '#ff9a9a');
          else pushToast('Already placed', '#b0c0e0');
          return;
        }
        haptic('forge');
        pushToast(`${res.upgrade.name} placed in the cavern`, '#b8f0ff', 2000);
        renderOverlay();
      },
      can ? 'primary' : 'secondary',
      !can,
    );
    row.append(buy);
  }
  return row;
}

function renderStore(): void {
  const snap = economy.getSnapshot();
  const items = snap.availableSkus.map((sku) => {
    const row = el('div', { class: 'sku' }, [
      el('div', {}, [
        el('div', { class: 'name' }, [
          sku.name,
          sku.tag ? el('span', { class: 'tag' }, [sku.tag]) : '',
        ].filter(Boolean) as (string | Node)[]),
        el('div', { class: 'blurb' }, [sku.blurb]),
      ]),
    ]);
    const buy = btn(`${sku.credits}¢`, () => {
      economy.purchase(sku.id);
      renderOverlay();
    }, 'secondary');
    row.append(buy);
    return row;
  });

  panel(
    'Crystal Exchange',
    [
      el('p', {}, [
        `Credits ${snap.wallet.credits} · Shards ${snap.wallet.shards} · All prices fictional.`,
      ]),
      ...items,
    ],
    [
      btn('Back', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
  );
}

function renderLivesGate(): void {
  const snap = economy.getSnapshot();
  const mins = Math.ceil(snap.lives.msUntilNext / 60000);
  panel(
    'No Lives Left',
    [
      el('p', {}, [
        `Next life in ~${mins} min. Or spend ${30} shards, watch a simulated ad, or visit the store.`,
      ]),
    ],
    [
      btn('Spend 30 Shards', () => {
        if (economy.refillLivesWithShards()) {
          app.screen = 'prelevel';
          renderOverlay();
        }
      }),
      btn('Watch Short +1 Life', () => openAd('rewardedLife', 'lives'), 'secondary'),
      btn('Store', () => {
        app.screen = 'store';
        renderOverlay();
      }, 'secondary'),
      btn('Map', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
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

function renderSettings(): void {
  const snap = economy.getSnapshot();
  panel(
    'Settings',
    [
      el('p', {}, ['Sound, accessibility, and demo tools. Nothing leaves this device.']),
    ],
    [
      btn(snap.settings.sfx ? 'SFX: On' : 'SFX: Off', () => {
        economy.updateSettings({ sfx: !snap.settings.sfx });
        audio.setEnabled(!snap.settings.sfx);
        renderOverlay();
      }, 'secondary'),
      btn(snap.settings.glyphs ? 'Glyphs: On' : 'Glyphs: Off', () => {
        economy.updateSettings({ glyphs: !snap.settings.glyphs });
        boardView.glyphs = !snap.settings.glyphs;
        renderOverlay();
      }, 'secondary'),
      btn('Publisher Dashboard', () => {
        app.screen = 'dashboard';
        renderOverlay();
      }),
      btn('Reset research profile', () => {
        if (confirm('Wipe local save and start fresh?')) {
          economy.resetProfile();
          app.screen = 'map';
          renderOverlay();
        }
      }, 'danger'),
      btn('Back', () => {
        app.screen = 'map';
        renderOverlay();
      }, 'secondary'),
    ],
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
