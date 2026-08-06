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

  glyphs = true;
  /** Larger glyphs + thick white/black rims on crystals for colour-blind play. */
  highContrast = false;
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
  /** Logical pointer down position — enables direction-based swipe on mobile. */
  private pressPx: { x: number; y: number } | null = null;
  /**
   * Fraction of cell size that counts as a swipe (lower = more sensitive).
   * ~0.22 works well on dense phone boards; desktop still uses cell adjacency.
   */
  swipeThreshold = 0.22;

  /**
   * Fit board into the play area of the logical canvas.
   * Free-floating top HUD + bottom tool buttons must never cover playable cells.
   *
   * Soft-max is intentionally conservative on phones: 7×7/8×7 boards with softMax
   * 90+ filled most of the stage and felt “physically unplayable” (L23 report).
   */
  relayout(cols: number, rows: number): void {
    // Side pad scales with board width so 8×7 still clears edges
    const padX = cols <= 6 ? 20 : cols <= 7 ? 24 : 28;
    // Fixed top shelf — denser lives/goals optical scale, same gem budget
    // (icon ~52 @ y≈38 + counter ≈ 172 band; do not raise without measuring cell size)
    const PLAY_HUD_TOP = 172;
    // Tool float buttons (~68–80px) + shadow + home-indicator safe band
    const PLAY_TOOL_RESERVE = 176;
    // Gold shaped bezel outerPad ≈ 0.22*cell + stroke/shadow — keep headroom
    const BEZEL_BLEED = 40;
    const top = PLAY_HUD_TOP;
    const bottom = LOGICAL_HEIGHT - PLAY_TOOL_RESERVE;
    const availW = LOGICAL_WIDTH - padX * 2;
    const availH = Math.max(1, bottom - top);

    // Prefer larger gems; still clamp so HUD/tools never cover the board.
    // (Soft-max was overly conservative after L23 — raise for readability.)
    const softMax =
      cols * rows <= 36 ? 96 : cols * rows <= 49 ? 86 : cols * rows <= 56 ? 78 : 72;

    let cell = Math.max(1, Math.floor(Math.min(availW / cols, availH / rows)));
    cell = Math.min(cell, softMax);
    // Fit full board + bezel into the play band
    const maxCellByH = Math.floor((availH - BEZEL_BLEED) / rows);
    const maxCellByW = Math.floor(availW / cols);
    cell = Math.max(1, Math.min(cell, maxCellByH, maxCellByW));

    // Second pass: if bezel outerPad at this cell would clip tools, shrink once more
    const outerPad = Math.max(12, Math.floor(cell * 0.22));
    const needBleed = outerPad + 12;
    if (cell * rows + needBleed > availH) {
      cell = Math.max(1, Math.floor((availH - needBleed) / rows));
    }

    const boardW = cell * cols;
    const boardH = cell * rows;
    // Prefer slightly high centering so tools never collide
    let originY = top + Math.floor((availH - boardH) * 0.22);
    const maxOriginY = bottom - boardH - Math.max(BEZEL_BLEED, needBleed);
    originY = Math.max(top, Math.min(originY, maxOriginY));

    this.layout = {
      originX: Math.floor((LOGICAL_WIDTH - boardW) / 2),
      originY,
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
    this.pressPx = { x: lx, y: ly };
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
    this.pressPx = null;
    return a; // caller also needs b — use completeSwap
  }

  /**
   * Peek a swap without consuming press (for mid-drag commits on mobile).
   */
  peekSwap(lx: number, ly: number): { a: Coord; b: Coord } | null {
    if (!this.press) return null;
    const a = this.press;
    const bCell = this.screenToCell(lx, ly);
    if (bCell && Math.abs(a.x - bCell.x) + Math.abs(a.y - bCell.y) === 1) {
      return { a, b: bCell };
    }
    if (this.pressPx) {
      const { cell, width, height } = this.layout;
      const dx = lx - this.pressPx.x;
      const dy = ly - this.pressPx.y;
      const need = Math.max(8, cell * this.swipeThreshold);
      if (Math.abs(dx) < need && Math.abs(dy) < need) return null;
      let bx = a.x;
      let by = a.y;
      if (Math.abs(dx) >= Math.abs(dy)) bx = a.x + (dx > 0 ? 1 : -1);
      else by = a.y + (dy > 0 ? 1 : -1);
      if (bx < 0 || by < 0 || bx >= width || by >= height) return null;
      return { a, b: { x: bx, y: by } };
    }
    return null;
  }

  /**
   * Resolve a swap from press → release / drag.
   * Mobile-friendly: short flicks use swipe *direction* with a low threshold.
   */
  completeSwap(lx: number, ly: number): { a: Coord; b: Coord } | null {
    const swap = this.peekSwap(lx, ly);
    this.cancelPress();
    return swap;
  }

  cancelPress(): void {
    this.press = null;
    this.pressPx = null;
  }

  get hasPress(): boolean {
    return this.press != null;
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
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    const useAnim = animator != null && animator.busy;

    // Playable mask — holes are simply not drawn (no black squares)
    const playable: boolean[][] = [];
    for (let y = 0; y < snap.height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < snap.width; x++) {
        row.push(!!snap.cells[y * snap.width + x]?.playable);
      }
      playable.push(row);
    }

    // Gold chrome follows the actual playable silhouette
    drawShapedBoardBezel(ctx, originX, originY, cell, playable);

    // Floor, blockers, crust — pieces drawn separately so drops can animate.
    for (let y = 0; y < snap.height; y++) {
      for (let x = 0; x < snap.width; x++) {
        const cellData = snap.cells[y * snap.width + x];
        if (!cellData || !cellData.playable) continue;
        const cx = originX + x * cell + cell / 2;
        const cy = originY + y * cell + cell / 2;

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
          drawPiece(
            ctx,
            atlas,
            cellData.piece,
            cx,
            cy,
            cell,
            dprBucket,
            pulse,
            this.glyphs,
            undefined,
            this.highContrast,
          );
          // Chain shimmer wash over gems — bright pulse through the whole board
          if (this.shimmer && this.shimmer.alpha > 0.02) {
            ctx.save();
            const a = Math.min(0.95, this.shimmer.alpha);
            ctx.globalAlpha = a;
            const sg = ctx.createRadialGradient(cx, cy, cell * 0.02, cx, cy, cell * 0.55);
            sg.addColorStop(0, '#ffffff');
            sg.addColorStop(0.25, this.shimmer.color);
            sg.addColorStop(0.6, 'rgba(255,255,255,0.25)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(cx, cy, cell * 0.55, 0, Math.PI * 2);
            ctx.fill();
            // Outer prism rim flash
            ctx.globalAlpha = a * 0.65;
            ctx.strokeStyle = this.shimmer.color;
            ctx.lineWidth = 2.2;
            ctx.shadowColor = this.shimmer.color;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        if (cellData.crust > 0) {
          const layers = Math.min(3, Math.max(1, cellData.crust)) as 1 | 2 | 3;
          // Full-cell ice block so crust owns the pad (not a faint floor tint).
          atlas.draw(ctx, frameKey.crust(layers), cx, cy, cell * 1.02, dprBucket);
          drawIceBlockChrome(ctx, cx, cy, cell, layers);
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
      // Clip falling pieces to the playable silhouette (not the full rect)
      ctx.save();
      pathPlayableCells(ctx, originX, originY, cell, playable, 4);
      ctx.clip();
      const list = animator.visiblePieces();
      // Draw higher board-y last so falling pieces stack naturally.
      const sorted = [...list].sort((a, b) => a.vis.y - b.vis.y || a.vis.z - b.vis.z);
      for (const ap of sorted) {
        const cx = originX + ap.vis.x * cell + cell / 2;
        const cy = originY + ap.vis.y * cell + cell / 2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ap.vis.alpha));
        if (ap.vis.rot) {
          ctx.translate(cx, cy);
          ctx.rotate(ap.vis.rot);
          ctx.translate(-cx, -cy);
        }
        if (ap.vis.glow > 0.02) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.55);
          g.addColorStop(0, `rgba(180, 230, 255, ${0.55 * ap.vis.glow})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        const size = cell * (0.88 * ap.vis.scale);
        drawPiece(
          ctx,
          atlas,
          ap.piece,
          cx,
          cy,
          cell,
          dprBucket,
          pulse,
          this.glyphs,
          size,
          this.highContrast,
        );
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
  highContrast = false,
): void {
  const isPower =
    piece.kind === 'line' ||
    piece.kind === 'burst' ||
    piece.kind === 'prism' ||
    piece.kind === 'supernova';
  const isCore = piece.kind === 'core';
  const isRelic = piece.kind === 'relic';

  // Gold treasure aura — artifacts must read as special on a crowded board
  if (isRelic) {
    const t = performance.now();
    const breath = 0.55 + 0.45 * Math.sin(t * 0.005);
    const rOuter = cell * (0.72 + pulse * 0.1) * (0.92 + breath * 0.08);
    const outer = ctx.createRadialGradient(cx, cy, cell * 0.05, cx, cy, rOuter);
    outer.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
    outer.addColorStop(0.3, 'rgba(255, 200, 80, 0.55)');
    outer.addColorStop(0.65, 'rgba(255, 160, 40, 0.2)');
    outer.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fill();
    // Soft rotating sparkles (slower than power gems — treasure, not danger)
    const spin = t * 0.004;
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      const rad = cell * (0.38 + pulse * 0.06);
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      const sz = cell * 0.07;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.4, '#ffd24a');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (isPower || isCore) {
    // Loud prismatic bloom — readable as power from arm's length on phone
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
    const rOuter =
      (isCore || piece.kind === 'supernova' ? cell * 1.05 : cell * 0.95) *
      (1 + pulse * 0.18);
    // Wide outer prism wash (very bright)
    const outer = ctx.createRadialGradient(cx, cy, cell * 0.04, cx, cy, rOuter);
    outer.addColorStop(0, '#ffffff');
    outer.addColorStop(0.12, prismStops[0]!);
    outer.addColorStop(0.35, prismStops[1]! + 'ee');
    outer.addColorStop(0.65, prismStops[2]! + '88');
    outer.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fill();
    // Second color wash slightly offset for prismatic split
    const tHue = performance.now() * 0.004;
    const ox = Math.cos(tHue) * cell * 0.06;
    const oy = Math.sin(tHue * 1.3) * cell * 0.06;
    const split = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx, cy, cell * 0.55);
    split.addColorStop(0, prismStops[2]! + 'aa');
    split.addColorStop(0.5, prismStops[1]! + '55');
    split.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = split;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // Hot white core
    const mid = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.48);
    mid.addColorStop(0, 'rgba(255,255,255,1)');
    mid.addColorStop(0.25, prismStops[0]!);
    mid.addColorStop(0.6, prismStops[1]! + '99');
    mid.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.48 * (0.95 + pulse * 0.12), 0, Math.PI * 2);
    ctx.fill();

    // Fast dual-orbit spark rings — large, glowing, obvious spin
    const t = performance.now();
    const spinFast = t * 0.018; // ~faster orbit
    const spinMid = t * 0.011;
    const spinSlow = t * 0.006;
    const sparks = isCore || piece.kind === 'supernova' ? 14 : 12;
    for (let i = 0; i < sparks; i++) {
      const a = spinFast + (i / sparks) * Math.PI * 2;
      const rad = cell * (0.48 + pulse * 0.12);
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      const sz = cell * (0.14 + (i % 3) * 0.03);
      // Motion streak behind each spark
      const trailA = a - 0.35;
      const tx = cx + Math.cos(trailA) * rad;
      const ty = cy + Math.sin(trailA) * rad;
      ctx.save();
      ctx.strokeStyle = prismStops[i % 3]!;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = sz * 0.7;
      ctx.lineCap = 'round';
      ctx.shadowColor = prismStops[0]!;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.restore();
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.3, prismStops[i % 3]!);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mid ring: elongated spinning diamonds
    for (let i = 0; i < 8; i++) {
      const a = -spinMid + (i / 8) * Math.PI * 2;
      const rad = cell * 0.34;
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : prismStops[i % 3]!;
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = prismStops[1]!;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -cell * 0.07);
      ctx.lineTo(cell * 0.04, 0);
      ctx.lineTo(0, cell * 0.07);
      ctx.lineTo(-cell * 0.04, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Counter-rotating inner bright dots
    for (let i = 0; i < 8; i++) {
      const a = -spinSlow + (i / 8) * Math.PI * 2;
      const rad = cell * 0.22;
      const sx = cx + Math.cos(a) * rad;
      const sy = cy + Math.sin(a) * rad;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = prismStops[0]!;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sx, sy, cell * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Double prism ring strokes
    ctx.save();
    ctx.strokeStyle = prismStops[0]!;
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.lineWidth = 3.2 + pulse * 2.5;
    ctx.shadowColor = prismStops[1]!;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = prismStops[2]!;
    ctx.globalAlpha = 0.45 + pulse * 0.25;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.52 + pulse * cell * 0.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Line powers: thick axis flash
    if (piece.kind === 'line') {
      ctx.save();
      ctx.globalAlpha = 0.55 + pulse * 0.4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4.5 + pulse * 3.5;
      ctx.shadowColor = '#7ed0ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      if (piece.orientation === 'v') {
        ctx.moveTo(cx, cy - cell * 0.52);
        ctx.lineTo(cx, cy + cell * 0.52);
      } else {
        ctx.moveTo(cx - cell * 0.52, cy);
        ctx.lineTo(cx + cell * 0.52, cy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  const key = pieceFrame(piece);
  // Fill more of the cell so gems read larger on phone.
  const scale = isCore
    ? 1.08 + pulse * 0.1
    : isPower
      ? 1.04 + pulse * 0.08
      : isRelic
        ? 1.02 + pulse * 0.06
        : 0.97;
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

  // Power-kind badges — readable at a glance (what this special does)
  if (piece.kind === 'line' || piece.kind === 'burst' || piece.kind === 'prism') {
    ctx.save();
    const badge = piece.kind === 'line' ? (piece.orientation === 'v' ? '│' : '─') : piece.kind === 'burst' ? '✦' : '◇';
    const label =
      piece.kind === 'line'
        ? piece.orientation === 'v'
          ? 'COL'
          : 'ROW'
        : piece.kind === 'burst'
          ? 'AOE'
          : 'ALL';
    // Dark pill behind badge
    const bw = cell * 0.42;
    const bh = cell * 0.2;
    ctx.fillStyle = 'rgba(8, 10, 24, 0.72)';
    ctx.beginPath();
    const bx = cx - bw / 2;
    const by = cy + size * 0.22;
    const rr = bh / 2;
    ctx.moveTo(bx + rr, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr);
    ctx.arcTo(bx, by + bh, bx, by, rr);
    ctx.arcTo(bx, by, bx + bw, by, rr);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle =
      piece.kind === 'line' ? '#7ed0ff' : piece.kind === 'burst' ? '#ffc060' : '#e0a0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff6e8';
    ctx.font = `800 ${Math.max(9, Math.floor(cell * 0.14))}px "ScreenTechno","Nunito",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, by + bh / 2 + 0.5);
    // Keep glyph mark for shape dual-coding
    void badge;
    ctx.restore();
  }
  if (piece.kind === 'supernova') {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 24, 0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.28, cell * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe56a';
    ctx.font = `800 ${Math.max(8, Math.floor(cell * 0.12))}px "ScreenTechno","Nunito",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NOVA', cx, cy + size * 0.28);
    ctx.restore();
  }

  if (piece.kind === 'bomb' && piece.fuse !== undefined) {
    // Fuse countdown on the bomb body — hot when low
    const hot = piece.fuse <= 2;
    ctx.fillStyle = hot ? '#ff6a5a' : '#fff8e8';
    ctx.font = `800 ${Math.floor(cell * 0.3)}px "Nunito",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.shadowColor = hot ? 'rgba(255, 80, 40, 0.85)' : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = hot ? 10 : 0;
    ctx.strokeText(String(piece.fuse), cx, cy + cell * 0.06);
    ctx.fillText(String(piece.fuse), cx, cy + cell * 0.06);
    ctx.shadowBlur = 0;
  }
  if (glyphs && piece.color) {
    const gSize = highContrast ? cell * 0.48 : cell * 0.4;
    // Dark plate under glyph for contrast on bright facets
    if (highContrast) {
      ctx.save();
      ctx.fillStyle = 'rgba(8, 10, 20, 0.55)';
      ctx.beginPath();
      ctx.arc(cx, cy, gSize * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    atlas.draw(ctx, frameKey.glyph(piece.color), cx, cy, gSize, dprBucket);
  }
  // High-contrast outer rim so silhouettes separate under colour blindness
  if (highContrast && (piece.kind === 'crystal' || piece.kind === 'line' || piece.kind === 'burst')) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, cell * 0.04);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = Math.max(1.5, cell * 0.025);
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function pieceFrame(p: Piece): string {
  if (p.kind === 'supernova') return 'supernova';
  if (p.kind === 'prism') return 'prism';
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
  // Belt direction chevrons drawn as geometry (no Unicode arrows)
  for (let i = 0; i < cols; i++) {
    const cx = x0 + i * cell + cell / 2 + scroll * dir * 0.35;
    const cy = y0 + 10;
    const s = Math.max(4, cell * 0.08);
    ctx.beginPath();
    if (direction === 'right') {
      ctx.moveTo(cx - s, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx - s, cy + s);
    } else {
      ctx.moveTo(cx + s, cy - s);
      ctx.lineTo(cx - s, cy);
      ctx.lineTo(cx + s, cy + s);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Row frame glow
  ctx.strokeStyle = `rgba(94, 200, 212, ${0.45 + 0.4 * life})`;
  ctx.lineWidth = 3;
  roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, 11);
  ctx.stroke();
  ctx.restore();
}

/**
 * Studio board chrome that follows the *playable* silhouette.
 * Overlapping per-cell pads merge into one continuous gold frame —
 * no full rectangle, no black hole squares for empty layout cells.
 */
function drawShapedBoardBezel(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  cell: number,
  playable: readonly (readonly boolean[])[],
): void {
  const rows = playable.length;
  const cols = playable[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return;

  const outerPad = Math.max(12, Math.floor(cell * 0.22));
  const goldThick = Math.max(5, Math.floor(cell * 0.09));
  const cornerR = Math.min(16, cell * 0.28);

  // Bounding box of playable cells (for gradients)
  let minX = cols;
  let minY = rows;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!playable[y]![x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return;

  const bx = originX + minX * cell - outerPad;
  const by = originY + minY * cell - outerPad;
  const bw = (maxX - minX + 1) * cell + outerPad * 2;
  const bh = (maxY - minY + 1) * cell + outerPad * 2;

  // Soft outer shadow following the shape
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#1a1230';
  pathPlayableCells(ctx, originX, originY, cell, playable, outerPad, cornerR);
  ctx.fill();
  ctx.restore();

  // Gold outer rim (shape-following)
  const gold = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  gold.addColorStop(0, '#ffe56a');
  gold.addColorStop(0.35, '#c9a227');
  gold.addColorStop(0.65, '#8a6010');
  gold.addColorStop(1, '#e8c040');
  ctx.fillStyle = gold;
  pathPlayableCells(ctx, originX, originY, cell, playable, outerPad, cornerR);
  ctx.fill();

  // Inner dark edge (cut gold into a frame)
  ctx.fillStyle = '#120c24';
  pathPlayableCells(
    ctx,
    originX,
    originY,
    cell,
    playable,
    Math.max(0, outerPad - goldThick),
    Math.max(8, cornerR - 4),
  );
  ctx.fill();

  // Highlight stroke on gold lip
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.5)';
  ctx.lineWidth = 1.4;
  pathPlayableCells(
    ctx,
    originX,
    originY,
    cell,
    playable,
    outerPad - 1.5,
    Math.max(10, cornerR - 1),
  );
  ctx.stroke();
  ctx.restore();

  // Felt / pad well under tiles
  const padGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
  padGrad.addColorStop(0, '#221848');
  padGrad.addColorStop(0.5, '#16102e');
  padGrad.addColorStop(1, '#100c22');
  ctx.fillStyle = padGrad;
  pathPlayableCells(
    ctx,
    originX,
    originY,
    cell,
    playable,
    Math.max(0, outerPad - goldThick - 3),
    Math.max(6, cornerR - 6),
  );
  ctx.fill();

  // Inner gold hairline
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 1;
  pathPlayableCells(
    ctx,
    originX,
    originY,
    cell,
    playable,
    Math.max(0, outerPad - goldThick - 2),
    Math.max(7, cornerR - 5),
  );
  ctx.stroke();
}

/**
 * Union path of every playable cell, expanded by `pad` pixels.
 * Adjacent cells merge into one continuous silhouette.
 */
function pathPlayableCells(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  cell: number,
  playable: readonly (readonly boolean[])[],
  pad: number,
  cornerR?: number,
): void {
  const r = cornerR ?? Math.min(14, cell * 0.28 + Math.max(0, pad) * 0.35);
  ctx.beginPath();
  for (let y = 0; y < playable.length; y++) {
    const row = playable[y]!;
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const px = originX + x * cell - pad;
      const py = originY + y * cell - pad;
      const pw = cell + pad * 2;
      const ph = cell + pad * 2;
      const rr = Math.min(r, pw / 2, ph / 2);
      // Subpath per cell — overlapping fills merge visually
      ctx.moveTo(px + rr, py);
      ctx.arcTo(px + pw, py, px + pw, py + ph, rr);
      ctx.arcTo(px + pw, py + ph, px, py + ph, rr);
      ctx.arcTo(px, py + ph, px, py, rr);
      ctx.arcTo(px, py, px + pw, py, rr);
      ctx.closePath();
    }
  }
}

/** Soft amber pulse + frost rim so ice-block crust reads as a breakable goal. */
function drawIceBlockChrome(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  layers: 1 | 2 | 3,
): void {
  const half = cell * 0.48;
  const r = cell * 0.12;
  const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.0045);

  ctx.save();
  ctx.shadowColor = `rgba(255, 193, 74, ${0.35 + pulse * 0.35})`;
  ctx.shadowBlur = 10 + pulse * 8;
  ctx.strokeStyle = `rgba(255, 200, 90, ${0.45 + pulse * 0.35})`;
  ctx.lineWidth = 2.2;
  roundRect(ctx, cx - half, cy - half, half * 2, half * 2, r);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(8, 14, 28, 0.75)';
  ctx.lineWidth = 2.5;
  roundRect(ctx, cx - half - 1, cy - half - 1, half * 2 + 2, half * 2 + 2, r + 1);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(210, 240, 255, 0.85)';
  ctx.lineWidth = 1.6;
  roundRect(ctx, cx - half + 2, cy - half + 2, half * 2 - 4, half * 2 - 4, r - 1);
  ctx.stroke();

  // Layer pips
  const pipR = Math.max(2.5, cell * 0.045);
  const gap = cell * 0.12;
  const startX = cx - ((layers - 1) * gap) / 2;
  const pipY = cy + half - cell * 0.12;
  for (let i = 0; i < layers; i++) {
    const px = startX + i * gap;
    ctx.beginPath();
    ctx.arc(px, pipY, pipR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4c8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 40, 70, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  if (layers === 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 40, 70, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.7, cy - half * 0.2);
    ctx.lineTo(cx - half * 0.1, cy + half * 0.15);
    ctx.lineTo(cx + half * 0.35, cy - half * 0.1);
    ctx.lineTo(cx + half * 0.65, cy + half * 0.25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.68, cy - half * 0.22);
    ctx.lineTo(cx - half * 0.08, cy + half * 0.13);
    ctx.stroke();
    ctx.restore();
  }
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
