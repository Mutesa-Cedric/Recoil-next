/**
 * TypeScript Vite config for todo-example
 */

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react()],
});
