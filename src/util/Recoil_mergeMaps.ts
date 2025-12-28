/**
 * TypeScript port of Recoil_mergeMaps.js
 */

'use strict';

export default function mergeMaps<TKey, TValue>(
  ...maps: ReadonlyArray<ReadonlyMap<TKey, TValue>>
): Map<TKey, TValue> {
  const result = new Map<TKey, TValue>();
  for (let i = 0; i < maps.length; i++) {
    const iterator = maps[i].keys();
    let nextKey;
    while (!(nextKey = iterator.next()).done) {
      result.set(nextKey.value, maps[i].get(nextKey.value)!);
    }
  }
  return result;
}
