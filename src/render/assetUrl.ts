/**
 * Resolve a site-relative asset path for subfolder deploys.
 *
 * Manifest paths look like `gen/crystals@2x.webp`. Prefixing `/` breaks when the
 * app lives at `/demos/crystalline/` (it would fetch `/gen/...` from the domain
 * root and miss the atlas — gems fall back to placeholders).
 *
 * Uses Vite's `BASE_URL` when available so `base: './'` and absolute bases both work.
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
  // Already absolute from site root — leave as-is (caller intent).
  if (src.startsWith('/')) return src;

  const base =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
      ? String(import.meta.env.BASE_URL)
      : './';

  // base is often `./` or `/demos/crystalline/`
  if (base === './' || base === '.' || base === '') {
    return `./${src.replace(/^\.\//, '')}`;
  }
  const b = base.endsWith('/') ? base : `${base}/`;
  return `${b}${src.replace(/^\.\//, '')}`;
}
