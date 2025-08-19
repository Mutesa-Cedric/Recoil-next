/**
 * TypeScript port of Recoil_PersistentMap.js
 */

'use strict';

import gkx from '../../../shared/src/util/Recoil_gkx';
import hamt from 'hamt_plus';

export interface PersistentMap<K extends string, V> {
  keys(): Iterable<K>;
  entries(): Iterable<[K, V]>;
  get(key: K): V | void;
  has(key: K): boolean;
  set(key: K, value: V): PersistentMap<K, V>;
  delete(key: K): PersistentMap<K, V>;
  clone(): PersistentMap<K, V>;
  toMap(): Map<K, V>;
}

class BuiltInMap<K extends string, V> implements PersistentMap<K, V> {
  _map: Map<K, V>;

  constructor(existing?: PersistentMap<K, V>) {
    this._map = new Map(existing?.entries());
  }

  keys(): Iterable<K> {
    return this._map.keys();
  }

  entries(): Iterable<[K, V]> {
    return this._map.entries();
  }

  get(k: K): V | void {
    return this._map.get(k);
  }

  has(k: K): boolean {
    return this._map.has(k);
  }

  set(k: K, v: V): PersistentMap<K, V> {
    this._map.set(k, v);
    return this;
  }

  delete(k: K): PersistentMap<K, V> {
    this._map.delete(k);
    return this;
  }

  clone(): PersistentMap<K, V> {
    return persistentMap(this);
  }

  toMap(): Map<K, V> {
    return new Map(this._map);
  }
}

class HashArrayMappedTrieMap<K extends string, V>
  implements PersistentMap<K, V>
{
  _hamt: any;

  constructor(existing?: PersistentMap<K, V>) {
    this._hamt = hamt.empty.beginMutation();
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

  get(k: K): V | void {
    return this._hamt.get(k);
  }

  has(k: K): boolean {
    return this._hamt.has(k);
  }

  set(k: K, v: V): PersistentMap<K, V> {
    this._hamt.set(k, v);
    return this;
  }

  delete(k: K): PersistentMap<K, V> {
    this._hamt.delete(k);
    return this;
  }

  clone(): PersistentMap<K, V> {
    return persistentMap(this);
  }

  toMap(): Map<K, V> {
    return new Map(this._hamt);
  }
}

export function persistentMap<K extends string, V>(
  existing?: PersistentMap<K, V>,
): PersistentMap<K, V> {
  if (gkx('recoil_hamt_2020')) {
    return new HashArrayMappedTrieMap(existing);
  } else {
    return new BuiltInMap(existing);
  }
}
