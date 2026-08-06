/**
 * Active theme singleton — set once at boot before Economy / UI mount.
 */

import type { ThemeConfig, ThemeId } from './types';
import { crystallineTheme } from './crystalline';
import { harborTheme } from './harbor';

const THEMES: Record<ThemeId, ThemeConfig> = {
  crystalline: crystallineTheme,
  harbor: harborTheme,
};

let active: ThemeConfig = crystallineTheme;

export function resolveThemeId(): ThemeId {
  try {
    const w = globalThis as { __THEME__?: string };
    if (w.__THEME__ === 'harbor') return 'harbor';
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search).get('game');
      if (q === 'harbor') return 'harbor';
      // harbor.html path
      if (/harbor\.html/i.test(location.pathname)) return 'harbor';
    }
  } catch {
    // SSR / tests
  }
  return 'crystalline';
}

export function setTheme(id: ThemeId): ThemeConfig {
  active = THEMES[id] ?? crystallineTheme;
  return active;
}

export function theme(): ThemeConfig {
  return active;
}

export function themedAsset(path: string): string {
  if (!path) return path;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('/')
  ) {
    return path;
  }
  const root = active.assetRoot;
  if (!root) return path.replace(/^\.\//, '');
  const clean = path.replace(/^\.\//, '');
  // Paths already under themes/… stay as-is
  if (clean.startsWith('themes/')) return clean;
  return `${root.replace(/\/?$/, '/')}${clean}`;
}

/**
 * UI chrome under public/ui or public/themes/<id>/ui.
 * Prefer themed file when assetRoot is set (Harbor).
 */
export function themeUi(path: string): string {
  const clean = path.replace(/^\.\//, '');
  // Already themed absolute-ish path
  if (clean.startsWith('themes/')) return clean;
  // Strip leading ui/ then re-prefix with themed ui/
  const rel = clean.startsWith('ui/') ? clean : `ui/${clean}`;
  return themedAsset(rel);
}

export { THEMES };
