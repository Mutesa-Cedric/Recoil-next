/**
 * TypeScript port of Recoil_concatIterables.js
 */

'use strict';

export default function* concatIterables<TValue>(
    iters: Iterable<Iterable<TValue>>,
): Iterable<TValue> {
    for (const iter of iters) {
        for (const val of iter) {
            yield val;
        }
    }
} 