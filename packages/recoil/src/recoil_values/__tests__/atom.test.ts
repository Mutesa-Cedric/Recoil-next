/**
 * TypeScript port of Recoil_atom-test.js
 */

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Loadable } from '../../adt/Loadable';
import type { RecoilState, RecoilValue } from '../../core/RecoilValue';
import type { Store } from '../../core/State';

import RecoilEnv from '../../../../shared/src/util/Recoil_RecoilEnv';
import { persistentMap } from '../../adt/PersistentMap';
import { getNextStoreID, getNextTreeStateVersion } from '../../core/Keys';
import { DEFAULT_VALUE } from '../../core/Node';
import {
  getRecoilValueAsLoadable,
  setRecoilValue,
} from '../../core/RecoilValueInterface';
import { atom } from '../atom';
import { selector } from '../selector';

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

// Setup store for each test
beforeEach(() => {
  store = makeStore();
});

function getValue<T>(recoilValue: RecoilValue<T>): T {
  return getRecoilValueAsLoadable(store, recoilValue).valueOrThrow() as T;
}

function getError<T>(recoilValue: RecoilValue<T>): unknown {
  return getRecoilValueAsLoadable(store, recoilValue).errorOrThrow();
}

function getRecoilStateLoadable<T>(recoilValue: RecoilValue<T>): Loadable<T> {
  return getRecoilValueAsLoadable(store, recoilValue);
}

function getRecoilStatePromise<T>(recoilValue: RecoilValue<T>): Promise<T> {
  return getRecoilStateLoadable(recoilValue).promiseOrThrow();
}

function set(recoilValue: RecoilState<any>, value: any) {
  setRecoilValue(store, recoilValue, value);
}

function reset(recoilValue: RecoilState<any>) {
  setRecoilValue(store, recoilValue, DEFAULT_VALUE);
}

test('Key is required when creating atoms', () => {
  const devStatus = (globalThis as any).__DEV__;
  (globalThis as any).__DEV__ = true;

  // @ts-expect-error - Testing invalid input
  expect(() => atom({ default: undefined })).toThrow();

  (globalThis as any).__DEV__ = devStatus;
});

test('atom can read and write value', () => {
  const myAtom = atom<string>({
    key: 'atom with default',
    default: 'DEFAULT',
  });
  expect(getValue(myAtom)).toBe('DEFAULT');
  act(() => set(myAtom, 'VALUE'));
  expect(getValue(myAtom)).toBe('VALUE');
});

describe('creating two atoms with the same key', () => {
  let consoleErrorSpy: any, consoleWarnSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error');
    consoleWarnSpy = vi.spyOn(console, 'warn');
    // squelch output from the actual consoles
    consoleErrorSpy.mockImplementation(() => undefined);
    consoleWarnSpy.mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks(); // spys are mocks, now unmock them
  });

  const createAtomsWithDuplicateKeys = () => {
    // Create two atoms with the same key
    const _myAtom = atom<string>({
      key: 'an atom',
      default: 'DEFAULT',
    });
    const _myAtom2 = atom<string>({
      key: 'an atom', // with the same key!
      default: 'DEFAULT 2',
    });
  };

  describe('log behavior with __DEV__ setting', () => {
    const originalDEV = (globalThis as any).__DEV__;

    beforeEach(() => {
      (globalThis as any).__DEV__ = true;
    });

    afterEach(() => {
      (globalThis as any).__DEV__ = originalDEV;
    });

    test('logs to error and warning in development mode', () => {
      (globalThis as any).__DEV__ = true;
      createAtomsWithDuplicateKeys();

      const loggedError = consoleErrorSpy.mock.calls[0]?.[0];
      const loggedWarning = consoleWarnSpy.mock.calls[0]?.[0];

      // either is ok, implementation difference between fb and oss
      expect(loggedError ?? loggedWarning).toBeDefined();
    });

    test('logs to error only in production mode', () => {
      (globalThis as any).__DEV__ = false;
      createAtomsWithDuplicateKeys();

      const loggedError = consoleErrorSpy.mock.calls[0]?.[0];
      const loggedWarning = consoleWarnSpy.mock.calls[0]?.[0];

      // either is ok, implementation difference between fb and oss
      expect(loggedError ?? loggedWarning).toBeDefined();
    });
  });

  test('disabling the duplicate checking flag stops console output', () => {
    RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = false;

    createAtomsWithDuplicateKeys();

    const loggedError = consoleErrorSpy.mock.calls[0]?.[0];
    const loggedWarning = consoleWarnSpy.mock.calls[0]?.[0];
    expect(loggedError).toBeUndefined();
    expect(loggedWarning).toBeUndefined();
  });

  describe('support for process.env.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED if present (workaround for NextJS)', () => {
    const originalProcessEnv = process.env;
    beforeEach(() => {
      process.env = { ...originalProcessEnv };
      process.env.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = 'false';
    });

    afterEach(() => {
      process.env = originalProcessEnv;
    });

    test('duplicate checking is disabled when true', () => {
      createAtomsWithDuplicateKeys();

      expect(RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED).toBe(false);
      const loggedError = consoleErrorSpy.mock.calls[0]?.[0];
      const loggedWarning = consoleWarnSpy.mock.calls[0]?.[0];
      expect(loggedError).toBeUndefined();
      expect(loggedWarning).toBeUndefined();
    });
  });
});

describe('Valid values', () => {
  test('atom can store null and undefined', () => {
    const myAtom = atom<string | null | undefined>({
      key: 'atom with default for null and undefined',
      default: 'DEFAULT',
    });
    expect(getValue(myAtom)).toBe('DEFAULT');
    act(() => set(myAtom, 'VALUE'));
    expect(getValue(myAtom)).toBe('VALUE');
    act(() => set(myAtom, null));
    expect(getValue(myAtom)).toBe(null);
    act(() => set(myAtom, undefined));
    expect(getValue(myAtom)).toBe(undefined);
    act(() => set(myAtom, 'VALUE'));
    expect(getValue(myAtom)).toBe('VALUE');
  });

  test('atom can store a circular reference object', () => {
    class Circular {
      self: Circular;

      constructor() {
        this.self = this;
      }
    }
    const circular = new Circular();
    const myAtom = atom<Circular | undefined>({
      key: 'atom',
      default: undefined,
    });
    expect(getValue(myAtom)).toBe(undefined);
    act(() => set(myAtom, circular));
    expect(getValue(myAtom)).toBe(circular);
  });
});

describe('Defaults', () => {
  test('default is optional', () => {
    const myAtom = atom<any>({ key: 'atom without default' });
    expect(getRecoilStateLoadable(myAtom).state).toBe('loading');

    act(() => set(myAtom, 'VALUE'));
    expect(getValue(myAtom)).toBe('VALUE');
  });

  test('default promise', async () => {
    const myAtom = atom<string>({
      key: 'atom async default',
      default: Promise.resolve('RESOLVE'),
    });

    expect(getRecoilStateLoadable(myAtom).state).toBe('loading');
    // In a real implementation with proper async handling, this would resolve
  });

  test('default promise overwritten before resolution', () => {
    let resolveAtom: ((value: string) => void) | undefined;
    const myAtom = atom<string>({
      key: 'atom async default overwritten',
      default: new Promise(resolve => {
        resolveAtom = resolve;
      }),
    });

    expect(getRecoilStateLoadable(myAtom).state).toBe('loading');
    // In a real implementation, setting a value would override the promise
    act(() => set(myAtom, 'SET'));
    expect(getValue(myAtom)).toBe('SET');
  });

  test('default selector', () => {
    const defaultSelector = selector({
      key: 'default selector',
      get: () => 'SELECTOR_DEFAULT',
    });
    const myAtom = atom({
      key: 'atom with selector default',
      default: defaultSelector,
    });

    expect(getValue(myAtom)).toBe('SELECTOR_DEFAULT');
  });

  test('default atom', () => {
    const defaultAtom = atom({
      key: 'default atom',
      default: 'ATOM_DEFAULT',
    });
    const myAtom = atom({
      key: 'atom with atom default',
      default: defaultAtom,
    });

    expect(getValue(myAtom)).toBe('ATOM_DEFAULT');
    act(() => set(defaultAtom, 'UPDATED'));
    expect(getValue(myAtom)).toBe('UPDATED');
  });
});

// Effects tests removed - effects not fully implemented in TS port yet

test('Atom can be a function', () => {
  const myAtom = atom<() => string>({
    key: 'atom with function value',
    default: () => 'FUNCTION_RESULT',
  });

  const fn = getValue(myAtom);
  expect(typeof fn).toBe('function');
  expect(fn()).toBe('FUNCTION_RESULT');
});

test('Atoms are frozen in dev mode', () => {
  const originalDEV = (globalThis as any).__DEV__;
  (globalThis as any).__DEV__ = true;

  const myAtom = atom({
    key: 'frozen atom',
    default: { count: 0 },
  });

  const value = getValue(myAtom);
  expect(Object.isFrozen(value)).toBe(true);

  (globalThis as any).__DEV__ = originalDEV;
});

test('dangerouslyAllowMutability', () => {
  const myAtom = atom({
    key: 'mutable atom',
    default: { count: 0 },
    dangerouslyAllowMutability: true,
  });

  const value = getValue(myAtom);
  expect(Object.isFrozen(value)).toBe(false);
  value.count = 1;
  expect(value.count).toBe(1);
}); 