/**
 * Returns true if some element in the set satisfies the callback.
 */

function someSet<T>(set: ReadonlySet<T>, callback: (value: T, key: T, set: ReadonlySet<T>) => boolean, context?: unknown): boolean {
    for (const entry of set) {
        if (callback.call(context, entry, entry, set)) {
            return true;
        }
    }
    return false;
}

export default someSet; 