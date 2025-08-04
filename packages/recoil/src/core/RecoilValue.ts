/*
 * TypeScript port of Recoil_RecoilValue.js.
 */

import type { NodeKey } from './State';

// Abstract base class for Recoil values (stateful or read-only).
export class AbstractRecoilValue<T> {
    readonly key: NodeKey;
    constructor(key: NodeKey) {
        this.key = key;
    }
    toJSON(): { key: string } {
        return { key: this.key };
    }
}

export class RecoilState<T> extends AbstractRecoilValue<T> { }
export class RecoilValueReadOnly<T> extends AbstractRecoilValue<T> { }

export type RecoilValue<T> = RecoilValueReadOnly<T> | RecoilState<T>;

// User-land predicate helper
export function isRecoilValue(x: unknown): x is RecoilValue<unknown> {
    return x instanceof RecoilState || x instanceof RecoilValueReadOnly;
} 