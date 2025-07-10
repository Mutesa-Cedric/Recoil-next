declare module 'hamt_plus' {
    interface HamtMap<K, V> {
        beginMutation(): HamtMap<K, V>;
        endMutation(): HamtMap<K, V>;
        keys(): Iterable<K>;
        entries(): Iterable<[K, V]>;
        get(key: K): V | undefined;
        has(key: K): boolean;
        set(key: K, value: V): HamtMap<K, V>;
        delete(key: K): HamtMap<K, V>;
    }

    const empty: HamtMap<any, any>;

    export { empty };
    export default { empty };
} 