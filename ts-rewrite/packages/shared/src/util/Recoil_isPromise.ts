/**
 * Type guard to determine if a value is Promise-like.
 */

function isPromise<T = unknown>(p: unknown): p is Promise<T> {
    return !!p && typeof (p as any).then === 'function';
}

export default isPromise; 