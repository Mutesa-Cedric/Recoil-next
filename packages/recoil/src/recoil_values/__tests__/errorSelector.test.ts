/**
 * TypeScript port of Recoil_errorSelector-test.js
 */

import {describe, test, expect, beforeEach} from 'vitest';

import type {Store} from '../../core/State';
import type {RecoilValueReadOnly} from '../../core/RecoilValue';

import {errorSelector} from '../errorSelector';
import {persistentMap} from '../../adt/PersistentMap';
import {getNextStoreID, getNextTreeStateVersion} from '../../core/Keys';
import {getRecoilValueAsLoadable} from '../../core/RecoilValueInterface';

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

function getError(recoilValue: RecoilValueReadOnly<unknown>): Error {
  const error = getRecoilValueAsLoadable(store, recoilValue).errorOrThrow();
  if (!(error instanceof Error)) {
    throw new Error('Expected error to be an instance of Error');
  }
  return error;
}

describe('errorSelector', () => {
  test('errorSelector - string', () => {
    const mySelector = errorSelector<unknown>('My Error');
    expect(getError(mySelector).message).toEqual(
      expect.stringContaining('My Error'),
    );
  });

  test('errorSelector - creates different selectors for different messages', () => {
    const errorA = errorSelector<string>('Error A');
    const errorB = errorSelector<string>('Error B');

    expect(errorA).not.toBe(errorB);
    expect(getError(errorA).message).toEqual(
      expect.stringContaining('Error A'),
    );
    expect(getError(errorB).message).toEqual(
      expect.stringContaining('Error B'),
    );
  });

  test('errorSelector - same message returns same selector', () => {
    const errorA1 = errorSelector<string>('Same Error');
    const errorA2 = errorSelector<string>('Same Error');

    expect(errorA1).toBe(errorA2); // Should be the same instance due to selectorFamily caching
  });

  test('errorSelector - loadable state is hasError', () => {
    const mySelector = errorSelector<number>('Test Error');
    const loadable = getRecoilValueAsLoadable(store, mySelector);

    expect(loadable.state).toBe('hasError');
    expect(loadable.contents).toBeInstanceOf(Error);
    expect((loadable.contents as Error).message).toEqual(
      expect.stringContaining('Test Error'),
    );
  });

  test('errorSelector - with empty message', () => {
    const mySelector = errorSelector<boolean>('');
    const error = getError(mySelector);

    expect(error).toBeInstanceOf(Error);
    // Error message might be empty or have some default content
    expect(typeof error.message).toBe('string');
  });

  test('errorSelector - with special characters in message', () => {
    const specialMessage = 'Error with special chars: !@#$%^&*()';
    const mySelector = errorSelector<object>(specialMessage);
    const error = getError(mySelector);

    expect(error.message).toEqual(expect.stringContaining(specialMessage));
  });
});
