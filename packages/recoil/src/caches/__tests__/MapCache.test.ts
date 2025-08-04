/**
 * TypeScript port of Recoil_MapCache-test.js
 */

import { describe, test, expect } from 'vitest';
import { MapCache } from '../MapCache';

describe('MapCache', () => {
  test('setting and getting', () => {
    const cache = new MapCache<string, number>();

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  test('deleting', () => {
    const cache = new MapCache<string, number>();

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(3);

    cache.delete('a');

    expect(cache.size()).toBe(2);

    expect(cache.get('a')).toBe(undefined);
    expect(cache.get('b')).toBe(2);
    expect(cache.has('a')).toBe(false);
  });
}); 