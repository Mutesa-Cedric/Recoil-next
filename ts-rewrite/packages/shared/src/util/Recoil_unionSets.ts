/**
 * TypeScript port of Recoil_unionSets.js
 */

'use strict';

export default function unionSets<TValue>(
    ...sets: ReadonlyArray<ReadonlySet<TValue>>
): Set<TValue> {
    const result = new Set<TValue>();
    for (const set of sets) {
        for (const value of set) {
            result.add(value);
        }
    }
    return result;
} 