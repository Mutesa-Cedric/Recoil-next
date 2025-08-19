/**
 * TypeScript port of Recoil_atomWithFallback-test.js
 */

import {describe, test, expect, beforeEach} from 'vitest';

import type {Store} from '../../core/State';
import type {RecoilState, RecoilValue} from '../../core/RecoilValue';

import {atom} from '../atom';
import {constSelector} from '../constSelector';
import {selector} from '../selector';
import {persistentMap} from '../../adt/PersistentMap';
import {getNextStoreID, getNextTreeStateVersion} from '../../core/Keys';
import {
  getRecoilValueAsLoadable,
  setRecoilValue,
} from '../../core/RecoilValueInterface';
import {DefaultValue} from '../../core/Node';

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

beforeEach(() => {
  store = makeStore();
});

function get<T>(recoilValue: RecoilValue<T>): T {
  const loadable = getRecoilValueAsLoadable(store, recoilValue);
  if (loadable.state === 'hasError') {
    throw loadable.contents;
  }
  return loadable.contents as T;
}

function set<T>(recoilState: RecoilState<T>, value: T | DefaultValue): void {
  setRecoilValue(store, recoilState, value);
}

let id = 0;

describe('atomWithFallback', () => {
  test('atom with fallback to another atom', () => {
    const fallbackAtom = atom<number>({key: `fallback${id}`, default: 1});
    const hasFallbackAtom = atom<number>({
      key: `hasFallback${id++}`,
      default: fallbackAtom,
    });

    // Should get the fallback value initially
    expect(get(hasFallbackAtom)).toEqual(1);
    expect(get(fallbackAtom)).toEqual(1);

    // Setting the fallback atom should affect the dependent atom
    set(fallbackAtom, 2);
    expect(get(hasFallbackAtom)).toEqual(2);
    expect(get(fallbackAtom)).toEqual(2);

    // Setting the dependent atom directly should override the fallback
    set(hasFallbackAtom, 3);
    expect(get(hasFallbackAtom)).toEqual(3);
    expect(get(fallbackAtom)).toEqual(2); // Fallback atom unchanged
  });

  test('atom with fallback to selector', () => {
    const baseAtom = atom<number>({key: `base${id++}`, default: 10});
    const fallbackSelector = selector<number>({
      key: `fallbackSelector${id}`,
      get: ({get}) => get(baseAtom) * 2,
    });
    const atomWithSelectorFallback = atom<number>({
      key: `atomWithSelectorFallback${id++}`,
      default: fallbackSelector,
    });

    // Should get the computed fallback value
    expect(get(atomWithSelectorFallback)).toEqual(20);

    // Changing the base should affect the fallback and the dependent atom
    set(baseAtom, 15);
    expect(get(atomWithSelectorFallback)).toEqual(30);

    // Setting the atom directly should override the fallback
    set(atomWithSelectorFallback, 100);
    expect(get(atomWithSelectorFallback)).toEqual(100);

    // Changing the base should not affect the atom after it's been set
    set(baseAtom, 20);
    expect(get(atomWithSelectorFallback)).toEqual(100);
  });

  test('atom with fallback to constant selector', () => {
    const fallbackConstant = constSelector('CONSTANT');
    const atomWithConstantFallback = atom<string>({
      key: `atomWithConstantFallback${id++}`,
      default: fallbackConstant,
    });

    expect(get(atomWithConstantFallback)).toEqual('CONSTANT');

    // Setting the atom should work
    set(atomWithConstantFallback, 'OVERRIDDEN');
    expect(get(atomWithConstantFallback)).toEqual('OVERRIDDEN');
  });

  test('resetting atom with fallback', () => {
    const fallbackAtom = atom<number>({key: `resetFallback${id}`, default: 42});
    const atomWithFallback = atom<number>({
      key: `resetAtomWithFallback${id++}`,
      default: fallbackAtom,
    });

    // Initial value from fallback
    expect(get(atomWithFallback)).toEqual(42);

    // Set a value
    set(atomWithFallback, 99);
    expect(get(atomWithFallback)).toEqual(99);

    // Reset should go back to fallback
    set(atomWithFallback, new DefaultValue());
    expect(get(atomWithFallback)).toEqual(42);

    // Change fallback and verify it's used after reset
    set(fallbackAtom, 123);
    expect(get(atomWithFallback)).toEqual(123);
  });

  test('nested atom fallbacks', () => {
    const baseAtom = atom<number>({key: `nestedBase${id}`, default: 1});
    const middleAtom = atom<number>({
      key: `nestedMiddle${id}`,
      default: baseAtom,
    });
    const topAtom = atom<number>({
      key: `nestedTop${id++}`,
      default: middleAtom,
    });

    // All should have the same value initially
    expect(get(topAtom)).toEqual(1);
    expect(get(middleAtom)).toEqual(1);
    expect(get(baseAtom)).toEqual(1);

    // Changing the base should propagate up
    set(baseAtom, 2);
    expect(get(topAtom)).toEqual(2);
    expect(get(middleAtom)).toEqual(2);
    expect(get(baseAtom)).toEqual(2);

    // Setting middle should only affect top
    set(middleAtom, 3);
    expect(get(topAtom)).toEqual(3);
    expect(get(middleAtom)).toEqual(3);
    expect(get(baseAtom)).toEqual(2);

    // Setting top should only affect top
    set(topAtom, 4);
    expect(get(topAtom)).toEqual(4);
    expect(get(middleAtom)).toEqual(3);
    expect(get(baseAtom)).toEqual(2);
  });
});
