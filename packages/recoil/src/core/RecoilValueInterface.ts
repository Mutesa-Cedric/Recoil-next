/*
 * Partial TypeScript port of Recoil_RecoilValueInterface.js
 *
 * Provides the surface API consumed by other migrated modules. Detailed internal
 * behavior will be implemented later.
 */

import type { Loadable } from '../adt/Loadable';
import type { AtomWrites, NodeKey, Store, TreeState } from './State';

import {
    copyTreeState,
    getNodeLoadable,
    invalidateDownstreams,
    setNodeValue,
} from './FunctionalCore';
import { getNextComponentID } from './Keys';
import { DEFAULT_VALUE, DefaultValue, getNode, getNodeMaybe } from './Node';
import {
    AbstractRecoilValue,
    RecoilState,
    RecoilValueReadOnly,
    isRecoilValue,
} from './RecoilValue';

import err from '../../../shared/src/util/Recoil_err';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';

const batchStack: Array<Array<() => void>> = [];

export function batchStart(): () => void {
    const callbacks: Array<() => void> = [];
    batchStack.push(callbacks);
    return () => {
        callbacks.forEach(fn => fn());
        batchStack.pop();
    };
}


type ValueOrUpdater<T> = T | ((curr: T) => T);

export type ComponentSubscription = { release: () => void };

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



export function writeLoadableToTreeState(
    state: TreeState,
    key: NodeKey,
    loadable: Loadable<unknown>,
): void {
    if (loadable.state === 'hasValue' && loadable.contents instanceof DefaultValue) {
        state.atomValues.delete(key);
    } else {
        state.atomValues.set(key, loadable);
    }
    state.dirtyAtoms.add(key);
    state.nonvalidatedAtoms.delete(key);
}

export function markRecoilValueModified<T>(store: Store, rv: AbstractRecoilValue<T>): void {
    // Mark the node as dirty to trigger re-renders
    store.replaceState(state => {
        const newState = copyTreeState(state);
        newState.dirtyAtoms.add(rv.key);
        return newState;
    });
}

function valueFromValueOrUpdater<T>(
    store: Store,
    state: TreeState,
    recoilValue: AbstractRecoilValue<T>,
    valueOrUpdater: T | ValueOrUpdater<T> | typeof DEFAULT_VALUE,
): T | typeof DEFAULT_VALUE {
    if (typeof valueOrUpdater === 'function' && valueOrUpdater !== DEFAULT_VALUE) {
        // Updater form: pass in the current value
        const current = getRecoilValueAsLoadable(store, recoilValue, state);
        
        if (current.state === 'loading') {
            const msg = `Tried to set atom or selector "${recoilValue.key}" using an updater function while the current state is pending, this is not currently supported.`;
            throw err(msg);
        } else if (current.state === 'hasError') {
            throw current.contents;
        }
        
        // Call the updater function with the current value
        return (valueOrUpdater as (curr: T) => T)(current.contents as T);
    } else {
        return valueOrUpdater as T | typeof DEFAULT_VALUE;
    }
}

export function setRecoilValue<T>(
    store: Store,
    recoilValue: AbstractRecoilValue<T>,
    valueOrUpdater: T | ValueOrUpdater<T> | typeof DEFAULT_VALUE,
): void {
    store.replaceState(state => {
        const newState = copyTreeState(state);
        const newValue = valueFromValueOrUpdater(store, newState, recoilValue, valueOrUpdater);
        const writes = setNodeValue(store, newState, recoilValue.key, newValue);
        writes.forEach((loadable, key) => writeLoadableToTreeState(newState, key, loadable));
        invalidateDownstreams(store, newState);
        return newState;
    });
}

export function setUnvalidatedRecoilValue<T>(store: Store, recoilValue: AbstractRecoilValue<T>, unvalidatedValue: T): void {
    const { key } = recoilValue;
    store.replaceState(state => {
        const newState = copyTreeState(state);
        const node = getNodeMaybe(key);
        node?.invalidate?.(newState);
        newState.atomValues.delete(key);
        newState.nonvalidatedAtoms.set(key, unvalidatedValue);
        newState.dirtyAtoms.add(key);
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

export function refreshRecoilValue<T>(
    store: Store,
    { key }: AbstractRecoilValue<T>,
): void {
    const { currentTree } = store.getState();
    const node = getNode(key);
    node.clearCache?.(store, currentTree);
}

export { AbstractRecoilValue, RecoilState, RecoilValueReadOnly, isRecoilValue };
