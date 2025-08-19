/**
 * TypeScript port of Recoil_filterSet.js
 */

'use strict';

export default function filterSet<TValue>(
  set: ReadonlySet<TValue>,
  callback: (value: TValue) => boolean,
): ReadonlySet<TValue> {
  const result = new Set<TValue>();
  for (const value of set) {
    if (callback(value)) {
      result.add(value);
    }
  }

  return result;
}
