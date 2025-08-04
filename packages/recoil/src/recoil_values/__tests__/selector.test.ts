/**
 * TypeScript port of Recoil_selector-test.js
 */

import { describe, expect, test, beforeEach } from 'vitest';

import type { Loadable } from '../../adt/Loadable';
import type { RecoilState, RecoilValue } from '../../core/RecoilValue';
import type { Store } from '../../core/State';

import { DefaultValue } from '../../core/Node';
import { persistentMap } from '../../adt/PersistentMap';
import { getNextStoreID, getNextTreeStateVersion } from '../../core/Keys';
import {
    getRecoilValueAsLoadable,
    setRecoilValue,
} from '../../core/RecoilValueInterface';
import { atom } from '../atom';
import { constSelector } from '../constSelector';
import { selector } from '../selector';

// Create a simplified mock store for testing (using same approach as atom.test.ts)
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

function getLoadable<T>(recoilValue: RecoilValue<T>): Loadable<T> {
  return getRecoilValueAsLoadable(store, recoilValue);
}

function getValue<T>(recoilValue: RecoilValue<T>): T {
  const loadable = getLoadable(recoilValue);
  if (loadable.state === 'hasError') {
    throw loadable.contents;
  }
  return loadable.contents as T;
}

function getPromise<T>(recoilValue: RecoilValue<T>): Promise<T> {
  return getLoadable(recoilValue).promiseOrThrow();
}

function getError(recoilValue: RecoilValue<any>): Error {
  const error = getLoadable(recoilValue).errorOrThrow();
  if (!(error instanceof Error)) {
    throw new Error('Expected error to be instance of Error');
  }
  return error;
}

function setValue<T>(recoilState: RecoilState<T>, value: T) {
  setRecoilValue(store, recoilState, value);
  // Increment version for testing
  store.getState().currentTree.version++;
}

function resetValue<T>(recoilState: RecoilState<T>) {
  setRecoilValue(store, recoilState, new DefaultValue());
  store.getState().currentTree.version++;
}

describe('Selector', () => {
    test('Required options are provided when creating selectors', () => {
        const originalDEV = (globalThis as any).__DEV__;
        (globalThis as any).__DEV__ = true;

        // @ts-expect-error - Testing invalid input
        expect(() => selector({ get: () => { } })).toThrow();
        // @ts-expect-error - Testing invalid input
        expect(() => selector({ get: false })).toThrow();
        // @ts-expect-error - Testing invalid input
        expect(() => selector({ key: 'MISSING GET' })).toThrow();

        (globalThis as any).__DEV__ = originalDEV;
    });

    test('selector get', () => {
        const staticSel = constSelector('HELLO');

        const selectorRO = selector({
            key: 'selector/get',
            get: ({ get }) => get(staticSel),
        });

        expect(getValue(selectorRO)).toEqual('HELLO');
    });

    test('selector set', () => {
        const myAtom = atom({
            key: 'selector/set/atom',
            default: 'DEFAULT',
        });

        const selectorRW = selector({
            key: 'selector/set',
            get: ({ get }) => get(myAtom),
            set: ({ set }, newValue) =>
                set(
                    myAtom,
                    newValue instanceof DefaultValue ? newValue : 'SET: ' + newValue,
                ),
        });

        expect(getValue(selectorRW)).toEqual('DEFAULT');
        setValue(selectorRW, 'NEW_VALUE');
        expect(getValue(selectorRW)).toEqual('SET: NEW_VALUE');
        expect(getValue(myAtom)).toEqual('SET: NEW_VALUE');
    });

    test('selector reset', () => {
        const myAtom = atom({
            key: 'selector/reset/atom',
            default: 'DEFAULT',
        });

        const selectorRW = selector({
            key: 'selector/reset',
            get: ({ get }) => get(myAtom),
            set: ({ set }, newValue) =>
                set(
                    myAtom,
                    newValue instanceof DefaultValue ? 'RESET' : `SET: ${newValue}`,
                ),
        });

        expect(getValue(selectorRW)).toEqual('DEFAULT');
        setValue(selectorRW, 'NEW_VALUE');
        expect(getValue(selectorRW)).toEqual('SET: NEW_VALUE');
        resetValue(selectorRW);
        expect(getValue(selectorRW)).toEqual('RESET');
    });

    test('selector dependencies', () => {
        const atomA = atom({
            key: 'selector/dependencies/atomA',
            default: 'A',
        });

        const atomB = atom({
            key: 'selector/dependencies/atomB',
            default: 'B',
        });

        const selectorAB = selector({
            key: 'selector/dependencies/selectorAB',
            get: ({ get }) => `${get(atomA)}-${get(atomB)}`,
        });

        expect(getValue(selectorAB)).toEqual('A-B');
        setValue(atomA, 'A1');
        expect(getValue(selectorAB)).toEqual('A1-B');
        setValue(atomB, 'B1');
        expect(getValue(selectorAB)).toEqual('A1-B1');
    });

    test('selector with promise', async () => {
        const promiseAtom = atom({
            key: 'selector/promise/atom',
            default: Promise.resolve('ASYNC_VALUE'),
        });

        const promiseSelector = selector({
            key: 'selector/promise/selector',
            get: ({ get }) => get(promiseAtom),
        });

        expect(getLoadable(promiseSelector).state).toBe('loading');
    });

    test('selector chaining', () => {
        const baseAtom = atom({
            key: 'selector/chaining/base',
            default: 10,
        });

        const firstSelector = selector({
            key: 'selector/chaining/first',
            get: ({ get }) => get(baseAtom) * 2,
        });

        const secondSelector = selector({
            key: 'selector/chaining/second',
            get: ({ get }) => get(firstSelector as RecoilValue<number>) + 5,
        });

        expect(getValue(secondSelector)).toBe(25); // (10 * 2) + 5
        setValue(baseAtom, 20);
        expect(getValue(secondSelector)).toBe(45); // (20 * 2) + 5
    });

    test('selector error handling', () => {
        const errorSelector = selector({
            key: 'selector/error',
            get: () => {
                throw new Error('Selector error');
            },
        });

        expect(() => getValue(errorSelector)).toThrow('Selector error');
        expect(getLoadable(errorSelector).state).toBe('hasError');
    });

    test('selector with conditional dependencies', () => {
        const switchAtom = atom({
            key: 'selector/conditional/switch',
            default: true,
        });

        const valueAAtom = atom({
            key: 'selector/conditional/valueA',
            default: 'A',
        });

        const valueBAtom = atom({
            key: 'selector/conditional/valueB',
            default: 'B',
        });

        const conditionalSelector = selector({
            key: 'selector/conditional',
            get: ({ get }) => {
                return get(switchAtom) ? get(valueAAtom) : get(valueBAtom);
            },
        });

        expect(getValue(conditionalSelector)).toBe('A');
        setValue(switchAtom, false);
        expect(getValue(conditionalSelector)).toBe('B');
        setValue(valueAAtom, 'A_NEW');
        expect(getValue(conditionalSelector)).toBe('B'); // Still B since switch is false
        setValue(valueBAtom, 'B_NEW');
        expect(getValue(conditionalSelector)).toBe('B_NEW');
    });
}); 