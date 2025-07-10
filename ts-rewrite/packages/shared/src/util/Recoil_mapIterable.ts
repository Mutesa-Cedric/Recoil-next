/**
 * TypeScript port of Recoil_mapIterable.js
 */

'use strict';

export default function* mapIterable<T, K>(
    iterable: Iterable<T>,
    callback: (v: T, index: number) => K,
): Iterable<K> {
    let index = 0;
    for (const value of iterable) {
        yield callback(value, index++);
    }
} 