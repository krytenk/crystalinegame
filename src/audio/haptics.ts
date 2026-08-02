/**
 * CRYSTALLINE — mobile haptics.
 *
 * Uses Capacitor Haptics on native (Android APK) for reliable low-latency
 * feedback, and falls back to the Vibration API on mobile browsers
 * (GitHub Pages / Departure Bay Digital).
 *
 * Patterns are short and snappy so clears feel immediate on phone.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

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
  | 'softFail'
  | 'relic';

/** Vibration API patterns (ms). Kept short for snappy mobile feel. */
const PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  tap: 8,
  reject: 14,
  clear: 16,
  clear3: [12, 18, 16],
  clear4: [14, 20, 18, 24, 22],
  clear5: [16, 22, 18, 28, 22, 32],
  clear6: [18, 24, 20, 32, 24, 38, 28],
  clearBig: [18, 28, 22, 34],
  cascade: [10, 22, 12, 26, 14, 30],
  cascadeBig: [12, 26, 16, 32, 18, 38, 22],
  special: [16, 28, 22, 36],
  specialBig: [20, 32, 24, 42, 28, 48],
  explode: [24, 36, 28, 48, 32, 56, 36],
  forge: [14, 22, 28, 18],
  win: [16, 30, 16, 30, 22, 36],
  softFail: [12, 40, 18],
  relic: [10, 16, 22],
};

type NativeTier = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const NATIVE_TIER: Readonly<Record<HapticKind, NativeTier>> = {
  tap: 'light',
  reject: 'warning',
  clear: 'light',
  clear3: 'medium',
  clear4: 'medium',
  clear5: 'heavy',
  clear6: 'heavy',
  clearBig: 'heavy',
  cascade: 'medium',
  cascadeBig: 'heavy',
  special: 'heavy',
  specialBig: 'heavy',
  explode: 'heavy',
  forge: 'medium',
  win: 'success',
  softFail: 'error',
  relic: 'success',
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
let unlocked = false;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

/**
 * Call once from the first user gesture so mobile browsers allow vibration
 * and Capacitor is primed. Safe to call many times.
 */
export function unlockHaptics(): void {
  if (unlocked) return;
  unlocked = true;
  // Prime Vibration API on WebView / Safari after gesture
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(1);
    }
  } catch {
    /* ignore */
  }
}

async function nativeImpact(tier: NativeTier): Promise<void> {
  try {
    if (tier === 'success' || tier === 'warning' || tier === 'error') {
      const type =
        tier === 'success'
          ? NotificationType.Success
          : tier === 'warning'
            ? NotificationType.Warning
            : NotificationType.Error;
      await Haptics.notification({ type });
      return;
    }
    const style =
      tier === 'heavy'
        ? ImpactStyle.Heavy
        : tier === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* plugin unavailable — fall through to vibrate */
  }
}

function webVibrate(kind: HapticKind): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* ignore */
  }
}

/**
 * Fire haptic feedback immediately. Prefer native Capacitor on APK;
 * also fire Vibration API so GitHub/demo pages feel the same on phones.
 */
export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  const isNative = (() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  })();

  // Always try web vibrate — works on Chrome Android for Pages/demo, and
  // stacks harmlessly under native when both exist.
  webVibrate(kind);

  if (isNative) {
    // Non-blocking: do not await so juice stays in sync with frame.
    void nativeImpact(NATIVE_TIER[kind]);
    // Heavy moments get a second kick for "more responsive" feel
    if (kind === 'explode' || kind === 'clear6' || kind === 'cascadeBig') {
      window.setTimeout(() => {
        void nativeImpact('heavy');
      }, 40);
    }
  }
}
