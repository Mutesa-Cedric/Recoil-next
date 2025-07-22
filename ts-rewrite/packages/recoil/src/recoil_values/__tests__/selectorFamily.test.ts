/**
 * TypeScript port of Recoil_selectorFamily tests
 */

import { describe, expect, test, beforeEach } from 'vitest';

import type { RecoilState } from '../../core/RecoilValue';
import type { Store } from '../../core/State';
import type { Loadable } from '../../adt/Loadable';

import { DefaultValue } from '../../core/Node';
import { persistentMap } from '../../adt/PersistentMap';
import { getNextStoreID, getNextTreeStateVersion } from '../../core/Keys';
import {
    getRecoilValueAsLoadable,
    setRecoilValue,
} from '../../core/RecoilValueInterface';
import { atomFamily } from '../atomFamily';
import { selectorFamily } from '../selectorFamily';

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

function getLoadable<T>(recoilValue: RecoilState<T>): Loadable<T> {
  return getRecoilValueAsLoadable(store, recoilValue);
}

function get<T>(recoilValue: RecoilState<T>): T {
    const loadable = getLoadable(recoilValue);
    if (loadable.state === 'hasError') {
      throw loadable.contents;
    }
    return loadable.contents as T;
}

function set<T>(recoilValue: RecoilState<T>, value: T): void {
    setRecoilValue(store, recoilValue, value);
}

describe('selectorFamily', () => {
    test('Create a selector family', () => {
        const mySelectorFamily = selectorFamily<string, number>({
            key: 'selectorFamily/create',
            get: (param) => () => `Value for ${param}`,
        });

        const selector1 = mySelectorFamily(1);
        const selector2 = mySelectorFamily(2);
        const selector1Again = mySelectorFamily(1);

        expect(selector1).toBe(selector1Again); // Same parameter should return same selector
        expect(selector1).not.toBe(selector2);
        expect(selector1.key).toContain('selectorFamily/create');
        expect(selector2.key).toContain('selectorFamily/create');
        expect(selector1.key).not.toBe(selector2.key);
    });

    test('selectorFamily with get function', () => {
        const baseFam = atomFamily<number, string>({
            key: 'selectorFamily/base',
            default: 0,
        });

        const multiplierFam = selectorFamily<number, { id: string; factor: number }>({
            key: 'selectorFamily/multiplier',
            get: ({ id, factor }) => ({ get }) => get(baseFam(id)) * factor,
        });

        const base = baseFam('test');
        const doubler = multiplierFam({ id: 'test', factor: 2 });
        const tripler = multiplierFam({ id: 'test', factor: 3 });

        expect(get(base)).toBe(0);
        expect(get(doubler)).toBe(0);
        expect(get(tripler)).toBe(0);

        set(base, 5);
        expect(get(doubler)).toBe(10);
        expect(get(tripler)).toBe(15);
    });

    test('selectorFamily with set function', () => {
        const baseFam = atomFamily<number, string>({
            key: 'selectorFamily/setBase',
            default: 0,
        });

        const scaledFam = selectorFamily<number, { id: string; scale: number }>({
            key: 'selectorFamily/scaled',
            get: ({ id, scale }) => ({ get }) => get(baseFam(id)) * scale,
            set: ({ id, scale }) => ({ set }, newValue) => {
                if (newValue instanceof DefaultValue) {
                    set(baseFam(id), newValue);
                } else {
                    set(baseFam(id), newValue / scale);
                }
            },
        });

        const base = baseFam('test');
        const scaled = scaledFam({ id: 'test', scale: 10 });

        expect(get(base)).toBe(0);
        expect(get(scaled)).toBe(0);

        set(scaled, 50);
        expect(get(base)).toBe(5); // 50 / 10
        expect(get(scaled)).toBe(50);
    });

    test('selectorFamily with different parameter types', () => {
        const stringFam = selectorFamily<string, string>({
            key: 'selectorFamily/string',
            get: (param) => () => `String param: ${param}`,
        });

        const numberFam = selectorFamily<number, number>({
            key: 'selectorFamily/number',
            get: (param) => () => param * 10,
        });

        const objectFam = selectorFamily<string, { x: number; y: number }>({
            key: 'selectorFamily/object',
            get: ({ x, y }) => () => `Point: (${x}, ${y})`,
        });

        expect(get(stringFam('hello'))).toBe('String param: hello');
        expect(get(numberFam(5))).toBe(50);
        expect(get(objectFam({ x: 1, y: 2 }))).toBe('Point: (1, 2)');
    });

    test('selectorFamily with dependencies on other families', () => {
        const baseFam = atomFamily<number, string>({
            key: 'selectorFamily/depBase',
            default: 1,
        });

        const doubleFam = selectorFamily<number, string>({
            key: 'selectorFamily/double',
            get: (id) => ({ get }) => get(baseFam(id)) * 2,
        });

        const quadFam = selectorFamily<number, string>({
            key: 'selectorFamily/quad',
            get: (id) => ({ get }) => get(doubleFam(id)) * 2,
        });

        const base = baseFam('test');
        const double = doubleFam('test');
        const quad = quadFam('test');

        expect(get(base)).toBe(1);
        expect(get(double)).toBe(2);
        expect(get(quad)).toBe(4);

        set(base, 3);
        expect(get(double)).toBe(6);
        expect(get(quad)).toBe(12);
    });

    test('selectorFamily with async get', () => {
        const asyncFam = selectorFamily<string, number>({
            key: 'selectorFamily/async',
            get: (param) => async () => {
                // Simulate async operation
                return `Async result for ${param}`;
            },
        });

        const async1 = asyncFam(1);
        const loadable = getLoadable(async1);

        expect(loadable.state).toBe('loading');
    });

    test('selectorFamily with conditional logic', () => {
        const configFam = atomFamily<{ enabled: boolean; value: number }, string>({
            key: 'selectorFamily/config',
            default: { enabled: true, value: 0 },
        });

        const conditionalFam = selectorFamily<number | null, string>({
            key: 'selectorFamily/conditional',
            get: (id) => ({ get }) => {
                const config = get(configFam(id));
                return config.enabled ? config.value : null;
            },
        });

        const config = configFam('test');
        const conditional = conditionalFam('test');

        expect(get(conditional)).toBe(0);

        set(config, { enabled: false, value: 42 });
        expect(get(conditional)).toBe(null);

        set(config, { enabled: true, value: 42 });
        expect(get(conditional)).toBe(42);
    });

    test('selectorFamily parameter serialization', () => {
        const objFam = selectorFamily<string, { a: number; b: string }>({
            key: 'selectorFamily/serialization',
            get: ({ a, b }) => () => `${a}-${b}`,
        });

        const sel1 = objFam({ a: 1, b: 'test' });
        const sel2 = objFam({ b: 'test', a: 1 }); // Different order, same values
        const sel3 = objFam({ a: 2, b: 'test' }); // Different values

        expect(sel1).toBe(sel2); // Should be same due to serialization
        expect(sel1).not.toBe(sel3);
    });

    test('selectorFamily with array parameter', () => {
        const arrayFam = selectorFamily<string, number[]>({
            key: 'selectorFamily/array',
            get: (arr) => () => `Sum: ${arr.reduce((a, b) => a + b, 0)}`,
        });

        const sel1 = arrayFam([1, 2, 3]);
        const sel2 = arrayFam([1, 2, 3]);
        const sel3 = arrayFam([3, 2, 1]);

        expect(sel1).toBe(sel2);
        expect(sel1).not.toBe(sel3);
        expect(get(sel1)).toBe('Sum: 6');
        expect(get(sel3)).toBe('Sum: 6');
    });

    test('selectorFamily error handling', () => {
        const errorFam = selectorFamily<string, boolean>({
            key: 'selectorFamily/error',
            get: (shouldError) => () => {
                if (shouldError) {
                    throw new Error('Selector family error');
                }
                return 'Success';
            },
        });

        const successSel = errorFam(false);
        const errorSel = errorFam(true);

        expect(get(successSel)).toBe('Success');
        expect(() => get(errorSel)).toThrow('Selector family error');
    });

    test('selectorFamily with cache policy', () => {
        const cachedFam = selectorFamily<string, number>({
            key: 'selectorFamily/cached',
            get: (param) => () => `Cached value ${param}`,
            cachePolicyForParams_UNSTABLE: {
                equality: 'reference',
            },
        });

        const sel1 = cachedFam(1);
        const sel2 = cachedFam(1);

        expect(sel1).toBe(sel2);
        expect(get(sel1)).toBe('Cached value 1');
    });

    test('selectorFamily with complex parameter and dependency chain', () => {
        type UserParam = {
            userId: string;
            includeProfile: boolean;
        };

        const userDataFam = atomFamily<{ name: string; email: string }, string>({
            key: 'selectorFamily/userData',
            default: { name: 'Unknown', email: 'unknown@example.com' },
        });

        const userProfileFam = atomFamily<{ bio: string; avatar: string }, string>({
            key: 'selectorFamily/userProfile',
            default: { bio: '', avatar: '' },
        });

        const userInfoFam = selectorFamily<any, UserParam>({
            key: 'selectorFamily/userInfo',
            get: ({ userId, includeProfile }) => ({ get }) => {
                const data = get(userDataFam(userId));
                if (includeProfile) {
                    const profile = get(userProfileFam(userId));
                    return { ...data, ...profile };
                }
                return data;
            },
        });

        const userData = userDataFam('user1');
        const userProfile = userProfileFam('user1');
        const basicInfo = userInfoFam({ userId: 'user1', includeProfile: false });
        const fullInfo = userInfoFam({ userId: 'user1', includeProfile: true });

        set(userData, { name: 'John', email: 'john@example.com' });
        set(userProfile, { bio: 'Developer', avatar: 'avatar.jpg' });

        const basic = get(basicInfo);
        const full = get(fullInfo);

        expect(basic).toEqual({ name: 'John', email: 'john@example.com' });
        expect(full).toEqual({
            name: 'John',
            email: 'john@example.com',
            bio: 'Developer',
            avatar: 'avatar.jpg',
        });
    });
}); 