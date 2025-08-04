/**
 * TypeScript vitest config for todo-example
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      'recoil': new URL('../../packages/recoil/src', import.meta.url).pathname,
      'recoil-shared': new URL('../../packages/shared/src', import.meta.url).pathname,
    },
  },
});