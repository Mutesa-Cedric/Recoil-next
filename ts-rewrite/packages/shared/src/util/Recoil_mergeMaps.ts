/**
 * Merge a series of Maps into a new Map. Later maps override earlier ones.
 */

function mergeMaps<K, V>(...maps: ReadonlyMap<K, V>[]): Map<K, V> {
    const result = new Map<K, V>();
    for (const map of maps) {
        for (const key of map.keys()) {
            result.set(key, map.get(key)!);
        }
    }
    return result;
}

export default mergeMaps; 