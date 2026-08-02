/**
 * CRYSTALLINE — board drawing + input.
 */

import type { BoardSnapshot, Coord, Piece } from '@engine/types';
import { frameKey } from './manifest';
import type { Atlas } from './atlas';
import type { BoardAnimator } from './boardAnimator';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './canvas';

export interface BoardLayout {
  originX: number;
  originY: number;
  cell: number;
  width: number;
  height: number;
}

export class BoardView {
  layout: BoardLayout = {
    originX: 40,
    originY: 220,
    cell: 80,
    width: 8,
    height: 8,
  };

  glyphs = false;
  /** Active conveyor row highlight (set by play loop from engine events). */
  conveyor: {
    row: number;
    direction: 'left' | 'right';
    until: number;
  } | null = null;
  /**
   * Board-wide shimmer from chain clears (from JuiceSystem.boardShimmer).
   * Applied as a glow over every gem cell.
   */
  shimmer: { alpha: number; color: string } | null = null;
  /** Per-level felt tint so consecutive boards read as different chambers. */
  chamberTint: string | null = null;
  private press: Coord | null = null;
  private hover: Coord | null = null;

  /**
   * Fit board into the play area of the logical canvas.
   * HUD sits above (~0–170); action bar below (~bottom 90).
   * We use as much of the middle as possible so gems stay large.
   */
  relayout(cols: number, rows: number): void {
    const padX = 20;
    const top = 170;
    const bottom = LOGICAL_HEIGHT - 88;
    const availW = LOGICAL_WIDTH - padX * 2;
    const availH = bottom - top;
    // Prefer large cells; floor but never smaller than 1
    const cell = Math.max(1, Math.floor(Math.min(availW / cols, availH / rows)));
    const boardW = cell * cols;
    const boardH = cell * rows;
    this.layout = {
      originX: Math.floor((LOGICAL_WIDTH - boardW) / 2),
      // Bias slightly upward so the board sits under the HUD, not the action bar
      originY: top + Math.floor((availH - boardH) * 0.35),
      cell,
      width: cols,
      height: rows,
    };
  }

  screenToCell(lx: number, ly: number): Coord | null {
    const { originX, originY, cell, width, height } = this.layout;
    const x = Math.floor((lx - originX) / cell);
    const y = Math.floor((ly - originY) / cell);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return { x, y };
  }

  onPress(lx: number, ly: number): void {
    this.press = this.screenToCell(lx, ly);
  }

  onMove(lx: number, ly: number): Coord | null {
    this.hover = this.screenToCell(lx, ly);
    if (!this.press || !this.hover) return null;
    if (this.press.x === this.hover.x && this.press.y === this.hover.y) return null;
    const dx = Math.abs(this.press.x - this.hover.x);
    const dy = Math.abs(this.press.y - this.hover.y);
    if (dx + dy !== 1) return null;
    const a = this.press;
    this.press = null;
    return a; // caller also needs b — use completeSwap
  }

  completeSwap(lx: number, ly: number): { a: Coord; b: Coord } | null {
    if (!this.press) return null;
    const b = this.screenToCell(lx, ly);
    const a = this.press;
    this.press = null;
    if (!b) return null;
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return null;
    return { a, b };
  }

  cancelPress(): void {
    this.press = null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    snap: BoardSnapshot,
    atlas: Atlas,
    dprBucket: 1 | 2 | 4,
    now = performance.now(),
    animator?: BoardAnimator | null,
  ): void {
    const { originX, originY, cell } = this.layout;
    const boardW = cell * snap.width;
    const boardH = cell * snap.height;
    drawBoardBezel(ctx, originX, originY, boardW, boardH);

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    const useAnim = animator != null && animator.busy;

    // Floor, blockers, crust — pieces drawn separately so drops can animate.
    for (let y = 0; y < snap.height; y++) {
      for (let x = 0; x < snap.width; x++) {
        const cellData = snap.cells[y * snap.width + x];
        if (!cellData) continue;
        const cx = originX + x * cell + cell / 2;
        const cy = originY + y * cell + cell / 2;

        if (!cellData.playable) {
          ctx.fillStyle = 'rgba(8, 6, 16, 0.75)';
          roundRect(ctx, originX + x * cell + 3, originY + y * cell + 3, cell - 6, cell - 6, 8);
          ctx.fill();
          continue;
        }

        // Soft checker felt — dark pad so gems pop (studio contrast)
        const even = (x + y) % 2 === 0;
        ctx.fillStyle = even ? 'rgba(42, 34, 72, 0.9)' : 'rgba(26, 20, 48, 0.92)';
        roundRect(ctx, originX + x * cell + 2, originY + y * cell + 2, cell - 4, cell - 4, 10);
        ctx.fill();
        // Chamber tint so each level's board colour reads as a new space
        if (this.chamberTint) {
          ctx.fillStyle = this.chamberTint;
          roundRect(ctx, originX + x * cell + 2, originY + y * cell + 2, cell - 4, cell - 4, 10);
          ctx.fill();
        }
        const tileHi = ctx.createLinearGradient(
          originX + x * cell,
          originY + y * cell,
          originX + x * cell,
          originY + y * cell + cell * 0.4,
        );
        tileHi.addColorStop(0, 'rgba(255,255,255,0.07)');
        tileHi.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = tileHi;
        roundRect(ctx, originX + x * cell + 2, originY + y * cell + 2, cell - 4, cell - 4, 10);
        ctx.fill();

        if (cellData.shadow > 0) {
          atlas.draw(
            ctx,
            frameKey.shadow(cellData.shadow === 1 ? 1 : 2),
            cx,
            cy,
            cell * 0.98,
            dprBucket,
          );
        }

        // When not animating, draw pieces in-cell. During animation the
        // animator owns all piece drawing (including stones/bombs).
        if (!useAnim && cellData.piece) {
          drawPiece(ctx, atlas, cellData.piece, cx, cy, cell, dprBucket, pulse, this.glyphs);
          // Chain shimmer wash over gems
          if (this.shimmer && this.shimmer.alpha > 0.02) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.85, this.shimmer.alpha);
            const sg = ctx.createRadialGradient(cx, cy, cell * 0.05, cx, cy, cell * 0.48);
            sg.addColorStop(0, this.shimmer.color);
            sg.addColorStop(0.55, 'rgba(255,255,255,0.15)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (cellData.crust > 0) {
          const layers = Math.min(3, Math.max(1, cellData.crust)) as 1 | 2 | 3;
          atlas.draw(ctx, frameKey.crust(layers), cx, cy, cell * 0.95, dprBucket);
        }

        if (this.press && this.press.x === x && this.press.y === y) {
          ctx.strokeStyle = 'rgba(255, 220, 90, 0.98)';
          ctx.lineWidth = 3.5;
          roundRect(ctx, originX + x * cell + 4, originY + y * cell + 4, cell - 8, cell - 8, 12);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.5;
          roundRect(ctx, originX + x * cell + 7, originY + y * cell + 7, cell - 14, cell - 14, 10);
          ctx.stroke();
        }
      }
    }

    // Conveyor belt chrome under the shifting row
    if (this.conveyor && now < this.conveyor.until) {
      drawConveyorBelt(
        ctx,
        originX,
        originY,
        cell,
        snap.width,
        this.conveyor.row,
        this.conveyor.direction,
        now,
        this.conveyor.until,
      );
    }

    if (useAnim && animator) {
      // Clip so crystals entering from above appear to drop into the well.
      ctx.save();
      ctx.beginPath();
      ctx.rect(originX - 4, originY - 4, cell * snap.width + 8, cell * snap.height + 8);
      ctx.clip();
      const list = animator.visiblePieces();
      // Draw higher board-y last so falling pieces stack naturally.
      const sorted = [...list].sort((a, b) => a.vis.y - b.vis.y || a.vis.z - b.vis.z);
      for (const ap of sorted) {
        const cx = originX + ap.vis.x * cell + cell / 2;
        const cy = originY + ap.vis.y * cell + cell / 2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ap.vis.alpha));
        const size = cell * (0.88 * ap.vis.scale);
        drawPiece(ctx, atlas, ap.piece, cx, cy, cell, dprBucket, pulse, this.glyphs, size);
        ctx.restore();
      }
      ctx.restore();
    }
  }
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  piece: Piece,
  cx: number,
  cy: number,
  cell: number,
  dprBucket: 1 | 2 | 4,
  pulse: number,
  glyphs: boolean,
  forcedSize?: number,
): void {
  const isPower =
    piece.kind === 'line' ||
    piece.kind === 'burst' ||
    piece.kind === 'prism' ||
    piece.kind === 'supernova';
  const isCore = piece.kind === 'core';
  if (isPower || isCore) {
    // Bright multi-layer prismatic bloom — must read as power from arm's length
    const prismStops =
      isCore
        ? (['#fff6c8', '#ffd24a', '#ff9a40'] as const)
        : piece.kind === 'supernova'
          ? (['#ffffff', '#e8d0ff', '#7ed0ff'] as const)
          : piece.kind === 'prism'
            ? (['#fff0ff', '#e0a0ff', '#80e0ff'] as const)
            : piece.kind === 'burst'
              ? (['#fff0c0', '#ffc060', '#ff8040'] as const)
              : (['#e8ffff', '#7ed0ff', '#4080ff'] as const);
    const rOuter = (isCore || piece.kind === 'supernova' ? cell * 0.92 : cell * 0.82) * (1 + pulse * 0.12);
    // Soft outer prism wash
    const outer = ctx.createRadialGradient(cx, cy, cell * 0.05, cx, cy, rOuter);
    outer.addColorStop(0, prismStops[0]!);
    outer.addColorStop(0.25, prismStops[1]! + 'cc');
    outer.addColorStop(0.55, prismStops[2]! + '66');
    outer.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fill();
    // Bright core halo
    const mid = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.42);
    mid.addColorStop(0, 'rgba(255,255,255,0.95)');
    mid.addColorStop(0.35, prismStops[0]!);
    mid.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.42 * (0.95 + pulse * 0.1), 0, Math.PI * 2);
    ctx.fill();

    // Fast dual-orbit spark rings (obvious spin)
    const t = performance.now();
    const spinFast = t * 0.012;
    const spinSlow = t * 0.007;
    const sparks = isCore || piece.kind === 'supernova' ? 12 : 10;
    for (let i = 0; i < sparks; i++) {
      const a = spinFast + (i / sparks) * Math.PI * 2;
      const rad = cell * (0.42 + pulse * 0.1);
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      const sz = cell * (0.1 + (i % 3) * 0.02);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.35, prismStops[i % 3]!);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    // Counter-rotating inner dots
    for (let i = 0; i < 6; i++) {
      const a = -spinSlow + (i / 6) * Math.PI * 2;
      const rad = cell * 0.28;
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(sx, sy, cell * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    // Prism ring stroke
    ctx.save();
    ctx.strokeStyle = prismStops[0]!;
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.lineWidth = 2.5 + pulse * 2;
    ctx.shadowColor = prismStops[1]!;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Line powers: thick axis flash
    if (piece.kind === 'line') {
      ctx.save();
      ctx.globalAlpha = 0.45 + pulse * 0.35;
      ctx.strokeStyle = '#b8f0ff';
      ctx.lineWidth = 3.5 + pulse * 3;
      ctx.shadowColor = '#7ed0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      if (piece.orientation === 'v') {
        ctx.moveTo(cx, cy - cell * 0.48);
        ctx.lineTo(cx, cy + cell * 0.48);
      } else {
        ctx.moveTo(cx - cell * 0.48, cy);
        ctx.lineTo(cx + cell * 0.48, cy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  const key = pieceFrame(piece);
  const scale = isCore
    ? 1.02 + pulse * 0.1
    : isPower
      ? 0.98 + pulse * 0.08
      : 0.9;
  const size = forcedSize ?? cell * scale;

  // Soft contact shadow under gem (depth)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.32, size * 0.32, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Living Core uses dedicated spin sheet when available
  if (isCore && drawLivingCore(ctx, cx, cy, size, pulse)) {
    // drawn
  } else {
    atlas.draw(ctx, key, cx, cy, size, dprBucket);
  }

  // Specular gloss — studio polish without changing base atlas art
  if (piece.kind === 'crystal' || isPower || isCore) {
    const gloss = ctx.createRadialGradient(
      cx - size * 0.18,
      cy - size * 0.22,
      size * 0.02,
      cx - size * 0.05,
      cy - size * 0.08,
      size * 0.42,
    );
    gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
    gloss.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  if (piece.kind === 'bomb' && piece.fuse !== undefined) {
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.floor(cell * 0.28)}px "Nunito",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(String(piece.fuse), cx, cy + cell * 0.08);
    ctx.fillText(String(piece.fuse), cx, cy + cell * 0.08);
  }
  if (glyphs && piece.color) {
    atlas.draw(ctx, frameKey.glyph(piece.color), cx, cy, cell * 0.35, dprBucket);
  }
}

function pieceFrame(p: Piece): string {
  if (p.kind === 'prism' || p.kind === 'supernova') return 'prism';
  if (p.kind === 'core') return 'prism';
  if (p.kind === 'stone') return 'stone';
  if (p.kind === 'bomb') return 'bomb';
  if (p.kind === 'relic') return 'relic';
  if (!p.color) return 'stone';
  if (p.kind === 'line') return frameKey.line(p.color, p.orientation ?? 'h');
  if (p.kind === 'burst') return frameKey.burst(p.color);
  return frameKey.crystal(p.color);
}

/** Spinning Living Core / Beacon Core sheet (6×2, 96px). Path is theme-aware. */
let coreSheet: HTMLImageElement | null = null;
let coreTried = false;
let coreSrcTried = '';
function ensureCoreSheet(): HTMLImageElement | null {
  // Lazy import avoided: path injected via setCoreSheetPath from main boot
  const src = coreSheetPath;
  if (coreSheet && coreSrcTried === src) return coreSheet;
  if (coreTried && coreSrcTried === src) return coreSheet;
  coreTried = true;
  coreSrcTried = src;
  coreSheet = null;
  const img = new Image();
  img.onload = () => {
    coreSheet = img;
  };
  img.onerror = () => {
    coreSheet = null;
  };
  img.src = src;
  return null;
}

let coreSheetPath = './gen/living_core.webp';
/** Call at boot after theme resolve so Harbor can load its beacon sheet. */
export function setCoreSheetPath(path: string): void {
  coreSheetPath = path.startsWith('./') || path.startsWith('/') || path.startsWith('http')
    ? path
    : `./${path}`;
  coreTried = false;
  coreSheet = null;
  coreSrcTried = '';
}

function drawLivingCore(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  pulse: number,
): boolean {
  const sheet = ensureCoreSheet() ?? coreSheet;
  if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return false;
  const fw = 96;
  const fh = 96;
  const cols = 6;
  const count = 12;
  const frame = Math.floor(performance.now() / 80) % count;
  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const s = size * (1 + pulse * 0.05);
  ctx.drawImage(
    sheet,
    col * fw,
    row * fh,
    fw,
    fh,
    cx - s / 2,
    cy - s / 2,
    s,
    s,
  );
  return true;
}

/** Sort-inspired belt under a shifting row — chevrons scroll with direction. */
function drawConveyorBelt(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  cell: number,
  cols: number,
  row: number,
  direction: 'left' | 'right',
  now: number,
  until: number,
): void {
  const life = Math.max(0.15, (until - now) / 900);
  const y0 = originY + row * cell;
  const x0 = originX;
  const w = cell * cols;
  const h = cell;
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.4 * life;
  // Thin top/bottom rails (don't wash out gems) — amber/teal reads as a sorting belt
  ctx.fillStyle = 'rgba(42, 143, 154, 0.4)';
  ctx.fillRect(x0 + 4, y0 + 2, w - 8, 5);
  ctx.fillRect(x0 + 4, y0 + h - 7, w - 8, 5);
  ctx.strokeStyle = 'rgba(240, 160, 75, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0 + 6, y0 + 4);
  ctx.lineTo(x0 + w - 6, y0 + 4);
  ctx.moveTo(x0 + 6, y0 + h - 4);
  ctx.lineTo(x0 + w - 6, y0 + h - 4);
  ctx.stroke();
  // Belt plate treads
  const dir = direction === 'left' ? -1 : 1;
  const scroll = ((now * 0.12 * dir) % (cell * 0.45) + cell) % cell;
  ctx.fillStyle = 'rgba(244, 239, 230, 0.55)';
  for (let i = 0; i < cols + 1; i++) {
    const tx = x0 + i * cell + scroll * dir * 0.4;
    ctx.fillRect(tx, y0 + h - 10, Math.max(3, cell * 0.12), 4);
  }
  ctx.fillStyle = 'rgba(240, 200, 120, 0.85)';
  ctx.font = `800 ${Math.floor(cell * 0.2)}px "Nunito",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mark = direction === 'left' ? '◀' : '▶';
  for (let i = 0; i < cols; i++) {
    const cx = x0 + i * cell + cell / 2 + scroll * dir * 0.35;
    ctx.fillText(mark, cx, y0 + 10);
  }
  // Row frame glow
  ctx.strokeStyle = `rgba(94, 200, 212, ${0.45 + 0.4 * life})`;
  ctx.lineWidth = 3;
  roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, 11);
  ctx.stroke();
  ctx.restore();
}

/**
 * Studio match-3 board chrome: drop shadow → gold outer bezel → dark felt well.
 * Original crystal-mine palette (not a clone of any title's frame).
 */
function drawBoardBezel(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  boardW: number,
  boardH: number,
): void {
  const pad = 18;
  const x = originX - pad;
  const y = originY - pad;
  const w = boardW + pad * 2;
  const h = boardH + pad * 2;
  const r = 22;

  // Soft outer shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#1a1230';
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // Gold outer rim
  const gold = ctx.createLinearGradient(x, y, x + w, y + h);
  gold.addColorStop(0, '#ffe56a');
  gold.addColorStop(0.35, '#c9a227');
  gold.addColorStop(0.65, '#8a6010');
  gold.addColorStop(1, '#e8c040');
  ctx.fillStyle = gold;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // Inner dark edge
  ctx.fillStyle = '#120c24';
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 18);
  ctx.fill();

  // Highlight stroke on gold
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.55)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 20);
  ctx.stroke();

  // Felt / pad fill
  const padGrad = ctx.createLinearGradient(x, y, x, y + h);
  padGrad.addColorStop(0, '#221848');
  padGrad.addColorStop(0.5, '#16102e');
  padGrad.addColorStop(1, '#100c22');
  ctx.fillStyle = padGrad;
  roundRect(ctx, x + 9, y + 9, w - 18, h - 18, 14);
  ctx.fill();

  // Inner gold hairline
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 10, y + 10, w - 20, h - 20, 13);
  ctx.stroke();
}

function roundRect(
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
