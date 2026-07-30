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
    // Board well — carved stone frame
    const well = ctx.createLinearGradient(
      originX - 12,
      originY - 12,
      originX + cell * snap.width + 12,
      originY + cell * snap.height + 12,
    );
    well.addColorStop(0, 'rgba(28, 36, 64, 0.96)');
    well.addColorStop(1, 'rgba(10, 14, 28, 0.96)');
    ctx.fillStyle = well;
    roundRect(
      ctx,
      originX - 12,
      originY - 12,
      cell * snap.width + 24,
      cell * snap.height + 24,
      18,
    );
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 190, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80, 50, 120, 0.35)';
    ctx.lineWidth = 1;
    roundRect(
      ctx,
      originX - 8,
      originY - 8,
      cell * snap.width + 16,
      cell * snap.height + 16,
      14,
    );
    ctx.stroke();

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
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(originX + x * cell + 2, originY + y * cell + 2, cell - 4, cell - 4);
          continue;
        }

        ctx.fillStyle =
          (x + y) % 2 === 0 ? 'rgba(36, 48, 78, 0.7)' : 'rgba(24, 32, 58, 0.7)';
        ctx.fillRect(originX + x * cell + 1, originY + y * cell + 1, cell - 2, cell - 2);

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
          ctx.strokeStyle = 'rgba(255, 230, 120, 0.95)';
          ctx.lineWidth = 3;
          ctx.strokeRect(originX + x * cell + 3, originY + y * cell + 3, cell - 6, cell - 6);
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
    const aura = isCore
      ? `rgba(255, 240, 180, ${0.35 + pulse * 0.45})`
      : piece.kind === 'supernova'
        ? `rgba(255, 255, 255, ${0.35 + pulse * 0.4})`
        : piece.kind === 'prism'
          ? `rgba(220, 180, 255, ${0.25 + pulse * 0.35})`
          : piece.kind === 'burst'
            ? `rgba(255, 200, 120, ${0.22 + pulse * 0.3})`
            : `rgba(120, 210, 255, ${0.22 + pulse * 0.3})`;
    const r = isCore || piece.kind === 'supernova' ? cell * 0.62 : cell * 0.55;
    const grd = ctx.createRadialGradient(cx, cy, cell * 0.1, cx, cy, r);
    grd.addColorStop(0, aura);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const key = pieceFrame(piece);
  const scale = isCore
    ? 0.95 + pulse * 0.08
    : isPower
      ? 0.92 + pulse * 0.04
      : 0.88;
  const size = forcedSize ?? cell * scale;

  // Living Core uses dedicated spin sheet when available
  if (isCore && drawLivingCore(ctx, cx, cy, size, pulse)) {
    // drawn
  } else {
    atlas.draw(ctx, key, cx, cy, size, dprBucket);
  }

  if (piece.kind === 'bomb' && piece.fuse !== undefined) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(cell * 0.28)}px "Segoe UI",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
