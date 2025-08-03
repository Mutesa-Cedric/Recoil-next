/**
 * TypeScript port of vitest config for recoil-devtools
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      'recoil-shared': new URL('../../packages/shared/src', import.meta.url).pathname,
      'recoil': new URL('../../packages/recoil/src', import.meta.url).pathname,
    },
  },
});