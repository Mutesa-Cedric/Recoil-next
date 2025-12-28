/**
 * TypeScript port of Recoil_Memoize.js
 */

'use strict';

export function memoizeWithArgsHash<
  TArgs extends ReadonlyArray<unknown>,
  TReturn,
>(
  fn: (...args: TArgs) => TReturn,
  hashFunction: (...args: TArgs) => string,
): (...args: TArgs) => TReturn {
  let cache: {[key: string]: TReturn} | undefined;

  return (...args: TArgs): TReturn => {
    if (!cache) {
      cache = {};
    }

    const key = hashFunction(...args);
    if (!Object.prototype.hasOwnProperty.call(cache, key)) {
      cache[key] = fn(...args);
    }
    return cache[key];
  };
}

export function memoizeOneWithArgsHash<
  TArgs extends ReadonlyArray<unknown>,
  TReturn,
>(
  fn: (...args: TArgs) => TReturn,
  hashFunction: (...args: TArgs) => string,
): (...args: TArgs) => TReturn {
  let lastKey: string | undefined;
  let lastResult: TReturn;

  return (...args: TArgs): TReturn => {
    const key = hashFunction(...args);
    if (lastKey === key) {
      return lastResult;
    }

    lastKey = key;
    lastResult = fn(...args);
    return lastResult;
  };
}

export function memoizeOneWithArgsHashAndInvalidation<
  TArgs extends ReadonlyArray<unknown>,
  TReturn,
>(
  fn: (...args: TArgs) => TReturn,
  hashFunction: (...args: TArgs) => string,
): [(...args: TArgs) => TReturn, () => void] {
  let lastKey: string | null;
  let lastResult: TReturn;

  const memoizedFn: (...args: TArgs) => TReturn = (...args: TArgs): TReturn => {
    const key = hashFunction(...args);
    if (lastKey === key) {
      return lastResult;
    }

    lastKey = key;
    lastResult = fn(...args);
    return lastResult;
  };

  const invalidate = () => {
    lastKey = null;
  };

  return [memoizedFn, invalidate];
}
