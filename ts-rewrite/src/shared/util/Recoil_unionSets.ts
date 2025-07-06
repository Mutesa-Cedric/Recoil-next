/**
 * Returns a new Set that is the union of all provided sets.
 */

function unionSets<T>(...sets: ReadonlySet<T>[]): Set<T> {
    const result = new Set<T>();
    for (const set of sets) {
        for (const value of set) {
            result.add(value);
        }
    }
    return result;
}

export default unionSets; 