/**
 * MapCache – simple in-memory cache wrapping Map with custom key-mapper.
 */

export interface MapCacheOptions<K> {
    mapKey?: (key: K) => unknown;
}

export class MapCache<K, V> {
    private _map: Map<unknown, V> = new Map();
    private _keyMapper: (key: K) => unknown;

    constructor(options?: MapCacheOptions<K>) {
        this._keyMapper = options?.mapKey ?? (v => v);
    }

    size(): number {
        return this._map.size;
    }

    has(key: K): boolean {
        return this._map.has(this._keyMapper(key));
    }

    get(key: K): V | undefined {
        return this._map.get(this._keyMapper(key));
    }

    set(key: K, val: V): void {
        this._map.set(this._keyMapper(key), val);
    }

    delete(key: K): void {
        this._map.delete(this._keyMapper(key));
    }

    clear(): void {
        this._map.clear();
    }
}

export default MapCache; 