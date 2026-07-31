# Crystal Cavern art

Furnishing icons and stage vistas for the meta progression loop.

```
cavern/
  icons/s1_lamp.webp … s4_sky.webp   # 256² prop icons
  stages/stage1.webp … stage4.webp   # 960×540 chamber vistas
```

Mapped in `src/economy/meta.ts` via each upgrade’s `art` path and each stage’s `art` path.
Loaded with `assetUrl()` so subdirectory deploys work.
