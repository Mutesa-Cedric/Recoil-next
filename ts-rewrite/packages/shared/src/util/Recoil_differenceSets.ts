/**
 * Returns a set containing all values from the first set that are not present
 * in any of the other provided sets.
 */

function differenceSets<T>(first: ReadonlySet<T>, ...others: ReadonlySet<T>[]): ReadonlySet<T> {
    const result = new Set<T>();
    FIRST: for (const value of first) {
        for (const set of others) {
            if (set.has(value)) {
                continue FIRST;
            }
        }
        result.add(value);
    }
    return result;
}

export default differenceSets; 