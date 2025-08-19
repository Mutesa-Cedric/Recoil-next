/**
 * TypeScript port of vitest setup for recoil-devtools
 */

import '@testing-library/jest-dom';
import {vi} from 'vitest';

// Define global __DEV__ for tests
(globalThis as any).__DEV__ = true;

// Setup basic Chrome API mock for all tests
const mockChrome = {
  runtime: {
    onConnect: {
      addListener: vi.fn(),
    },
    connect: vi.fn(),
  },
  extension: {
    getURL: vi.fn(() => ''),
  },
} as any;

// Make chrome available both as global and globalThis property
(global as any).chrome = mockChrome;
(globalThis as any).chrome = mockChrome;
