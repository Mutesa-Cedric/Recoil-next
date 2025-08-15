import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'Recoil-old/**',
      '**/node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/',
        "Recoil-old"
      ],
    },
  },
  resolve: {
    alias: {
      'recoil-shared': new URL('./packages/shared/src', import.meta.url).pathname,
      'recoil': new URL('./packages/recoil/src', import.meta.url).pathname,
      'react': new URL('./node_modules/react', import.meta.url).pathname,
      'react-dom': new URL('./node_modules/react-dom', import.meta.url).pathname,
    },
  },
}); 