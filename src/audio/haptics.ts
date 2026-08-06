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

/**
 * Vibration API patterns (ms). Tuned for modern Android phones:
 * slightly longer than desktop-only demos so low-power motors still register.
 */
const PATTERNS: Readonly<Record<HapticKind, number | number[]>> = {
  tap: 12,
  reject: [18, 30, 22],
  clear: 20,
  clear3: [16, 22, 20],
  clear4: [16, 24, 20, 28, 24],
  clear5: [18, 26, 22, 32, 26, 36],
  clear6: [20, 28, 24, 36, 28, 42, 32],
  clearBig: [22, 32, 26, 40],
  cascade: [12, 26, 14, 30, 16, 34],
  cascadeBig: [14, 30, 18, 36, 20, 42, 24],
  special: [18, 32, 24, 40],
  specialBig: [22, 36, 28, 46, 32, 52],
  explode: [28, 40, 32, 52, 36, 60, 40],
  forge: [16, 26, 32, 20],
  win: [18, 34, 18, 34, 26, 42],
  softFail: [14, 48, 22],
  relic: [12, 20, 26],
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
