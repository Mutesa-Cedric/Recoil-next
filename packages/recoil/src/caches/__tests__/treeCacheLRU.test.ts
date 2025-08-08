/**
 * TypeScript port of Recoil_treeCacheLRU-test.js
 */

import { describe, expect, test } from 'vitest';
import { loadableWithValue } from '../../adt/Loadable';
import type { NodeCacheRoute } from '../TreeCacheImplementationType';
import treeCacheLRU from '../treeCacheLRU';

describe('treeCacheLRU()', () => {
  test('getting and setting cache', () => {
    const cache = treeCacheLRU<any>({ maxSize: 10 });

    const [route1, loadable1]: [NodeCacheRoute, any] = [
      [
        ['a', 2],
        ['b', 3],
      ],
      loadableWithValue('value1'),
    ];

    const [route2, loadable2]: [NodeCacheRoute, any] = [
      [
        ['a', 3],
        ['b', 4],
      ],
      loadableWithValue('value2'),
    ];

    const [route3, loadable3]: [NodeCacheRoute, any] = [
      [['a', 4]],
      loadableWithValue('value3'),
    ];

    cache.set(route1, loadable1);
    cache.set(route2, loadable2);
    cache.set(route3, loadable3);

    expect(cache.size()).toBe(3);

    expect(
      cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable1);

    expect(
      cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable2);

    expect(
      cache.get(nodeKey => route3.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable3);
  });

  test('evicting from cache when full', () => {
    const cache = treeCacheLRU<any>({ maxSize: 2 });

    const [route1, loadable1]: [NodeCacheRoute, any] = [
      [
        ['a', 2],
        ['b', 3],
      ],
      loadableWithValue('value1'),
    ];

    const [route2, loadable2]: [NodeCacheRoute, any] = [
      [
        ['a', 3],
        ['b', 4],
      ],
      loadableWithValue('value2'),
    ];

    const [route3, loadable3]: [NodeCacheRoute, any] = [
      [['a', 4]],
      loadableWithValue('value3'),
    ];

    cache.set(route1, loadable1);
    cache.set(route2, loadable2);
    expect(cache.size()).toBe(2);

    cache.set(route3, loadable3);
    expect(cache.size()).toBe(2); // Should still be 2 after eviction

    // route1 should be evicted (LRU)
    expect(
      cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(undefined);

    expect(
      cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable2);

    expect(
      cache.get(nodeKey => route3.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable3);
  });

  test('updating LRU order on access', () => {
    const cache = treeCacheLRU<any>({ maxSize: 2 });

    const [route1, loadable1]: [NodeCacheRoute, any] = [
      [['a', 1]],
      loadableWithValue('value1'),
    ];

    const [route2, loadable2]: [NodeCacheRoute, any] = [
      [['a', 2]],
      loadableWithValue('value2'),
    ];

    const [route3, loadable3]: [NodeCacheRoute, any] = [
      [['a', 3]],
      loadableWithValue('value3'),
    ];

    cache.set(route1, loadable1);
    cache.set(route2, loadable2);

    // Access route1 to make it more recently used
    cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]);

    // Add route3 - this should evict route2 (not route1)
    cache.set(route3, loadable3);

    expect(
      cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable1);

    expect(
      cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(undefined); // Should be evicted

    expect(
      cache.get(nodeKey => route3.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable3);
  });

  test('clear cache', () => {
    const cache = treeCacheLRU<any>({ maxSize: 10 });

    const [route1, loadable1]: [NodeCacheRoute, any] = [
      [['a', 1]],
      loadableWithValue('value1'),
    ];

    cache.set(route1, loadable1);
    expect(cache.size()).toBe(1);

    cache.clear();
    expect(cache.size()).toBe(0);

    expect(
      cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(undefined);
  });
}); 