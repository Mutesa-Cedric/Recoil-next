/**
 * TypeScript port of Recoil_Snapshot-test.js
 */

import { describe, test, expect, beforeEach } from 'vitest';

import type { Snapshot } from '../Snapshot';
import type { RecoilState, RecoilValueReadOnly } from '../RecoilValue';
import type { Store } from '../State';

import { atom } from '../../recoil_values/atom';
import { constSelector } from '../../recoil_values/constSelector';
import { selector } from '../../recoil_values/selector';
import { freshSnapshot } from '../Snapshot';
import { persistentMap } from '../../adt/PersistentMap';
import { getNextStoreID, getNextTreeStateVersion } from '../Keys';

// Create a proper mock store for testing (same pattern as other tests)
function makeStore(): Store {
  const storeState = {
    currentTree: {
      version: getNextTreeStateVersion(),
      stateID: getNextTreeStateVersion(),
      transactionMetadata: {},
      dirtyAtoms: new Set<string>(),
      atomValues: persistentMap(),
      nonvalidatedAtoms: persistentMap(),
    },
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
    graphsByVersion: new Map(),
    retention: {
      referenceCounts: new Map(),
      nodesRetainedByZone: new Map(),
      retainablesToCheckForRelease: new Set(),
    },
    nodeCleanupFunctions: new Map(),
  } as any; // Cast to avoid complex type alignment for test mock

  const store: Store = {
    storeID: getNextStoreID(),
    getState: () => storeState,
    replaceState: (replacer) => {
      const currentStoreState = store.getState();
      currentStoreState.currentTree = replacer(currentStoreState.currentTree);
    },
    getGraph: (version) => {
      const graphs = storeState.graphsByVersion;
      if (graphs.has(version)) {
        return graphs.get(version)!;
      }
      const newGraph = { nodeDeps: new Map(), nodeToNodeSubscriptions: new Map() };
      graphs.set(version, newGraph);
      return newGraph;
    },
    subscribeToTransactions: () => {
      return { release: () => {} };
    },
    addTransactionMetadata: () => {
      // no-op in test mock
    },
  };
  
  return store;
}

let store: Store;

beforeEach(() => {
  store = makeStore();
});

// Use this to spread proxy results into an object for Jest's toMatchObject()
function getInfo(
  snapshot: Snapshot,
  node: RecoilState<string> | RecoilValueReadOnly<string>,
) {
  return {...snapshot.getInfo_UNSTABLE(node)};
}

describe('Snapshot', () => {
  test('getNodes', () => {
    const snapshot = freshSnapshot();
    const { getNodes_UNSTABLE } = snapshot;
    expect(Array.from(getNodes_UNSTABLE()).length).toEqual(0);
    expect(Array.from(getNodes_UNSTABLE({ isInitialized: true })).length).toEqual(0);

    // Test atoms
    const myAtom = atom({ key: 'snapshot getNodes atom', default: 'DEFAULT' });
    expect(Array.from(getNodes_UNSTABLE()).length).toEqual(1);
    expect(Array.from(getNodes_UNSTABLE({ isInitialized: true })).length).toEqual(0);
    expect(snapshot.getLoadable(myAtom).contents).toEqual('DEFAULT');
    const nodesAfterGet = Array.from(getNodes_UNSTABLE());
    expect(nodesAfterGet.length).toEqual(1);
    expect(nodesAfterGet[0]).toBe(myAtom);
    expect(snapshot.getLoadable(nodesAfterGet[0]).contents).toEqual('DEFAULT');

    // Test selectors
    const mySelector = selector({
      key: 'snapshot getNodes selector',
      get: ({ get }) => get(myAtom) + '-SELECTOR',
    });
    expect(Array.from(getNodes_UNSTABLE()).length).toEqual(2);
    expect(Array.from(getNodes_UNSTABLE({ isInitialized: true })).length).toEqual(1);
    expect(snapshot.getLoadable(mySelector).contents).toEqual('DEFAULT-SELECTOR');
    expect(Array.from(getNodes_UNSTABLE({ isInitialized: true })).length).toEqual(2);
  });

  test('getLoadable', () => {
    const snapshot = freshSnapshot();

    // Test atom
    const myAtom = atom({ key: 'snapshot getLoadable atom', default: 'DEFAULT' });
    const loadable = snapshot.getLoadable(myAtom);
    expect(loadable.state).toBe('hasValue');
    expect(loadable.contents).toEqual('DEFAULT');

    // Test selector
    const mySelector = selector({
      key: 'snapshot getLoadable selector',
      get: ({ get }) => get(myAtom) + '-SELECTOR',
    });
    const selectorLoadable = snapshot.getLoadable(mySelector);
    expect(selectorLoadable.state).toBe('hasValue');
    expect(selectorLoadable.contents).toEqual('DEFAULT-SELECTOR');
  });

  test('getPromise', () => {
    const snapshot = freshSnapshot();

    const myAtom = atom({ key: 'snapshot getPromise atom', default: 'DEFAULT' });
    return snapshot.getPromise(myAtom).then(value => {
      expect(value).toEqual('DEFAULT');
    });
  });

  test('getInfo_UNSTABLE', () => {
    const snapshot = freshSnapshot();

    const myAtom = atom({ key: 'snapshot getInfo atom', default: 'DEFAULT' });
    const info = getInfo(snapshot, myAtom);
    expect(info.type).toBe('atom');
    expect(info.isSet).toBe(false);
    expect(info.isModified).toBe(false);
    expect(info.loadable?.state).toBe('hasValue');
    expect(info.loadable?.contents).toEqual('DEFAULT');
  });

  test('map', () => {
    const snapshot = freshSnapshot();
    const myAtom = atom({ key: 'snapshot map atom', default: 'DEFAULT' });

    const newSnapshot = snapshot.map(({ set }) => {
      set(myAtom, 'MAPPED');
    });

    expect(snapshot.getLoadable(myAtom).contents).toEqual('DEFAULT');
    expect(newSnapshot.getLoadable(myAtom).contents).toEqual('MAPPED');
  });

  test('asyncMap', async () => {
    const snapshot = freshSnapshot();
    const myAtom = atom({ key: 'snapshot asyncMap atom', default: 'DEFAULT' });

    const newSnapshot = await snapshot.asyncMap(async ({ set }) => {
      await Promise.resolve(); // Simulate async operation
      set(myAtom, 'ASYNC_MAPPED');
    });

    expect(snapshot.getLoadable(myAtom).contents).toEqual('DEFAULT');
    expect(newSnapshot.getLoadable(myAtom).contents).toEqual('ASYNC_MAPPED');
  });
}); 