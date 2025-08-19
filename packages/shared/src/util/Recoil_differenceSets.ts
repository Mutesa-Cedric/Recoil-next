/**
 * TypeScript port of Recoil_differenceSets.js
 */

'use strict';

export default function differenceSets<TValue>(
  set: ReadonlySet<TValue>,
  ...setsWithValuesToRemove: ReadonlyArray<ReadonlySet<TValue>>
): ReadonlySet<TValue> {
  const ret = new Set<TValue>();
  FIRST: for (const value of set) {
    for (const otherSet of setsWithValuesToRemove) {
      if (otherSet.has(value)) {
        continue FIRST;
      }
    }
    ret.add(value);
  }
  return ret;
}
