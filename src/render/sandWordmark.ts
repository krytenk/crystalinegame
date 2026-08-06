/**
 * Material hero wordmark — sand under water (Harbor) or ore grain (Crystalline).
 *
 * Hero surfaces only (title / major headlines). Never used for HUD digits.
 * Kill-switch: reducedMotion → static painted text.
 *
 * Scoop easter egg: drag across letters enough → onScoop (economy hard-caps daily).
 */

export type SandWordmarkProfile = 'sand' | 'ore';

export interface SandWordmarkOptions {
  /** Display string (e.g. "LANTERN HARBOR"). */
  text: string;
  /** Logical canvas width of the wordmark region. */
  width: number;
  /** Logical canvas height. */
  height: number;
  profile?: SandWordmarkProfile;
  /** When true, draw static fill only (settings / reduced motion). */
  reducedMotion?: boolean;
  /** Font CSS for measuring / clip text. */
  font?: string;
  /** Sand / ore base colour. */
  fill?: string;
  /** Water / glass tint over sand (ore uses crystal sheen). */
  waterTint?: string;
  /**
   * Optional scoop easter egg — fires once per successful drag gesture.
   * Caller must hard-cap rewards (economy.claimMaterialScoop).
   */
  onScoop?: () => void;
}

interface Grain {
  x: number;
  y: number;
  r: number;
  phase: number;
  /** 0..1 brightness variance */
  tone: number;
}

/**
 * Interactive sand wordmark. Mount with mount(); call dispose() when leaving screen.
 */
export class SandWordmark {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Required<
    Pick<
      SandWordmarkOptions,
      'text' | 'width' | 'height' | 'profile' | 'reducedMotion' | 'font' | 'fill' | 'waterTint'
    >
  > & { onScoop?: () => void };
  private grains: Grain[] = [];
  private mask: OffscreenCanvas | HTMLCanvasElement | null = null;
  private raf = 0;
  private born = performance.now();
  private pointer = { x: 0.5, y: 0.5, active: false };
  private tilt = { x: 0, y: 0 };
  private disposed = false;
  private onPointer: ((e: PointerEvent) => void) | null = null;
  private onTilt: ((e: DeviceOrientationEvent) => void) | null = null;
  /** Drag distance in logical px this gesture (for scoop). */
  private dragPath = 0;
  private lastDrag = { x: 0, y: 0 };
  private scoopFired = false;
  private scoopFlashUntil = 0;

  constructor(opts: SandWordmarkOptions) {
    const isOre = (opts.profile ?? 'sand') === 'ore';
    this.opts = {
      text: opts.text,
      width: opts.width,
      height: opts.height,
      profile: opts.profile ?? 'sand',
      reducedMotion: opts.reducedMotion ?? false,
      font:
        opts.font ??
        (isOre
          ? '800 40px "DragonBlaze", "Fredoka", system-ui, sans-serif'
          : '800 42px "Tidepop", "Fredoka", "ScreenTechno", system-ui, sans-serif'),
      fill: opts.fill ?? (isOre ? '#c9a0ff' : '#e8c48a'),
      waterTint: opts.waterTint ?? (isOre ? 'rgba(160, 120, 255, 0.35)' : 'rgba(90, 200, 210, 0.28)'),
      onScoop: opts.onScoop,
    };
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sand-wordmark';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.width = Math.round(this.opts.width * (window.devicePixelRatio || 1));
    this.canvas.height = Math.round(this.opts.height * (window.devicePixelRatio || 1));
    this.canvas.style.width = `${this.opts.width}px`;
    this.canvas.style.height = `${this.opts.height}px`;
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.touchAction = 'none';
    this.canvas.style.cursor = 'pointer';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('SandWordmark: 2d context unavailable');
    this.ctx = ctx;
    this.buildMaskAndGrains();
  }

  get el(): HTMLCanvasElement {
    return this.canvas;
  }

  mount(parent: HTMLElement): void {
    parent.append(this.canvas);
    if (!this.opts.reducedMotion) {
      this.bindInput();
      this.loop();
    } else {
      this.drawStatic();
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.unbindInput();
    this.canvas.remove();
  }

  private buildMaskAndGrains(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const mask =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : document.createElement('canvas');
    if (!(mask instanceof OffscreenCanvas)) {
      mask.width = w;
      mask.height = h;
    }
    const mctx = mask.getContext('2d')!;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, this.opts.width, this.opts.height);
    mctx.fillStyle = '#fff';
    mctx.font = this.opts.font;
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    // Soft outline so thin Tidepop stems still catch grains
    mctx.lineWidth = 3;
    mctx.strokeStyle = '#fff';
    mctx.strokeText(this.opts.text, this.opts.width / 2, this.opts.height / 2);
    mctx.fillText(this.opts.text, this.opts.width / 2, this.opts.height / 2);
    this.mask = mask;

    // Sample mask → place grains inside letters
    const img = mctx.getImageData(0, 0, w, h);
    const grains: Grain[] = [];
    const step = Math.max(2, Math.floor(3 * dpr));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const a = img.data[(y * w + x) * 4 + 3]!;
        if (a < 40) continue;
        // Density jitter
        if (Math.random() > 0.55) continue;
        grains.push({
          x: x / dpr,
          y: y / dpr,
          r: 0.7 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          tone: 0.75 + Math.random() * 0.35,
        });
      }
    }
    // Cap for mobile fill-rate
    if (grains.length > 900) {
      // Fisher-Yates thin
      for (let i = grains.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = grains[i]!;
        grains[i] = grains[j]!;
        grains[j] = tmp;
      }
      grains.length = 900;
    }
    this.grains = grains;
  }

  private bindInput(): void {
    this.onPointer = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(1, rect.width);
      const ny = (e.clientY - rect.top) / Math.max(1, rect.height);
      const lx = nx * this.opts.width;
      const ly = ny * this.opts.height;
      this.pointer.x = nx;
      this.pointer.y = ny;

      if (e.type === 'pointerdown') {
        this.pointer.active = true;
        this.dragPath = 0;
        this.scoopFired = false;
        this.lastDrag = { x: lx, y: ly };
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      } else if (e.type === 'pointermove' && this.pointer.active) {
        const dx = lx - this.lastDrag.x;
        const dy = ly - this.lastDrag.y;
        this.dragPath += Math.hypot(dx, dy);
        this.lastDrag = { x: lx, y: ly };
        // Scoop once when finger rakes ~half the wordmark width
        if (!this.scoopFired && this.dragPath > this.opts.width * 0.42) {
          this.scoopFired = true;
          this.scoopFlashUntil = performance.now() + 420;
          try {
            this.opts.onScoop?.();
          } catch {
            /* never break title */
          }
        }
      } else if (e.type === 'pointerup' || e.type === 'pointerleave' || e.type === 'pointercancel') {
        this.pointer.active = false;
        this.dragPath = 0;
      }
    };
    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onPointer);
    this.canvas.addEventListener('pointerup', this.onPointer);
    this.canvas.addEventListener('pointerleave', this.onPointer);
    this.canvas.addEventListener('pointercancel', this.onPointer);

    this.onTilt = (e: DeviceOrientationEvent) => {
      // beta: front-back, gamma: left-right — clamp soft
      const g = typeof e.gamma === 'number' ? e.gamma : 0;
      const b = typeof e.beta === 'number' ? e.beta : 0;
      this.tilt.x = Math.max(-1, Math.min(1, g / 35));
      this.tilt.y = Math.max(-1, Math.min(1, (b - 45) / 35));
    };
    window.addEventListener('deviceorientation', this.onTilt, { passive: true });
  }

  private unbindInput(): void {
    if (this.onPointer) {
      this.canvas.removeEventListener('pointerdown', this.onPointer);
      this.canvas.removeEventListener('pointermove', this.onPointer);
      this.canvas.removeEventListener('pointerup', this.onPointer);
      this.canvas.removeEventListener('pointerleave', this.onPointer);
      this.onPointer = null;
    }
    if (this.onTilt) {
      window.removeEventListener('deviceorientation', this.onTilt);
      this.onTilt = null;
    }
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.drawFrame(performance.now());
    this.raf = requestAnimationFrame(this.loop);
  };

  private drawStatic(): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.opts.width, this.opts.height);
    ctx.font = this.opts.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.opts.fill;
    ctx.fillText(this.opts.text, this.opts.width / 2, this.opts.height / 2);
    ctx.fillStyle = this.opts.waterTint;
    ctx.fillText(this.opts.text, this.opts.width / 2, this.opts.height / 2);
  }

  private drawFrame(now: number): void {
    const dpr = window.devicePixelRatio || 1;
    const { ctx } = this;
    const age = (now - this.born) / 1000;
    const isOre = this.opts.profile === 'ore';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.opts.width, this.opts.height);

    // Base material plate under letters
    if (this.mask) {
      ctx.save();
      ctx.drawImage(this.mask as CanvasImageSource, 0, 0, this.opts.width, this.opts.height);
      ctx.globalCompositeOperation = 'source-in';
      const sand = ctx.createLinearGradient(0, 0, 0, this.opts.height);
      if (isOre) {
        sand.addColorStop(0, '#e8d0ff');
        sand.addColorStop(0.45, this.opts.fill);
        sand.addColorStop(1, '#5a3088');
      } else {
        sand.addColorStop(0, '#f0d4a0');
        sand.addColorStop(0.5, this.opts.fill);
        sand.addColorStop(1, '#c49a58');
      }
      ctx.fillStyle = sand;
      ctx.fillRect(0, 0, this.opts.width, this.opts.height);
      ctx.restore();
    }

    // Grains (interactive)
    const px = this.pointer.x * this.opts.width;
    const py = this.pointer.y * this.opts.height;
    const push = this.pointer.active ? 12 : 4;
    ctx.save();
    for (const g of this.grains) {
      let gx = g.x + this.tilt.x * 3.5 + Math.sin(age * 1.2 + g.phase) * 0.6;
      let gy = g.y + this.tilt.y * 2.5 + Math.cos(age * 0.9 + g.phase) * 0.5;
      const dx = gx - px;
      const dy = gy - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < 55 * 55 && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = ((55 - d) / 55) * push;
        gx += (dx / d) * f;
        gy += (dy / d) * f;
      }
      const a = 0.55 + 0.35 * g.tone;
      ctx.fillStyle = isOre
        ? `rgba(${160 + g.tone * 60 | 0}, ${120 + g.tone * 40 | 0}, ${220 | 0}, ${a})`
        : `rgba(${210 + g.tone * 30 | 0}, ${170 + g.tone * 20 | 0}, ${110 + g.tone * 15 | 0}, ${a})`;
      ctx.beginPath();
      ctx.arc(gx, gy, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Caustic / crystal wash
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.55;
    const cx = this.opts.width * (0.35 + 0.1 * Math.sin(age * 0.7));
    const cy = this.opts.height * (0.4 + 0.08 * Math.cos(age * 0.55));
    const rad = this.opts.width * 0.45;
    const c = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
    c.addColorStop(0, isOre ? 'rgba(255, 220, 255, 0.55)' : 'rgba(180, 240, 255, 0.55)');
    c.addColorStop(0.5, this.opts.waterTint);
    c.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, this.opts.width, this.opts.height);
    ctx.restore();

    // Scoop flash
    if (now < this.scoopFlashUntil) {
      const f = (this.scoopFlashUntil - now) / 420;
      ctx.save();
      ctx.globalAlpha = 0.35 * f;
      ctx.fillStyle = isOre ? 'rgba(220, 180, 255, 1)' : 'rgba(255, 230, 160, 1)';
      ctx.fillRect(0, 0, this.opts.width, this.opts.height);
      ctx.restore();
    }

    // Soft outline for legibility
    ctx.save();
    ctx.font = this.opts.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = isOre ? 'rgba(30, 12, 50, 0.45)' : 'rgba(20, 40, 50, 0.35)';
    ctx.strokeText(this.opts.text, this.opts.width / 2, this.opts.height / 2);
    ctx.restore();
  }
}

/** One-shot factory for title screens. */
export function createSandWordmark(
  parent: HTMLElement,
  opts: SandWordmarkOptions,
): SandWordmark {
  const sw = new SandWordmark(opts);
  sw.mount(parent);
  return sw;
}
