/**
 * PersistentMap – a map abstraction with structural sharing (when HAMT enabled)
 * Ported from Recoil. In OSS builds we default to Hamt when the GK is enabled,
 * otherwise fallback to built-in Map.
 */

import gkx from '../shared/util/Recoil_gkx';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – no types for hamt_plus
import hamt from 'hamt_plus';

export interface PersistentMap<K extends string, V> {
    keys(): Iterable<K>;
    entries(): Iterable<[K, V]>;

    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): PersistentMap<K, V>;
    delete(key: K): PersistentMap<K, V>;

    clone(): PersistentMap<K, V>;
    toMap(): Map<K, V>;
}

class BuiltInMap<K extends string, V> implements PersistentMap<K, V> {
    private _map: Map<K, V>;
    constructor(existing?: PersistentMap<K, V>) {
        this._map = new Map(existing ? existing.entries() : undefined);
    }
    keys(): Iterable<K> {
        return this._map.keys();
    }
    entries(): Iterable<[K, V]> {
        return this._map.entries();
    }
    get(key: K): V | undefined {
        return this._map.get(key);
    }
    has(key: K): boolean {
        return this._map.has(key);
    }
    set(key: K, value: V): PersistentMap<K, V> {
        this._map.set(key, value);
        return this;
    }
    delete(key: K): PersistentMap<K, V> {
        this._map.delete(key);
        return this;
    }
    clone(): PersistentMap<K, V> {
        return persistentMap(this);
    }
    toMap(): Map<K, V> {
        return new Map(this._map);
    }
}

class HashArrayMappedTrieMap<K extends string, V> implements PersistentMap<K, V> {
    // hamt_plus mutative context
    private _hamt: any;
    constructor(existing?: PersistentMap<K, V>) {
        // create mutable hamt
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this._hamt = (hamt.empty as any).beginMutation();
        if (existing instanceof HashArrayMappedTrieMap) {
            const h = existing._hamt.endMutation();
            existing._hamt = h.beginMutation();
            this._hamt = h.beginMutation();
        } else if (existing) {
            for (const [k, v] of existing.entries()) {
                this._hamt.set(k, v);
            }
        }
    }
    keys(): Iterable<K> {
        return this._hamt.keys();
    }
    entries(): Iterable<[K, V]> {
        return this._hamt.entries();
    }
    get(key: K): V | undefined {
        return this._hamt.get(key);
    }
    has(key: K): boolean {
        return this._hamt.has(key);
    }
    set(key: K, value: V): PersistentMap<K, V> {
        this._hamt.set(key, value);
        return this;
    }
    delete(key: K): PersistentMap<K, V> {
        this._hamt.delete(key);
        return this;
    }
    clone(): PersistentMap<K, V> {
        return persistentMap(this);
    }
    toMap(): Map<K, V> {
        return new Map(this._hamt);
    }
}

export function persistentMap<K extends string, V>(existing?: PersistentMap<K, V>): PersistentMap<K, V> {
    if (gkx('recoil_hamt_2020')) {
        return new HashArrayMappedTrieMap(existing);
    }
    return new BuiltInMap(existing);
} 