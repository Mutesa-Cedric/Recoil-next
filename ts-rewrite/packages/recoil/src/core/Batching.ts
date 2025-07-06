/*
 * TypeScript port of Recoil_Batching.js
 */

import { batchStart } from './RecoilValueInterface';
import { unstable_batchedUpdates } from 'recoil-shared/util/Recoil_ReactBatchedUpdates';

// Generic callback type
type Callback = () => unknown;
// A batcher receives a callback and ensures React state updates are batched.
export type Batcher = (callback: Callback) => void;

// During SSR, unstable_batchedUpdates may be undefined; fall back to plain execution.
let batcher: Batcher = unstable_batchedUpdates ?? (cb => cb());

/**
 * Set a custom batcher (e.g., for non-DOM React renderers).
 */
export function setBatcher(newBatcher: Batcher): void {
    batcher = newBatcher;
}

/**
 * Return the currently configured batcher.
 */
export function getBatcher(): Batcher {
    return batcher;
}

/**
 * Execute the provided callback via the current batcher while informing Recoil
 * of batch boundaries so internal state can be processed correctly.
 */
export function batchUpdates(callback: Callback): void {
    batcher(() => {
        let batchEnd: () => void = () => { };
        try {
            batchEnd = batchStart();
            callback();
        } finally {
            batchEnd();
        }
    });
} 