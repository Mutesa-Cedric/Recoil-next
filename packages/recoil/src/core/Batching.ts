/**
 * TypeScript port of Recoil_Batching.js
 */

'use strict';

import {unstable_batchedUpdates} from '../../../shared/src/util/Recoil_ReactBatchedUpdates';
import {batchStart} from './RecoilValueInterface';

type Callback = () => unknown;
export type Batcher = (callback: Callback) => void;

let batcher: Batcher = unstable_batchedUpdates ?? (cb => cb());

export function setBatcher(newBatcher: Batcher): void {
  batcher = newBatcher;
}

export function getBatcher(): Batcher {
  return batcher;
}

export function batchUpdates(callback: Callback): void {
  batcher(() => {
    let batchEnd: () => void = () => {};
    try {
      batchEnd = batchStart();
      callback();
    } finally {
      batchEnd();
    }
  });
}
