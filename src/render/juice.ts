/**
 * CRYSTALLINE — juice layer: particles, rings, flashes, score pops, banners.
 * Makes every clear feel like an event.
 */

export interface JuiceFloat {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
  life: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  /** 0 = circle, 1 = diamond spark, 2 = soft star */
  shape: 0 | 1 | 2;
}

interface Ring {
  x: number;
  y: number;
  born: number;
  life: number;
  color: string;
  maxR: number;
}

/** Prey gem a limb will seize and drag home. */
export interface KrakenPrey {
  readonly x: number;
  readonly y: number;
  readonly color: string;
}

/**
 * Super Chest limb — art-matched tapered arm (teal top / coral belly + suckers)
 * that reaches a board cell, wraps the gem, then recoils dragging it home.
 */
interface Tentacle {
  /** Chest / body origin (logical canvas). */
  ox: number;
  oy: number;
  /** Full-reach tip target (prey cell centre). */
  tx: number;
  ty: number;
  born: number;
  life: number;
  /** Dorsal (top) teal — matches octopus_chest art. */
  color: string;
  /** Ventral / sucker belly coral-pink. */
  belly: string;
  /** Base thickness at chest. */
  baseW: number;
  preyColor: string;
  /** Stagger index for sucker phase + curl sign. */
  seed: number;
  /** True ambient flourish arm (no prey gem). */
  ambient: boolean;
}

interface Flash {
  born: number;
  life: number;
  color: string;
  alpha: number;
}

/** Harbor Super Chest palette — locked to octopus_chest art. */
const KRAKEN = {
  tealHi: '#9ad8d0',
  teal: '#5eb8b0',
  tealDeep: '#2f6e78',
  lavender: '#8b7bc9',
  belly: '#e07a6a',
  bellyHi: '#ffb8a8',
  suckerRim: 'rgba(90, 50, 70, 0.55)',
  suckerHole: 'rgba(255, 230, 210, 0.9)',
} as const;

export class JuiceSystem {
  private particles: Particle[] = [];
  private floats: JuiceFloat[] = [];
  private rings: Ring[] = [];
  private tentacles: Tentacle[] = [];
  private flash: Flash | null = null;
  private banner: { text: string; born: number; life: number; color: string } | null = null;
  /** Board-wide gem shimmer / glow after chain clears. */
  private shimmer: { born: number; life: number; color: string; intensity: number } | null = null;
  /** Optional Super Chest body sprite (Harbor octopus_chest only). */
  private krakenBodyImg: HTMLImageElement | null = null;
  /** Origin of the current feast body (for sprite draw). */
  private krakenBody: { ox: number; oy: number; r: number; born: number; life: number } | null =
    null;
  /** Which peak body to draw — octopus is Harbor-only. */
  private peakBodyStyle: 'kraken' | 'supernova' = 'supernova';
  hitStopUntil = 0;

  /** Prefetch Super Chest octopus art — call only for Harbor theme. */
  setKrakenBodySrc(src: string): void {
    if (!src) {
      this.krakenBodyImg = null;
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    this.krakenBodyImg = img;
  }

  requestHitStop(ms: number, now = performance.now()): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, now + ms);
  }

  get frozen(): boolean {
    return performance.now() < this.hitStopUntil;
  }

  /** Active board shimmer for renderer (null if idle). */
  get boardShimmer(): { alpha: number; color: string } | null {
    if (!this.shimmer) return null;
    const age = performance.now() - this.shimmer.born;
    if (age > this.shimmer.life) return null;
    const t = age / this.shimmer.life;
    const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 4);
    const fade = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
    return {
      alpha: this.shimmer.intensity * pulse * fade,
      color: this.shimmer.color,
    };
  }

  /**
   * Board-wide shimmer through all gems (chain feedback).
   * intensity 0.2–1, life ms.
   */
  shimmerBoard(color = 'rgba(180, 230, 255, 1)', intensity = 0.55, life = 420): void {
    const prev = this.shimmer;
    const now = performance.now();
    if (prev && now - prev.born < prev.life * 0.6) {
      // Stack intensity on multi-step cascades
      this.shimmer = {
        born: now,
        life: Math.max(life, prev.life),
        color,
        intensity: Math.min(1, prev.intensity * 0.5 + intensity),
      };
    } else {
      this.shimmer = { born: now, life, color, intensity };
    }
  }

  burst(x: number, y: number, color: string, count = 14): void {
    const n = Math.min(80, Math.max(4, Math.floor(count)));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.4 + Math.random() * 6.5;
      const roll = Math.random();
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.4,
        life: 1,
        maxLife: 0.4 + Math.random() * 0.55,
        size: 2.5 + Math.random() * 5,
        color,
        shape: roll > 0.65 ? 1 : roll > 0.4 ? 2 : 0,
      });
    }
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
  }

  /** Dense radial explosion for power clears — multi-wave, very loud. */
  explode(x: number, y: number, color: string, power = 1): void {
    const count = Math.floor(48 + power * 40);
    this.burst(x, y, color, count);
    this.burst(x, y, '#ffffff', Math.floor(18 + power * 14));
    this.burst(x, y, '#ffe9a8', Math.floor(14 + power * 12));
    this.burst(x, y, '#e0c0ff', Math.floor(10 + power * 8));
    // Triple shockwave rings
    this.ring(x, y, color, 90 + power * 50, 520 + power * 90);
    this.ring(x, y, '#ffffff', 55 + power * 35, 400 + power * 50);
    this.ring(x, y, color, 120 + power * 55, 640 + power * 100);
    this.screenFlash(
      color.includes('rgba') ? color : `rgba(255, 240, 200, 0.7)`,
      260 + power * 55,
      0.38 + power * 0.12,
    );
  }

  /** Expanding ring shockwave (forge / power / big cascade). */
  ring(x: number, y: number, color: string, maxR = 70, life = 420): void {
    this.rings.push({ x, y, born: performance.now(), life, color, maxR });
    if (this.rings.length > 12) this.rings.shift();
  }

  /**
   * Peak 6+ special spectacle. Harbor → Super Chest (octopus). Mine → Supernova (crystal).
   * Engine already cleared cells — pure juice.
   */
  peakSpecialFeast(
    style: 'kraken' | 'supernova',
    ox: number,
    oy: number,
    prey: readonly KrakenPrey[],
    opts: { cell?: number; color?: string } = {},
  ): void {
    if (style === 'kraken') this.krakenFeast(ox, oy, prey, opts);
    else this.supernovaFeast(ox, oy, prey, opts);
  }

  /**
   * Crystalline peak special: living-geode core + crystal rays that pull shards in.
   * No tentacles — this is a mine, not a harbor.
   */
  supernovaFeast(
    ox: number,
    oy: number,
    prey: readonly KrakenPrey[],
    opts: { cell?: number; color?: string } = {},
  ): void {
    const cell = opts.cell ?? 64;
    const color = opts.color ?? '#e8d0ff';
    const now = performance.now();
    const life = 980;
    const list = prey.length > 0 ? prey.slice(0, 8) : defaultRadialPrey(ox, oy, cell, 7);

    // Crystal “vein rays” — gold / void / white, not octopus arms
    const rayColors = ['#ffe56a', '#e0a0ff', '#7ed0ff', '#ffffff', '#ffb02e', '#c9a0ff'];
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      this.tentacles.push({
        ox,
        oy,
        tx: p.x,
        ty: p.y,
        born: now + i * 28,
        life: life + (i % 3) * 30,
        color: rayColors[i % rayColors.length]!,
        belly: '#fff6e8',
        baseW: Math.max(8, cell * 0.14), // thin crystal blades, not fat tentacles
        preyColor: p.color,
        seed: i * 23 + 3,
        ambient: false,
      });
    }
    // Ambient facet spokes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      const reach = cell * (1.6 + (i % 2) * 0.35);
      this.tentacles.push({
        ox,
        oy,
        tx: ox + Math.cos(a) * reach,
        ty: oy + Math.sin(a) * reach,
        born: now + 40 + i * 18,
        life: life * 0.65,
        color: i % 2 === 0 ? '#ffd24a' : '#c8a0ff',
        belly: '#ffffff',
        baseW: Math.max(6, cell * 0.1),
        preyColor: 'rgba(0,0,0,0)',
        seed: 200 + i * 5,
        ambient: true,
      });
    }
    if (this.tentacles.length > 22) this.tentacles.splice(0, this.tentacles.length - 22);

    this.krakenBody = {
      ox,
      oy,
      r: Math.max(24, cell * 0.78),
      born: now,
      life: life + 100,
    };
    // Mark body as geode style via oversized r + separate draw path uses peakStyle
    this.peakBodyStyle = 'supernova';

    this.burst(ox, oy, '#ffffff', 28);
    this.burst(ox, oy, '#ffe56a', 22);
    this.burst(ox, oy, '#e0a0ff', 18);
    this.ring(ox, oy, color, cell * 2.4, 700);
    this.ring(ox, oy, '#ffd24a', cell * 1.3, 480);
    this.screenFlash('rgba(255, 230, 160, 0.4)', 340, 0.32);
    this.requestHitStop(80);
  }

  /**
   * Harbor Super Chest / kraken feast: limbs reach targets, seize gems, drag them in.
   * Visual language matches octopus_chest (teal + coral belly suckers).
   * **Harbor only** — Crystalline uses supernovaFeast.
   */
  krakenFeast(
    ox: number,
    oy: number,
    prey: readonly KrakenPrey[],
    opts: { cell?: number; color?: string } = {},
  ): void {
    const cell = opts.cell ?? 64;
    const color = opts.color ?? KRAKEN.teal;
    const now = performance.now();
    // Reach → wrap → pull must land before cascade UI; slightly longer than v1
    const life = 1040;
    const list = prey.length > 0 ? prey.slice(0, 7) : defaultRadialPrey(ox, oy, cell, 6);
    // Art-locked cycle — teal dominant, lavender accents like chest art
    const dorsalCycle = [KRAKEN.teal, '#6eb8c8', KRAKEN.lavender, KRAKEN.teal, '#7a9ad0', '#5aa8a0'];

    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      this.tentacles.push({
        ox,
        oy,
        tx: p.x,
        ty: p.y,
        born: now + i * 30,
        life: life + (i % 3) * 36,
        color: dorsalCycle[i % dorsalCycle.length]!,
        belly: i % 3 === 2 ? '#d87068' : KRAKEN.belly,
        // Slightly fatter base so S-curve reads at arm's length
        baseW: Math.max(15, cell * 0.3),
        preyColor: p.color,
        seed: i * 19 + 5,
        ambient: false,
      });
    }
    // Ambient arms fill the silhouette when few prey
    const ambientN = Math.max(0, 5 - list.length);
    for (let i = 0; i < ambientN; i++) {
      const a = (i / Math.max(1, ambientN)) * Math.PI * 2 + 0.55 + list.length * 0.12;
      const reach = cell * (1.85 + (i % 3) * 0.38);
      this.tentacles.push({
        ox,
        oy,
        tx: ox + Math.cos(a) * reach,
        ty: oy + Math.sin(a) * reach,
        born: now + 48 + i * 22,
        life: life * 0.7,
        color: i % 2 === 0 ? KRAKEN.teal : '#6a9aaa',
        belly: KRAKEN.belly,
        baseW: Math.max(10, cell * 0.2),
        preyColor: 'rgba(0,0,0,0)',
        seed: 110 + i * 7,
        ambient: true,
      });
    }
    if (this.tentacles.length > 22) this.tentacles.splice(0, this.tentacles.length - 22);

    // Body pulse tracks feast life (sprite or procedural)
    this.peakBodyStyle = 'kraken';
    this.krakenBody = {
      ox,
      oy,
      r: Math.max(22, cell * 0.72),
      born: now,
      life: life + 120,
    };

    // Soft open — not a full explode (limbs need to own the read)
    this.burst(ox, oy, KRAKEN.tealHi, 16);
    this.burst(ox, oy, '#ffe9a8', 14);
    this.burst(ox, oy, KRAKEN.bellyHi, 10);
    this.ring(ox, oy, color, cell * 2.2, 640);
    this.ring(ox, oy, '#ffffff', cell * 1.1, 420);
    this.screenFlash('rgba(90, 200, 210, 0.42)', 320, 0.28);
    this.requestHitStop(72);
  }

  /** Full-view colour wash for peak moments. */
  screenFlash(color = 'rgba(255, 230, 160, 0.35)', life = 220, alpha = 0.32): void {
    this.flash = { born: performance.now(), life, color, alpha };
  }

  scorePop(x: number, y: number, points: number, color = '#ffe9a8'): void {
    if (points <= 0) return;
    this.floats.push({
      x,
      y,
      text: `+${points}`,
      color,
      born: performance.now(),
      // Appears ~0.1s into clear choreography (caller may delay slightly).
      life: 1000,
      vy: -0.62,
    });
    if (this.floats.length > 28) this.floats.shift();
  }

  cascadeBanner(step: number): void {
    if (step < 1) return;
    // Competence inflation labels — over-the-top on purpose (research).
    const labels = [
      '',
      'Nice!',
      'Cascade ×2!',
      'Cascade ×3!',
      'BLAZING!',
      'UNSTOPPABLE!',
      'CRYSTAL STORM!',
      'LEGENDARY!',
    ];
    const text = labels[Math.min(step, labels.length - 1)] ?? `Cascade ×${step}!`;
    const colors = ['#fff', '#b8f0ff', '#ffe9a8', '#ffb0e0', '#ffd0a0', '#e0c0ff', '#ffffff', '#fff6c8'];
    this.banner = {
      text,
      born: performance.now(),
      life: 1000 + step * 100,
      color: colors[Math.min(step, colors.length - 1)] ?? '#fff',
    };
  }

  powerBanner(label: string): void {
    this.banner = {
      text: label,
      born: performance.now(),
      life: 1400,
      color: '#e8d0ff',
    };
  }

  update(dt: number): void {
    if (this.frozen) return;
    const n = Math.min(0.05, dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= n / p.maxLife;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    const now = performance.now();
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]!;
      f.y += f.vy * (n * 60);
      if (now - f.born > f.life) this.floats.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      if (now - this.rings[i]!.born > this.rings[i]!.life) this.rings.splice(i, 1);
    }
    for (let i = this.tentacles.length - 1; i >= 0; i--) {
      if (now - this.tentacles[i]!.born > this.tentacles[i]!.life) this.tentacles.splice(i, 1);
    }
    if (this.krakenBody && now - this.krakenBody.born > this.krakenBody.life) {
      this.krakenBody = null;
    }
    if (this.flash && now - this.flash.born > this.flash.life) this.flash = null;
    if (this.shimmer && now - this.shimmer.born > this.shimmer.life) this.shimmer = null;
  }

  draw(ctx: CanvasRenderingContext2D, now: number, viewW: number, viewH = 1280): void {
    // Screen flash under everything else in juice (over board)
    if (this.flash) {
      const age = now - this.flash.born;
      const t = age / this.flash.life;
      const a = this.flash.alpha * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.restore();
    }

    for (const r of this.rings) {
      const age = now - r.born;
      const t = Math.min(1, age / r.life);
      const radius = r.maxR * (0.15 + 0.85 * t);
      const alpha = (1 - t) * 0.85;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3.5 * (1 - t * 0.6);
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Peak limbs: crystal veins (mine) or Super Chest arms (harbor)
    for (const ten of this.tentacles) {
      const age = now - ten.born;
      if (age < 0) continue;
      const lifeT = Math.min(1, age / ten.life);
      if (this.peakBodyStyle === 'supernova') drawCrystalRay(ctx, ten, lifeT);
      else drawKrakenLimb(ctx, ten, lifeT);
    }
    // Body last — geode core (mine) or Super Chest octopus (harbor)
    if (this.krakenBody) {
      const age = now - this.krakenBody.born;
      if (age >= 0 && age < this.krakenBody.life) {
        const t = age / this.krakenBody.life;
        if (this.peakBodyStyle === 'supernova') {
          drawSupernovaBody(
            ctx,
            this.krakenBody.ox,
            this.krakenBody.oy,
            this.krakenBody.r,
            now,
            t,
          );
        } else {
          drawKrakenBody(
            ctx,
            this.krakenBody.ox,
            this.krakenBody.oy,
            this.krakenBody.r,
            now,
            t,
            this.krakenBodyImg,
          );
        }
      }
    } else if (this.tentacles.some((t) => now >= t.born && now - t.born < t.life)) {
      const body = this.tentacles.find((t) => now >= t.born)!;
      if (this.peakBodyStyle === 'supernova') {
        drawSupernovaBody(ctx, body.ox, body.oy, body.baseW * 1.9, now, 0.3);
      } else {
        drawKrakenBody(ctx, body.ox, body.oy, body.baseW * 1.75, now, 0.3, this.krakenBodyImg);
      }
    }

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      const s = p.size * p.life;
      if (p.shape === 1) {
        // Diamond spark
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.7, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.7, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 2) {
        ctx.font = `${Math.max(8, s * 3)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Soft disc spark (no ASCII) — nautical-safe for both themes
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floats) {
      const age = now - f.born;
      const t = age / f.life;
      const fade = t < 0.12 ? t / 0.12 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
      const pop = 1 + 0.18 * Math.sin(Math.min(1, t * 5) * Math.PI);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(f.x, f.y);
      ctx.scale(pop, pop);
      // Thick outline for readability over particle chaos (mobile arm's-length).
      ctx.font = '700 26px "DragonBlaze", "DragonWarrior", "GalacticKnights", "Cinzel", serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.72)';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 14;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }

    if (this.banner) {
      const age = now - this.banner.born;
      if (age > this.banner.life) {
        this.banner = null;
      } else {
        const t = age / this.banner.life;
        const fade = t < 0.12 ? t / 0.12 : t > 0.75 ? (1 - t) / 0.25 : 1;
        const pop = 1 + 0.12 * Math.sin(Math.min(1, t * 4) * Math.PI);
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(viewW / 2, 240);
        ctx.scale(pop, pop);
        ctx.font = '700 40px "DragonBlaze", "DragonWarrior", "GalacticKnights", "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeText(this.banner.text, 0, 0);
        ctx.fillStyle = this.banner.color;
        ctx.shadowColor = this.banner.color;
        ctx.shadowBlur = 26;
        ctx.fillText(this.banner.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function defaultRadialPrey(
  ox: number,
  oy: number,
  cell: number,
  n: number,
): KrakenPrey[] {
  const out: KrakenPrey[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const r = cell * (2.4 + (i % 3) * 0.35);
    out.push({
      x: ox + Math.cos(a) * r,
      y: oy + Math.sin(a) * r,
      color: '#7ec8ff',
    });
  }
  return out;
}

/** Sample a cubic Bezier (S-curve limbs). */
function bez3(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): { x: number; y: number } {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * u * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + tt * t * x3,
    y: uu * u * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + tt * t * y3,
  };
}

/** Build cubic control points for an octopus arm (S-curl + optional tip wrap). */
function limbControls(
  ten: Tentacle,
  tipT: number,
  wrapPhase: number,
): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
} {
  const dx = ten.tx - ten.ox;
  const dy = ten.ty - ten.oy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const curlSign = ten.seed % 2 === 0 ? 1 : -1;
  // Attach slightly outside the chest so arms grow from under the body
  const root = ten.baseW * 0.55;
  const x0 = ten.ox + ux * root;
  const y0 = ten.oy + uy * root;
  // Living idle sway + stronger wrap curl
  const idle = Math.sin(tipT * Math.PI * 1.6 + ten.seed * 0.25) * ten.baseW * 0.55;
  const wrap = wrapPhase * ten.baseW * 2.4;
  const bow = (idle + wrap) * curlSign;
  // First third bows one way; second third S-curves opposite — reads as real tentacle
  const x1 = x0 + ux * len * 0.32 + nx * bow * 0.95;
  const y1 = y0 + uy * len * 0.32 + ny * bow * 0.95;
  // Tip wrap: pull control toward prey during grab so tip hooks the gem
  const tipHook = wrapPhase * ten.baseW * 1.35 * curlSign;
  const x2 = x0 + ux * len * 0.68 - nx * bow * 0.7 + nx * tipHook * 0.4;
  const y2 = y0 + uy * len * 0.68 - ny * bow * 0.7 + ny * tipHook * 0.4;
  const x3 = ten.tx + nx * tipHook * 0.25;
  const y3 = ten.ty + ny * tipHook * 0.25;
  return { x0, y0, x1, y1, x2, y2, x3, y3 };
}

/**
 * Thick two-tone limb (teal dorsal + coral belly) + optional prey gem.
 * Cubic S-curve · outline · ridge highlight · ringed suckers.
 * t: 0..1 lifetime · 0–0.40 reach · 0.40–0.56 wrap · 0.56–1.0 pull
 */
function drawKrakenLimb(
  ctx: CanvasRenderingContext2D,
  ten: Tentacle,
  t: number,
): void {
  let tipT: number;
  let gemAlong: number | null = null;
  let wrapPhase = 0;
  if (t < 0.4) {
    tipT = easeOutCubic(t / 0.4);
    wrapPhase = tipT * 0.25;
  } else if (t < 0.56) {
    tipT = 1;
    gemAlong = 0;
    wrapPhase = 0.55 + 0.45 * Math.sin(((t - 0.4) / 0.16) * Math.PI);
  } else {
    const u = (t - 0.56) / 0.44;
    tipT = Math.max(0.07, 1 - easeInCubic(u) * 0.93);
    gemAlong = Math.min(1, easeInCubic(Math.min(1, u * 1.1)));
    wrapPhase = Math.max(0.12, 0.55 * (1 - u));
  }

  const alpha = t < 0.05 ? t / 0.05 : t > 0.88 ? Math.max(0, (1 - t) / 0.12) : 1;
  if (alpha <= 0.01) return;

  const c = limbControls(ten, tipT, wrapPhase);
  const sample = (s: number) =>
    bez3(s, c.x0, c.y0, c.x1, c.y1, c.x2, c.y2, c.x3, c.y3);

  const tip = sample(tipT);
  const steps = 22;
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  const bellyOuter: { x: number; y: number }[] = [];
  const bellyInner: { x: number; y: number }[] = [];
  const ridge: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * tipT;
    const p = sample(s);
    const p2 = sample(Math.min(1, s + 0.015));
    let tx = p2.x - p.x;
    let ty = p2.y - p.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const px = -ty;
    const py = tx;
    // Fat base → power-taper to a delicate tip (reads more organic than linear)
    const taper = Math.pow(1 - s * 0.92, 1.35);
    const pulse = 0.9 + 0.1 * Math.sin(s * 11 + ten.seed * 0.35);
    const w = ten.baseW * taper * pulse;
    left.push({ x: p.x + px * w, y: p.y + py * w });
    right.push({ x: p.x - px * w, y: p.y - py * w });
    bellyOuter.push({ x: p.x - px * w, y: p.y - py * w });
    bellyInner.push({ x: p.x - px * w * 0.05, y: p.y - py * w * 0.05 });
    // Dorsal highlight ridge
    ridge.push({ x: p.x + px * w * 0.45, y: p.y + py * w * 0.45 });
  }

  ctx.save();
  ctx.globalAlpha = alpha * (ten.ambient ? 0.8 : 0.98);

  // Soft outer outline (depth against board)
  ctx.beginPath();
  ctx.moveTo(left[0]!.x, left[0]!.y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(20, 40, 50, 0.45)';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dorsal fill
  const grad = ctx.createLinearGradient(c.x0, c.y0, tip.x, tip.y);
  grad.addColorStop(0, shade(ten.color, 1.22));
  grad.addColorStop(0.4, ten.color);
  grad.addColorStop(0.75, shade(ten.color, 0.88));
  grad.addColorStop(1, shade(ten.color, 0.68));
  ctx.fillStyle = grad;
  ctx.shadowColor = ten.color;
  ctx.shadowBlur = 11;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Coral belly band
  if (bellyOuter.length > 5) {
    ctx.beginPath();
    const b0 = 2;
    const b1 = bellyOuter.length - 2;
    ctx.moveTo(bellyOuter[b0]!.x, bellyOuter[b0]!.y);
    for (let i = b0 + 1; i < b1; i++) ctx.lineTo(bellyOuter[i]!.x, bellyOuter[i]!.y);
    for (let i = b1 - 1; i >= b0; i--) ctx.lineTo(bellyInner[i]!.x, bellyInner[i]!.y);
    ctx.closePath();
    const bg = ctx.createLinearGradient(c.x0, c.y0, tip.x, tip.y);
    bg.addColorStop(0, KRAKEN.bellyHi);
    bg.addColorStop(0.5, ten.belly);
    bg.addColorStop(1, shade(ten.belly, 0.82));
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle = bg;
    ctx.fill();
  }

  // Specular ridge along the top (cartoon plastic sheen)
  if (ridge.length > 4) {
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = Math.max(1.5, ten.baseW * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ridge[2]!.x, ridge[2]!.y);
    for (let i = 3; i < ridge.length - 2; i++) ctx.lineTo(ridge[i]!.x, ridge[i]!.y);
    ctx.stroke();
  }

  // Suckers on belly — denser mid-arm, smaller near tip
  ctx.globalAlpha = alpha * 0.96;
  for (let i = 3; i < steps - 1; i += 1) {
    if (i % 2 === 0) continue;
    const s = (i / steps) * tipT;
    if (s < 0.12 || s > tipT * 0.94) continue;
    const p = sample(s);
    const p2 = sample(Math.min(1, s + 0.018));
    let tx = p2.x - p.x;
    let ty = p2.y - p.y;
    const tl = Math.hypot(tx, ty) || 1;
    const px = -ty / tl;
    const py = tx / tl;
    const taper = Math.pow(1 - s * 0.9, 1.2);
    const ox = p.x - px * ten.baseW * 0.32 * taper;
    const oy = p.y - py * ten.baseW * 0.32 * taper;
    const r = Math.max(2.2, ten.baseW * 0.19 * taper);
    const ang = Math.atan2(ty, tx);
    // rim
    ctx.fillStyle = 'rgba(70, 35, 50, 0.5)';
    ctx.beginPath();
    ctx.ellipse(ox, oy, r * 1.1, r * 0.72, ang, 0, Math.PI * 2);
    ctx.fill();
    // cup
    ctx.fillStyle = KRAKEN.suckerHole;
    ctx.beginPath();
    ctx.ellipse(ox, oy, r * 0.52, r * 0.34, ang, 0, Math.PI * 2);
    ctx.fill();
    // dark center
    ctx.fillStyle = 'rgba(120, 60, 70, 0.35)';
    ctx.beginPath();
    ctx.ellipse(ox, oy, r * 0.22, r * 0.14, ang, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coral tip pad
  ctx.globalAlpha = alpha;
  ctx.fillStyle = KRAKEN.bellyHi;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, Math.max(3.8, ten.baseW * 0.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(tip.x - 1.4, tip.y - 1.4, Math.max(1.4, ten.baseW * 0.1), 0, Math.PI * 2);
  ctx.fill();

  // Prey gem rides home
  if (
    gemAlong !== null &&
    !ten.ambient &&
    ten.preyColor &&
    !ten.preyColor.startsWith('rgba(0,0,0')
  ) {
    const along = 1 - gemAlong;
    const gpos = sample(along);
    const gs = ten.baseW * (1.05 - gemAlong * 0.48);
    ctx.globalAlpha = alpha * (1 - gemAlong * 0.42);
    ctx.fillStyle = ten.preyColor;
    ctx.shadowColor = ten.preyColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(gpos.x, gpos.y - gs);
    ctx.lineTo(gpos.x + gs * 0.72, gpos.y);
    ctx.lineTo(gpos.x, gpos.y + gs);
    ctx.lineTo(gpos.x - gs * 0.72, gpos.y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(gpos.x - gs * 0.18, gpos.y - gs * 0.22, gs * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Mine peak limb — thin luminous crystal blade that draws prey along its length. */
function drawCrystalRay(ctx: CanvasRenderingContext2D, ten: Tentacle, lifeT: number): void {
  const enter = lifeT < 0.12 ? easeOutCubic(lifeT / 0.12) : 1;
  const fade = lifeT > 0.82 ? Math.max(0, (1 - lifeT) / 0.18) : 1;
  const alpha = enter * fade;
  if (alpha <= 0.02) return;
  // Pull phase: tip moves toward origin
  const pull = lifeT > 0.45 ? Math.min(1, (lifeT - 0.45) / 0.4) : 0;
  const tx = ten.tx + (ten.ox - ten.tx) * pull * 0.85;
  const ty = ten.ty + (ten.oy - ten.ty) * pull * 0.85;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = ten.color;
  ctx.shadowColor = ten.color;
  ctx.shadowBlur = 16;
  ctx.lineWidth = ten.baseW * (1.1 - pull * 0.35);
  ctx.beginPath();
  ctx.moveTo(ten.ox, ten.oy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  // Hot core
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, ten.baseW * 0.35);
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(ten.ox, ten.oy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (!ten.ambient && ten.preyColor && !ten.preyColor.startsWith('rgba(0,0,0')) {
    const along = 1 - pull * 0.9;
    const gx = ten.ox + (tx - ten.ox) * along;
    const gy = ten.oy + (ty - ten.oy) * along;
    const gs = ten.baseW * 1.2;
    ctx.fillStyle = ten.preyColor;
    ctx.shadowColor = ten.preyColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gs);
    ctx.lineTo(gx + gs * 0.7, gy);
    ctx.lineTo(gx, gy + gs);
    ctx.lineTo(gx - gs * 0.7, gy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Mine peak body — faceted geode / living crystal core (not an octopus). */
function drawSupernovaBody(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  r: number,
  now: number,
  lifeT: number,
): void {
  const enter = lifeT < 0.08 ? easeOutCubic(lifeT / 0.08) : 1;
  const fade = lifeT > 0.88 ? Math.max(0, (1 - lifeT) / 0.12) : 1;
  const pulse = 1 + 0.08 * Math.sin(now * 0.02) + (lifeT > 0.5 ? 0.06 * Math.sin(lifeT * 20) : 0);
  const scale = enter * pulse;
  const alpha = fade * enter;
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.35);
  glow.addColorStop(0, 'rgba(255,255,255,0.95)');
  glow.addColorStop(0.35, 'rgba(255, 220, 120, 0.7)');
  glow.addColorStop(0.7, 'rgba(180, 120, 255, 0.35)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
  ctx.fill();

  // Faceted crystal body (hex-ish)
  const sides = 6;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    const rr = r * (i % 2 === 0 ? 1 : 0.82);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const body = ctx.createLinearGradient(-r, -r, r, r);
  body.addColorStop(0, '#fff6e8');
  body.addColorStop(0.35, '#e0a0ff');
  body.addColorStop(0.7, '#7ed0ff');
  body.addColorStop(1, '#5a3a90');
  ctx.fillStyle = body;
  ctx.shadowColor = 'rgba(255, 210, 100, 0.7)';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 230, 140, 0.95)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner core
  const core = ctx.createRadialGradient(-r * 0.15, -r * 0.2, 0, 0, 0, r * 0.45);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.5, '#ffe56a');
  core.addColorStop(1, 'rgba(200, 120, 255, 0.2)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Facet lines
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + now * 0.001;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Super Chest body — prefer octopus_chest sprite; cute procedural fallback.
 * lifeT: 0..1 feast progress for pop / chomp pulse. Harbor only.
 */
function drawKrakenBody(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  r: number,
  now: number,
  lifeT: number,
  img: HTMLImageElement | null,
): void {
  // Pop in, hold, gentle chomp on pull, fade
  const enter = lifeT < 0.08 ? easeOutCubic(lifeT / 0.08) : 1;
  const fade = lifeT > 0.88 ? Math.max(0, (1 - lifeT) / 0.12) : 1;
  const chomp =
    lifeT > 0.55 && lifeT < 0.85 ? 1 + 0.1 * Math.sin((lifeT - 0.55) * Math.PI * 6) : 1;
  const idle = 1 + 0.04 * Math.sin(now * 0.014);
  const scale = enter * chomp * idle;
  const alpha = fade * enter;
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  const imgReady = img && img.complete && img.naturalWidth > 0;
  if (imgReady) {
    const size = r * 2.35;
    ctx.shadowColor = 'rgba(80, 200, 210, 0.55)';
    ctx.shadowBlur = 18;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0;
    // Soft gold ring so the sprite pops on the board
    ctx.strokeStyle = 'rgba(255, 210, 100, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Cute procedural head (teal + blush) matching board art silhouette
    const br = r;
    const g = ctx.createRadialGradient(-br * 0.2, -br * 0.25, br * 0.08, 0, 0, br);
    g.addColorStop(0, KRAKEN.tealHi);
    g.addColorStop(0.5, KRAKEN.teal);
    g.addColorStop(1, KRAKEN.tealDeep);
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(80, 200, 210, 0.55)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // cheeks
    ctx.fillStyle = 'rgba(255, 140, 130, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-br * 0.38, br * 0.08, br * 0.14, br * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(br * 0.38, br * 0.08, br * 0.14, br * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // mouth chomp
    ctx.fillStyle = 'rgba(20, 10, 30, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, br * 0.18, br * 0.38, br * 0.22 * chomp, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.arc(-br * 0.26, -br * 0.18, br * 0.16, 0, Math.PI * 2);
    ctx.arc(br * 0.26, -br * 0.18, br * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2030';
    ctx.beginPath();
    ctx.arc(-br * 0.24, -br * 0.16, br * 0.08, 0, Math.PI * 2);
    ctx.arc(br * 0.28, -br * 0.16, br * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-br * 0.28, -br * 0.22, br * 0.04, 0, Math.PI * 2);
    ctx.arc(br * 0.24, -br * 0.22, br * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function shade(hex: string, f: number): string {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = Math.min(255, Math.round(parseInt(full.slice(1, 3), 16) * f));
  const g = Math.min(255, Math.round(parseInt(full.slice(3, 5), 16) * f));
  const b = Math.min(255, Math.round(parseInt(full.slice(5, 7), 16) * f));
  return `rgb(${r},${g},${b})`;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number): number {
  return t * t * t;
}
