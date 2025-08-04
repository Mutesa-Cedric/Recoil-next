/**
 * TypeScript port of Recoil_stableStringify.js
 */

'use strict';
const __DEV__ = process.env.NODE_ENV !== 'production';
import err from './Recoil_err';
import isPromise from './Recoil_isPromise';

const TIME_WARNING_THRESHOLD_MS = 15;

type Options = { allowFunctions?: boolean };

function stringify(x: unknown, opt: Options, key?: string): string {
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
                throw err('Attempt to serialize function in a Recoil cache key');
            }
            return `__FUNCTION(${(x as any).name})__`;
    }

    if (x === null) {
        return 'null';
    }

    if (typeof x !== 'object') {
        return JSON.stringify(x) ?? '';
    }

    if (isPromise(x)) {
        return '__PROMISE__';
    }

    if (Array.isArray(x)) {
        return `[${x.map((v, i) => stringify(v, opt, i.toString()))}]`;
    }

    if (typeof (x as any).toJSON === 'function') {
        return stringify((x as any).toJSON(key), opt, key);
    }

    if (x instanceof Map) {
        const obj: { [key: string]: unknown } = {};
        for (const [k, v] of x) {
            obj[typeof k === 'string' ? k : stringify(k, opt)] = v;
        }
        return stringify(obj, opt, key);
    }

    if (x instanceof Set) {
        return stringify(
            Array.from(x).sort((a, b) =>
                stringify(a, opt).localeCompare(stringify(b, opt)),
            ),
            opt,
            key,
        );
    }

    if (
        Symbol !== undefined &&
        (x as any)[Symbol.iterator] != null &&
        typeof (x as any)[Symbol.iterator] === 'function'
    ) {
        return stringify(Array.from(x as any), opt, key);
    }

    return `{${Object.keys(x)
        .filter(k => (x as any)[k] !== undefined)
        .sort()
        .map(k => `${stringify(k, opt)}:${stringify((x as any)[k], opt, k)}`)
        .join(',')}}`;
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