// TypeScript port of Logger.js

// __DEV__ with fallback for environments where it's not available
const _DEV_MODE: boolean = (globalThis as any).__DEV__ ?? false;

function debug(...args: readonly any[]) {
  if (_DEV_MODE) {
    console.log(...args);
  }
}

function warn(...args: readonly any[]) {
  if (typeof console !== 'undefined') {
    console.warn(...args);
  }
}

export {debug, warn};
