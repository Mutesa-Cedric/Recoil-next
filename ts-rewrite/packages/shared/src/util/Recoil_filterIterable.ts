/**
 * TypeScript port of Recoil_filterIterable.js
 */

'use strict';

export default function* filterIterable<T>(
    iterable: Iterable<T>,
    predicate: (v: T, index: number) => boolean,
): Iterable<T> {
    let index = 0;
    for (const value of iterable) {
        if (predicate(value, index++)) {
            yield value;
        }
    }
} 