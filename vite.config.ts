import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@engine': r('./src/engine'),
      '@economy': r('./src/economy'),
      '@render': r('./src/render'),
      '@audio': r('./src/audio'),
      '@ui': r('./src/ui'),
      '@themes': r('./src/themes'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    // Avoid ENOSPC when the OS inotify watcher limit is exhausted
    watch: { usePolling: true, interval: 1000 },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: r('./index.html'),
        harbor: r('./harbor.html'),
      },
    },
  },
});
