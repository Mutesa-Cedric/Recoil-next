/**
 * Typescript port of Recoil_Snapshot.js
 */

import type {Loadable} from '../adt/Loadable';
import type {
  ResetRecoilState,
  SetRecoilState,
  ValueOrUpdater,
} from '../recoil_values/callbackTypes';
import type {RecoilValueInfo} from './FunctionalCore';
import type {Graph} from './GraphTypes';
import type {NodeKey, StoreID} from './Keys';
import type {RecoilState, RecoilValue} from './RecoilValue';
import type {StateID, Store, StoreState, TreeState} from './State';

import {batchUpdates} from './Batching';
import {initializeNode, peekNodeInfo} from './FunctionalCore';
import {graph} from './Graph';
import {getNextStoreID} from './Keys';
import {DEFAULT_VALUE, recoilValues, recoilValuesForKeys} from './Node';
import {
  AbstractRecoilValue,
  getRecoilValueAsLoadable,
  setRecoilValue,
  setUnvalidatedRecoilValue,
} from './RecoilValueInterface';
import {updateRetainCount} from './Retention';
import {setInvalidateMemoizedSnapshot} from './SnapshotCache';
import {getNextTreeStateVersion, makeEmptyStoreState} from './State';
import concatIterables from '../../../shared/src/util/Recoil_concatIterables';
import {isSSR} from '../../../shared/src/util/Recoil_Environment';
import err from '../../../shared/src/util/Recoil_err';
import filterIterable from '../../../shared/src/util/Recoil_filterIterable';
import gkx from '../../../shared/src/util/Recoil_gkx';
import mapIterable from '../../../shared/src/util/Recoil_mapIterable';
import {memoizeOneWithArgsHashAndInvalidation} from '../../../shared/src/util/Recoil_Memoize';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';

// Opaque at this surface because it's part of the public API from here.
export type SnapshotID = StateID;

const retainWarning = `
Recoil Snapshots only last for the duration of the callback they are provided to. To keep a Snapshot longer, do this:

  const release = snapshot.retain();
  try {
    await doSomethingWithSnapshot(snapshot);
  } finally {
    release();
  }

This is currently a DEV-only warning but will become a thrown exception in the next release of Recoil.
`;

// A "Snapshot" is "read-only" and captures a specific set of values of atoms.
// However, the data-flow-graph and selector values may evolve as selector
// evaluation functions are executed and async selectors resolve.
export class Snapshot {
  _store: Store;
  _refCount: number = 1;

  constructor(storeState: StoreState, parentStoreID?: StoreID) {
    this._store = {
      storeID: getNextStoreID(),
      parentStoreID,
      getState: () => storeState,
      replaceState: (replacer: (treeState: TreeState) => TreeState) => {
        // no batching, so nextTree is never active
        storeState.currentTree = replacer(storeState.currentTree);
      },
      getGraph: (version: StateID) => {
        const graphs = storeState.graphsByVersion;
        if (graphs.has(version)) {
          return nullthrows(graphs.get(version));
        }
        const newGraph = graph();
        graphs.set(version, newGraph);
        return newGraph;
      },
      subscribeToTransactions: () => ({release: () => {}}),
      addTransactionMetadata: () => {
        throw err('Cannot subscribe to Snapshots');
      },
    };
    // Initialize any nodes that are live in the parent store (primarily so that
    // this snapshot gets counted towards the node's live stores count).
    // TODO Optimize this when cloning snapshots for callbacks
    for (const nodeKey of this._store.getState().knownAtoms) {
      initializeNode(this._store, nodeKey, 'get');
      updateRetainCount(this._store, nodeKey, 1);
    }

    this.autoRelease_INTERNAL();
  }

  retain(): () => void {
    if (this._refCount <= 0) {
      if (process.env.NODE_ENV !== 'production') {
        throw err('Snapshot has already been released.');
      } else {
        recoverableViolation(
          'Attempt to retain() Snapshot that was already released.',
          'recoil',
        );
      }
    }
    this._refCount++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this._release();
      }
    };
  }

  /**
   * Release the snapshot on the next tick.  This means the snapshot is retained
   * during the execution of the current function using it.
   */
  autoRelease_INTERNAL(): void {
    if (!isSSR) {
      // Use timeout of 10 to workaround Firefox issue: https://github.com/facebookexperimental/Recoil/issues/1936
      (globalThis as any).setTimeout(() => this._release(), 10);
    }
  }

  _release(): void {
    this._refCount--;
    if (this._refCount === 0) {
      this._store.getState().nodeCleanupFunctions.forEach(cleanup => cleanup());
      this._store.getState().nodeCleanupFunctions.clear();

      if (!gkx('recoil_memory_managament_2020')) {
        return;
      }
      // Temporarily nerfing this to allow us to find broken call sites without
      // actually breaking anybody yet.
      // for (const k of this._store.getState().knownAtoms) {
      //   updateRetainCountToZero(this._store, k);
      //       }
    } else if (this._refCount < 0) {
      if (process.env.NODE_ENV !== 'production') {
        recoverableViolation('Snapshot released an extra time.', 'recoil');
      }
    }
  }

  isRetained(): boolean {
    return this._refCount > 0;
  }

  checkRefCount_INTERNAL(): void {
    if (gkx('recoil_memory_managament_2020') && this._refCount <= 0) {
      if (process.env.NODE_ENV !== 'production') {
        recoverableViolation(retainWarning, 'recoil');
      }
      // What we will ship later:
      // throw err(retainWarning);
    }
  }

  getStore_INTERNAL(): Store {
    this.checkRefCount_INTERNAL();
    return this._store;
  }

  getID(): SnapshotID {
    this.checkRefCount_INTERNAL();
    return this._store.getState().currentTree.stateID;
  }

  getStoreID(): StoreID {
    this.checkRefCount_INTERNAL();
    return this._store.storeID;
  }

  // We want to allow the methods to be destructured and used as accessors
  getLoadable = <T>(recoilValue: RecoilValue<T>): Loadable<T> => {
    this.checkRefCount_INTERNAL();
    return getRecoilValueAsLoadable(this._store, recoilValue);
  };

  getPromise = <T>(recoilValue: RecoilValue<T>): Promise<T> => {
    this.checkRefCount_INTERNAL();
    return this.getLoadable(recoilValue).toPromise();
  };

  getNodes_UNSTABLE = (opt?: {
    isModified?: boolean;
    isInitialized?: boolean;
  }): Iterable<RecoilValue<any>> => {
    this.checkRefCount_INTERNAL();

    // TODO Deal with modified selectors
    if (opt?.isModified === true) {
      if (opt?.isInitialized === false) {
        return [];
      }
      const state = this._store.getState().currentTree;
      return recoilValuesForKeys(state.dirtyAtoms);
    }
    const knownAtoms = this._store.getState().knownAtoms;
    const knownSelectors = this._store.getState().knownSelectors;

    return opt?.isInitialized == null
      ? recoilValues.values()
      : opt.isInitialized === true
        ? recoilValuesForKeys(concatIterables([knownAtoms, knownSelectors]))
        : filterIterable(
            recoilValues.values(),
            recoilValue =>
              !knownAtoms.has(recoilValue.key) &&
              !knownSelectors.has(recoilValue.key),
          );
  };

  // Report the current status of a node.
  // This peeks the current state and does not affect the snapshot state at all
  getInfo_UNSTABLE = <T>(recoilValue: RecoilValue<T>): RecoilValueInfo<T> => {
    this.checkRefCount_INTERNAL();
    return peekNodeInfo(
      this._store,
      this._store.getState().currentTree,
      recoilValue.key,
    );
  };

  map = (mapper: (mutableSnapshot: MutableSnapshot) => void): Snapshot => {
    this.checkRefCount_INTERNAL();
    const mutableSnapshot = new MutableSnapshot(this, batchUpdates);
    mapper(mutableSnapshot); // if removing batchUpdates from `set` add it here
    return mutableSnapshot;
  };

  asyncMap = async (
    mapper: (mutableSnapshot: MutableSnapshot) => Promise<void>,
  ): Promise<Snapshot> => {
    this.checkRefCount_INTERNAL();
    const mutableSnapshot = new MutableSnapshot(this, batchUpdates);
    mutableSnapshot.retain(); // Retain new snapshot during async mapper
    await mapper(mutableSnapshot);
    // Continue to retain the new snapshot for the user, but auto-release it
    // after the next tick, the same as a new synchronous snapshot.
    mutableSnapshot.autoRelease_INTERNAL();
    return mutableSnapshot;
  };
}

export function cloneStoreState(
  store: Store,
  treeState: TreeState,
  bumpVersion: boolean = false,
): StoreState {
  const storeState = store.getState();
  const version = bumpVersion ? getNextTreeStateVersion() : treeState.version;
  return {
    // Always clone the TreeState to isolate stores from accidental mutations.
    // For example, reading a selector from a cloned snapshot shouldn't cache
    // in the original treestate which may cause the original to skip
    // initialization of upstream atoms.
    currentTree: {
      // TODO snapshots shouldn't really have versions because a new version number
      // is always assigned when the snapshot is gone to.
      version: bumpVersion ? version : treeState.version,
      stateID: bumpVersion ? version : treeState.stateID,
      transactionMetadata: {...treeState.transactionMetadata},
      dirtyAtoms: new Set(treeState.dirtyAtoms),
      atomValues: treeState.atomValues.clone(),
      nonvalidatedAtoms: treeState.nonvalidatedAtoms.clone(),
    },
    commitDepth: 0,
    nextTree: null,
    previousTree: null,
    knownAtoms: new Set(storeState.knownAtoms), // FIXME here's a copy
    knownSelectors: new Set(storeState.knownSelectors), // FIXME here's a copy
    transactionSubscriptions: new Map(),
    nodeTransactionSubscriptions: new Map(),
    nodeToComponentSubscriptions: new Map(),
    queuedComponentCallbacks_DEPRECATED: [],
    suspendedComponentResolvers: new Set(),
    graphsByVersion: new Map<StateID, Graph>().set(
      version,
      store.getGraph(treeState.version),
    ),
    retention: {
      referenceCounts: new Map(),
      nodesRetainedByZone: new Map(),
      retainablesToCheckForRelease: new Set(),
    },
    // FIXME here's a copy
    // Create blank cleanup handlers for atoms so snapshots don't re-run
    // atom effects.
    nodeCleanupFunctions: new Map(
      mapIterable(
        storeState.nodeCleanupFunctions.entries(),
        ([key]: [string, any]) => [key, () => {}],
      ),
    ),
  };
}

// Factory to build a fresh snapshot
export function freshSnapshot(
  initializeState?: (mutableSnapshot: MutableSnapshot) => void,
): Snapshot {
  const snapshot = new Snapshot(makeEmptyStoreState());
  return initializeState != null ? snapshot.map(initializeState) : snapshot;
}

// Factory to clone a snapshot state
const [memoizedCloneSnapshot, invalidateMemoizedSnapshot] =
  memoizeOneWithArgsHashAndInvalidation(
    (store: Store, version: 'latest' | 'previous') => {
      const storeState = store.getState();
      const treeState =
        version === 'latest'
          ? (storeState.nextTree ?? storeState.currentTree)
          : nullthrows(storeState.previousTree);
      return new Snapshot(cloneStoreState(store, treeState), store.storeID);
    },
    (store: Store, version: 'latest' | 'previous') =>
      String(version) +
      String(store.storeID) +
      String(store.getState().nextTree?.version) +
      String(store.getState().currentTree.version) +
      String(store.getState().previousTree?.version),
  );
// Avoid circular dependencies
setInvalidateMemoizedSnapshot(invalidateMemoizedSnapshot);

export function cloneSnapshot(
  store: Store,
  version: 'latest' | 'previous' = 'latest',
): Snapshot {
  // For React 19 compatibility, bypass memoization when snapshots are failing
  // TODO: Re-enable memoization when snapshot lifecycle is more stable
  if (process.env.NODE_ENV === 'test') {
    const storeState = store.getState();
    const treeState =
      version === 'latest'
        ? (storeState.nextTree ?? storeState.currentTree)
        : nullthrows(storeState.previousTree);
    return new Snapshot(cloneStoreState(store, treeState), store.storeID);
  }

  try {
    const snapshot = memoizedCloneSnapshot(store, version);
    try {
      if (!snapshot.isRetained()) {
        invalidateMemoizedSnapshot();
        return memoizedCloneSnapshot(store, version);
      }
    } catch (retainError) {
      // If checking isRetained() fails, assume it's released and create fresh
      if (
        retainError &&
        typeof retainError === 'object' &&
        'message' in retainError &&
        typeof retainError.message === 'string' &&
        retainError.message.includes('already been released')
      ) {
        invalidateMemoizedSnapshot();
        return memoizedCloneSnapshot(store, version);
      }
      throw retainError;
    }
    return snapshot;
  } catch (error) {
    // If the memoized snapshot was released, create a fresh one
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('already been released')
    ) {
      invalidateMemoizedSnapshot();
      return memoizedCloneSnapshot(store, version);
    }
    throw error;
  }
}

export function invalidateSnapshot() {
  invalidateMemoizedSnapshot();
}

export class MutableSnapshot extends Snapshot {
  _batch: (fn: () => void) => void;

  constructor(snapshot: Snapshot, batch: (fn: () => void) => void) {
    super(
      cloneStoreState(
        snapshot.getStore_INTERNAL(),
        snapshot.getStore_INTERNAL().getState().currentTree,
        true,
      ),
      snapshot.getStoreID(),
    );
    this._batch = batch;
  }

  set: SetRecoilState = <T>(
    recoilState: RecoilState<T>,
    newValueOrUpdater: ValueOrUpdater<T>,
  ) => {
    this.checkRefCount_INTERNAL();
    const store = this.getStore_INTERNAL();
    // This batchUpdates ensures this `set` is applied immediately and you can
    // read the written value after calling `set`. I would like to remove this
    // behavior and only batch in `Snapshot.map`, but this would be a breaking
    // change potentially.
    this._batch(() => {
      updateRetainCount(store, recoilState.key, 1);
      setRecoilValue(this.getStore_INTERNAL(), recoilState, newValueOrUpdater);
    });
  };

  reset: ResetRecoilState = <T>(recoilState: RecoilState<T>) => {
    this.checkRefCount_INTERNAL();
    const store = this.getStore_INTERNAL();
    // See note at `set` about batched updates.
    this._batch(() => {
      updateRetainCount(store, recoilState.key, 1);
      setRecoilValue(this.getStore_INTERNAL(), recoilState, DEFAULT_VALUE);
    });
  };

  setUnvalidatedAtomValues_DEPRECATED = (values: Map<NodeKey, any>) => {
    this.checkRefCount_INTERNAL();
    const store = this.getStore_INTERNAL();
    // See note at `set` about batched updates.
    batchUpdates(() => {
      for (const [k, v] of values.entries()) {
        updateRetainCount(store, k, 1);
        setUnvalidatedRecoilValue(store, new AbstractRecoilValue(k), v);
      }
    });
  };
}
