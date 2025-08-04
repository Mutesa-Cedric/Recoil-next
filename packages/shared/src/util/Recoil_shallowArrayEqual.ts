/**
 * TypeScript port of Recoil_shallowArrayEqual.js
 */

'use strict';

export default function shallowArrayEqual<TArr extends ReadonlyArray<unknown>>(
    a: TArr,
    b: TArr,
): boolean {
    if (a === b) {
        return true;
    }

    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0, l = a.length; i < l; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
} 