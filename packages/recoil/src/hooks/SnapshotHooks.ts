/**
 * TypeScript port of Recoil_SnapshotHooks
 */

'use strict';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isSSR } from '../../../shared/src/util/Recoil_Environment';
import filterMap from '../../../shared/src/util/Recoil_filterMap';
import filterSet from '../../../shared/src/util/Recoil_filterSet';
import mapMap from '../../../shared/src/util/Recoil_mapMap';
import mergeMaps from '../../../shared/src/util/Recoil_mergeMaps';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';
import usePrevious from '../../../shared/src/util/Recoil_usePrevious';
import { Loadable, loadableWithValue } from '../adt/Loadable';
import { batchUpdates } from '../core/Batching';
import { copyTreeState, getDownstreamNodes, invalidateDownstreams } from '../core/FunctionalCore';
import { DEFAULT_VALUE, getNode, nodes, PersistenceType } from '../core/Node';
import { useStoreRef } from '../core/RecoilRoot';
import { SUSPENSE_TIMEOUT_MS } from '../core/Retention';
import { cloneSnapshot, Snapshot } from '../core/Snapshot';
import { NodeKey, Store, TreeState } from '../core/State';

function useTransactionSubscription(callback: (store: Store) => void) {
    const storeRef = useStoreRef();
    useEffect(() => {
        const wrappedCallback = (store: Store) => {
            try {
                callback(store);
            } catch (error) {
                // In React 19, snapshots can fail more aggressively
                if (error && typeof error === 'object' && 'message' in error &&
                    typeof error.message === 'string' &&
                    error.message.includes('already been released')) {
                    console.warn('Snapshot already released in transaction subscription, skipping');
                    return;
                }
                throw error;
            }
        };
        const sub = storeRef.current.subscribeToTransactions(wrappedCallback);
        return sub.release;
    }, [callback, storeRef]);
}

function externallyVisibleAtomValuesInState(
    state: TreeState,
): Map<NodeKey, unknown> {
    const atomValues = state.atomValues.toMap();
    const persistedAtomContentsValues = mapMap(
        filterMap(atomValues, (v, k) => {
            const node = getNode(k);
            const persistence = node.persistence_UNSTABLE;
            return (
                persistence != null &&
                persistence.type !== 'none' &&
                v.state === 'hasValue'
            );
        }),
        v => v.contents,
    );
    // Merge in nonvalidated atoms; we may not have defs for them but they will
    // all have persistence on or they wouldn't be there in the first place.
    return mergeMaps(
        state.nonvalidatedAtoms.toMap(),
        persistedAtomContentsValues,
    );
}

type ExternallyVisibleAtomInfo = {
    persistence_UNSTABLE: {
        type: PersistenceType;
        backButton: boolean;
    };
};

export function useTransactionObservation_DEPRECATED(
    callback: (info: {
        atomValues: Map<NodeKey, unknown>;
        previousAtomValues: Map<NodeKey, unknown>;
        atomInfo: Map<NodeKey, ExternallyVisibleAtomInfo>;
        modifiedAtoms: ReadonlySet<NodeKey>;
        transactionMetadata: { [key: string]: unknown };
    }) => void,
) {
    useTransactionSubscription(
        useCallback(
            (store: Store) => {
                let previousTree = store.getState().previousTree;
                const currentTree = store.getState().currentTree;
                if (!previousTree) {
                    recoverableViolation(
                        'Transaction subscribers notified without a previous tree being present -- this is a bug in Recoil',
                        'recoil',
                    );
                    previousTree = store.getState().currentTree; // attempt to trundle on
                }

                const atomValues = externallyVisibleAtomValuesInState(currentTree);
                const previousAtomValues =
                    externallyVisibleAtomValuesInState(previousTree);
                const atomInfo = mapMap(nodes, node => ({
                    persistence_UNSTABLE: {
                        type: node.persistence_UNSTABLE?.type ?? 'none',
                        backButton: node.persistence_UNSTABLE?.backButton ?? false,
                    },
                }));
                // Filter on existance in atomValues so that externally-visible rules
                // are also applied to modified atoms (specifically exclude selectors):
                const modifiedAtoms = filterSet(
                    currentTree.dirtyAtoms,
                    k => atomValues.has(k) || previousAtomValues.has(k),
                );

                callback({
                    atomValues,
                    previousAtomValues,
                    atomInfo,
                    modifiedAtoms,
                    transactionMetadata: { ...currentTree.transactionMetadata },
                });
            },
            [callback],
        ),
    );
}

export function useRecoilTransactionObserver(
    callback: (info: { snapshot: Snapshot; previousSnapshot: Snapshot }) => void,
) {
    useTransactionSubscription(
        useCallback(
            (store: Store) => {
                const snapshot = cloneSnapshot(store, 'latest');
                const previousSnapshot = cloneSnapshot(store, 'previous');
                callback({
                    snapshot,
                    previousSnapshot,
                });
            },
            [callback],
        ),
    );
}

// Return a snapshot of the current state and subscribe to all state changes
export function useRecoilSnapshot(): Snapshot {
    const storeRef = useStoreRef();
    const [snapshot, setSnapshot] = useState(() => {
        try {
            return cloneSnapshot(storeRef.current);
        } catch (error) {
            // In React 19, snapshots can be released more aggressively
            // If the snapshot was already released, create a fresh one
            if (error && typeof error === 'object' && 'message' in error &&
                typeof error.message === 'string' &&
                error.message.includes('already been released')) {
                console.warn('Snapshot already released during initial state, creating fresh snapshot');
                return cloneSnapshot(storeRef.current);
            }
            throw error;
        }
    });
    const previousSnapshot = usePrevious(snapshot);
    const timeoutID = useRef<number | null>(null);
    const releaseRef = useRef<(() => void) | null>(null);

    useTransactionSubscription(
        useCallback((store: Store) => {
            try {
                setSnapshot(cloneSnapshot(store));
            } catch (error) {
                // In React 19, snapshots can be released more aggressively
                // If the snapshot was already released, skip this update
                if (error && typeof error === 'object' && 'message' in error &&
                    typeof error.message === 'string' &&
                    error.message.includes('already been released')) {
                    console.warn('Snapshot already released during transaction subscription, skipping update');
                    return;
                }
                throw error;
            }
        }, []),
    );

    // Retain snapshot for duration component is mounted
    useEffect(() => {
        let release: (() => void) | null = null;
        try {
            release = snapshot.retain();
        } catch (error) {
            // If snapshot retention fails, skip this effect
            if (error && typeof error === 'object' && 'message' in error &&
                typeof error.message === 'string' &&
                error.message.includes('already been released')) {
                console.warn('Cannot retain snapshot in useEffect, already released');
                return;
            }
            throw error;
        }

        // Release the retain from the rendering call
        if (timeoutID.current && !isSSR) {
            window.clearTimeout(timeoutID.current);
            timeoutID.current = null;
            releaseRef.current?.();
            releaseRef.current = null;
        }

        return () => {
            // Defer the release.  If "Fast Refresh"" is used then the component may
            // re-render with the same state.  The previous cleanup will then run and
            // then the new effect will run. We don't want the snapshot to be released
            // by that cleanup before the new effect has a chance to retain it again.
            // Use timeout of 10 to workaround Firefox issue: https://github.com/facebookexperimental/Recoil/issues/1936
            if (release) {
                window.setTimeout(release, 10);
            }
        };
    }, [snapshot]);

    // Retain snapshot until above effect is run.
    // Release after a threshold in case component is suspended.
    if (previousSnapshot !== snapshot && !isSSR) {
        // Release the previous snapshot
        if (timeoutID.current) {
            window.clearTimeout(timeoutID.current);
            timeoutID.current = null;
            releaseRef.current?.();
            releaseRef.current = null;
        }
        try {
            releaseRef.current = snapshot.retain();
        } catch (error) {
            // If snapshot retention fails, skip this retention
            if (error && typeof error === 'object' && 'message' in error &&
                typeof error.message === 'string' &&
                error.message.includes('already been released')) {
                console.warn('Cannot retain snapshot in render, already released');
                releaseRef.current = null;
            } else {
                throw error;
            }
        }
        timeoutID.current = window.setTimeout(() => {
            timeoutID.current = null;
            releaseRef.current?.();
            releaseRef.current = null;
        }, SUSPENSE_TIMEOUT_MS);
    }

    return snapshot;
}

function notifyComponents(store: Store, treeState: TreeState): void {
    const storeState = store.getState();
    const dependentNodes = getDownstreamNodes(store, treeState, treeState.dirtyAtoms);

    for (const key of dependentNodes) {
        const comps = storeState.nodeToComponentSubscriptions.get(key);
        if (comps) {
            for (const [_subID, [_debugName, callback]] of comps) {
                try {
                    callback(treeState);
                } catch (error) {
                    console.error(`Error in component callback for ${key}:`, error);
                }
            }
        }
    }
}

export function gotoSnapshot(store: Store, snapshot: Snapshot): void {
    const storeState = store.getState();
    const prev = storeState.nextTree ?? storeState.currentTree;
    const next = snapshot.getStore_INTERNAL().getState().currentTree;

    batchUpdates(() => {
        store.replaceState(currentTree => {
            const newTree = copyTreeState(currentTree);
            newTree.stateID = snapshot.getID();

            const atomKeysChanged = new Set<NodeKey>();

            // Update atoms that should be restored from snapshots
            for (const key of new Set([...prev.atomValues.keys(), ...next.atomValues.keys()])) {
                const node = getNode(key);
                if (!node.shouldRestoreFromSnapshots) continue;

                const prevContents = prev.atomValues.get(key)?.contents;
                const nextContents = next.atomValues.get(key)?.contents;

                if (prevContents !== nextContents) {
                    atomKeysChanged.add(key);
                    const loadable = next.atomValues.has(key)
                        ? nullthrows(next.atomValues.get(key))
                        : loadableWithValue(DEFAULT_VALUE);

                    if (loadable && loadable.state === 'hasValue' && loadable.contents === DEFAULT_VALUE) {
                        newTree.atomValues.delete(key);
                    } else {
                        newTree.atomValues.set(key, loadable as Loadable<unknown>);
                    }
                    newTree.dirtyAtoms.add(key);
                }
            }

            // If atoms changed, invalidate dependent selectors and notify components
            if (atomKeysChanged.size > 0) {
                invalidateDownstreams(store, newTree);
                notifyComponents(store, newTree);
            }

            return newTree;
        });
    });
}

export function useGotoRecoilSnapshot(): (snapshot: Snapshot) => void {
    const storeRef = useStoreRef();
    return useCallback(
        (snapshot: Snapshot) => gotoSnapshot(storeRef.current, snapshot),
        [storeRef],
    );
}

export const useTransactionSubscription_DEPRECATED = useTransactionSubscription; 