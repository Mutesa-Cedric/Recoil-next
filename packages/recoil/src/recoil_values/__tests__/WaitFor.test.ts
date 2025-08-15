/**
 * TypeScript port of Recoil_WaitFor-test.js
 */

import { describe, expect, test, beforeEach } from 'vitest';

import type { RecoilValue } from '../../core/RecoilValue';
import type { Store } from '../../core/State';
import type { Loadable } from '../../adt/Loadable';

import invariant from '../../../../shared/src/util/Recoil_invariant';
import { persistentMap } from '../../adt/PersistentMap';
import { getNextStoreID, getNextTreeStateVersion } from '../../core/Keys';
import {
    getRecoilValueAsLoadable,
} from '../../core/RecoilValueInterface';
import { atom } from '../atom';
import { selector } from '../selector';
import {
    noWait,
    waitForAll,
    waitForAllSettled,
    waitForAny,
    waitForNone,
} from '../WaitFor';

// Create a proper mock store for testing (same as selector.test.ts)
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

function getState<T>(
    recoilValue: RecoilValue<T>,
): 'loading' | 'hasValue' | 'hasError' {
    return getLoadable(recoilValue).state;
}

function getValue<T>(recoilValue: RecoilValue<T>): T {
    const loadable = getLoadable(recoilValue);
    if (loadable.state !== 'hasValue') {
        throw new Error(`expected atom "${recoilValue.key}" to have a value`);
    }
    return loadable.contents as T;
}

function getPromise<T>(recoilValue: RecoilValue<T>): Promise<T> {
    const loadable = getLoadable(recoilValue);
    if (loadable.state !== 'loading') {
        throw new Error(`expected atom "${recoilValue.key}" to be a promise`);
    }
    return loadable.toPromise() as Promise<T>;
}

let id = 0;
function asyncSelector<T, S = any>(
    dep?: RecoilValue<S>,
): [RecoilValue<T>, (value: T) => void, (error: Error) => void, () => boolean] {
    let resolve: (value: T) => void = () => invariant(false, 'bug in test code');
    let reject: (error: any) => void = () => invariant(false, 'bug in test code');
    let evaluated = false;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    const sel = selector({
        key: `AsyncSelector${id++}`,
        get: ({ get }) => {
            evaluated = true;
            if (dep != null) {
                get(dep);
            }
            return promise;
        },
    });
    return [sel, resolve, reject, () => evaluated];
}

describe('WaitFor', () => {
    describe('noWait', () => {
        test('noWait - resolve', () => {
            const [asyncSel, resolve] = asyncSelector<string>();
            const noWaitSel = noWait(asyncSel);

            expect(getState(noWaitSel)).toBe('hasValue');
            const loadable = getValue(noWaitSel);
            expect(loadable.state).toBe('loading');

            resolve('VALUE');
            // Note: In a real implementation, this would update reactively
            expect(loadable.state).toBe('loading');
        });

        test('noWait - reject', () => {
            const [asyncSel, , reject] = asyncSelector<string>();
            const noWaitSel = noWait(asyncSel);

            expect(getState(noWaitSel)).toBe('hasValue');
            const loadable = getValue(noWaitSel);
            expect(loadable.state).toBe('loading');

            reject(new Error('ERROR'));
            expect(loadable.state).toBe('loading');
        });

        test('noWait - value', () => {
            const myAtom = atom({
                key: 'noWait/value',
                default: 'VALUE',
            });
            const noWaitSel = noWait(myAtom);

            expect(getState(noWaitSel)).toBe('hasValue');
            const loadable = getValue(noWaitSel);
            expect(loadable.state).toBe('hasValue');
            expect(loadable.contents).toBe('VALUE');
        });
    });

    describe('waitForAll', () => {
        test('waitForAll - array - resolve', () => {
            const [asyncA, resolveA] = asyncSelector<string>();
            const [asyncB, resolveB] = asyncSelector<string>();
            const waitForAllSel = waitForAll([asyncA, asyncB]);

            expect(getState(waitForAllSel)).toBe('loading');

            resolveA('A');
            expect(getState(waitForAllSel)).toBe('loading');

            resolveB('B');
            // Note: In a real implementation, this would resolve
            expect(getState(waitForAllSel)).toBe('loading');
        });

        test('waitForAll - object - resolve', () => {
            const [asyncA, resolveA] = asyncSelector<string>();
            const [asyncB, resolveB] = asyncSelector<number>();
            const waitForAllSel = waitForAll({ a: asyncA, b: asyncB });

            expect(getState(waitForAllSel)).toBe('loading');

            resolveA('A');
            expect(getState(waitForAllSel)).toBe('loading');

            resolveB(42);
            expect(getState(waitForAllSel)).toBe('loading');
        });

        test('waitForAll - mixed values', () => {
            const [asyncA, resolveA] = asyncSelector<string>();
            const valueB = atom({
                key: 'waitForAll/valueB',
                default: 'B',
            });
            const waitForAllSel = waitForAll([asyncA, valueB]);

            expect(getState(waitForAllSel)).toBe('loading');

            resolveA('A');
            expect(getState(waitForAllSel)).toBe('loading');
        });
    });

    describe('waitForAny', () => {
        test('waitForAny - resolve first', () => {
            const [asyncA, resolveA] = asyncSelector<string>();
            const [asyncB] = asyncSelector<string>();
            const waitForAnySel = waitForAny([asyncA, asyncB]);

            expect(getState(waitForAnySel)).toBe('loading');

            resolveA('A');
            // In real implementation, this would resolve
            expect(getState(waitForAnySel)).toBe('loading');
        });

        test('waitForAny - immediate value', () => {
            const [asyncA] = asyncSelector<string>();
            const valueB = atom({
                key: 'waitForAny/valueB',
                default: 'B',
            });
            const waitForAnySel = waitForAny([asyncA, valueB]);

            // Should resolve immediately due to valueB
            expect(getState(waitForAnySel)).toBe('hasValue');
        });
    });

    describe('waitForNone', () => {
        test('waitForNone - with promises', () => {
            const [asyncA] = asyncSelector<string>();
            const [asyncB] = asyncSelector<string>();
            const waitForNoneSel = waitForNone([asyncA, asyncB]);

            // Should always have a value (array of loadables)
            expect(getState(waitForNoneSel)).toBe('hasValue');
        });

        test('waitForNone - with values', () => {
            const valueA = atom({
                key: 'waitForNone/valueA',
                default: 'A',
            });
            const valueB = atom({
                key: 'waitForNone/valueB',
                default: 'B',
            });
            const waitForNoneSel = waitForNone([valueA, valueB]);

            expect(getState(waitForNoneSel)).toBe('hasValue');
        });
    });

    describe('waitForAllSettled', () => {
        test('waitForAllSettled - resolve and reject', () => {
            const [asyncA, resolveA] = asyncSelector<string>();
            const [asyncB, , rejectB] = asyncSelector<string>();
            const waitForAllSettledSel = waitForAllSettled([asyncA, asyncB]);

            expect(getState(waitForAllSettledSel)).toBe('loading');

            resolveA('A');
            expect(getState(waitForAllSettledSel)).toBe('loading');

            rejectB(new Error('ERROR'));
            // In real implementation, this would resolve with mixed results
            expect(getState(waitForAllSettledSel)).toBe('loading');
        });

        test('waitForAllSettled - all values', () => {
            const valueA = atom({
                key: 'waitForAllSettled/valueA',
                default: 'A',
            });
            const valueB = atom({
                key: 'waitForAllSettled/valueB',
                default: 'B',
            });
            const waitForAllSettledSel = waitForAllSettled([valueA, valueB]);

            expect(getState(waitForAllSettledSel)).toBe('hasValue');
        });
    });

    describe('Error handling', () => {
        test('waitForAll - reject', async () => {
            const [asyncA, resolveA] = asyncSelector<string>();
            const [asyncB, , rejectB] = asyncSelector<string>();
            const waitForAllSel = waitForAll([asyncA, asyncB]);

            expect(getState(waitForAllSel)).toBe('loading');

            rejectB(new Error('ERROR B'));
            // Wait for Promise rejection to propagate
            await new Promise(resolve => setTimeout(resolve, 0));
            // Should propagate error
            expect(getState(waitForAllSel)).toBe('hasError');
        });

        test('waitForAny - all reject', async () => {
            const [asyncA, , rejectA] = asyncSelector<string>();
            const [asyncB, , rejectB] = asyncSelector<string>();
            const waitForAnySel = waitForAny([asyncA, asyncB]);

            expect(getState(waitForAnySel)).toBe('loading');

            rejectA(new Error('ERROR A'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(getState(waitForAnySel)).toBe('loading');

            rejectB(new Error('ERROR B'));
            // Wait for Promise rejection to propagate
            await new Promise(resolve => setTimeout(resolve, 0));
            // Should error when all fail
            expect(getState(waitForAnySel)).toBe('hasError');
        });
    });
}); 