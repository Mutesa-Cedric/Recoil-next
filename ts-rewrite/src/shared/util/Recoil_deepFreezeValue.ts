/**
 * Deep freeze utility copied from Recoil's original implementation with minor TypeScript tweaks.
 * Skips freezing React elements, Promises, Errors, DOM nodes, and certain immutable structures.
 */

import { isReactNative, isWindow } from './Recoil_Environment';
import isNode from './Recoil_isNode';
import isPromise from './Recoil_isPromise';

/**
 * Determine whether a value should be skipped when attempting to deep freeze.
 */
function shouldNotBeFrozen(value: unknown): boolean {
    // Primitives and functions
    if (value === null || typeof value !== 'object') {
        return true;
    }

    // React elements (heuristic based on $$typeof)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    switch (typeof (value as any).$$typeof) {
        case 'symbol':
        case 'number':
            return true;
    }

    // Immutable.js structures (duck typing for internal flags)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
        (value as any)['@@__IMMUTABLE_ITERABLE__@@'] != null ||
        (value as any)['@@__IMMUTABLE_KEYED__@@'] != null ||
        (value as any)['@@__IMMUTABLE_INDEXED__@@'] != null ||
        (value as any)['@@__IMMUTABLE_ORDERED__@@'] != null ||
        (value as any)['@@__IMMUTABLE_RECORD__@@'] != null
    ) {
        return true;
    }

    // DOM nodes
    if (isNode(value)) {
        return true;
    }

    // Promises
    if (isPromise(value)) {
        return true;
    }

    // Errors
    if (value instanceof Error) {
        return true;
    }

    // Typed arrays / ArrayBuffer views
    if (ArrayBuffer.isView(value)) {
        return true;
    }

    // Window object
    if (!isReactNative && isWindow(value)) {
        return true;
    }

    return false;
}

/**
 * Recursively frees a value to enforce read-only semantics.
 */
function deepFreezeValue(value: unknown): void {
    if (typeof value !== 'object' || value === null || shouldNotBeFrozen(value)) {
        return;
    }

    Object.freeze(value);
    // eslint-disable-next-line guard-for-in, @typescript-eslint/no-explicit-any
    for (const key in value as any) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prop = (value as any)[key];
            if (typeof prop === 'object' && prop != null && !Object.isFrozen(prop)) {
                deepFreezeValue(prop);
            }
        }
    }
    Object.seal(value);
}

export default deepFreezeValue; 