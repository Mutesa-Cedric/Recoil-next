/**
 * TypeScript port of Recoil_Batching-test.js and Recoil_batcher-test.js
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { batchUpdates, getBatcher, setBatcher } from '../Batching';

/**
 * Cleanup function that will reset the batcher back
 * to the default batcher.
 *
 * Call this at the end of a test that calls setBatcher
 * to maintain test purity.
 */
const resetBatcherToDefault = () => {
  // Reset to a simple default implementation
  setBatcher((callback: () => void) => callback());
};

describe('Batching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBatcherToDefault();
  });

  afterEach(() => {
    resetBatcherToDefault();
  });

  test('default batcher should be available', () => {
    const batcher = getBatcher();
    expect(typeof batcher).toBe('function');
  });

  test('setBatcher sets the batcher function', () => {
    const batcherFn = vi.fn((callback: () => void) => callback());
    setBatcher(batcherFn);

    expect(getBatcher()).toEqual(batcherFn);
  });

  test('batchUpdates calls the batcher', () => {
    const batcherFn = vi.fn((callback: () => void) => callback());
    setBatcher(batcherFn);

    const callback = vi.fn();
    batchUpdates(callback);
    
    expect(batcherFn).toHaveBeenCalledTimes(1);
    // Check that batcherFn was called with a function
    expect(typeof batcherFn.mock.calls[0][0]).toBe('function');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('batchUpdates executes callback', () => {
    const callback = vi.fn();
    batchUpdates(callback);
    
    expect(callback).toHaveBeenCalledTimes(1);
  });
}); 