import {cleanup} from '@testing-library/react';
import {afterEach, beforeAll, vi} from 'vitest';

// Mock jest for relay-test-utils
(globalThis as any).jest = vi;

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
  global.cancelAnimationFrame = vi.fn(() => {});

  // Set up text encoding globals
  const {TextEncoder, TextDecoder} = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;

  // React test environment
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});
