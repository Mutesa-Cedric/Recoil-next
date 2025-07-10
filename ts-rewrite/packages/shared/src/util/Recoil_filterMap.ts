/**
 * TypeScript port of Recoil_filterMap.js
 */

'use strict';

export default function filterMap<TKey, TValue>(
    map: ReadonlyMap<TKey, TValue>,
    callback: (value: TValue, key: TKey) => boolean,
): Map<TKey, TValue> {
    const result = new Map<TKey, TValue>();
    for (const [key, value] of map) {
        if (callback(value, key)) {
            result.set(key, value);
        }
    }

    return result;
} 