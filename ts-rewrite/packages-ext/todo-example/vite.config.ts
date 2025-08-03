/**
 * TypeScript Vite config for todo-example
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'recoil': new URL('../../packages/recoil/src', import.meta.url).pathname,
      'recoil-shared': new URL('../../packages/shared/src', import.meta.url).pathname,
    },
  },
});