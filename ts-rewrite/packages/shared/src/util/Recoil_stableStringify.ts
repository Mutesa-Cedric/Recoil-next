/**
 * Stable stringify replicates functionality of Recoil's original util.
 * See original comments for behaviour details.
 */

import err from './Recoil_err';
import isPromise from './Recoil_isPromise';
import { isSSR } from './Recoil_Environment';

interface Options {
    allowFunctions?: boolean;
}

const TIME_WARNING_THRESHOLD_MS = 15;

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
            return `__FUNCTION(${(x as Function).name})__`;
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
        return `[${x.map((v, i) => stringify(v, opt, i.toString())).join(',')}]`;
    }

    // toJSON override
    if (typeof (x as any).toJSON === 'function') {
        return stringify((x as any).toJSON(key), opt, key);
    }

    if (x instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of x) {
            obj[typeof k === 'string' ? k : stringify(k, opt)] = v;
        }
        return stringify(obj, opt, key);
    }

    if (x instanceof Set) {
        const arr = Array.from(x).sort((a, b) =>
            stringify(a, opt).localeCompare(stringify(b, opt)),
        );
        return stringify(arr, opt, key);
    }

    if (typeof Symbol !== 'undefined' && (x as any)[Symbol.iterator] != null) {
        return stringify(Array.from(x as Iterable<unknown>), opt, key);
    }

    const sortedKeys = Object.keys(x as Record<string, unknown>)
        .filter(k => (x as any)[k] !== undefined)
        .sort();
    const body = sortedKeys
        .map(k => `${stringify(k, opt)}:${stringify((x as any)[k], opt, k)}`)
        .join(',');
    return `{${body}}`;
}

export default function stableStringify(x: unknown, opt: Options = { allowFunctions: false }): string {
    // dev performance warn
    // @ts-ignore
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !isSSR && typeof window !== 'undefined') {
        const start = window.performance ? window.performance.now() : Date.now();
        const str = stringify(x, opt);
        const end = window.performance ? window.performance.now() : Date.now();
        if (end - start > TIME_WARNING_THRESHOLD_MS) {
            // eslint-disable-next-line no-console
            console.groupCollapsed(`Recoil: Spent ${end - start}ms computing a cache key`);
            // eslint-disable-next-line no-console
            console.warn(x, str);
            // eslint-disable-next-line no-console
            console.groupEnd();
        }
        return str;
    }
    return stringify(x, opt);
} 