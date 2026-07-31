/**
 * CRYSTALLINE — juice layer: particles, score pops, cascade banners, hit-stop.
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
}

export class JuiceSystem {
  private particles: Particle[] = [];
  private floats: JuiceFloat[] = [];
  private banner: { text: string; born: number; life: number; color: string } | null = null;
  hitStopUntil = 0;

  requestHitStop(ms: number, now = performance.now()): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, now + ms);
  }

  get frozen(): boolean {
    return performance.now() < this.hitStopUntil;
  }

  burst(x: number, y: number, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 1,
        maxLife: 0.35 + Math.random() * 0.45,
        size: 2 + Math.random() * 3.5,
        color,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
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
  }

  draw(ctx: CanvasRenderingContext2D, now: number, viewW: number): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.font = '800 26px "GalacticKnights", "CrystallineDisplay", "Cinzel", serif';
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
        ctx.font = '800 40px "GalacticKnights", "CrystallineDisplay", "Cinzel", serif';
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
