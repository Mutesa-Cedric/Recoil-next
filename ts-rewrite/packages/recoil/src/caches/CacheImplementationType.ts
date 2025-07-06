/** CacheImplementation generic interface */
export interface CacheImplementation<K, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): void;
    clear(): void;
    size(): number;
} 