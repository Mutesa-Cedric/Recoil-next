/**
 * TypeScript port of Recoil_RecoilValueInterface-test.js
 */

import { act } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';

import { persistentMap } from '../../adt/PersistentMap';
import { atom } from '../../recoil_values/atom';
import { selector } from '../../recoil_values/selector';
import { getNextStoreID, getNextTreeStateVersion } from '../Keys';
import {
    getRecoilValueAsLoadable,
    refreshRecoilValue,
    setRecoilValue,
    setUnvalidatedRecoilValue,
    subscribeToRecoilValue,
} from '../RecoilValueInterface';
import type { Store } from '../State';

// Create a simplified mock store for testing
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
      const oldTree = currentStoreState.currentTree;
      currentStoreState.currentTree = replacer(currentStoreState.currentTree);
      
      // Notify subscribers after state change (simulate Recoil's notification mechanism)
      setTimeout(() => {
        const subs = currentStoreState.nodeToComponentSubscriptions;
        subs.forEach((componentSubs, nodeKey) => {
          componentSubs.forEach(([debugName, callback]) => {
            try {
              callback(currentStoreState.currentTree);
            } catch (e) {
              // Ignore callback errors in tests
            }
          });
        });
      }, 0);
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
            return { release: () => { } };
        },
        addTransactionMetadata: () => {
            // no-op in test mock
        },
    };

    return store;
}

let store: Store;
let a: any;
let dependsOnAFn: any;
let dependsOnA: any;
let dependsOnDependsOnA: any;
let b: any;

let testId = 0;

beforeEach(() => {
    store = makeStore();
    testId++;

    a = atom<number>({ key: `a_${testId}`, default: 0 });

    dependsOnAFn = vi.fn(x => x + 1);

    dependsOnA = selector({
        key: `dependsOnA_${testId}`,
        get: ({ get }) => dependsOnAFn(get(a)),
    });

    dependsOnDependsOnA = selector({
        key: `dependsOnDependsOnA_${testId}`,
        get: ({ get }) => {
            const value = get(dependsOnA);
            if (typeof value !== 'number') {
                throw new Error('dependsOnA did not return a number');
            }
            return value + 1;
        },
    });

    b = atom<number>({
        key: `b_${testId}`,
        default: 0,
        persistence_UNSTABLE: {
            type: 'url',
            validator: x => parseInt(x as string, 10),
        },
    });
});

test('read default value', () => {
    expect(getRecoilValueAsLoadable(store, a)).toMatchObject({
        state: 'hasValue',
        contents: 0,
    });
});

test('read written value, visited contains written value', () => {
    setRecoilValue(store, a, 1);
    expect(getRecoilValueAsLoadable(store, a)).toMatchObject({
        state: 'hasValue',
        contents: 1,
    });
});

test('read selector based on default upstream', () => {
    expect(getRecoilValueAsLoadable(store, dependsOnA).contents).toEqual(1);
});

test('read selector based on written upstream', () => {
    setRecoilValue(store, a, 1);
    expect(getRecoilValueAsLoadable(store, dependsOnA).contents).toEqual(2);
});

test('selector subscriber is called when upstream changes', async () => {
  const callback = vi.fn();
  const { release } = subscribeToRecoilValue(store, dependsOnA, callback);
  getRecoilValueAsLoadable(store, dependsOnA);
  expect(callback).toHaveBeenCalledTimes(0);
  setRecoilValue(store, a, 1);
  await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async notification
  expect(callback).toHaveBeenCalledTimes(1);
  release();
  setRecoilValue(store, a, 2);
  await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async notification
  expect(callback).toHaveBeenCalledTimes(1);
});

test('selector is recursively visited when subscribed and upstream changes', async () => {
  const callback = vi.fn();
  const { release } = subscribeToRecoilValue(
    store,
    dependsOnDependsOnA,
    callback,
  );
  getRecoilValueAsLoadable(store, dependsOnDependsOnA);
  expect(callback).toHaveBeenCalledTimes(0);
  setRecoilValue(store, a, 1);
  await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async notification
  expect(callback).toHaveBeenCalledTimes(1);
  release();
  setRecoilValue(store, a, 2);
  await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async notification
  expect(callback).toHaveBeenCalledTimes(1);
});

test('selector function is evaluated only on first read', () => {
    dependsOnAFn.mockClear();
    const callback = vi.fn();
    subscribeToRecoilValue(store, dependsOnA, callback);
    getRecoilValueAsLoadable(store, dependsOnA);
    expect(dependsOnAFn).toHaveBeenCalledTimes(1); // called once on initial read
    act(() => setRecoilValue(store, a, 1337)); // input number must not be used in any other test due to selector-internal caching
    getRecoilValueAsLoadable(store, dependsOnA);
    expect(dependsOnAFn).toHaveBeenCalledTimes(2); // called again on read following upstream change
    getRecoilValueAsLoadable(store, dependsOnA);
    expect(dependsOnAFn).toHaveBeenCalledTimes(2); // not called on subsequent read with no upstream change
});

test('selector cache refresh', () => {
    const getA = vi.fn(() => 'A');
    const selectorA = selector({
        key: 'useRecoilRefresher ancestors A',
        get: getA,
    });

    const getB = vi.fn(({ get }) => get(selectorA) + 'B');
    const selectorB = selector({
        key: 'useRecoilRefresher ancestors B',
        get: getB,
    });

    const getC = vi.fn(({ get }) => get(selectorB) + 'C');
    const selectorC = selector({
        key: 'useRecoilRefresher ancestors C',
        get: getC,
    });

    expect(getRecoilValueAsLoadable(store, selectorC).contents).toEqual('ABC');
    expect(getC).toHaveBeenCalledTimes(1);
    expect(getB).toHaveBeenCalledTimes(1);
    expect(getA).toHaveBeenCalledTimes(1);

    expect(getRecoilValueAsLoadable(store, selectorC).contents).toEqual('ABC');
    expect(getC).toHaveBeenCalledTimes(1);
    expect(getB).toHaveBeenCalledTimes(1);
    expect(getA).toHaveBeenCalledTimes(1);

    act(() => {
        refreshRecoilValue(store, selectorC);
    });
    expect(getRecoilValueAsLoadable(store, selectorC).contents).toEqual('ABC');
    expect(getC).toHaveBeenCalledTimes(2);
    expect(getB).toHaveBeenCalledTimes(2);
    expect(getA).toHaveBeenCalledTimes(2);
});

test('atom can go from unvalidated to normal value', () => {
    setUnvalidatedRecoilValue(store, b, '1');
    expect(getRecoilValueAsLoadable(store, b)).toMatchObject({
        state: 'hasValue',
        contents: 1,
    });
    setRecoilValue(store, b, 2);
    expect(getRecoilValueAsLoadable(store, b)).toMatchObject({
        state: 'hasValue',
        contents: 2,
    });
});

test('atom can go from normal to unvalidated value', () => {
    setRecoilValue(store, b, 1);
    expect(getRecoilValueAsLoadable(store, b)).toMatchObject({
        state: 'hasValue',
        contents: 1,
    });
    setUnvalidatedRecoilValue(store, b, '2');
    expect(getRecoilValueAsLoadable(store, b)).toMatchObject({
        state: 'hasValue',
        contents: 2,
    });
});

test('atom can go from unvalidated to unvalidated value', () => {
    // Regression test for an issue where setting an unvalidated value when
    // already in a has-unvalidated-value state would result in a stale value:
    setUnvalidatedRecoilValue(store, b, '1');
    expect(getRecoilValueAsLoadable(store, b)).toMatchObject({
        state: 'hasValue',
        contents: 1,
    });
    setUnvalidatedRecoilValue(store, b, '2');
    expect(getRecoilValueAsLoadable(store, b)).toMatchObject({
        state: 'hasValue',
        contents: 2,
    });
}); 