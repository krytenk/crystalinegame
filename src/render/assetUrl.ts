/**
 * Resolve a site-relative asset path for subfolder deploys.
 *
 * Manifest paths look like `gen/crystals@2x.webp`. Absolute `/gen/...` breaks when
 * the app lives at `/demos/crystalline/` or `/crystalinegame/` (fetch would hit the
 * domain root and miss the atlas — gems fall back to placeholders).
 *
 * Order of resolution:
 * 1. Absolute / data / blob URLs — unchanged
 * 2. `document.baseURI` (HTML page location) — correct for GitHub project Pages
 *    and VPS subdirectory deploys when the page has a trailing slash
 * 3. Vite `import.meta.env.BASE_URL` fallback for tests / non-DOM
 */

export function assetUrl(src: string): string {
  if (!src) return src;
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  ) {
    return src;
  }

  // Leading slash = site-root absolute; strip so we stay under the app base.
  const clean = src.startsWith('/')
    ? src.replace(/^\/+/, '')
    : src.replace(/^\.\//, '');

  // Prefer the HTML document location (most reliable on GH project pages).
  if (typeof document !== 'undefined' && document.baseURI) {
    try {
      return new URL(clean, document.baseURI).href;
    } catch {
      /* fall through */
    }
  }

  const base =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
      ? String(import.meta.env.BASE_URL)
      : './';

  if (base === './' || base === '.' || base === '') {
    return `./${clean}`;
  }
  const b = base.endsWith('/') ? base : `${base}/`;
  return `${b}${clean}`;
}
