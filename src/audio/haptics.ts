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
  | 'clear3'
  | 'clear4'
  | 'clear5'
  | 'clear6'
  | 'clearBig'
  | 'cascade'
  | 'cascadeBig'
  | 'special'
  | 'specialBig'
  | 'explode'
  | 'forge'
  | 'win'
  | 'softFail';

const PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  tap: 10,
  reject: 18,
  clear: 22,
  /** Match-3 — short double beat */
  clear3: [22, 28, 26],
  /** Match-4 / forge tier — building rhythm */
  clear4: [28, 32, 30, 36, 40, 30],
  /** Match-5 prism tier — longer punchy cascade */
  clear5: [32, 36, 34, 42, 38, 48, 40],
  /** 6+ / supernova clear — heavy multi-hit */
  clear6: [40, 45, 42, 55, 48, 60, 50, 65],
  clearBig: [35, 45, 40, 55, 48],
  cascade: [18, 40, 24, 48, 28, 52, 32],
  cascadeBig: [28, 48, 32, 58, 36, 68, 42, 72, 50],
  special: [36, 48, 42, 60, 50],
  specialBig: [45, 55, 50, 70, 55, 80, 60],
  /** Power detonation — longest, hardest pattern */
  explode: [50, 60, 55, 80, 60, 95, 70, 100, 65],
  forge: [32, 40, 48, 36, 40],
  win: [35, 60, 35, 60, 50, 70, 55],
  softFail: [22, 80, 30],
};

/** Scale haptic intensity by cascade step (1-based). */
export function hapticCascade(step: number): void {
  if (step >= 4) haptic('cascadeBig');
  else if (step >= 2) haptic('cascade');
  else haptic('clear3');
}

/** Scale haptic by match tier (3–6). */
export function hapticMatchTier(tier: number): void {
  if (tier >= 6) haptic('clear6');
  else if (tier === 5) haptic('clear5');
  else if (tier === 4) haptic('clear4');
  else haptic('clear3');
}

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
