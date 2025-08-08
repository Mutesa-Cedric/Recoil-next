/**
 * Typescript port of Recoil_RecoilRoot.js
 */

import type { ReactNode } from 'react';
import React, {
    createContext,
    Suspense,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

import type { NodeKey, StateID, StoreID } from './Keys';
import type { RecoilValue } from './RecoilValue';
import type { MutableSnapshot } from './Snapshot';
import type { Store, StoreRef, StoreState, TreeState } from './State';

import err from '../../../shared/src/util/Recoil_err';
import gkx from '../../../shared/src/util/Recoil_gkx';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';
import unionSets from '../../../shared/src/util/Recoil_unionSets';
import useRefInitOnce from '../../../shared/src/util/Recoil_useRefInitOnce';
import { enqueueExecution } from '../adt/Queue';
import {
    cleanUpNode,
    getDownstreamNodes,
    initializeNode,
    setNodeValue,
    setUnvalidatedAtomValue_DEPRECATED,
} from './FunctionalCore';
import { cloneGraph, graph } from './Graph';
import { getNextStoreID } from './Keys';
import { reactMode } from './ReactMode';
import { applyAtomValueWrites } from './RecoilValueInterface';
import { releaseScheduledRetainablesNow } from './Retention';
import { freshSnapshot } from './Snapshot';
import {
    getNextTreeStateVersion,
    makeEmptyStoreState,
} from './State';

type InternalProps = {
    initializeState_DEPRECATED?: (options: {
        set: <T>(recoilValue: RecoilValue<T>, value: T) => void;
        setUnvalidatedAtomValues: (values: Map<string, unknown>) => void;
    }) => void;
    initializeState?: (mutableSnapshot: MutableSnapshot) => void;
    store_INTERNAL?: Store;
    children: ReactNode;
    skipCircularDependencyDetection_DANGEROUS?: boolean;
};

function notInAContext() {
    throw err('This component must be used inside a <RecoilRoot> component.');
}

const defaultStore: Store = Object.freeze({
    storeID: getNextStoreID(),
    getState: notInAContext as any,
    replaceState: notInAContext as any,
    getGraph: notInAContext as any,
    subscribeToTransactions: notInAContext as any,
    addTransactionMetadata: notInAContext as any,
});

let stateReplacerIsBeingExecuted: boolean = false;

function startNextTreeIfNeeded(store: Store): void {
    if (stateReplacerIsBeingExecuted) {
        throw err(
            'An atom update was triggered within the execution of a state updater function. State updater functions provided to Recoil must be pure functions.',
        );
    }
    const storeState = store.getState();
    if (storeState.nextTree === null) {
        if (
            gkx('recoil_memory_managament_2020') &&
            gkx('recoil_release_on_cascading_update_killswitch_2021')
        ) {
            // If this is a cascading update (that is, rendering due to one state change
            // invokes a second state change), we won't have cleaned up retainables yet
            // because this normally happens after notifying components. Do it before
            // proceeding with the cascading update so that it remains predictable:
            if (storeState.commitDepth > 0) {
                releaseScheduledRetainablesNow(store);
            }
        }
        const version = storeState.currentTree.version;
        const nextVersion = getNextTreeStateVersion();
        storeState.nextTree = {
            ...storeState.currentTree,
            version: nextVersion,
            stateID: nextVersion,
            dirtyAtoms: new Set(),
            transactionMetadata: {},
        };
        storeState.graphsByVersion.set(
            nextVersion,
            cloneGraph(nullthrows(storeState.graphsByVersion.get(version))),
        );
    }
}

const AppContext = createContext<StoreRef>({ current: defaultStore });
export const useStoreRef = (): StoreRef => useContext(AppContext);

function notifyComponents(
    store: Store,
    storeState: StoreState,
    treeState: TreeState,
): void {
    const dependentNodes = getDownstreamNodes(
        store,
        treeState,
        treeState.dirtyAtoms,
    );
    for (const key of dependentNodes) {
        const comps = storeState.nodeToComponentSubscriptions.get(key);
        if (comps) {
            for (const [_subID, [_debugName, callback]] of comps) {
                callback(treeState);
            }
        }
    }
}

function sendEndOfBatchNotifications(store: Store) {
    const storeState = store.getState();
    const treeState = storeState.currentTree;

    // Inform transaction subscribers of the transaction:
    const dirtyAtoms = treeState.dirtyAtoms;
    if (dirtyAtoms.size) {
        // Execute Node-specific subscribers before global subscribers
        for (const [
            key,
            subscriptions,
        ] of storeState.nodeTransactionSubscriptions) {
            if (dirtyAtoms.has(key)) {
                for (const [_, subscription] of subscriptions) {
                    subscription(store);
                }
            }
        }

        for (const [_, subscription] of storeState.transactionSubscriptions) {
            subscription(store);
        }

        if (!reactMode().early || storeState.suspendedComponentResolvers.size > 0) {
            // Notifying components is needed to wake from suspense, even when using
            // early rendering.
            notifyComponents(store, storeState, treeState);
            // Wake all suspended components so the right one(s) can try to re-render.
            // We need to wake up components not just when some asynchronous selector
            // resolved, but also when changing synchronous values because this may cause
            // a selector to change from asynchronous to synchronous, in which case there
            // would be no follow-up asynchronous resolution to wake us up.
            // TODO OPTIMIZATION Only wake up related downstream components
            storeState.suspendedComponentResolvers.forEach(cb => cb());
            storeState.suspendedComponentResolvers.clear();
        }
    }

    // Special behavior ONLY invoked by useInterface.
    // FIXME delete queuedComponentCallbacks_DEPRECATED when deleting useInterface.
    storeState.queuedComponentCallbacks_DEPRECATED.forEach(cb => cb(treeState));
    storeState.queuedComponentCallbacks_DEPRECATED.splice(
        0,
        storeState.queuedComponentCallbacks_DEPRECATED.length,
    );
}

function endBatch(store: Store) {
    const storeState = store.getState();
    storeState.commitDepth++;
    try {
        const { nextTree } = storeState;

        // Ignore commits that are not because of Recoil transactions -- namely,
        // because something above RecoilRoot re-rendered:
        if (nextTree == null) {
            return;
        }

        // nextTree is now committed -- note that copying and reset occurs when
        // a transaction begins, in startNextTreeIfNeeded:
        storeState.previousTree = storeState.currentTree;
        storeState.currentTree = nextTree;
        storeState.nextTree = null;

        sendEndOfBatchNotifications(store);

        if (storeState.previousTree != null) {
            storeState.graphsByVersion.delete(storeState.previousTree.version);
        } else {
            recoverableViolation(
                'Ended batch with no previous state, which is unexpected',
                'recoil',
            );
        }
        storeState.previousTree = null;

        if (gkx('recoil_memory_managament_2020')) {
            // Only release retainables if there were no writes during the end of the
            // batch.  This avoids releasing something we might be about to use.
            if (nextTree == null) {
                releaseScheduledRetainablesNow(store);
            }
        }
    } finally {
        storeState.commitDepth--;
    }
}

/*
 * The purpose of the Batcher is to observe when React batches end so that
 * Recoil state changes can be batched. Whenever Recoil state changes, we call
 * setState on the batcher. Then we wait for that change to be committed, which
 * signifies the end of the batch. That's when we respond to the Recoil change.
 */
function Batcher({
    setNotifyBatcherOfChange,
}: {
    setNotifyBatcherOfChange: (fn: () => void) => void;
}) {
    const storeRef = useStoreRef();

    const [, setState] = useState<unknown[]>([]);
    setNotifyBatcherOfChange(() => setState([]));
    useEffect(() => {
        setNotifyBatcherOfChange(() => setState([]));

        // If an asynchronous selector resolves after the Batcher is unmounted,
        // notifyBatcherOfChange will still be called. An error gets thrown whenever
        // setState is called after a component is already unmounted, so this sets
        // notifyBatcherOfChange to be a no-op.
        return () => {
            setNotifyBatcherOfChange(() => { });
        };
    }, [setNotifyBatcherOfChange]);

    useEffect(() => {
        // enqueueExecution runs this function immediately; it is only used to
        // manipulate the order of useEffects during tests, since React seems to
        // call useEffect in an unpredictable order sometimes.
        enqueueExecution('Batcher', () => {
            endBatch(storeRef.current);
        });
    });

    return null;
}

if (process.env.NODE_ENV !== 'production') {
    if (typeof window !== 'undefined' && !(window as any).$recoilDebugStates) {
        (window as any).$recoilDebugStates = [];
    }
}

// When removing this deprecated function, remove stateBySettingRecoilValue
// which will no longer be needed.
function initialStoreState_DEPRECATED(
    store: Store,
    initializeState: (options: {
        set: <T>(recoilValue: RecoilValue<T>, value: T) => void;
        setUnvalidatedAtomValues: (values: Map<string, unknown>) => void;
    }) => void,
): StoreState {
    const initial: StoreState = makeEmptyStoreState();
    initializeState({
        set: <T extends unknown>(atom: RecoilValue<T>, value: T) => {
            const state = initial.currentTree;
            const writes = setNodeValue(store, state, atom.key, value);
            const writtenNodes = new Set(writes.keys());

            const nonvalidatedAtoms = state.nonvalidatedAtoms.clone();
            for (const n of writtenNodes) {
                nonvalidatedAtoms.delete(n);
            }

            initial.currentTree = {
                ...state,
                dirtyAtoms: unionSets(state.dirtyAtoms, writtenNodes),
                atomValues: applyAtomValueWrites(state.atomValues, writes), // NB: PLEASE un-export applyAtomValueWrites when deleting this code
                nonvalidatedAtoms,
            };
        },
        setUnvalidatedAtomValues: atomValues => {
            // FIXME replace this with a mutative loop
            atomValues.forEach((v, k) => {
                initial.currentTree = setUnvalidatedAtomValue_DEPRECATED(
                    initial.currentTree,
                    k,
                    v,
                );
            });
        },
    });
    return initial;
}

// Initialize state snapshot for <RecoilRoot> for the initializeState prop.
// Atom effect initialization takes precedence over this prop.
// Any atom effects will be run before initialization, but then cleaned up,
// they are then re-run when used as part of rendering.  These semantics are
// compatible with React StrictMode where effects may be re-run multiple times
// but state initialization only happens once the first time.
function initialStoreState(
    initializeState: (mutableSnapshot: MutableSnapshot) => void,
): StoreState {
    // Initialize a snapshot and get its store
    const snapshot = freshSnapshot(initializeState);
    const storeState = snapshot.getStore_INTERNAL().getState();

    // Counteract the snapshot auto-release
    snapshot.retain();

    // Cleanup any effects run during initialization and clear the handlers so
    // they will re-initialize if used during rendering.  This allows atom effect
    // initialization to take precedence over initializeState and be compatible
    // with StrictMode semantics.
    storeState.nodeCleanupFunctions.forEach(cleanup => cleanup());
    storeState.nodeCleanupFunctions.clear();

    return storeState;
}

let warned = false;
function RecoilSuspenseWarning() {
    if (!warned) {
        warned = true;
        console.warn(
            'Suspended <RecoilRoot> detected. The children of <RecoilRoot> should be wrapped in a <Suspense> boundary since RecoilRoot is not designed to suspend.',
        );
    }
    return null;
}

let nextID = 0;
function RecoilRoot_INTERNAL({
    initializeState_DEPRECATED,
    initializeState,
    store_INTERNAL: storeProp, // For use with React "context bridging"
    children,
    skipCircularDependencyDetection_DANGEROUS,
}: InternalProps): React.ReactElement {
    let storeStateRef: { current: StoreState }; // eslint-disable-line prefer-const

    const getGraph = (version: StateID) => {
        const graphs = storeStateRef.current.graphsByVersion;
        if (graphs.has(version)) {
            return nullthrows(graphs.get(version));
        }
        const newGraph = graph();
        graphs.set(version, newGraph);
        return newGraph;
    };

    const subscribeToTransactions = (
        callback: (store: Store) => void,
        key?: NodeKey,
    ): { release: () => void } => {
        if (key == null) {
            // Global transaction subscriptions
            const { transactionSubscriptions } = storeRef.current.getState();
            const id = nextID++;
            transactionSubscriptions.set(id, callback);
            return {
                release: () => {
                    transactionSubscriptions.delete(id);
                },
            };
        } else {
            // Node-specific transaction subscriptions:
            const { nodeTransactionSubscriptions } = storeRef.current.getState();
            if (!nodeTransactionSubscriptions.has(key)) {
                nodeTransactionSubscriptions.set(key, new Map());
            }
            const id = nextID++;
            nullthrows(nodeTransactionSubscriptions.get(key)).set(id, callback);
            return {
                release: () => {
                    const subs = nodeTransactionSubscriptions.get(key);
                    if (subs) {
                        subs.delete(id);
                        if (subs.size === 0) {
                            nodeTransactionSubscriptions.delete(key);
                        }
                    }
                },
            };
        }
    };

    const addTransactionMetadata = (metadata: Record<string, unknown>) => {
        startNextTreeIfNeeded(storeRef.current);
        for (const k of Object.keys(metadata)) {
            nullthrows(storeRef.current.getState().nextTree).transactionMetadata[k] =
                metadata[k];
        }
    };

    const replaceState = (replacer: (treeState: TreeState) => TreeState) => {
        startNextTreeIfNeeded(storeRef.current);
        // Use replacer to get the next state:
        const nextTree = nullthrows(storeStateRef.current.nextTree);
        let replaced;
        try {
            stateReplacerIsBeingExecuted = true;
            replaced = replacer(nextTree);
        } finally {
            stateReplacerIsBeingExecuted = false;
        }
        if (replaced === nextTree) {
            return;
        }

        if (process.env.NODE_ENV !== 'production') {
            if (typeof window !== 'undefined') {
                (window as any).$recoilDebugStates.push(replaced); // TODO this shouldn't happen here because it's not batched
            }
        }

        // Save changes to nextTree and schedule a React update:
        storeStateRef.current.nextTree = replaced;
        if (reactMode().early) {
            notifyComponents(storeRef.current, storeStateRef.current, replaced);
        }
        nullthrows(notifyBatcherOfChange.current)({});
    };

    const notifyBatcherOfChange = useRef<((arg: unknown) => void) | null>(null);
    const setNotifyBatcherOfChange = useCallback(
        (x: (arg: unknown) => void) => {
            notifyBatcherOfChange.current = x;
        },
        [notifyBatcherOfChange],
    );

    const storeRef: { current: Store } = useRefInitOnce(
        () =>
            storeProp ?? {
                storeID: getNextStoreID(),
                getState: () => storeStateRef.current,
                replaceState,
                getGraph,
                subscribeToTransactions,
                addTransactionMetadata,
                skipCircularDependencyDetection_DANGEROUS,
            },
    );
    if (storeProp != null) {
        storeRef.current = storeProp;
    }

    storeStateRef = useRefInitOnce(() =>
        initializeState_DEPRECATED != null
            ? initialStoreState_DEPRECATED(
                storeRef.current,
                initializeState_DEPRECATED,
            )
            : initializeState != null
                ? initialStoreState(initializeState)
                : makeEmptyStoreState(),
    );

    // Cleanup when the <RecoilRoot> is unmounted
    useEffect(() => {
        // React is free to call effect cleanup handlers and effects at will, the
        // deps array is only an optimization.  For example, React strict mode
        // will execute each effect twice for testing.  Therefore, we need symmetry
        // to re-initialize all known atoms after they were cleaned up.
        const store = storeRef.current;
        for (const atomKey of new Set(store.getState().knownAtoms)) {
            initializeNode(store, atomKey, 'get');
        }

        return () => {
            for (const atomKey of store.getState().knownAtoms) {
                cleanUpNode(store, atomKey);
            }
        };
    }, [storeRef]);

    return (
        <AppContext.Provider value={storeRef}>
            <Batcher setNotifyBatcherOfChange={setNotifyBatcherOfChange} />
            <Suspense fallback={<RecoilSuspenseWarning />}>{children}</Suspense>
        </AppContext.Provider>
    );
}

type Props =
    | {
        initializeState_DEPRECATED?: (options: {
            set: <T>(recoilValue: RecoilValue<T>, value: T) => void;
            setUnvalidatedAtomValues: (values: Map<string, unknown>) => void;
        }) => void;
        initializeState?: (mutableSnapshot: MutableSnapshot) => void;
        store_INTERNAL?: Store;
        store?: Store; // Add compatibility for the store prop
        override?: true;
        children: ReactNode;
        skipCircularDependencyDetection_DANGEROUS?: boolean;
    }
    | {
        store_INTERNAL?: Store;
        store?: Store; // Add compatibility for the store prop
        /**
         * Defaults to true. If override is true, this RecoilRoot will create a
         * new Recoil scope. If override is false and this RecoilRoot is nested
         * within another RecoilRoot, this RecoilRoot will perform no function.
         * Children of this RecoilRoot will access the Recoil values of the
         * nearest ancestor RecoilRoot.
         */
        override: false;
        children: ReactNode;
        skipCircularDependencyDetection_DANGEROUS?: boolean;
    };

export function RecoilRoot(props: Props): React.ReactElement {
    const { override, store, ...propsExceptOverride } = props;

    const ancestorStoreRef = useStoreRef();
    if (override === false && ancestorStoreRef.current !== defaultStore) {
        // If ancestorStoreRef.current !== defaultStore, it means that this
        // RecoilRoot is not nested within another.
        return props.children as React.ReactElement;
    }

    // Map `store` prop to `store_INTERNAL` for backward compatibility
    const internalProps = {
        ...propsExceptOverride,
        store_INTERNAL: propsExceptOverride.store_INTERNAL || store,
    };

    return <RecoilRoot_INTERNAL {...internalProps} />;
}

export function useRecoilStoreID(): StoreID {
    return useStoreRef().current.storeID;
}

// Export testing functions for internal use
export const notifyComponents_FOR_TESTING = notifyComponents;
export const sendEndOfBatchNotifications_FOR_TESTING = sendEndOfBatchNotifications; 