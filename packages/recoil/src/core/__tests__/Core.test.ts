/**
 * TypeScript port of Recoil_core-test.js
 */

import { beforeEach, describe, expect, test } from 'vitest';
import nullthrows from '../../../../shared/src/util/Recoil_nullthrows';
import { atom } from '../../recoil_values/atom';
import { getNodeLoadable, setNodeValue } from '../FunctionalCore';
import type { NodeKey } from '../Keys';
import { getNextStoreID } from '../Keys';
import type { Store } from '../State';
import { makeEmptyStoreState } from '../State';

describe('Core', () => {
  let store: Store;
  let atomA: NodeKey;

  beforeEach(() => {
    // Create a simple store for testing
    const storeState = makeEmptyStoreState();
    store = {
      storeID: getNextStoreID(),
      getState: () => storeState,
      replaceState: (replacer) => {
        storeState.currentTree = replacer(storeState.currentTree);
      },
      getGraph: (version) => {
        const graph = storeState.graphsByVersion.get(version);
        if (graph == null) {
          throw new Error(`Graph not found for version ${version}`);
        }
        return graph;
      },
      subscribeToTransactions: () => ({ release: () => {} }),
      addTransactionMetadata: () => {},
    };

    const a = atom<number>({ key: 'core-test-atom-a', default: 0 });
    atomA = a.key;
  });

  test('read default value', () => {
    const loadable = getNodeLoadable(store, store.getState().currentTree, atomA);
    expect(loadable).toMatchObject({
      state: 'hasValue',
      contents: 0,
    });
  });

  test('setNodeValue returns written value when writing atom', () => {
    const writes = setNodeValue(store, store.getState().currentTree, atomA, 1);
    const written = nullthrows(writes.get(atomA));
    expect(written.contents).toBe(1);
  });
}); 