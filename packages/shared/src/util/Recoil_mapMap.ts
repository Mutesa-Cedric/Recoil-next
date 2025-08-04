/**
 * TypeScript port of Recoil_mapMap.js
 */

'use strict';

export default function mapMap<TKey, TValue, TValueOut>(
    map: ReadonlyMap<TKey, TValue>,
    callback: (value: TValue, key: TKey) => TValueOut,
): Map<TKey, TValueOut> {
    const result = new Map<TKey, TValueOut>();
    map.forEach((value, key) => {
        result.set(key, callback(value, key));
    });

    return result;
} 