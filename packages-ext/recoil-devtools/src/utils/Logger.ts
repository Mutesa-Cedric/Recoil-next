// TypeScript port of Logger.js

declare const __DEV__: boolean;

function debug(...args: readonly any[]) {
  if (__DEV__) {
    /* eslint-disable-next-line fb-www/no-console */
    console.log(...args);
  }
}

function warn(...args: readonly any[]) {
  if (typeof console !== 'undefined') {
    console.warn(...args);
  }
}

export {debug, warn};
