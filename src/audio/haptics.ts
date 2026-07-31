/**
 * CRYSTALLINE — mobile haptics (Vibration API).
 *
 * Syncs short pulses with juice beats so clears feel physical.
 * No-ops on desktop / denied permission / missing API.
 */

export type HapticKind =
  | 'tap'
  | 'reject'
  | 'clear'
  | 'clearBig'
  | 'cascade'
  | 'special'
  | 'forge'
  | 'win'
  | 'softFail';

const PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  tap: 8,
  reject: 12,
  clear: 14,
  clearBig: [18, 30, 22],
  cascade: [12, 40, 16, 40, 20],
  special: [20, 35, 28],
  forge: 30,
  win: [25, 50, 25, 50, 40],
  softFail: [15, 60, 20],
};

let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* ignore */
  }
}
