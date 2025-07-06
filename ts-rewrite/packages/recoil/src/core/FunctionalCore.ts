/*
 * Partial TypeScript port of Recoil_FunctionalCore.js.
 *
 * NOTE: Only the surface API required by other migrated modules is implemented for now.
 * The functions provided here are sufficient for type-checking but are NOT fully functional.
 * They should be replaced with complete logic in subsequent iterations.
 */

import type { Loadable } from '../adt/Loadable';
import type { NodeKey, TreeState, Store } from './State';
import type { AtomWrites } from './State';
import { DEFAULT_VALUE, getNode } from './Node';
import nullthrows from 'recoil-shared/util/Recoil_nullthrows';

// -----------------------------------------------------------------------------
// Public helpers – STUB IMPLEMENTATIONS
// -----------------------------------------------------------------------------

export function initializeNode(_store: Store, _key: NodeKey, _trigger: 'get' | 'set'): void {
    /* noop – detailed initialization logic will be added later */
}

export function cleanUpNode(_store: Store, _key: NodeKey): void {
    /* noop */
}

export function getNodeLoadable<T>(_store: Store, _treeState: TreeState, key: NodeKey): Loadable<T> {
    // Very naive implementation: consult treeState.atomValues; otherwise default value
    const loadable = _treeState.atomValues.get(key as string as NodeKey);
    if (loadable) return loadable as Loadable<T>;
    // If not found, treat as default value.
    const { RecoilLoadable } = require('../adt/Loadable');
    return RecoilLoadable.of(DEFAULT_VALUE as unknown as T);
}

export function setNodeValue<T>(
    _store: Store,
    state: TreeState,
    key: NodeKey,
    newValue: T | typeof DEFAULT_VALUE,
): AtomWrites {
    // Simple write into a new Map
    const { loadableWithValue } = require('../adt/Loadable');
    const writes: AtomWrites = new Map();
    const loadable = loadableWithValue(newValue as unknown);
    writes.set(key, loadable);
    // Also update state for convenience (mutation); actual logic will differ
    state.atomValues.set(key, loadable);
    return writes;
}

export function getDownstreamNodes(
    _store: Store,
    _treeState: TreeState,
    nodes: Set<NodeKey>,
): Set<NodeKey> {
    // Simplified: return same set (no graph traversal yet)
    return new Set(nodes);
}

export function invalidateDownstreams(_store: Store, _state: TreeState): void {
    /* noop – placeholder */
}

export function peekNodeInfo(
    _store: Store,
    _treeState: TreeState,
    key: NodeKey,
): unknown {
    // Return minimal info for debugging
    return { key, initialized: _treeState.atomValues.has(key) };
}

// Utility used by RecoilValueInterface to clone tree state (shallow+maps)
export function copyTreeState(state: TreeState): TreeState {
    return {
        ...state,
        atomValues: state.atomValues.clone(),
        nonvalidatedAtoms: state.nonvalidatedAtoms.clone(),
        dirtyAtoms: new Set(state.dirtyAtoms),
    };
}

export function setUnvalidatedAtomValue_DEPRECATED(
    treeState: TreeState,
    key: NodeKey,
    value: unknown,
): TreeState {
    const next = copyTreeState(treeState);
    next.nonvalidatedAtoms.set(key, value);
    next.dirtyAtoms.add(key);
    return next;
}

/* Replace entire file with ported implementation */ 