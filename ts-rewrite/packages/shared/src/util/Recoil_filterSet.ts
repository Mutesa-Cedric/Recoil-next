/**
 * Returns a new Set containing values from the original set that satisfy callback.
 */

function filterSet<T>(set: ReadonlySet<T>, predicate: (value: T) => boolean): ReadonlySet<T> {
    const result = new Set<T>();
    for (const value of set) {
        if (predicate(value)) {
            result.add(value);
        }
    }
    return result;
}

export default filterSet; 