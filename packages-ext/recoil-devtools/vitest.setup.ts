/**
 * TypeScript port of vitest setup for recoil-devtools
 */

import '@testing-library/jest-dom';
import {vi} from 'vitest';

// Define global __DEV__ for tests
global.__DEV__ = true;

// Setup basic Chrome API mock for all tests
global.chrome = {
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