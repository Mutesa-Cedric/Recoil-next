/**
 * TypeScript port of Recoil_perf-test.js
 */

import {performance} from 'perf_hooks';
import {describe, expect, test} from 'vitest';

import type {Loadable, RecoilState, RecoilValue} from '../../index';

import {atom, selectorFamily} from '../../index';
import {waitForAll} from '../../recoil_values/WaitFor';
import {graph as makeGraph} from '../Graph';
import {getNextStoreID} from '../Keys';
import {
  getRecoilValueAsLoadable,
  setRecoilValue,
} from '../RecoilValueInterface';
import {makeEmptyStoreState, type Store} from '../State';

// Create a proper mock store for testing
function makeStore(): Store {
  const storeState = makeEmptyStoreState();
  const store: Store = {
    storeID: getNextStoreID(),
    getState: () => storeState,
    replaceState: replacer => {
      const currentStoreState = store.getState();
      // FIXME: does not increment state version number
      currentStoreState.currentTree = replacer(currentStoreState.currentTree);
      // Note: We're not calling invalidateDownstreams or other complex logic
      // for performance testing purposes
    },
    getGraph: version => {
      const graphs = storeState.graphsByVersion;
      if (graphs.has(version)) {
        return graphs.get(version)!;
      }
      const newGraph = makeGraph();
      graphs.set(version, newGraph);
      return newGraph;
    },
    subscribeToTransactions: () => {
      throw new Error(
        'This functionality should not be tested at this level. Use a component to test this functionality: e.g. componentThatReadsAndWritesAtom',
      );
    },
    addTransactionMetadata: () => {
      throw new Error('not implemented');
    },
  };
  return store;
}

const ITERATIONS = [1]; // Avoid iterating for automated testing
// const ITERATIONS = [100];
// const ITERATIONS = [1000];
// const ITERATIONS = [10, 100, 1000];
// const ITERATIONS = [10, 100, 1000, 10000];
// const ITERATIONS = [10, 100, 1000, 10000, 100000];

function testPerf(
  name: string,
  fn: ({
    iterations,
    perf,
  }: {
    iterations: number;
    perf: (cb: () => void) => void;
  }) => void,
) {
  test.each(ITERATIONS)(name, iterations => {
    store = makeStore();
    const perf = (cb: () => void) => {
      const BEGIN = performance.now();
      cb();
      const END = performance.now();
      console.log(`${name}(${iterations})`, END - BEGIN);
    };
    fn({iterations, perf});
  });
}

let store = makeStore();

function getNodeLoadable<T>(recoilValue: RecoilValue<T>): Loadable<T> {
  return getRecoilValueAsLoadable(store, recoilValue);
}

function getNodeValue<T>(recoilValue: RecoilValue<T>): T {
  return getNodeLoadable(recoilValue).getValue();
}

function setNode(recoilValue: RecoilState<string>, value: unknown) {
  setRecoilValue(store, recoilValue, value);
  // The setRecoilValue call above will handle the state updates
}

let nextAtomKey = 0;

function createAtoms(num: number): Array<RecoilState<string>> {
  const atoms = Array(num);
  const atomKey = nextAtomKey++;
  for (let i = 0; i < num; i++) {
    atoms[i] = atom({
      key: `PERF-${atomKey}-${i}`,
      default: 'DEFAULT',
    });
  }
  return atoms;
}

// Helper functions removed since snapshot functionality is simplified for performance testing

describe('Performance Tests', () => {
  testPerf('create n atoms', ({iterations}) => {
    createAtoms(iterations);
  });

  testPerf('get n atoms', ({iterations, perf}) => {
    const atoms = createAtoms(iterations);
    perf(() => {
      for (const node of atoms) {
        getNodeValue(node);
      }
    });
  });

  testPerf('set n atoms', ({iterations, perf}) => {
    const atoms = createAtoms(iterations);
    perf(() => {
      for (const node of atoms) {
        setNode(node, 'SET');
      }
    });
  });

  testPerf('get n selectors', ({iterations, perf}) => {
    const atoms = createAtoms(iterations);
    const testFamily = selectorFamily({
      key: 'PERF-getselectors',
      get:
        (id: number) =>
        ({get}) =>
          get(atoms[id]) + get(atoms[0]),
    });
    perf(() => {
      for (let i = 0; i < iterations; i++) {
        getNodeValue(testFamily(i));
      }
    });
  });

  testPerf('clone n snapshots', ({iterations, perf}) => {
    const atoms = createAtoms(iterations);
    perf(() => {
      for (const node of atoms) {
        // Set node to avoid hitting cached snapshots
        setNode(node, 'SET');
        // Verify the value was set correctly
        expect(getNodeValue(node)).toBe('SET');
      }
    });
  });

  testPerf('get 1 selector with n dependencies', ({iterations, perf}) => {
    const atoms = createAtoms(iterations);
    perf(() => {
      getNodeValue(waitForAll(atoms));
    });
  });

  testPerf(
    'get 1 selector with n dependencies n times',
    ({iterations, perf}) => {
      const atoms = createAtoms(iterations);
      perf(() => {
        for (let i = 0; i < iterations; i++) {
          getNodeValue(waitForAll(atoms));
        }
      });
    },
  );

  testPerf('get n selectors n times', ({iterations, perf}) => {
    const atoms = createAtoms(iterations);
    const testFamily = selectorFamily({
      key: 'PERF-getselectors',
      get:
        (id: number) =>
        ({get}) =>
          get(atoms[id]) + get(atoms[0]),
    });
    perf(() => {
      for (let i = 0; i < iterations; i++) {
        for (let j = 0; j < iterations; j++) {
          getNodeValue(testFamily(i));
        }
      }
    });
  });

  testPerf(
    'get n selectors with n dependencies n times',
    ({iterations, perf}) => {
      const atoms = createAtoms(iterations);
      const testFamily = selectorFamily<unknown, number>({
        key: 'PERF-getselectors',
        get: () => () => waitForAll(atoms),
      });
      perf(() => {
        for (let i = 0; i < iterations; i++) {
          for (let j = 0; j < iterations; j++) {
            getNodeValue(testFamily(i));
          }
        }
      });
    },
  );
});
