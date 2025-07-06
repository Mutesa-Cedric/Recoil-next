/*
 * Partial TypeScript port of Recoil_RecoilValueInterface.js
 *
 * Provides the surface API consumed by other migrated modules. Detailed internal
 * behavior will be implemented later.
 */

import type { Loadable } from '../adt/Loadable';
import type { Store, TreeState, NodeKey, AtomWrites } from './State';

import {
    getNodeLoadable,
    setNodeValue,
    invalidateDownstreams,
    copyTreeState,
} from './FunctionalCore';
import { getNextComponentID } from './Keys';
import { getNode, getNodeMaybe, DEFAULT_VALUE, DefaultValue } from './Node';
import {
    AbstractRecoilValue,
    RecoilState,
    RecoilValueReadOnly,
    isRecoilValue,
} from './RecoilValue';

import err from 'recoil-shared/util/Recoil_err';
import recoverableViolation from 'recoil-shared/util/Recoil_recoverableViolation';
import nullthrows from 'recoil-shared/util/Recoil_nullthrows';

type ValueOrUpdater<T> = T | ((curr: T) => T);

// -----------------------------------------------------------------------------
// Utility helpers (mostly simplified) – many adapted from original source
// -----------------------------------------------------------------------------

export function getRecoilValueAsLoadable<T>(
    store: Store,
    { key }: AbstractRecoilValue<T>,
    treeState: TreeState = store.getState().currentTree,
): Loadable<T> {
    return getNodeLoadable<T>(store, treeState, key);
}

export function applyAtomValueWrites(
    atomValues: any, // PersistentMap placeholder
    writes: AtomWrites,
): any {
    const result = atomValues.clone();
    writes.forEach((v, k) => {
        if (v.state === 'hasValue' && v.contents instanceof DefaultValue) {
            result.delete(k);
        } else {
            result.set(k, v);
        }
    });
    return result;
}

// Minimal batch stack implementation for batchStart
const batchStack: Array<Array<() => void>> = [];

export function batchStart(): () => void {
    const callbacks: Array<() => void> = [];
    batchStack.push(callbacks);
    return () => {
        callbacks.forEach(fn => fn());
        batchStack.pop();
    };
}

export function writeLoadableToTreeState(
    state: TreeState,
    key: NodeKey,
    loadable: Loadable<unknown>,
): void {
    state.atomValues.set(key, loadable);
    state.dirtyAtoms.add(key);
    state.nonvalidatedAtoms.delete(key);
}

export function markRecoilValueModified<T>(_store: Store, _rv: AbstractRecoilValue<T>): void {
    /* TODO later */
}

export function setRecoilValue<T>(
    store: Store,
    recoilValue: AbstractRecoilValue<T>,
    valueOrUpdater: T | ValueOrUpdater<T> | typeof DEFAULT_VALUE,
): void {
    store.replaceState(state => {
        const newState = copyTreeState(state);
        const writes = setNodeValue(store, newState, recoilValue.key, valueOrUpdater as any);
        writes.forEach((loadable, key) => writeLoadableToTreeState(newState, key, loadable));
        invalidateDownstreams(store, newState);
        return newState;
    });
}

export function setRecoilValueLoadable<T>(
    store: Store,
    recoilValue: AbstractRecoilValue<T>,
    loadable: Loadable<T>,
): void {
    writeLoadableToTreeState(store.getState().currentTree, recoilValue.key, loadable);
}

export function subscribeToRecoilValue<T>(
    store: Store,
    { key }: AbstractRecoilValue<T>,
    callback: (treeState: TreeState) => void,
    _componentDebugName?: string | null,
): { release: () => void } {
    const id = getNextComponentID();
    const subs = store.getState().nodeToComponentSubscriptions;
    if (!subs.has(key)) subs.set(key, new Map());
    nullthrows(subs.get(key)).set(id, ['<not captured>', callback]);
    return {
        release() {
            subs.get(key)?.delete(id);
        },
    };
}

export { AbstractRecoilValue, RecoilValueReadOnly, RecoilState, isRecoilValue }; 