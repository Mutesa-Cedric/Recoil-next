import {beforeAll, afterEach, vi} from 'vitest';
import {cleanup} from '@testing-library/react';

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
  global.IS_REACT_ACT_ENVIRONMENT = true;

  // Jest globals for compatibility with libraries that expect them
  global.jest = {
    fn: vi.fn,
    spyOn: vi.spyOn,
    clearAllMocks: vi.clearAllMocks,
    resetAllMocks: vi.resetAllMocks,
    restoreAllMocks: vi.restoreAllMocks,
  };
});

// Clean up DOM after each test
afterEach(() => {
  // Clean up React Testing Library
  cleanup();
  document.body.innerHTML = '';
  // Clear all timers to prevent test interference
  vi.clearAllTimers();
  // Reset to real timers to avoid timer pollution
  vi.useRealTimers();
  // Clear all mocks to prevent spy pollution
  vi.clearAllMocks();
});
