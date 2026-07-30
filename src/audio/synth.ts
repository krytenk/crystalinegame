/**
 * CRYSTALLINE — procedural WebAudio voices (no external files).
 *
 * Sound design goal: glass / crystal / cave — not generic 8-bit bleeps.
 * Each hit is layered (body + harmonics + noise sparkle) with short tails
 * and light stereo so cascades feel physical rather than monophonic.
 */

type OscType = OscillatorType;

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  enabled = true;

  private padOsc: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private padLfo: OscillatorNode | null = null;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (
      typeof AudioContext === 'undefined' &&
      typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ===
        'undefined'
    ) {
      return null;
    }
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();

      // master → compressor → destination (keeps layered hits from clipping)
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;

      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 12;
      this.comp.ratio.value = 4;
      this.comp.attack.value = 0.003;
      this.comp.release.value = 0.12;

      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1;

      this.bus.connect(this.comp);
      this.comp.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  resume(): void {
    void this.ensure();
  }

  /** Shared graph for SampleBank (null until first resume/play). */
  getContext(): AudioContext | null {
    return this.ensure();
  }

  getBus(): GainNode | null {
    this.ensure();
    return this.bus ?? this.master;
  }

  private out(): GainNode | null {
    return this.bus ?? this.master;
  }

  // -----------------------------------------------------------------------
  // Building blocks
  // -----------------------------------------------------------------------

  private tone(
    freq: number,
    opts: {
      type?: OscType;
      start?: number;
      dur?: number;
      attack?: number;
      peak?: number;
      release?: number;
      detune?: number;
      pan?: number;
      filterFreq?: number;
      filterType?: BiquadFilterType;
      filterQ?: number;
    } = {},
  ): void {
    const ctx = this.ensure();
    const dest = this.out();
    if (!ctx || !dest) return;

    const t0 = opts.start ?? ctx.currentTime;
    const dur = opts.dur ?? 0.25;
    const attack = opts.attack ?? 0.008;
    const peak = opts.peak ?? 0.2;
    const release = opts.release ?? Math.max(0.04, dur - attack);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);

    let node: AudioNode = osc;
    if (opts.filterFreq) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filterType ?? 'lowpass';
      f.frequency.setValueAtTime(opts.filterFreq, t0);
      f.Q.value = opts.filterQ ?? 0.7;
      osc.connect(f);
      node = f;
    }

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan ?? 0)), t0);
    node.connect(g);
    g.connect(panner);
    panner.connect(dest);

    osc.start(t0);
    osc.stop(t0 + attack + release + 0.02);
  }

  /** Filtered noise burst — glass grit / crystal shatter dust. */
  private noise(opts: {
    start?: number;
    dur?: number;
    peak?: number;
    highpass?: number;
    lowpass?: number;
    pan?: number;
  } = {}): void {
    const ctx = this.ensure();
    const dest = this.out();
    if (!ctx || !dest) return;

    const t0 = opts.start ?? ctx.currentTime;
    const dur = opts.dur ?? 0.1;
    const peak = opts.peak ?? 0.12;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      // Light pink-ish noise (smoother than pure white — less harsh).
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = (white * 0.55 + last * 0.45) * (1 - i / n);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = opts.highpass ?? 1800;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.lowpass ?? 9000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan ?? 0)), t0);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(panner);
    panner.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** Very short stereo slap that reads as cave space without a full convolver. */
  private space(freq: number, start: number, peak = 0.06): void {
    this.tone(freq * 0.5, {
      type: 'sine',
      start: start + 0.03,
      dur: 0.28,
      attack: 0.01,
      peak: peak * 0.55,
      release: 0.24,
      pan: -0.35,
      filterFreq: 2400,
    });
    this.tone(freq * 0.75, {
      type: 'triangle',
      start: start + 0.05,
      dur: 0.22,
      attack: 0.01,
      peak: peak * 0.4,
      release: 0.18,
      pan: 0.4,
      filterFreq: 3200,
    });
  }

  // -----------------------------------------------------------------------
  // Game voices
  // -----------------------------------------------------------------------

  /**
   * Match clear — glass chime that climbs with cascadeStep.
   * Larger clusters = richer harmonic stack + brighter sparkle.
   */
  clear(cascadeStep = 0, size = 3): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const step = Math.min(14, Math.max(0, cascadeStep));
    const n = Math.max(3, Math.min(8, size));

    // Pentatonic-ish climb feels “rewarding” without clashing.
    const base = 392 * Math.pow(2, step / 12); // G4 ladder
    const intervals = [0, 4, 7, 12, 16];
    const voices = Math.min(3 + Math.floor((n - 3) / 2), intervals.length);
    const panSpread = 0.55;

    for (let i = 0; i < voices; i++) {
      const f = base * Math.pow(2, (intervals[i] ?? 0) / 12);
      const pan = -panSpread + (panSpread * 2 * i) / Math.max(1, voices - 1);
      this.tone(f, {
        type: i === 0 ? 'triangle' : 'sine',
        start: t + i * 0.012,
        dur: 0.22 + i * 0.04,
        attack: 0.006,
        peak: 0.22 - i * 0.03,
        release: 0.2 + i * 0.05,
        detune: (i - 1) * 6,
        pan,
        filterFreq: 4200 + step * 180,
      });
      // Crystal overtone (almost-octave + small offset) — glass ring.
      this.tone(f * 2.01, {
        type: 'sine',
        start: t + 0.008 + i * 0.01,
        dur: 0.14,
        attack: 0.004,
        peak: 0.08,
        release: 0.12,
        pan: pan * 0.7,
        filterFreq: 7000,
      });
    }

    this.noise({
      start: t,
      dur: 0.06 + n * 0.008,
      peak: 0.07 + n * 0.01,
      highpass: 2500,
      lowpass: 11000,
      pan: (Math.random() * 2 - 1) * 0.4,
    });
    this.space(base, t, 0.05 + step * 0.004);
  }

  /** Crust / crystal break — mid noise + metallic tick. */
  shatter(intensity = 1): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const k = Math.max(0.4, Math.min(1.6, intensity));

    this.noise({
      start: t,
      dur: 0.09 * k,
      peak: 0.16 * k,
      highpass: 900,
      lowpass: 6500,
      pan: (Math.random() * 2 - 1) * 0.5,
    });
    this.noise({
      start: t + 0.01,
      dur: 0.05,
      peak: 0.1 * k,
      highpass: 3500,
      lowpass: 12000,
      pan: (Math.random() * 2 - 1) * 0.6,
    });
    // Metallic ping
    this.tone(1480 + Math.random() * 400, {
      type: 'triangle',
      start: t,
      dur: 0.08,
      attack: 0.001,
      peak: 0.1 * k,
      release: 0.07,
      filterFreq: 5000,
    });
  }

  /**
   * Power crystal / special — rising crystal fanfare.
   * kind biases colour: line = slice, burst = boom, prism = rainbow, etc.
   */
  special(kind: 'generic' | 'line' | 'burst' | 'prism' | 'supernova' | 'core' = 'generic'): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;

    if (kind === 'line') {
      // Fast rising sweep (blade of light)
      this.tone(180, {
        type: 'sawtooth',
        start: t,
        dur: 0.22,
        attack: 0.01,
        peak: 0.12,
        release: 0.18,
        filterFreq: 1800,
        filterType: 'lowpass',
      });
      // Manual pitch glide via stepped tones
      for (let i = 0; i < 6; i++) {
        this.tone(220 * Math.pow(2, i / 6), {
          type: 'square',
          start: t + i * 0.025,
          dur: 0.06,
          attack: 0.004,
          peak: 0.07,
          release: 0.05,
          filterFreq: 2400,
          pan: -0.6 + i * 0.2,
        });
      }
      this.noise({ start: t, dur: 0.12, peak: 0.1, highpass: 1200, lowpass: 8000 });
      return;
    }

    if (kind === 'burst') {
      // Low thump + bright explosion dust
      this.tone(70, {
        type: 'sine',
        start: t,
        dur: 0.28,
        attack: 0.004,
        peak: 0.32,
        release: 0.24,
      });
      this.tone(140, {
        type: 'triangle',
        start: t,
        dur: 0.18,
        attack: 0.005,
        peak: 0.18,
        release: 0.15,
      });
      this.noise({ start: t, dur: 0.18, peak: 0.2, highpass: 400, lowpass: 5000 });
      this.noise({ start: t + 0.02, dur: 0.1, peak: 0.12, highpass: 3000, lowpass: 12000 });
      return;
    }

    if (kind === 'prism') {
      // Rainbow arpeggio — major chord rolled
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        this.tone(f, {
          type: 'sine',
          start: t + i * 0.05,
          dur: 0.32,
          attack: 0.01,
          peak: 0.16,
          release: 0.28,
          pan: -0.5 + i * 0.3,
        });
        this.tone(f * 2.005, {
          type: 'triangle',
          start: t + i * 0.05 + 0.01,
          dur: 0.2,
          attack: 0.008,
          peak: 0.06,
          release: 0.16,
          pan: 0.5 - i * 0.3,
        });
      });
      return;
    }

    if (kind === 'supernova' || kind === 'core') {
      // Big whoosh in + harmonic bloom
      this.noise({ start: t, dur: 0.22, peak: 0.18, highpass: 200, lowpass: 3000 });
      this.tone(55, {
        type: 'sine',
        start: t,
        dur: 0.5,
        attack: 0.02,
        peak: 0.28,
        release: 0.45,
      });
      const bloom = [220, 277.18, 329.63, 440, 554.37, 659.25];
      bloom.forEach((f, i) => {
        this.tone(f, {
          type: i % 2 ? 'triangle' : 'sine',
          start: t + 0.04 + i * 0.035,
          dur: 0.45,
          attack: 0.02,
          peak: 0.14,
          release: 0.4,
          pan: Math.sin(i * 1.2) * 0.7,
          filterFreq: 5000,
        });
      });
      this.noise({ start: t + 0.08, dur: 0.25, peak: 0.14, highpass: 4000, lowpass: 14000 });
      return;
    }

    // Generic special / spawn
    this.tone(220, {
      type: 'sawtooth',
      start: t,
      dur: 0.28,
      attack: 0.01,
      peak: 0.14,
      release: 0.24,
      filterFreq: 1600,
      filterType: 'lowpass',
      filterQ: 2,
    });
    for (let i = 0; i < 4; i++) {
      const f = 330 * Math.pow(2, i / 5);
      this.tone(f, {
        type: 'triangle',
        start: t + i * 0.04,
        dur: 0.2,
        attack: 0.008,
        peak: 0.12,
        release: 0.16,
        pan: -0.4 + i * 0.25,
      });
    }
    this.noise({ start: t + 0.02, dur: 0.1, peak: 0.08, highpass: 2000 });
  }

  fail(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Descending minor feel + soft rumble
    const notes = [392, 349.23, 293.66, 246.94];
    notes.forEach((f, i) => {
      this.tone(f, {
        type: 'triangle',
        start: t + i * 0.09,
        dur: 0.35,
        attack: 0.02,
        peak: 0.16,
        release: 0.3,
        pan: -0.2 + i * 0.1,
        filterFreq: 1800,
      });
    });
    this.tone(80, {
      type: 'sine',
      start: t,
      dur: 0.55,
      attack: 0.04,
      peak: 0.18,
      release: 0.5,
    });
  }

  win(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Bright major flourish with sparkle trail
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      this.tone(f, {
        type: 'triangle',
        start: t + i * 0.08,
        dur: 0.4,
        attack: 0.012,
        peak: 0.2,
        release: 0.35,
        pan: -0.5 + i * 0.22,
      });
      this.tone(f * 2.01, {
        type: 'sine',
        start: t + i * 0.08 + 0.015,
        dur: 0.28,
        attack: 0.01,
        peak: 0.07,
        release: 0.24,
        pan: 0.5 - i * 0.22,
      });
    });
    this.noise({ start: t + 0.2, dur: 0.2, peak: 0.08, highpass: 5000, lowpass: 14000 });
    this.space(523.25, t + 0.1, 0.08);
  }

  swap(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Soft glass tick — two tiny pings
    this.tone(880, {
      type: 'sine',
      start: t,
      dur: 0.05,
      attack: 0.002,
      peak: 0.1,
      release: 0.04,
      pan: -0.25,
    });
    this.tone(1320, {
      type: 'triangle',
      start: t + 0.018,
      dur: 0.06,
      attack: 0.002,
      peak: 0.07,
      release: 0.05,
      pan: 0.3,
      filterFreq: 5000,
    });
  }

  reject(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(140, {
      type: 'square',
      start: t,
      dur: 0.09,
      attack: 0.003,
      peak: 0.08,
      release: 0.07,
      filterFreq: 500,
      filterType: 'lowpass',
    });
    this.tone(90, {
      type: 'sine',
      start: t + 0.02,
      dur: 0.1,
      attack: 0.004,
      peak: 0.1,
      release: 0.08,
    });
  }

  /** Soft land / fall click when gems settle (optional polish). */
  land(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(520 + Math.random() * 80, {
      type: 'sine',
      start: t,
      dur: 0.04,
      attack: 0.002,
      peak: 0.04,
      release: 0.03,
      pan: (Math.random() * 2 - 1) * 0.4,
    });
  }

  titleSting(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Open fifths + glass overtones — cave cathedral
    const notes = [196, 246.94, 293.66, 392, 493.88, 587.33];
    notes.forEach((f, i) => {
      this.tone(f, {
        type: i < 2 ? 'sine' : 'triangle',
        start: t + i * 0.07,
        dur: 0.7,
        attack: 0.03,
        peak: 0.18 - i * 0.015,
        release: 0.6,
        pan: Math.sin(i * 0.9) * 0.45,
        filterFreq: 3500,
      });
      this.tone(f * 2.02, {
        type: 'sine',
        start: t + i * 0.07 + 0.02,
        dur: 0.4,
        attack: 0.02,
        peak: 0.05,
        release: 0.35,
      });
    });
    this.noise({ start: t + 0.15, dur: 0.25, peak: 0.06, highpass: 4000 });
  }

  startPad(): void {
    const ctx = this.ensure();
    const dest = this.out();
    if (!ctx || !dest || this.padGain) return;

    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.028;
    this.padGain.connect(dest);

    // Slow amplitude shimmer
    this.padLfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    this.padLfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.01;
    this.padLfo.connect(lfoGain);
    lfoGain.connect(this.padGain.gain);
    this.padLfo.start();

    // Dark open chord with slight detune (chorus-like thickness)
    const roots = [
      { f: 98, d: -4 },
      { f: 146.83, d: 3 },
      { f: 196, d: -2 },
      { f: 246.94, d: 5 },
    ];
    for (const { f, d } of roots) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = d;
      osc.connect(filter);
      filter.connect(this.padGain);
      osc.start();
      this.padOsc.push(osc);
    }
  }

  stopPad(): void {
    for (const o of this.padOsc) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    this.padOsc = [];
    if (this.padLfo) {
      try {
        this.padLfo.stop();
      } catch {
        /* */
      }
      this.padLfo = null;
    }
    if (this.padGain) {
      try {
        this.padGain.disconnect();
      } catch {
        /* */
      }
    }
    this.padGain = null;
  }
}
