import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@engine': r('./src/engine'),
      '@economy': r('./src/economy'),
      '@render': r('./src/render'),
      '@audio': r('./src/audio'),
      '@ui': r('./src/ui'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
