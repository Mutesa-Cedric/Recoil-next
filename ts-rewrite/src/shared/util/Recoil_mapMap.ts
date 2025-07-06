/**
 * Creates a new Map with values transformed by callback.
 */

function mapMap<K, V, U>(map: ReadonlyMap<K, V>, callback: (value: V, key: K) => U): Map<K, U> {
    const result = new Map<K, U>();
    map.forEach((value, key) => {
        result.set(key, callback(value, key));
    });
    return result;
}

export default mapMap; 