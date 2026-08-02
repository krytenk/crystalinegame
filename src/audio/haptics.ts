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
  tap: 8,
  reject: 14,
  clear: 18,
  /** Match-3 */
  clear3: [16, 22, 18],
  /** Match-4 / forge tier */
  clear4: [20, 28, 24, 28, 30],
  /** Match-5 prism tier */
  clear5: [24, 32, 28, 36, 32, 40],
  /** 6+ / supernova clear */
  clear6: [30, 40, 35, 45, 40, 50, 45],
  clearBig: [28, 40, 32, 48, 36],
  cascade: [14, 36, 18, 40, 22, 44, 26],
  cascadeBig: [20, 40, 24, 48, 28, 55, 32, 60, 40],
  special: [28, 40, 35, 50, 40],
  specialBig: [35, 50, 40, 60, 45, 70, 50],
  explode: [40, 55, 45, 70, 50, 80, 55],
  forge: [25, 35, 40, 30],
  win: [30, 55, 30, 55, 45, 60, 50],
  softFail: [18, 70, 24],
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
