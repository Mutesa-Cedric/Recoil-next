/**
 * Helpers to work with Maps and Sets immutably (copy-on-write semantics).
 */

export function setByAddingToSet<V>(set: ReadonlySet<V>, value: V): Set<V> {
    const next = new Set<V>(set);
    next.add(value);
    return next;
}

export function setByDeletingFromSet<V>(set: ReadonlySet<V>, value: V): Set<V> {
    const next = new Set<V>(set);
    next.delete(value);
    return next;
}

export function mapBySettingInMap<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): Map<K, V> {
    const next = new Map<K, V>(map);
    next.set(key, value);
    return next;
}

export function mapByUpdatingInMap<K, V>(
    map: ReadonlyMap<K, V>,
    key: K,
    updater: (value: V | undefined) => V,
): Map<K, V> {
    const next = new Map<K, V>(map);
    next.set(key, updater(next.get(key)));
    return next;
}

export function mapByDeletingFromMap<K, V>(map: ReadonlyMap<K, V>, key: K): Map<K, V> {
    const next = new Map<K, V>(map);
    next.delete(key);
    return next;
}

export function mapByDeletingMultipleFromMap<K, V>(map: ReadonlyMap<K, V>, keys: Set<K>): Map<K, V> {
    const next = new Map<K, V>(map);
    keys.forEach(k => next.delete(k));
    return next;
} 