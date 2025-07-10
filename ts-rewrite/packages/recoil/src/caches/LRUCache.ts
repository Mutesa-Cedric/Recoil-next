/**
 * TypeScript port of Recoil_LRUCache.js
 */

'use strict';

import nullthrows from '../../../shared/src/util/Recoil_nullthrows';

export type CacheNode<K, V> = {
    key: K;
    value: V;
    left: CacheNode<K, V> | null;
    right: CacheNode<K, V> | null;
};

type Options<K> = {
    maxSize: number;
    mapKey?: (key: K) => unknown;
};

export class LRUCache<K = unknown, V = unknown> {
    _maxSize: number;
    _size: number;
    _head: CacheNode<K, V> | null;
    _tail: CacheNode<K, V> | null;
    _map: Map<unknown, CacheNode<K, V>>;
    _keyMapper: (key: K) => unknown;

    constructor(options: Options<K>) {
        this._maxSize = options.maxSize;
        this._size = 0;
        this._head = null;
        this._tail = null;
        this._map = new Map<unknown, CacheNode<K, V>>();
        this._keyMapper = options.mapKey ?? (v => v);
    }

    head(): CacheNode<K, V> | null {
        return this._head;
    }

    tail(): CacheNode<K, V> | null {
        return this._tail;
    }

    size(): number {
        return this._size;
    }

    maxSize(): number {
        return this._maxSize;
    }

    has(key: K): boolean {
        return this._map.has(this._keyMapper(key));
    }

    get(key: K): V | undefined {
        const mappedKey = this._keyMapper(key);
        const node = this._map.get(mappedKey);

        if (!node) {
            return undefined;
        }

        this.set(key, node.value);

        return node.value;
    }

    set(key: K, val: V): void {
        const mappedKey = this._keyMapper(key);
        const existingNode = this._map.get(mappedKey);

        if (existingNode) {
            this.delete(key);
        }

        const head = this.head();
        const node: CacheNode<K, V> = {
            key,
            right: head,
            left: null,
            value: val,
        };

        if (head) {
            head.left = node;
        } else {
            this._tail = node;
        }

        this._map.set(mappedKey, node);
        this._head = node;
        this._size++;

        this._maybeDeleteLRU();
    }

    _maybeDeleteLRU(): void {
        if (this.size() > this.maxSize()) {
            this.deleteLru();
        }
    }

    deleteLru(): void {
        const tail = this.tail();

        if (tail) {
            this.delete(tail.key);
        }
    }

    delete(key: K): void {
        const mappedKey = this._keyMapper(key);

        if (!this._size || !this._map.has(mappedKey)) {
            return;
        }

        const node = nullthrows(this._map.get(mappedKey));
        const right = node.right;
        const left = node.left;

        if (right) {
            right.left = node.left;
        }

        if (left) {
            left.right = node.right;
        }

        if (node === this.head()) {
            this._head = right;
        }

        if (node === this.tail()) {
            this._tail = left;
        }

        this._map.delete(mappedKey);
        this._size--;
    }

    clear(): void {
        this._size = 0;
        this._head = null;
        this._tail = null;
        this._map = new Map<unknown, CacheNode<K, V>>();
    }
} 