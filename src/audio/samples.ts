/**
 * CRYSTALLINE — one-shot sample bank (trimmed free SFX).
 *
 * Sources (see public/sfx/README.md):
 *  - Freesound community glass break (trimmed)
 *  - Dragon Studio whooshes (trimmed)
 *
 * Falls back silently if decode fails — Synth still carries the bed.
 */

export type SfxId =
  | 'glass'
  | 'glassTick'
  | 'whooshSoft'
  | 'whooshSlice'
  | 'whooshMotion'
  | 'whooshHeavy'
  | 'whooshCinematic'
  | 'whooshTitle';

const MANIFEST: Readonly<Record<SfxId, string>> = {
  glass: './sfx/glass.ogg',
  glassTick: './sfx/glass-tick.ogg',
  whooshSoft: './sfx/whoosh-soft.ogg',
  whooshSlice: './sfx/whoosh-slice.ogg',
  whooshMotion: './sfx/whoosh-motion.ogg',
  whooshHeavy: './sfx/whoosh-heavy.ogg',
  whooshCinematic: './sfx/whoosh-cinematic.ogg',
  whooshTitle: './sfx/whoosh-title.ogg',
};

export interface PlayOpts {
  /** Linear gain 0..1 (default 0.35). */
  gain?: number;
  /** Playback rate (default 1). Randomize slightly for variety. */
  rate?: number;
  /** Stereo pan -1..1. */
  pan?: number;
  /** Delay before start (seconds). */
  when?: number;
}

export class SampleBank {
  private ctx: AudioContext | null = null;
  private dest: AudioNode | null = null;
  private readonly buffers = new Map<SfxId, AudioBuffer>();
  private loadPromise: Promise<void> | null = null;
  private active = 0;
  private readonly maxVoices = 8;
  enabled = true;

  /** Attach to the shared WebAudio graph (call once after Synth.ensure). */
  attach(ctx: AudioContext, dest: AudioNode): void {
    this.ctx = ctx;
    this.dest = dest;
  }

  /** Prefetch all clips. Safe to call repeatedly. */
  preload(): Promise<void> {
    if (!this.ctx) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    const ctx = this.ctx;
    this.loadPromise = (async () => {
      await Promise.all(
        (Object.keys(MANIFEST) as SfxId[]).map(async (id) => {
          if (this.buffers.has(id)) return;
          try {
            const url = MANIFEST[id];
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.arrayBuffer();
            const buf = await ctx.decodeAudioData(raw.slice(0));
            this.buffers.set(id, buf);
          } catch (err) {
            console.warn(`[sfx] failed to load ${id}`, err);
          }
        }),
      );
    })();
    return this.loadPromise;
  }

  ready(id: SfxId): boolean {
    return this.buffers.has(id);
  }

  play(id: SfxId, opts: PlayOpts = {}): void {
    if (!this.enabled || !this.ctx || !this.dest) return;
    const buf = this.buffers.get(id);
    if (!buf) {
      // Kick a load if first play raced preload
      void this.preload();
      return;
    }
    if (this.active >= this.maxVoices) return;

    const t0 = this.ctx.currentTime + (opts.when ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const rate = opts.rate ?? 1;
    src.playbackRate.setValueAtTime(Math.max(0.5, Math.min(2, rate)), t0);

    const g = this.ctx.createGain();
    const peak = Math.max(0.0001, Math.min(1, opts.gain ?? 0.35));
    g.gain.setValueAtTime(peak, t0);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan ?? 0)), t0);

    src.connect(g);
    g.connect(panner);
    panner.connect(this.dest);

    this.active += 1;
    src.onended = () => {
      this.active = Math.max(0, this.active - 1);
      try {
        src.disconnect();
        g.disconnect();
        panner.disconnect();
      } catch {
        /* */
      }
    };
    try {
      src.start(t0);
    } catch {
      this.active = Math.max(0, this.active - 1);
    }
  }

  /** Convenience: glass + soft whoosh for a match hit. */
  matchHit(cascadeStep: number, size: number): void {
    const step = Math.max(0, Math.min(10, cascadeStep));
    const n = Math.max(3, Math.min(8, size));
    const pan = (Math.random() * 2 - 1) * 0.45;
    const rateJitter = () => 0.94 + Math.random() * 0.12;

    this.play('glass', {
      gain: 0.18 + n * 0.02,
      rate: rateJitter() * (1 + step * 0.015),
      pan,
    });
    this.play('whooshSoft', {
      gain: 0.14 + Math.min(0.12, step * 0.015),
      rate: rateJitter(),
      pan: pan * -0.6,
      when: 0.01,
    });
    if (n >= 4) {
      this.play('whooshMotion', {
        gain: 0.1,
        rate: rateJitter(),
        pan: pan * 0.5,
        when: 0.02,
      });
    }
  }

  specialWhoosh(kind: 'line' | 'burst' | 'prism' | 'supernova' | 'core' | 'generic'): void {
    const pan = (Math.random() * 2 - 1) * 0.4;
    const rate = 0.92 + Math.random() * 0.14;
    switch (kind) {
      case 'line':
        this.play('whooshSlice', { gain: 0.32, rate, pan });
        this.play('glassTick', { gain: 0.12, rate: rate * 1.05, pan: -pan, when: 0.02 });
        break;
      case 'burst':
        this.play('whooshHeavy', { gain: 0.34, rate: rate * 0.95, pan });
        this.play('glass', { gain: 0.22, rate, pan: -pan * 0.5, when: 0.03 });
        break;
      case 'prism':
        this.play('whooshMotion', { gain: 0.28, rate: rate * 1.05, pan });
        this.play('glassTick', { gain: 0.14, rate: rate * 1.1, pan: -pan });
        break;
      case 'supernova':
      case 'core':
        this.play('whooshCinematic', { gain: 0.36, rate: rate * 0.92, pan: 0 });
        this.play('glass', { gain: 0.26, rate, pan: 0.2, when: 0.04 });
        this.play('whooshHeavy', { gain: 0.18, rate: rate * 0.9, pan: -0.2, when: 0.08 });
        break;
      default:
        this.play('whooshSoft', { gain: 0.24, rate, pan });
        this.play('glassTick', { gain: 0.12, rate, pan: -pan });
    }
  }

  crust(): void {
    this.play('glassTick', {
      gain: 0.2,
      rate: 0.9 + Math.random() * 0.2,
      pan: (Math.random() * 2 - 1) * 0.5,
    });
  }

  title(): void {
    this.play('whooshTitle', { gain: 0.28, rate: 1, pan: 0 });
    this.play('whooshMotion', { gain: 0.16, rate: 0.95, pan: 0.25, when: 0.12 });
  }
}
