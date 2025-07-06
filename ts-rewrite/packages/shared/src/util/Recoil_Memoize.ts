/**
 * Simple memoization helpers (ported from Flow implementation).
 */

// Generic function types for readability
export type Memoized<Args extends any[], Return> = (...args: Args) => Return;

export function memoizeWithArgsHash<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    hash: (...args: Args) => string,
): Memoized<Args, Return> {
    let cache: Record<string, Return> = Object.create(null);
    return ((...args: Args) => {
        const key = hash(...args);
        if (!Object.prototype.hasOwnProperty.call(cache, key)) {
            cache[key] = fn(...args);
        }
        return cache[key];
    }) as Memoized<Args, Return>;
}

export function memoizeOneWithArgsHash<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    hash: (...args: Args) => string,
): Memoized<Args, Return> {
    let lastKey: string | null = null;
    let lastResult: Return;
    return ((...args: Args) => {
        const key = hash(...args);
        if (lastKey === key) {
            return lastResult;
        }
        lastKey = key;
        lastResult = fn(...args);
        return lastResult;
    }) as Memoized<Args, Return>;
}

export function memoizeOneWithArgsHashAndInvalidation<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    hash: (...args: Args) => string,
): [Memoized<Args, Return>, () => void] {
    let lastKey: string | null = null;
    let lastResult: Return;
    const memoized = ((...args: Args) => {
        const key = hash(...args);
        if (lastKey === key) {
            return lastResult;
        }
        lastKey = key;
        lastResult = fn(...args);
        return lastResult;
    }) as Memoized<Args, Return>;

    const invalidate = () => {
        lastKey = null;
    };

    return [memoized, invalidate];
} 