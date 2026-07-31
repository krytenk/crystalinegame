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
    // Outer bloom + rotating spark ring — powers must read as “special” at a glance
    const mid = isCore
      ? 'rgba(255, 240, 180, 0.55)'
      : piece.kind === 'supernova'
        ? 'rgba(255, 255, 255, 0.55)'
        : piece.kind === 'prism'
          ? 'rgba(220, 180, 255, 0.5)'
          : piece.kind === 'burst'
            ? 'rgba(255, 200, 120, 0.48)'
            : 'rgba(120, 210, 255, 0.48)';
    const edge = isCore
      ? 'rgba(255, 240, 180, 0.14)'
      : piece.kind === 'supernova'
        ? 'rgba(255, 255, 255, 0.14)'
        : piece.kind === 'prism'
          ? 'rgba(220, 180, 255, 0.12)'
          : piece.kind === 'burst'
            ? 'rgba(255, 200, 120, 0.12)'
            : 'rgba(120, 210, 255, 0.12)';
    const r = isCore || piece.kind === 'supernova' ? cell * 0.72 : cell * 0.64;
    const grd = ctx.createRadialGradient(cx, cy, cell * 0.08, cx, cy, r);
    grd.addColorStop(0, mid);
    grd.addColorStop(0.55, edge);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.92 + pulse * 0.08), 0, Math.PI * 2);
    ctx.fill();

    // Spark orbit
    const sparks = isCore || piece.kind === 'supernova' ? 8 : 6;
    const spin = performance.now() * 0.004;
    for (let i = 0; i < sparks; i++) {
      const a = spin + (i / sparks) * Math.PI * 2;
      const rad = cell * (0.38 + pulse * 0.06);
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, cell * 0.08);
      sg.addColorStop(0, 'rgba(255,255,255,0.95)');
      sg.addColorStop(0.4, mid);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, cell * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Line powers: axis flash
    if (piece.kind === 'line') {
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.2;
      ctx.strokeStyle = piece.orientation === 'v' ? 'rgba(140,220,255,0.9)' : 'rgba(140,220,255,0.9)';
      ctx.lineWidth = 2 + pulse * 2;
      ctx.shadowColor = '#7ed0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      if (piece.orientation === 'v') {
        ctx.moveTo(cx, cy - cell * 0.4);
        ctx.lineTo(cx, cy + cell * 0.4);
      } else {
        ctx.moveTo(cx - cell * 0.4, cy);
        ctx.lineTo(cx + cell * 0.4, cy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  const key = pieceFrame(piece);
  const scale = isCore
    ? 0.95 + pulse * 0.08
    : isPower
      ? 0.92 + pulse * 0.04
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

/** Spinning Living Core from public/gen/living_core.webp (6×2 sheet, 96px). */
let coreSheet: HTMLImageElement | null = null;
let coreTried = false;
function ensureCoreSheet(): HTMLImageElement | null {
  if (coreSheet) return coreSheet;
  if (coreTried) return null;
  coreTried = true;
  const img = new Image();
  img.onload = () => {
    coreSheet = img;
  };
  img.onerror = () => {
    coreSheet = null;
  };
  img.src = './gen/living_core.webp';
  return null;
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
