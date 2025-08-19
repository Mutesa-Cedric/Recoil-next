/**
 * TypeScript port of CV2_memoize.ts
 */

import isImmutable from './isImmutable';
import Immutable from 'immutable';

const KEY = Symbol('CV2_cacheKeyFromObject.KEY');
const TIME_WARNING_THRESHOLD_MS = 15;

/**
 * Convert the given object into something that hashable that can be used as an
 * Immutable Map key. The current implementation recursively converts arrays
 * and plain objects to Lists and Maps, but it stops when hitting an Immutable
 * structure or a class instance. TODO: T21531272 it should go deeper than that.
 */
function cacheKeyFromObject(object: unknown): unknown {
  if (typeof object === 'object' && object !== null && !isImmutable(object)) {
    const t0 = window.performance ? performance.now() : 0;
    let answer: Immutable.Map<string, unknown> = Immutable.Map();
    if ((object as any)[KEY]) {
      answer = answer.set('key', (object as any)[KEY]);
    } else {
      Object.entries(object).forEach(([key, value]) => {
        answer =
          typeof value === 'object' &&
          value !== null &&
          (value as any)[KEY] != null
            ? answer.set(key, (value as any)[KEY])
            : answer.set(key, Immutable.fromJS(value));
      });
    }
    const t1 = window.performance ? performance.now() : 0;
    if (__DEV__) {
      if (t1 - t0 > TIME_WARNING_THRESHOLD_MS) {
        console.error('Spent', t1 - t0, 'milliseconds computing a cache key.');
      }
    }
    return answer;
  } else {
    return object;
  }
}

export default function memoize<Arg, Result>(
  fn: (arg: Arg) => Result,
): (arg: Arg) => Result {
  let map: Immutable.Map<unknown, Result> | undefined;
  return (arg: Arg) => {
    if (!map) {
      map = Immutable.Map();
    }
    const key = cacheKeyFromObject(arg);

    if (map.has(key)) {
      return map.get(key) as Result;
    } else {
      const result = fn(arg);
      map = map.set(key, result);
      return result;
    }
  };
}
