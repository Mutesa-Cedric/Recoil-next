/**
 * Least-Recently-Used cache with O(1) get/set/delete using a double-linked list.
 */

import nullthrows from 'recoil-shared/util/Recoil_nullthrows';

export interface LRUCacheOptions<K> {
    maxSize: number;
    mapKey?: (key: K) => unknown;
}

interface CacheNode<K, V> {
    key: K;
    value: V;
    left: CacheNode<K, V> | null;
    right: CacheNode<K, V> | null;
}

export class LRUCache<K, V> {
    private _maxSize: number;
    private _size = 0;
    private _head: CacheNode<K, V> | null = null;
    private _tail: CacheNode<K, V> | null = null;
    private _map: Map<unknown, CacheNode<K, V>> = new Map();
    private _keyMapper: (key: K) => unknown;

    constructor(options: LRUCacheOptions<K>) {
        this._maxSize = options.maxSize;
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
        const mapped = this._keyMapper(key);
        const node = this._map.get(mapped);
        if (!node) return undefined;
        // Promote to head
        this.set(key, node.value);
        return node.value;
    }

    set(key: K, value: V): void {
        const mapped = this._keyMapper(key);
        // Remove if already present to re-insert at head
        if (this._map.has(mapped)) {
            this.delete(key);
        }

        const newNode: CacheNode<K, V> = { key, value, left: null, right: this._head };
        if (this._head) this._head.left = newNode; else this._tail = newNode;
        this._head = newNode;
        this._map.set(mapped, newNode);
        this._size++;
        if (this._size > this._maxSize) {
            this.deleteLru();
        }
    }

    deleteLru(): void {
        if (this._tail) {
            this.delete(this._tail.key);
        }
    }

    delete(key: K): void {
        const mapped = this._keyMapper(key);
        const node = this._map.get(mapped);
        if (!node) return;
        if (node.left) node.left.right = node.right;
        if (node.right) node.right.left = node.left;
        if (node === this._head) this._head = node.right;
        if (node === this._tail) this._tail = node.left;
        this._map.delete(mapped);
        this._size--;
    }

    clear(): void {
        this._map.clear();
        this._head = this._tail = null;
        this._size = 0;
    }
}

export default LRUCache; 