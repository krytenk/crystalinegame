/**
 * Immersive backdrop for the canvas playfield.
 * Loads themed public/bg art once; falls back to procedural fill if missing.
 */

import { assetUrl } from './assetUrl';

let bgImg: HTMLImageElement | null = null;
let bgReady = false;
let loadedSrc = '';

export function loadBackground(src = 'bg/mine-cavern-720.webp'): void {
  const resolved = assetUrl(src.replace(/^\.\//, ''));
  if (bgImg && loadedSrc === resolved) return;
  bgImg = null;
  bgReady = false;
  loadedSrc = resolved;
  const img = new Image();
  img.onload = () => {
    bgImg = img;
    bgReady = true;
  };
  img.onerror = () => {
    // Try crystalline jpg fallback only for default mine path
    if (!src.includes('harbor')) {
      const img2 = new Image();
      img2.onload = () => {
        bgImg = img2;
        bgReady = true;
      };
      img2.onerror = () => {
        /* procedural fill */
      };
      img2.src = assetUrl('bg/mine-cavern.jpg');
      return;
    }
  };
  img.src = resolved;
}

export function drawGameBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
): void {
  if (bgReady && bgImg) {
    // Cover-scale
    const iw = bgImg.naturalWidth || 1;
    const ih = bgImg.naturalHeight || 1;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.drawImage(bgImg, dx, dy, dw, dh);
    // Dim slightly so board/HUD pop
    ctx.fillStyle = 'rgba(4, 8, 18, 0.42)';
    ctx.fillRect(0, 0, w, h);
  } else {
    // Procedural fallback
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a1430');
    g.addColorStop(0.4, '#0c1424');
    g.addColorStop(1, '#06080f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Slow ambient shimmer
  const t = now * 0.00025;
  const glows: [number, number, number, string][] = [
    [0.22, 0.18, 160 + Math.sin(t) * 18, 'rgba(90, 60, 190, 0.12)'],
    [0.78, 0.28, 130 + Math.cos(t * 1.2) * 14, 'rgba(40, 150, 200, 0.1)'],
    [0.5, 0.82, 180, 'rgba(200, 120, 40, 0.07)'],
  ];
  for (const [nx, ny, r, col] of glows) {
    const grd = ctx.createRadialGradient(nx * w, ny * h, 0, nx * w, ny * h, r);
    grd.addColorStop(0, col);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  // Soft vignette
  const vig = ctx.createRadialGradient(w / 2, h * 0.48, h * 0.18, w / 2, h * 0.5, h * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}
