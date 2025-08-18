import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, vi } from 'vitest';

// Declare __DEV__ globally for TypeScript
declare global {
  var __DEV__: boolean;
}

// Define __DEV__ immediately
globalThis.__DEV__ = process.env.NODE_ENV !== 'production';

// Set up DOM environment
beforeAll(() => {
  // Mock global objects that React might need
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
    }),
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn(cb => {
    setTimeout(cb, 0);
    return 1;
  });
  global.cancelAnimationFrame = vi.fn(() => { });

  // Set up text encoding globals
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;

  // React test environment with concurrent features disabled
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  // Disable React concurrent features that might cause snapshot issues
  if (typeof React !== 'undefined' && (React as any).unstable_act) {
    (globalThis as any).React = React;
  }

  // Define __DEV__ for React development checks
  global.__DEV__ = process.env.NODE_ENV !== 'production';
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
}); 