/**
 * TypeScript port of Recoil_stableStringify.js
 */

'use strict';
const __DEV__ = process.env.NODE_ENV !== 'production';
import isPromise from './Recoil_isPromise';

const TIME_WARNING_THRESHOLD_MS = 15;

type Options = { allowFunctions?: boolean };

function stringify(x: unknown, opt: Options, key?: string, visited = new Set<unknown>()): string {
    if (typeof x === 'string' && !x.includes('"') && !x.includes('\\')) {
        return `"${x}"`;
    }

    switch (typeof x) {
        case 'undefined':
            return '';
        case 'boolean':
            return x ? 'true' : 'false';
        case 'number':
        case 'symbol':
            return String(x);
        case 'string':
            return JSON.stringify(x);
        case 'function':
            if (opt?.allowFunctions !== true) {
                return '';
            }
            return `__FUNCTION(${(x as any).name})__`;
    }

    if (x === null) {
        return 'null';
    }

    if (typeof x !== 'object') {
        return JSON.stringify(x) ?? '';
    }

    // Handle circular references
    if (visited.has(x)) {
        return '__CIRCULAR__';
    }
    visited.add(x);

    if (isPromise(x)) {
        visited.delete(x);
        return '__PROMISE__';
    }

    if (Array.isArray(x)) {
        const result = `[${x.map((v, i) => stringify(v, opt, i.toString(), visited)).join(',')}]`;
        visited.delete(x);
        return result;
    }

    if (typeof (x as any).toJSON === 'function') {
        const result = stringify((x as any).toJSON(key), opt, key, visited);
        visited.delete(x);
        return result;
    }

    if (x instanceof Map) {
        const obj: { [key: string]: unknown } = {};
        for (const [k, v] of x) {
            obj[typeof k === 'string' ? k : stringify(k, opt, undefined, visited)] = v;
        }
        const result = stringify(obj, opt, key, visited);
        visited.delete(x);
        return result;
    }

    if (x instanceof Set) {
        const sortedItems = Array.from(x).sort((a, b) => {
            const aStr = stringify(a, opt, undefined, new Set(visited));
            const bStr = stringify(b, opt, undefined, new Set(visited));
            // Use a more predictable sort order - null should come first
            if (aStr === 'null' && bStr !== 'null') return -1;
            if (bStr === 'null' && aStr !== 'null') return 1;
            return aStr.localeCompare(bStr);
        });
        const result = stringify(sortedItems, opt, key, visited);
        visited.delete(x);
        return result;
    }

    if (
        Symbol !== undefined &&
        (x as any)[Symbol.iterator] != null &&
        typeof (x as any)[Symbol.iterator] === 'function'
    ) {
        const result = stringify(Array.from(x as any), opt, key, visited);
        visited.delete(x);
        return result;
    }

    const result = `{${Object.keys(x)
        .filter(k => {
            const value = (x as any)[k];
            return value !== undefined && typeof value !== 'function';
        })
        .sort()
        .map(k => `${stringify(k, opt, undefined, visited)}:${stringify((x as any)[k], opt, k, visited)}`)
        .join(',')}}`;
    visited.delete(x);
    return result;
}

export default function stableStringify(
    x: unknown,
    opt: Options = { allowFunctions: false },
): string {
    if (__DEV__) {
        if (typeof window !== 'undefined') {
            const startTime = window.performance ? window.performance.now() : 0;

            const str = stringify(x, opt);

            const endTime = window.performance ? window.performance.now() : 0;

            if (endTime - startTime > TIME_WARNING_THRESHOLD_MS) {
                console.groupCollapsed(
                    `Recoil: Spent ${endTime - startTime}ms computing a cache key`,
                );
                console.warn(x, str);
                console.groupEnd();
            }

            return str;
        }
    }

    return stringify(x, opt);
} 