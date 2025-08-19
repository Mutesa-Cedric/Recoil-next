/**
 * TypeScript port of Recoil_core-test.js
 */

import {describe, test, expect, beforeEach} from 'vitest';

import type {Store} from '../State';

import {atom} from '../../recoil_values/atom';
import {persistentMap} from '../../adt/PersistentMap';
import {getNextStoreID, getNextTreeStateVersion} from '../Keys';
import {getNodeLoadable, setNodeValue} from '../FunctionalCore';
import nullthrows from '../../../../shared/src/util/Recoil_nullthrows';

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
    replaceState: replacer => {
      const currentStoreState = store.getState();
      currentStoreState.currentTree = replacer(currentStoreState.currentTree);
    },
    getGraph: version => {
      const graphs = storeState.graphsByVersion;
      if (graphs.has(version)) {
        return graphs.get(version)!;
      }
      const newGraph = {
        nodeDeps: new Map(),
        nodeToNodeSubscriptions: new Map(),
      };
      graphs.set(version, newGraph);
      return newGraph;
    },
    subscribeToTransactions: () => {
      return {release: () => {}};
    },
    addTransactionMetadata: () => {
      // no-op in test mock
    },
  };

  return store;
}

let store: Store;
let testAtom: ReturnType<typeof atom>;

beforeEach(() => {
  store = makeStore();
  testAtom = atom<number>({key: 'testAtom', default: 0});
});

describe('FunctionalCore', () => {
  test('read default value', () => {
    const loadable = getNodeLoadable(
      store,
      store.getState().currentTree,
      testAtom.key,
    );

    expect(loadable).toMatchObject({
      state: 'hasValue',
      contents: 0,
    });
  });

  test('setNodeValue returns written value when writing atom', () => {
    const writes = setNodeValue(
      store,
      store.getState().currentTree,
      testAtom.key,
      1,
    );

    expect(nullthrows(writes.get(testAtom.key)).contents).toBe(1);
  });

  test('read written value', () => {
    // First write a value
    const writes = setNodeValue(
      store,
      store.getState().currentTree,
      testAtom.key,
      42,
    );

    // Apply the writes to a new tree state
    const newState = {...store.getState().currentTree};
    writes.forEach((loadable, key) => {
      newState.atomValues = newState.atomValues.set(key, loadable);
    });

    // Now read the value
    const loadable = getNodeLoadable(store, newState, testAtom.key);

    expect(loadable).toMatchObject({
      state: 'hasValue',
      contents: 42,
    });
  });

  test('multiple atom writes', () => {
    const atomA = atom<string>({key: 'atomA', default: 'defaultA'});
    const atomB = atom<number>({key: 'atomB', default: 100});

    // Write to both atoms
    const writesA = setNodeValue(
      store,
      store.getState().currentTree,
      atomA.key,
      'valueA',
    );
    const writesB = setNodeValue(
      store,
      store.getState().currentTree,
      atomB.key,
      200,
    );

    expect(nullthrows(writesA.get(atomA.key)).contents).toBe('valueA');
    expect(nullthrows(writesB.get(atomB.key)).contents).toBe(200);
  });

  test('atom with object default value', () => {
    const objectAtom = atom<{count: number}>({
      key: 'objectAtom',
      default: {count: 5},
    });

    const loadable = getNodeLoadable(
      store,
      store.getState().currentTree,
      objectAtom.key,
    );

    expect(loadable).toMatchObject({
      state: 'hasValue',
      contents: {count: 5},
    });
  });

  test('atom with null default value', () => {
    const nullAtom = atom<null>({
      key: 'nullAtom',
      default: null,
    });

    const loadable = getNodeLoadable(
      store,
      store.getState().currentTree,
      nullAtom.key,
    );

    expect(loadable).toMatchObject({
      state: 'hasValue',
      contents: null,
    });
  });

  test('atom with undefined default value', () => {
    const undefinedAtom = atom<undefined>({
      key: 'undefinedAtom',
      default: undefined,
    });

    const loadable = getNodeLoadable(
      store,
      store.getState().currentTree,
      undefinedAtom.key,
    );

    expect(loadable).toMatchObject({
      state: 'hasValue',
      contents: undefined,
    });
  });
});
