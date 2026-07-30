/**
 * CRYSTALLINE — canvas surface, DPR handling and the logical coordinate space.
 *
 * The whole renderer draws into a FIXED logical space (720 x 1280, portrait).
 * That space is scaled with `contain` semantics and letterboxed into whatever
 * viewport it is given, so a phone in portrait, a tablet and a desktop window all
 * get the same layout with no per-breakpoint code. The doc's requirement is
 * parity across touch and mouse, which starts with a single coordinate system.
 *
 * Backing-store resolution follows `devicePixelRatio` so the art stays crisp; the
 * DPR is re-checked every frame because it changes when a window moves between
 * monitors or the user zooms.
 */

export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 1280;

/** A reusable point, so coordinate conversion never allocates. */
export interface Point {
  x: number;
  y: number;
}

const MAX_DPR = 3;

export class CanvasView {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private ro: ResizeObserver | null = null;
  private onWinResize: (() => void) | null = null;

  /** Device pixel ratio actually used for the backing store (clamped). */
  dpr = 1;
  /** DPR bucket for atlas selection: 1, 2 or 4. */
  dprBucket: 1 | 2 | 4 = 1;

  /** CSS pixel size of the element. */
  cssWidth = 0;
  cssHeight = 0;

  /** logical -> CSS scale factor, and the letterbox offsets in CSS pixels. */
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  readonly logicalWidth = LOGICAL_WIDTH;
  readonly logicalHeight = LOGICAL_HEIGHT;

  /** Filled behind the letterbox bars. */
  backdrop = '#05060c';
  /** Filled inside the logical viewport. */
  background = '#0b0e1a';

  private readonly scratch: Point = { x: 0, y: 0 };
  private dirty = true;

  get ctx(): CanvasRenderingContext2D | null {
    return this.context;
  }

  get element(): HTMLCanvasElement | null {
    return this.canvas;
  }

  mount(canvas: HTMLCanvasElement): void {
    this.unmount();
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    // Defensive: the host stylesheet may not have been written yet.
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    if (canvas.style.width === '') canvas.style.width = '100%';
    if (canvas.style.height === '') canvas.style.height = '100%';

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => {
        this.dirty = true;
      });
      this.ro.observe(canvas);
    }
    if (typeof window !== 'undefined') {
      this.onWinResize = () => {
        this.dirty = true;
      };
      window.addEventListener('resize', this.onWinResize, { passive: true });
      window.addEventListener('orientationchange', this.onWinResize, { passive: true });
    }
    this.dirty = true;
    this.sync();
  }

  unmount(): void {
    if (this.ro !== null) {
      this.ro.disconnect();
      this.ro = null;
    }
    if (this.onWinResize !== null && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWinResize);
      window.removeEventListener('orientationchange', this.onWinResize);
      this.onWinResize = null;
    }
    this.canvas = null;
    this.context = null;
  }

  /** Recompute backing store size and letterbox transform if anything changed. */
  sync(): void {
    const canvas = this.canvas;
    if (canvas === null) return;

    const rawDpr =
      typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
        ? window.devicePixelRatio
        : 1;
    const dpr = Math.max(1, Math.min(MAX_DPR, rawDpr));

    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    if (w <= 0 || h <= 0) {
      w = typeof window !== 'undefined' ? window.innerWidth : LOGICAL_WIDTH;
      h = typeof window !== 'undefined' ? window.innerHeight : LOGICAL_HEIGHT;
    }
    if (w <= 0) w = LOGICAL_WIDTH;
    if (h <= 0) h = LOGICAL_HEIGHT;

    if (!this.dirty && w === this.cssWidth && h === this.cssHeight && dpr === this.dpr) {
      return;
    }
    this.dirty = false;
    this.cssWidth = w;
    this.cssHeight = h;
    this.dpr = dpr;
    this.dprBucket = rawDpr >= 3 ? 4 : rawDpr >= 1.5 ? 2 : 1;

    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;

    const s = Math.min(w / LOGICAL_WIDTH, h / LOGICAL_HEIGHT);
    this.scale = s;
    this.offsetX = (w - LOGICAL_WIDTH * s) / 2;
    this.offsetY = (h - LOGICAL_HEIGHT * s) / 2;
  }

  /**
   * Clear, paint the letterbox and install the logical transform.
   * Returns the context ready for drawing in logical units, or null if unmounted.
   */
  beginFrame(): CanvasRenderingContext2D | null {
    this.sync();
    const ctx = this.context;
    const canvas = this.canvas;
    if (ctx === null || canvas === null) return null;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, this.dpr * this.offsetX, this.dpr * this.offsetY);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    return ctx;
  }

  endFrame(): void {
    const ctx = this.context;
    if (ctx === null) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Convert a pointer event's client coordinates into logical space.
   * The returned point is a shared scratch object — copy it if you keep it.
   */
  clientToLogical(clientX: number, clientY: number, out?: Point): Point {
    const p = out ?? this.scratch;
    const canvas = this.canvas;
    if (canvas === null) {
      p.x = 0;
      p.y = 0;
      return p;
    }
    const rect = canvas.getBoundingClientRect();
    // Guard against CSS transforms scaling the element away from its layout box.
    const rx = rect.width > 0 ? (clientX - rect.left) * (this.cssWidth / rect.width) : 0;
    const ry = rect.height > 0 ? (clientY - rect.top) * (this.cssHeight / rect.height) : 0;
    const s = this.scale > 0 ? this.scale : 1;
    p.x = (rx - this.offsetX) / s;
    p.y = (ry - this.offsetY) / s;
    return p;
  }

  /** Logical -> CSS pixels relative to the canvas element's top-left. */
  logicalToClient(lx: number, ly: number, out?: Point): Point {
    const p = out ?? this.scratch;
    p.x = lx * this.scale + this.offsetX;
    p.y = ly * this.scale + this.offsetY;
    return p;
  }

  inBounds(lx: number, ly: number): boolean {
    return lx >= 0 && ly >= 0 && lx <= LOGICAL_WIDTH && ly <= LOGICAL_HEIGHT;
  }
}
