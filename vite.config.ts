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
    },
  },
  server: { port: 5173, strictPort: false },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as never);
