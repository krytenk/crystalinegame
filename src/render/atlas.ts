/**
 * CRYSTALLINE — sprite atlas loader with placeholder fallback.
 */

import type { CrystalColor } from '@engine/types';
import { assetUrl } from './assetUrl';
import {
  MANIFEST_URL,
  MANIFEST_VERSION,
  type AssetManifest,
  type AtlasFrame,
  type AtlasPage,
  type FrameKey,
  type VfxClip,
} from './manifest';
import { DEFAULT_PALETTE, PlaceholderAtlas } from './placeholder';

export class Atlas {
  private manifest: AssetManifest | null = null;
  private pages = new Map<number, { img: HTMLImageElement; page: AtlasPage }>();
  private readonly placeholder = new PlaceholderAtlas(128);
  private ready = false;

  get isReady(): boolean {
    return this.ready;
  }

  get usingPlaceholder(): boolean {
    return this.manifest === null;
  }

  /** Match-reward VFX clips from the manifest (may be empty). */
  get vfx(): readonly VfxClip[] {
    return this.manifest?.vfx ?? [];
  }

  palette(): Readonly<Record<CrystalColor, string>> {
    return this.manifest?.palette ?? DEFAULT_PALETTE;
  }

  async load(url: string = MANIFEST_URL): Promise<void> {
    try {
      const res = await fetch(assetUrl(url));
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      const data = (await res.json()) as AssetManifest;
      if (data.version !== MANIFEST_VERSION) throw new Error('manifest version mismatch');
      this.manifest = data;
      this.placeholder.setPalette(data.palette);
      await Promise.all(
        data.pages.map(async (page) => {
          const img = await loadImage(page.src);
          this.pages.set(page.scale, { img, page });
        }),
      );
    } catch {
      // Subfolder path bugs or missing art → procedural placeholders.
      this.manifest = null;
      this.pages.clear();
    }
    this.ready = true;
  }

  /** Draw frame key centred at (cx,cy) with logical size. */
  draw(
    ctx: CanvasRenderingContext2D,
    key: FrameKey,
    cx: number,
    cy: number,
    size: number,
    dprBucket: 1 | 2 | 4 = 2,
  ): void {
    const baked = this.pages.get(dprBucket) ?? this.pages.get(2) ?? this.pages.values().next().value;
    if (baked) {
      const frame: AtlasFrame | undefined = baked.page.frames[key];
      if (frame) {
        const [ax, ay] = frame.anchor;
        const dx = cx - size * ax;
        const dy = cy - size * ay;
        ctx.drawImage(
          baked.img,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          dx,
          dy,
          size,
          size,
        );
        return;
      }
    }
    this.placeholder.draw(ctx, key, cx, cy, size);
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image ${src}`));
    // Never force site-root `/…` — breaks deploys under /demos/crystalline/
    img.src = assetUrl(src);
  });
