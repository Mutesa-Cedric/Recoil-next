/*
 * Full TypeScript port of Recoil_FunctionalCore.js
 * Implements node initialization, selector evaluation helpers, dependency
 * tracking and write utilities used throughout core.
 */

import type { Loadable } from '../adt/Loadable';
import type { RetainedBy } from './RetainedBy';
import type { AtomWrites, NodeKey, Store, TreeState } from './State';
import type { RecoilValue } from './RecoilValue';
import type { DefaultValue, Trigger } from './Node';

import { getNode, getNodeMaybe, recoilValuesForKeys } from './Node';
import { setByAddingToSet } from 'recoil-shared/util/Recoil_CopyOnWrite';
import filterIterable from 'recoil-shared/util/Recoil_filterIterable';
import gkx from 'recoil-shared/util/Recoil_gkx';
import lazyProxy from 'recoil-shared/util/Recoil_lazyProxy';
import mapIterable from 'recoil-shared/util/Recoil_mapIterable';
import { RetentionZone } from './RetentionZone';

// -------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------

const emptySet: ReadonlySet<unknown> = Object.freeze(new Set());

// -------------------------------------------------------------------------------------
// Error helpers
// -------------------------------------------------------------------------------------

class ReadOnlyRecoilValueError extends Error { }

// -------------------------------------------------------------------------------------
// Retention helpers
// -------------------------------------------------------------------------------------

function initializeRetentionForNode(
    store: Store,
    nodeKey: NodeKey,
    retainedBy: RetainedBy,
): () => void {
    if (!gkx('recoil_memory_managament_2020')) {
        return () => undefined;
    }
    const { nodesRetainedByZone } = store.getState().retention;

    function addToZone(zone: RetentionZone) {
        let set = nodesRetainedByZone.get(zone);
        if (!set) {
            nodesRetainedByZone.set(zone, (set = new Set()));
        }
        set.add(nodeKey);
    }

    if (retainedBy instanceof RetentionZone) {
        addToZone(retainedBy);
    } else if (Array.isArray(retainedBy)) {
        for (const zone of retainedBy) {
            addToZone(zone);
        }
    }

    return () => {
        if (!gkx('recoil_memory_managament_2020')) {
            return;
        }
        const { retention } = store.getState();

        function deleteFromZone(zone: RetentionZone) {
            const set = retention.nodesRetainedByZone.get(zone);
            set?.delete(nodeKey);
            if (set && set.size === 0) {
                retention.nodesRetainedByZone.delete(zone);
            }
        }

        if (retainedBy instanceof RetentionZone) {
            deleteFromZone(retainedBy);
        } else if (Array.isArray(retainedBy)) {
            for (const zone of retainedBy) {
                deleteFromZone(zone);
            }
        }
    };
}

// -------------------------------------------------------------------------------------
// Node lifecycle helpers
// -------------------------------------------------------------------------------------

function initializeNodeIfNewToStore(
    store: Store,
    treeState: TreeState,
    key: NodeKey,
    trigger: Trigger,
): void {
    const storeState = store.getState();
    if (storeState.nodeCleanupFunctions.has(key)) {
        return;
    }
    const node = getNode(key);
    const retentionCleanup = initializeRetentionForNode(store, key, node.retainedBy);
    const nodeCleanup = node.init(store, treeState, trigger);

    storeState.nodeCleanupFunctions.set(key, () => {
        nodeCleanup();
        retentionCleanup();
    });
}

export function initializeNode(store: Store, key: NodeKey, trigger: Trigger): void {
    initializeNodeIfNewToStore(store, store.getState().currentTree, key, trigger);
}

export function cleanUpNode(store: Store, key: NodeKey): void {
    const state = store.getState();
    state.nodeCleanupFunctions.get(key)?.();
    state.nodeCleanupFunctions.delete(key);
}

// -------------------------------------------------------------------------------------
// Load / peek helpers
// -------------------------------------------------------------------------------------

export function getNodeLoadable<T>(store: Store, state: TreeState, key: NodeKey): Loadable<T> {
    initializeNodeIfNewToStore(store, state, key, 'get');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getNode(key) as any).get(store, state) as Loadable<T>;
}

export function peekNodeLoadable<T>(store: Store, state: TreeState, key: NodeKey): Loadable<T> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getNode(key) as any).peek(store, state) as Loadable<T> | undefined;
}

// -------------------------------------------------------------------------------------
// Write helpers
// -------------------------------------------------------------------------------------

export function setNodeValue<T>(
    store: Store,
    state: TreeState,
    key: NodeKey,
    newValue: T | DefaultValue,
): AtomWrites {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node: any = getNode(key);
    if (node.set == null) {
        throw new ReadOnlyRecoilValueError(`Attempt to set read-only RecoilValue: ${key}`);
    }
    initializeNodeIfNewToStore(store, state, key, 'set');
    return node.set(store, state, newValue);
}

// Write value directly to state bypassing the Node interface (used by snapshots)
export function setUnvalidatedAtomValue_DEPRECATED(
    state: TreeState,
    key: NodeKey,
    newValue: unknown,
): TreeState {
    const node = getNodeMaybe(key);
    node?.invalidate?.(state);

    return {
        ...state,
        atomValues: state.atomValues.clone().delete(key),
        nonvalidatedAtoms: state.nonvalidatedAtoms.clone().set(key, newValue),
        dirtyAtoms: setByAddingToSet(state.dirtyAtoms, key),
    };
}

// -------------------------------------------------------------------------------------
// Debug helpers (peekNodeInfo)
// -------------------------------------------------------------------------------------

type ComponentInfo = {
    name: string;
};

export type RecoilValueInfo<T> = {
    loadable: Loadable<T> | null;
    isActive: boolean;
    isSet: boolean;
    isModified: boolean;
    type: 'atom' | 'selector';
    deps: Iterable<RecoilValue<unknown>>;
    subscribers: {
        nodes: Iterable<RecoilValue<unknown>>;
        components: Iterable<ComponentInfo>;
    };
};

export function peekNodeInfo<T>(
    store: Store,
    state: TreeState,
    key: NodeKey,
): RecoilValueInfo<T> {
    const storeState = store.getState();
    const graph = store.getGraph(state.version);
    const type = getNode(key).nodeType;

    return lazyProxy(
        { type } as Partial<RecoilValueInfo<T>>,
        {
            loadable: () => peekNodeLoadable<T>(store, state, key) ?? null,
            isActive: () => storeState.knownAtoms.has(key) || storeState.knownSelectors.has(key),
            isSet: () => (type === 'selector' ? false : state.atomValues.has(key)),
            isModified: () => state.dirtyAtoms.has(key),
            deps: () => recoilValuesForKeys(graph.nodeDeps.get(key) ?? []),
            subscribers: () => ({
                nodes: recoilValuesForKeys(
                    filterIterable(getDownstreamNodes(store, state, new Set([key])), n => n !== key),
                ),
                components: mapIterable(
                    storeState.nodeToComponentSubscriptions.get(key)?.values() ?? [],
                    ([name]) => ({ name }),
                ),
            }),
        },
    ) as unknown as RecoilValueInfo<T>;
}

// -------------------------------------------------------------------------------------
// Dependency graph traversal
// -------------------------------------------------------------------------------------

export function getDownstreamNodes(
    store: Store,
    state: TreeState,
    keys: ReadonlySet<NodeKey> | ReadonlyArray<NodeKey>,
): ReadonlySet<NodeKey> {
    const visitedNodes = new Set<NodeKey>();
    const visiting: NodeKey[] = Array.from(keys);
    const graph = store.getGraph(state.version);

    while (visiting.length) {
        const key = visiting.pop() as NodeKey;
        if (visitedNodes.has(key)) continue;

        visitedNodes.add(key);
        const subs = graph.nodeToNodeSubscriptions.get(key) ?? (emptySet as ReadonlySet<NodeKey>);
        for (const downstream of subs) {
            if (!visitedNodes.has(downstream)) visiting.push(downstream);
        }
    }
    return visitedNodes;
}

// -------------------------------------------------------------------------------------
// TreeState helper (clone)
// -------------------------------------------------------------------------------------

export function copyTreeState(state: TreeState): TreeState {
    return {
        ...state,
        atomValues: state.atomValues.clone(),
        nonvalidatedAtoms: state.nonvalidatedAtoms.clone(),
        dirtyAtoms: new Set(state.dirtyAtoms),
    };
}

export function invalidateDownstreams(store: Store, state: TreeState): void {
    const downstreams = getDownstreamNodes(store, state, state.dirtyAtoms);
    for (const key of downstreams) {
        getNodeMaybe(key)?.invalidate?.(state);
    }
} 