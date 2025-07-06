/**
 * Produce a new Map with entries for which the callback returns true.
 */

function filterMap<K, V>(map: ReadonlyMap<K, V>, predicate: (value: V, key: K) => boolean): Map<K, V> {
    const result = new Map<K, V>();
    for (const [key, value] of map) {
        if (predicate(value, key)) {
            result.set(key, value);
        }
    }
    return result;
}

export default filterMap; 