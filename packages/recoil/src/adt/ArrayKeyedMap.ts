/**
 * TypeScript port of Recoil_ArrayKeyedMap.js
 */

'use strict';

const LEAF = {};

const emptyMap = new Map<unknown, unknown>();

export class ArrayKeyedMap<V> {
    _base: Map<any, any> = new Map();

    constructor(
        existing?: ArrayKeyedMap<V> | Iterable<[unknown, V]>,
    ) {
        if (existing instanceof ArrayKeyedMap) {
            for (const [k, v] of existing.entries()) {
                this.set(k, v);
            }
        } else if (existing) {
            for (const [k, v] of existing) {
                this.set(k, v);
            }
        }
        return this;
    }

    get(key: unknown): V | void {
        const ks = Array.isArray(key) ? key : [key];
        let map: Map<unknown, unknown> | undefined = this._base;
        for (const k of ks) {
            if (map === undefined) {
                return undefined;
            }
            map = map.get(k) as Map<unknown, unknown> | undefined;
        }
        return map?.get(LEAF) as V | undefined;
    }

    set(key: unknown, value: V): this {
        const ks = Array.isArray(key) ? key : [key];
        let map: Map<unknown, unknown> = this._base;
        for (const k of ks) {
            let next = map.get(k);
            if (!next) {
                next = new Map();
                map.set(k, next);
            }
            map = next as Map<unknown, unknown>;
        }
        map.set(LEAF, value);
        return this;
    }

    delete(key: unknown): boolean {
        const ks = Array.isArray(key) ? key : [key];
        let map: Map<unknown, unknown> | undefined = this._base;
        const maps: Array<Map<unknown, unknown>> = [];
        for (const k of ks) {
            if (map === undefined) {
                return false;
            }
            maps.push(map);
            map = map.get(k) as Map<unknown, unknown> | undefined;
        }
        if (map === undefined) {
            return false;
        }
        const result = map.delete(LEAF);

        for (let i = maps.length - 1; i >= 0; i--) {
            const parent = maps[i];
            const child = parent.get(ks[i]);
            if (child instanceof Map && child.size === 0) {
                parent.delete(ks[i]);
            }
        }

        return result;
    }

    *entries(): IterableIterator<[ReadonlyArray<unknown>, V]> {
        const answer: Array<[ReadonlyArray<unknown>, V]> = [];
        function recurse(level: Map<unknown, unknown>, prefix: Array<unknown>) {
            level.forEach((v, k) => {
                if (k === LEAF) {
                    answer.push([prefix, v as V]);
                } else {
                    recurse(v as Map<unknown, unknown>, prefix.concat(k));
                }
            });
        }
        recurse(this._base, []);
        yield* answer;
    }

    toBuiltInMap(): Map<ReadonlyArray<unknown>, V> {
        return new Map(this.entries());
    }
} 