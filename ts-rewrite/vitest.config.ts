import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/',
      ],
    },
  },
  resolve: {
    alias: {
      'recoil-shared': new URL('./packages/shared/src', import.meta.url).pathname,
      'recoil': new URL('./packages/recoil/src', import.meta.url).pathname,
    },
  },
}); 