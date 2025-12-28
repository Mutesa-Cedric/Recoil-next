/*
 * TypeScript port of Recoil_State.js – central state container definitions.
 */

import {Loadable} from '../adt/Loadable';
import {persistentMap, PersistentMap} from '../adt/PersistentMap';
import {graph as makeGraph} from './Graph';
import type {Graph} from './GraphTypes';
import {
  ComponentID,
  NodeKey,
  StateID,
  StoreID,
  getNextTreeStateVersion,
} from './Keys';
import {RetentionZone} from './RetentionZone';

/* -------------------------------------------------------------------------- */
// Type definitions
/* -------------------------------------------------------------------------- */

export type {ComponentID, NodeKey, StateID, StoreID} from './Keys';

export type AtomValues = PersistentMap<NodeKey, Loadable<unknown>>;
export type AtomWrites = Map<NodeKey, Loadable<unknown>>;

type ComponentCallback = (treeState: TreeState) => void;

export type Retainable = RetentionZone | NodeKey;

export interface TreeState {
  /**
   * Version always increments when moving from one state to another, even
   * if the same state has been seen before.
   */
  version: StateID;

  /**
   * State ID usually increments, but when going to a snapshot that was
   * previously rendered the state ID will be re-used.
   */
  stateID: StateID;

  transactionMetadata: Record<string, unknown>;

  // Atoms:
  dirtyAtoms: Set<NodeKey>;
  atomValues: AtomValues;
  nonvalidatedAtoms: PersistentMap<NodeKey, unknown>;
}

export interface StoreState {
  currentTree: TreeState;
  nextTree: TreeState | null;
  previousTree: TreeState | null;
  commitDepth: number;

  knownAtoms: Set<NodeKey>;
  knownSelectors: Set<NodeKey>;

  // Retention management
  retention: {
    referenceCounts: Map<NodeKey | RetentionZone, number>;
    nodesRetainedByZone: Map<RetentionZone, Set<NodeKey>>;
    retainablesToCheckForRelease: Set<Retainable>;
  };

  nodeCleanupFunctions: Map<NodeKey, () => void>;

  nodeToComponentSubscriptions: Map<
    NodeKey,
    Map<ComponentID, [string, ComponentCallback]>
  >;

  graphsByVersion: Map<StateID, Graph>;

  // Subscriptions
  transactionSubscriptions: Map<number, (store: Store) => void>;
  nodeTransactionSubscriptions: Map<
    NodeKey,
    Map<number, (store: Store) => void>
  >;

  queuedComponentCallbacks_DEPRECATED: ComponentCallback[];
  suspendedComponentResolvers: Set<() => void>;
}

export interface Store {
  storeID: StoreID;
  parentStoreID?: StoreID;
  getState(): StoreState;
  replaceState(cb: (treeState: TreeState) => TreeState): void;
  getGraph(version: StateID): Graph;
  subscribeToTransactions(
    callback: (store: Store) => void,
    nodeKey?: NodeKey,
  ): {release: () => void};
  addTransactionMetadata(metadata: Record<string, unknown>): void;
  skipCircularDependencyDetection_DANGEROUS?: boolean;
}

export interface StoreRef {
  current: Store;
}

/* -------------------------------------------------------------------------- */
// Factory helpers
/* -------------------------------------------------------------------------- */

export function makeEmptyTreeState(): TreeState {
  const version = getNextTreeStateVersion();
  return {
    version,
    stateID: version,
    transactionMetadata: {},
    dirtyAtoms: new Set(),
    atomValues: persistentMap(),
    nonvalidatedAtoms: persistentMap(),
  };
}

export function makeEmptyStoreState(): StoreState {
  const currentTree = makeEmptyTreeState();
  return {
    currentTree,
    nextTree: null,
    previousTree: null,
    commitDepth: 0,
    knownAtoms: new Set(),
    knownSelectors: new Set(),
    transactionSubscriptions: new Map(),
    nodeTransactionSubscriptions: new Map(),
    nodeToComponentSubscriptions: new Map(),
    queuedComponentCallbacks_DEPRECATED: [],
    suspendedComponentResolvers: new Set(),
    graphsByVersion: new Map<StateID, Graph>().set(
      currentTree.version,
      makeGraph(),
    ),
    retention: {
      referenceCounts: new Map(),
      nodesRetainedByZone: new Map(),
      retainablesToCheckForRelease: new Set(),
    },
    nodeCleanupFunctions: new Map(),
  };
}

/* -------------------------------------------------------------------------- */
// Public exports
/* -------------------------------------------------------------------------- */

export {getNextTreeStateVersion};
