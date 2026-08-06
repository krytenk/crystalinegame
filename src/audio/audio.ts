/**
 * CRYSTALLINE — sound director driven by GameEvent stream.
 *
 * Hybrid: procedural Synth (musical pitch / chimes) + SampleBank
 * (glass, whooshes, chimes, thuds, theme ambient loops).
 */

import type { GameEvent } from '@engine/events';
import { SampleBank, type AmbientId } from './samples';
import { Synth } from './synth';

export class AudioDirector {
  private readonly synth = new Synth();
  private readonly samples = new SampleBank();
  sfx = true;
  /** Soft ambient bed (loop or legacy procedural). */
  music = true;
  /** Soft gem-land ticks (can get busy on big cascades). */
  private landClicks = true;
  private wired = false;
  private themeId: 'crystalline' | 'harbor' | string = 'crystalline';
  /** Prefer sample ambient beds; fall back to synth pad if decode fails. */
  private useSampleAmbient = true;

  private ensureGraph(): void {
    if (!this.sfx && !this.music) return;
    this.synth.resume();
    const ctx = this.synth.getContext();
    const bus = this.synth.getBus();
    if (!ctx || !bus) return;
    if (!this.wired) {
      this.samples.attach(ctx, bus);
      this.wired = true;
    }
    void this.samples.preload();
  }

  /** Call once at boot with active theme id. */
  setTheme(id: string): void {
    this.themeId = id;
    if (this.music) this.startAmbient();
  }

  resume(): void {
    if (this.sfx || this.music) this.ensureGraph();
    if (this.music) this.startAmbient();
  }

  setEnabled(on: boolean): void {
    this.sfx = on;
    this.synth.enabled = on;
    this.samples.enabled = on;
    if (!on) {
      this.synth.stopPad();
      this.samples.stopAmbient();
    } else {
      this.ensureGraph();
      if (this.music) this.startAmbient();
    }
  }

  /** Ambient pad / bed toggle (settings “Ambient pad”). */
  setMusic(on: boolean): void {
    this.music = on;
    if (!on) {
      this.synth.stopPad();
      this.samples.stopAmbient(0.6);
    } else {
      this.ensureGraph();
      this.startAmbient();
    }
  }

  private ambientId(): AmbientId {
    return this.themeId === 'harbor' ? 'ambientHarbor' : 'ambientMine';
  }

  startAmbient(): void {
    if (!this.music) return;
    this.ensureGraph();
    if (this.useSampleAmbient) {
      // Stop procedural if we were using it
      this.synth.stopPad();
      // Harbor drip bed peaks a bit hotter than mine cave droplets — keep menus calm
      this.samples.startAmbient(this.ambientId(), this.themeId === 'harbor' ? 0.07 : 0.085);
      // If bed never loads, soft fallback after preload
      void this.samples.preload().then(() => {
        if (!this.music) return;
        if (!this.samples.ready(this.ambientId())) {
          this.useSampleAmbient = false;
          this.synth.startPad();
        }
      });
    } else {
      this.synth.startPad();
    }
  }

  stopPad(): void {
    this.synth.stopPad();
    this.samples.stopAmbient(0.5);
  }

  titleSting(): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.samples.title();
    this.synth.titleSting();
    if (this.music) this.startAmbient();
  }

  uiTap(): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.samples.uiSfx();
    this.synth.uiTap();
  }

  starDing(index = 0): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.samples.starSfx(index);
    this.synth.starDing(index);
  }

  panelWhoosh(): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.synth.panelWhoosh();
    this.samples.play('whooshSoft', { gain: 0.1, rate: 1.1 });
  }

  /** Explicit life-spent / soft fail (quit, gate). */
  lifeSpent(): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.samples.lifeSpentSfx();
    this.synth.fail();
  }

  albumRare(): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.samples.albumRareSfx();
  }

  handle(events: readonly GameEvent[]): void {
    if (!this.sfx) return;
    this.ensureGraph();

    let lands = 0;

    for (const ev of events) {
      switch (ev.t) {
        case 'swap':
          this.synth.swap();
          break;
        case 'swapRejected':
          this.synth.reject();
          break;
        case 'match': {
          const size = ev.cells.length;
          this.samples.matchHit(ev.cascadeStep, size);
          this.synth.clear(ev.cascadeStep, size);
          this.synth.shatter(0.35 + Math.min(0.4, size / 12));
          if (ev.shape === 'five' || size >= 6) {
            this.samples.specialWhoosh('prism');
            this.synth.special('prism');
          } else if (ev.shape === 'four' || ev.shape === 'L' || ev.shape === 'T') {
            this.samples.specialWhoosh('generic');
            this.synth.special('generic');
          }
          break;
        }
        case 'spawnSpecial': {
          const kind = ev.piece.kind;
          if (
            kind === 'line' ||
            kind === 'burst' ||
            kind === 'prism' ||
            kind === 'supernova' ||
            kind === 'core'
          ) {
            this.samples.specialWhoosh(kind);
            this.synth.special(kind);
          } else {
            this.samples.specialWhoosh('generic');
            this.synth.special('generic');
          }
          break;
        }
        case 'specialTriggered':
          if (ev.kind === 'supernova' && this.themeId === 'harbor') {
            // Super Chest owns a longer layered sting (limbs need a score)
            this.samples.superChestSting();
            this.synth.superChest();
          } else {
            this.samples.specialWhoosh(ev.kind);
            this.synth.special(ev.kind);
            this.samples.play('glass', {
              gain: 0.2,
              rate: 0.95 + Math.random() * 0.1,
              pan: (Math.random() * 2 - 1) * 0.3,
            });
          }
          break;
        case 'coreSpawned':
          this.samples.specialWhoosh('core');
          this.synth.special('core');
          break;
        case 'coreClaimed':
          this.samples.specialWhoosh('prism');
          this.synth.special('prism');
          break;
        case 'crustDamaged':
          this.samples.crust();
          this.synth.shatter(0.4);
          break;
        case 'bombTick':
          this.samples.bombTickSfx(ev.fuse);
          break;
        case 'bombExploded':
          this.samples.play('thudHeavy', { gain: 0.34, rate: 0.9 });
          this.samples.specialWhoosh('burst');
          this.synth.special('burst');
          break;
        case 'bombDefused':
          this.samples.bombDefuseSfx();
          this.synth.clear(2, 3);
          break;
        case 'relicCollected':
          this.samples.relicSfx();
          this.synth.clear(2, 4);
          break;
        case 'fall':
          lands += ev.moves.length;
          break;
        case 'spawn':
          lands += Math.min(4, ev.spawns.length);
          break;
        case 'cascadeEnd':
          if (ev.steps >= 3) {
            this.samples.play('whooshMotion', { gain: 0.16, rate: 1.05 });
            this.synth.clear(ev.steps, 5);
          }
          break;
        case 'winFlourish':
          this.samples.winSfx();
          this.synth.clear(4, 6);
          this.synth.special('supernova');
          break;
        case 'levelEnded':
          if (ev.status === 'won') {
            this.samples.winSfx();
            this.synth.win();
          } else {
            this.samples.failSfx();
            this.synth.fail();
          }
          break;
        case 'reshuffle':
          this.samples.play('whooshMotion', { gain: 0.28, rate: 0.88 });
          this.samples.play('whooshHeavy', { gain: 0.22, rate: 0.95, when: 0.12 });
          this.samples.play('whooshCinematic', { gain: 0.18, rate: 1.05, when: 0.35 });
          this.synth.special('prism');
          break;
        default:
          break;
      }
    }

    if (this.landClicks && lands > 0) {
      const n = Math.min(4, Math.ceil(lands / 3));
      for (let i = 0; i < n; i++) {
        window.setTimeout(() => {
          if (this.sfx) this.synth.land();
        }, 40 + i * 35);
      }
    }
  }
}
