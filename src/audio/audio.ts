/**
 * CRYSTALLINE — sound director driven by GameEvent stream.
 *
 * Hybrid: procedural Synth (musical pitch / chimes) + SampleBank
 * (glass break + whooshes from free libraries, trimmed).
 */

import type { GameEvent } from '@engine/events';
import { SampleBank } from './samples';
import { Synth } from './synth';

export class AudioDirector {
  private readonly synth = new Synth();
  private readonly samples = new SampleBank();
  sfx = true;
  /** Soft gem-land ticks (can get busy on big cascades). */
  private landClicks = true;
  private wired = false;

  private ensureGraph(): void {
    if (!this.sfx) return;
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

  resume(): void {
    if (this.sfx) this.ensureGraph();
  }

  setEnabled(on: boolean): void {
    this.sfx = on;
    this.synth.enabled = on;
    this.samples.enabled = on;
    if (!on) this.synth.stopPad();
  }

  titleSting(): void {
    if (!this.sfx) return;
    this.ensureGraph();
    this.samples.title();
    this.synth.titleSting();
    this.synth.startPad();
  }

  stopPad(): void {
    this.synth.stopPad();
  }

  handle(events: readonly GameEvent[]): void {
    if (!this.sfx) return;
    this.ensureGraph();

    // Coalesce land ticks so big falls don't become a snare roll.
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
          // Samples = body/impact; synth = musical cascade climb
          this.samples.matchHit(ev.cascadeStep, size);
          this.synth.clear(ev.cascadeStep, size);
          // Lighter synth shatter when real glass is present
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
          this.samples.specialWhoosh(ev.kind);
          this.synth.special(ev.kind);
          this.samples.play('glass', {
            gain: 0.2,
            rate: 0.95 + Math.random() * 0.1,
            pan: (Math.random() * 2 - 1) * 0.3,
          });
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
        case 'bombExploded':
          this.samples.specialWhoosh('burst');
          this.synth.special('burst');
          break;
        case 'relicCollected':
          this.samples.play('whooshMotion', { gain: 0.18, rate: 1.08 });
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
        case 'levelEnded':
          if (ev.status === 'won') {
            this.samples.play('whooshCinematic', { gain: 0.22, rate: 1 });
            this.synth.win();
          } else {
            this.synth.fail();
          }
          break;
        case 'reshuffle':
          this.samples.specialWhoosh('generic');
          this.synth.special('generic');
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
