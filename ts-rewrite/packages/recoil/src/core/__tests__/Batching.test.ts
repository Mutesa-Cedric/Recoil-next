/**
 * TypeScript port of Recoil_batcher-test.js
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { batchUpdates, getBatcher, setBatcher } from '../Batching';

/**
 * Cleanup function that will reset the batcher back to default.
 * Call this at the end of a test that calls setBatcher to maintain test purity.
 */
const resetBatcherToDefault = () => {
  // Reset to a default implementation
  setBatcher((fn: () => void) => fn());
};

describe('batcher', () => {
  afterEach(() => {
    resetBatcherToDefault();
  });

  test('setBatcher sets the batcher function', () => {
    const batcherFn = vi.fn();
    setBatcher(batcherFn);

    expect(getBatcher()).toEqual(batcherFn);
  });

  test('batchUpdates calls the batcher', () => {
    const batcherFn = vi.fn();
    setBatcher(batcherFn);

    batchUpdates(() => {});
    expect(batcherFn).toHaveBeenCalledTimes(1);
  });

  test('batchUpdates executes the callback', () => {
    const callback = vi.fn();
    
    batchUpdates(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });
}); 