import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    exclude: [
      '**/architecture.test.ts',
      '**/shell-boundary.test.ts',
      '**/navigation-renderer.test.tsx',
      'e2e/**',
      'node_modules/**',
    ],
  },
});