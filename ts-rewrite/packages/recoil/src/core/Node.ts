/*
 * TypeScript port of Recoil_Node.js – manages node registry.
 * Only the parts needed by the rest of the TypeScript port are implemented for now.
 */

import type { Loadable } from '../adt/Loadable';
import type { RetainedBy } from './RetainedBy';
import type { NodeKey } from './Keys';
import type { RecoilValue } from './RecoilValue';
import type { Store, TreeState } from './State';

import gkx from 'recoil-shared/util/Recoil_gkx';
import mapIterable from 'recoil-shared/util/Recoil_mapIterable';
import nullthrows from 'recoil-shared/util/Recoil_nullthrows';
import RecoilEnv from 'recoil-shared/util/Recoil_RecoilEnv';
import recoverableViolation from 'recoil-shared/util/Recoil_recoverableViolation';

import * as RecoilValueClasses from './RecoilValue';

// -----------------------------------------------------------------------------
// Core types matching the Flow source (pruned)
// -----------------------------------------------------------------------------

export class DefaultValue { }
export const DEFAULT_VALUE = new DefaultValue();

export type NodeType = 'atom' | 'selector';

export type PersistenceType = 'url' | 'other' | 'none';

export type PersistenceInfo = {
    type: PersistenceType;
    backButton?: boolean;
};

export interface ReadOnlyNodeOptions<T> {
    key: NodeKey;
    nodeType: NodeType;
    // Methods required by functional core (we keep them typed but not implemented here)
    peek: (store: Store, treeState: TreeState) => Loadable<T> | undefined;
    get: (store: Store, treeState: TreeState) => Loadable<T>;
    init: (store: Store, treeState: TreeState, trigger: 'get' | 'set') => () => void;
    invalidate: (treeState: TreeState) => void;
    clearCache?: (store: Store, treeState: TreeState) => void;
    shouldRestoreFromSnapshots: boolean;
    dangerouslyAllowMutability?: boolean;
    persistence_UNSTABLE?: PersistenceInfo;
    shouldDeleteConfigOnRelease?: () => boolean;
    retainedBy: RetainedBy;
}

export interface ReadWriteNodeOptions<T> extends ReadOnlyNodeOptions<T> {
    set: (
        store: Store,
        state: TreeState,
        newValue: T | DefaultValue,
    ) => Map<NodeKey, Loadable<unknown>>; // AtomWrites type simplified
}

export type Node<T> = ReadOnlyNodeOptions<T> | ReadWriteNodeOptions<T>;

// Internal maps
const nodes: Map<NodeKey, Node<unknown>> = new Map();
const recoilValues: Map<NodeKey, RecoilValue<unknown>> = new Map();

// Registration helper.
export function registerNode<T>(node: Node<T>): RecoilValue<T> {
    if (RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED) {
        if (nodes.has(node.key)) {
            recoverableViolation(`Duplicate atom key "${node.key}" detected`, 'recoil');
        }
    }
    nodes.set(node.key, node as Node<unknown>);

    const recoilValue: RecoilValue<T> =
        'set' in node && node.set != null
            ? new RecoilValueClasses.RecoilState<T>(node.key)
            : new RecoilValueClasses.RecoilValueReadOnly<T>(node.key);

    recoilValues.set(node.key, recoilValue as RecoilValue<unknown>);
    return recoilValue;
}

export class NodeMissingError extends Error { }

export function getNode(key: NodeKey): Node<unknown> {
    const node = nodes.get(key);
    if (!node) {
        throw new NodeMissingError(`Missing definition for RecoilValue: "${key}"`);
    }
    return node;
}

export function getNodeMaybe(key: NodeKey): Node<unknown> | undefined {
    return nodes.get(key);
}

export function recoilValuesForKeys(keys: Iterable<NodeKey>): Iterable<RecoilValue<unknown>> {
    return mapIterable(keys, key => nullthrows(recoilValues.get(key)));
}

// Config deletion support for family members & memory mgmt (simplified)
const configDeletionHandlers = new Map<NodeKey, () => void>();

export function deleteNodeConfigIfPossible(key: NodeKey): void {
    if (!gkx('recoil_memory_managament_2020')) return;
    const node = nodes.get(key);
    if (node?.shouldDeleteConfigOnRelease?.()) {
        nodes.delete(key);
        configDeletionHandlers.get(key)?.();
        configDeletionHandlers.delete(key);
    }
}

export function setConfigDeletionHandler(key: NodeKey, fn?: () => void): void {
    if (!gkx('recoil_memory_managament_2020')) return;
    if (!fn) {
        configDeletionHandlers.delete(key);
    } else {
        configDeletionHandlers.set(key, fn);
    }
}

export function getConfigDeletionHandler(key: NodeKey): (() => void) | undefined {
    return configDeletionHandlers.get(key);
}

// Public exports replicating original module structure
export { nodes, recoilValues };

export type Trigger = 'get' | 'set'; 