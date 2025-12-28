/**
 * TypeScript port of Recoil_atomFamily-test.js
 */

import {describe, test, expect, beforeEach} from 'vitest';

import type {RecoilState} from '../../core/RecoilValue';
import type {Store} from '../../core/State';

import {persistentMap} from '../../adt/PersistentMap';
import {getNextStoreID, getNextTreeStateVersion} from '../../core/Keys';
import {
  getRecoilValueAsLoadable,
  setRecoilValue,
} from '../../core/RecoilValueInterface';
import {atom} from '../atom';
import {atomFamily} from '../atomFamily';
import {selectorFamily} from '../selectorFamily';

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

function get<T>(recoilValue: RecoilState<T>): T {
  return getRecoilValueAsLoadable(store, recoilValue).contents as T;
}

function set<T>(recoilValue: RecoilState<T>, value: T): void {
  setRecoilValue(store, recoilValue, value);
}

describe('atomFamily', () => {
  test('Create an atom family', () => {
    const myAtomFamily = atomFamily<string, number>({
      key: 'atomFamily/create',
      default: 'DEFAULT',
    });

    const atom1 = myAtomFamily(1);
    const atom2 = myAtomFamily(2);
    const atom1Again = myAtomFamily(1);

    expect(atom1).toBe(atom1Again); // Same parameter should return same atom
    expect(atom1).not.toBe(atom2);
    expect(atom1.key).toContain('atomFamily/create');
    expect(atom2.key).toContain('atomFamily/create');
    expect(atom1.key).not.toBe(atom2.key);
  });

  test('atomFamily with different parameter types', () => {
    const stringFamily = atomFamily<string, string>({
      key: 'atomFamily/string',
      default: 'DEFAULT',
    });

    const numberFamily = atomFamily<number, number>({
      key: 'atomFamily/number',
      default: 42,
    });

    const objectFamily = atomFamily<string, {id: number; name: string}>({
      key: 'atomFamily/object',
      default: 'DEFAULT',
    });

    const atom1 = stringFamily('param1');
    const atom2 = numberFamily(123);
    const atom3 = objectFamily({id: 1, name: 'test'});
    const atom3Again = objectFamily({id: 1, name: 'test'});

    expect(get(atom1)).toBe('DEFAULT');
    expect(get(atom2)).toBe(42);
    expect(get(atom3)).toBe('DEFAULT');
    expect(atom3).toBe(atom3Again); // Same object parameter should return same atom
  });

  test('atomFamily state is independent per parameter', () => {
    const countFamily = atomFamily<number, string>({
      key: 'atomFamily/independent',
      default: 0,
    });

    const counterA = countFamily('A');
    const counterB = countFamily('B');

    expect(get(counterA)).toBe(0);
    expect(get(counterB)).toBe(0);

    set(counterA, 10);
    expect(get(counterA)).toBe(10);
    expect(get(counterB)).toBe(0); // Should remain unchanged

    set(counterB, 20);
    expect(get(counterA)).toBe(10); // Should remain unchanged
    expect(get(counterB)).toBe(20);
  });

  test('atomFamily with default value function', () => {
    const paramAtomFamily = atomFamily<string, number>({
      key: 'atomFamily/defaultFunction',
      default: param => `Value for ${param}`,
    });

    const atom1 = paramAtomFamily(1);
    const atom2 = paramAtomFamily(2);

    expect(get(atom1)).toBe('Value for 1');
    expect(get(atom2)).toBe('Value for 2');
  });

  test('atomFamily with default promise', () => {
    const asyncFamily = atomFamily<string, number>({
      key: 'atomFamily/async',
      default: param => Promise.resolve(`Async value ${param}`),
    });

    const atom1 = asyncFamily(1);
    const loadable = getRecoilValueAsLoadable(store, atom1);

    expect(loadable.state).toBe('loading');
  });

  test('atomFamily with RecoilValue default', () => {
    const baseAtom = atom({
      key: 'atomFamily/base',
      default: 'BASE',
    });

    const derivedFamily = atomFamily<string, number>({
      key: 'atomFamily/derived',
      default: baseAtom,
    });

    const atom1 = derivedFamily(1);
    const atom2 = derivedFamily(2);

    expect(get(atom1)).toBe('BASE');
    expect(get(atom2)).toBe('BASE');

    set(baseAtom, 'UPDATED');
    // Note: In a real implementation, derived atoms would update
    expect(get(atom1)).toBe('UPDATED'); // Mock returns updated base value
  });

  test('atomFamily parameter serialization', () => {
    const objectFamily = atomFamily<string, {x: number; y: number}>({
      key: 'atomFamily/serialization',
      default: 'DEFAULT',
    });

    const atom1 = objectFamily({x: 1, y: 2});
    const atom2 = objectFamily({y: 2, x: 1}); // Different order, same values
    const atom3 = objectFamily({x: 1, y: 3}); // Different values

    // Should be the same atom due to serialization
    expect(atom1).toBe(atom2);
    expect(atom1).not.toBe(atom3);
  });

  test('atomFamily with complex parameter types', () => {
    type ComplexParam = {
      id: number;
      config: {
        enabled: boolean;
        settings: string[];
      };
    };

    const complexFamily = atomFamily<string, ComplexParam>({
      key: 'atomFamily/complex',
      default: 'DEFAULT',
    });

    const param1 = {
      id: 1,
      config: {
        enabled: true,
        settings: ['a', 'b'],
      },
    };

    const param2 = {
      id: 1,
      config: {
        enabled: true,
        settings: ['a', 'b'],
      },
    };

    const atom1 = complexFamily(param1);
    const atom2 = complexFamily(param2);

    expect(atom1).toBe(atom2); // Should be same due to deep equality
  });

  test('atomFamily with array parameter', () => {
    const arrayFamily = atomFamily<string, number[]>({
      key: 'atomFamily/array',
      default: 'DEFAULT',
    });

    const atom1 = arrayFamily([1, 2, 3]);
    const atom2 = arrayFamily([1, 2, 3]);
    const atom3 = arrayFamily([3, 2, 1]);

    expect(atom1).toBe(atom2);
    expect(atom1).not.toBe(atom3);
  });

  test('atomFamily parameter edge cases', () => {
    const edgeFamily = atomFamily<string, any>({
      key: 'atomFamily/edge',
      default: 'DEFAULT',
    });

    // Test with null, undefined, 0, false, empty string
    const atomNull = edgeFamily(null);
    const atomUndefined = edgeFamily(undefined);
    const atomZero = edgeFamily(0);
    const atomFalse = edgeFamily(false);
    const atomEmpty = edgeFamily('');

    expect(get(atomNull)).toBe('DEFAULT');
    expect(get(atomUndefined)).toBe('DEFAULT');
    expect(get(atomZero)).toBe('DEFAULT');
    expect(get(atomFalse)).toBe('DEFAULT');
    expect(get(atomEmpty)).toBe('DEFAULT');

    // All should be different atoms
    expect(atomNull).not.toBe(atomUndefined);
    expect(atomNull).not.toBe(atomZero);
    expect(atomZero).not.toBe(atomFalse);
    expect(atomFalse).not.toBe(atomEmpty);
  });

  test('atomFamily with selector family dependency', () => {
    const baseFamily = atomFamily<number, string>({
      key: 'atomFamily/base',
      default: 0,
    });

    const derivedFamily = selectorFamily<number, string>({
      key: 'selectorFamily/derived',
      get:
        param =>
        ({get}) =>
          get(baseFamily(param)) * 2,
    });

    const baseAtom = baseFamily('test');
    const derivedSelector = derivedFamily('test');

    expect(get(baseAtom)).toBe(0);
    expect(get(derivedSelector)).toBe(0);

    set(baseAtom, 5);
    expect(get(derivedSelector)).toBe(10);
  });
});
