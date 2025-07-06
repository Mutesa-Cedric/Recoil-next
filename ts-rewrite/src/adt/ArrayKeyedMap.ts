/**
 * Map-like structure that supports array keys with deep traversal. Ported from Recoil.
 */

const LEAF = Symbol('leaf');

const emptyMap = new Map<unknown, unknown>();

export default class ArrayKeyedMap<V> {
    private _base: Map<unknown, unknown> = new Map();

    constructor(existing?: ArrayKeyedMap<V> | Iterable<[unknown, V]>) {
        if (existing instanceof ArrayKeyedMap) {
            for (const [k, v] of existing.entries()) {
                this.set(k, v);
            }
        } else if (existing) {
            for (const [k, v] of existing) {
                this.set(k, v);
            }
        }
    }

    // Normalize key to array form
    private keyParts(key: unknown): unknown[] {
        return Array.isArray(key) ? key : [key];
    }

    get(key: unknown): V | undefined {
        const parts = this.keyParts(key);
        let map: Map<unknown, unknown> | undefined = this._base;
        for (const part of parts) {
            map = (map.get(part) as Map<unknown, unknown> | undefined) ?? emptyMap;
        }
        return map === undefined ? undefined : (map.get(LEAF) as V | undefined);
    }

    set(key: unknown, value: V): this {
        const parts = this.keyParts(key);
        let map: Map<unknown, unknown> = this._base;
        for (const part of parts) {
            let next = map.get(part) as Map<unknown, unknown> | undefined;
            if (!next) {
                next = new Map();
                map.set(part, next);
            }
            map = next;
        }
        map.set(LEAF, value);
        return this;
    }

    delete(key: unknown): this {
        const parts = this.keyParts(key);
        let map: Map<unknown, unknown> = this._base;
        for (const part of parts) {
            let next = map.get(part) as Map<unknown, unknown> | undefined;
            if (!next) {
                next = new Map();
                map.set(part, next);
            }
            map = next;
        }
        map.delete(LEAF);
        // Note: cleanup of empty maps is skipped to match original behaviour.
        return this;
    }

    *entries(): IterableIterator<[readonly unknown[], V]> {
        const recurse = (level: Map<unknown, unknown>, prefix: unknown[]): void => {
            level.forEach((v, k) => {
                if (k === LEAF) {
                    // yield result in outer generator scope
                    results.push([prefix, v as V]);
                } else {
                    recurse(v as Map<unknown, unknown>, [...prefix, k]);
                }
            });
        };

        const results: Array<[readonly unknown[], V]> = [];
        recurse(this._base, []);
        yield* results.values();
    }

    toBuiltInMap(): Map<readonly unknown[], V> {
        return new Map(this.entries());
    }
} 