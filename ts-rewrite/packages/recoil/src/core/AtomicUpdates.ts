/*
 * Simplified TypeScript port of Recoil_AtomicUpdates.js – provides atomicUpdater helper.
 */

// Simple local definition to avoid extra dependency
type ValueOrUpdater<T> = T | ((curr: T) => T);

import type { RecoilState, RecoilValue } from './RecoilValue';
import type { Store, TreeState, NodeKey } from './State';

import { loadableWithValue } from '../adt/Loadable';
import {
    initializeNode,
    copyTreeState,
    invalidateDownstreams,
} from './FunctionalCore';
import { writeLoadableToTreeState, getRecoilValueAsLoadable } from './RecoilValueInterface';
import { DEFAULT_VALUE, getNode } from './Node';
import err from '../../../shared/src/util/Recoil_err';

export interface TransactionInterface {
    get<T>(rv: RecoilValue<T>): T;
    set<T>(state: RecoilState<T>, valueOrUpdater: ValueOrUpdater<T>): void;
    reset<T>(state: RecoilState<T>): void;
}

function isAtom<T>(rv: RecoilValue<T>): boolean {
    return getNode(rv.key).nodeType === 'atom';
}

class TransactionInterfaceImpl implements TransactionInterface {
    private store: Store;
    private treeState: TreeState;
    private changes = new Map<NodeKey, unknown>();

    constructor(store: Store, treeState: TreeState) {
        this.store = store;
        this.treeState = treeState;
    }

    get = <T>(rv: RecoilValue<T>): T => {
        if (this.changes.has(rv.key)) {
            return this.changes.get(rv.key) as T;
        }
        if (!isAtom(rv)) throw err('Reading selectors within atomicUpdate is not supported');
        const loadable = getRecoilValueAsLoadable(this.store, rv, this.treeState);
        if (loadable.state === 'hasValue') return loadable.contents as T;
        if (loadable.state === 'hasError') throw loadable.contents;
        throw err(`Expected Recoil atom ${rv.key} to have a value, but it is loading.`);
    };

    set = <T>(state: RecoilState<T>, valueOrUpdater: ValueOrUpdater<T>): void => {
        if (!isAtom(state)) throw err('Setting selectors within atomicUpdate is not supported');

        if (typeof valueOrUpdater === 'function') {
            const current = this.get(state);
            // @ts-ignore
            this.changes.set(state.key, (valueOrUpdater as any)(current));
        } else {
            initializeNode(this.store, state.key, 'set');
            this.changes.set(state.key, valueOrUpdater);
        }
    };

    reset = <T>(state: RecoilState<T>): void => {
        this.set(state, DEFAULT_VALUE as unknown as T);
    };

    newTreeState_INTERNAL(): TreeState {
        if (this.changes.size === 0) return this.treeState;
        const newState = copyTreeState(this.treeState);
        for (const [k, v] of this.changes) {
            writeLoadableToTreeState(newState, k, loadableWithValue(v));
        }
        invalidateDownstreams(this.store, newState);
        return newState;
    }
}

export function atomicUpdater(store: Store): (fn: (tx: TransactionInterface) => void) => void {
    return fn => {
        store.replaceState(treeState => {
            const changeset = new TransactionInterfaceImpl(store, treeState);
            fn(changeset);
            return changeset.newTreeState_INTERNAL();
        });
    };
} 