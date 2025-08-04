/**
 * TypeScript port of Recoil_TreeCache-test.js
 */

import { describe, test, expect } from 'vitest';

import TreeCache from '../TreeCache';
import { loadableWithValue } from '../../adt/Loadable';
import type { NodeKey } from '../../core/Keys';
import nullthrows from '../../../../shared/src/util/Recoil_nullthrows';

describe('TreeCache', () => {
  test('setting and getting values', () => {
    const cache = new TreeCache();

    const [route1, loadable1] = [
      [
        ['a', 2],
        ['b', 3],
      ] as [NodeKey, unknown][],
      loadableWithValue('value1'),
    ];

    const [route2, loadable2] = [
      [
        ['a', 3],
        ['b', 4],
      ] as [NodeKey, unknown][],
      loadableWithValue('value2'),
    ];

    const [route3, loadable3] = [
      [['a', 4]] as [NodeKey, unknown][],
      loadableWithValue('value3'),
    ];

    cache.set(route1, loadable1);
    cache.set(route2, loadable2);
    cache.set(route3, loadable3);

    expect(
      cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable1);

    expect(
      cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable2);

    expect(
      cache.get(nodeKey => route3.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable3);

    expect(cache.size()).toBe(3);
  });

  test('deleting values', () => {
    const cache = new TreeCache();

    const [route1, loadable1] = [
      [
        ['a', 2],
        ['b', 3],
      ] as [NodeKey, unknown][],
      loadableWithValue('value1'),
    ];

    const [route2, loadable2] = [
      [
        ['a', 3],
        ['b', 4],
      ] as [NodeKey, unknown][],
      loadableWithValue('value2'),
    ];

    cache.set(route1, loadable1);
    cache.set(route2, loadable2);

    expect(cache.size()).toBe(2);

    // Get the leaf node to delete
    const leafToDelete = cache.getLeafNode(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]);
    
    if (leafToDelete) {
      const deleted = cache.delete(leafToDelete);
      expect(deleted).toBe(true);
    }

    expect(cache.size()).toBe(1);

    expect(
      cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(undefined);

    expect(
      cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1]),
    ).toBe(loadable2);
  });

  test('clear cache', () => {
    const cache = new TreeCache();

    const route1 = [['a', 1]] as [NodeKey, unknown][];
    const route2 = [['b', 2]] as [NodeKey, unknown][];

    cache.set(route1, loadableWithValue('value1'));
    cache.set(route2, loadableWithValue('value2'));

    expect(cache.size()).toBe(2);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1])).toBe(undefined);
    expect(cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1])).toBe(undefined);
  });

  test('cache with single node route', () => {
    const cache = new TreeCache();

    const route = [['singleNode', 42]] as [NodeKey, unknown][];
    const value = loadableWithValue('single value');

    cache.set(route, value);

    expect(cache.size()).toBe(1);
    expect(cache.get(nodeKey => route.find(([key]) => key === nodeKey)?.[1])).toBe(value);
  });

  test('cache with empty route', () => {
    const cache = new TreeCache();

    const emptyRoute = [] as [NodeKey, unknown][];
    const value = loadableWithValue('empty route value');

    cache.set(emptyRoute, value);

    expect(cache.size()).toBe(1);
    expect(cache.get(() => undefined)).toBe(value);
  });

  test('overwriting existing values', () => {
    const cache = new TreeCache();

    const route = [['node', 1]] as [NodeKey, unknown][];
    const value1 = loadableWithValue('first value');
    const value2 = loadableWithValue('second value');

    cache.set(route, value1);
    expect(cache.size()).toBe(1);
    expect(cache.get(nodeKey => route.find(([key]) => key === nodeKey)?.[1])).toBe(value1);

    // Overwrite with new value
    cache.set(route, value2);
    expect(cache.size()).toBe(1); // Size should remain the same
    expect(cache.get(nodeKey => route.find(([key]) => key === nodeKey)?.[1])).toBe(value2);
  });

  test('complex nested routes', () => {
    const cache = new TreeCache();

    const route1 = [
      ['level1', 'a'],
      ['level2', 'b'],
      ['level3', 'c'],
    ] as [NodeKey, unknown][];

    const route2 = [
      ['level1', 'a'],
      ['level2', 'b'],
      ['level3', 'd'], // Different at level3
    ] as [NodeKey, unknown][];

    const route3 = [
      ['level1', 'a'],
      ['level2', 'x'], // Different at level2
      ['level3', 'y'],
    ] as [NodeKey, unknown][];

    const value1 = loadableWithValue('value1');
    const value2 = loadableWithValue('value2');
    const value3 = loadableWithValue('value3');

    cache.set(route1, value1);
    cache.set(route2, value2);
    cache.set(route3, value3);

    expect(cache.size()).toBe(3);

    expect(cache.get(nodeKey => route1.find(([key]) => key === nodeKey)?.[1])).toBe(value1);
    expect(cache.get(nodeKey => route2.find(([key]) => key === nodeKey)?.[1])).toBe(value2);
    expect(cache.get(nodeKey => route3.find(([key]) => key === nodeKey)?.[1])).toBe(value3);
  });

  test('cache with name option', () => {
    const cache = new TreeCache({ name: 'test-cache' });

    const route = [['node', 1]] as [NodeKey, unknown][];
    cache.set(route, loadableWithValue('test'));

    expect(cache.size()).toBe(1);
  });

  test('cache with mapNodeValue option', () => {
    const cache = new TreeCache({
      mapNodeValue: (value) => typeof value === 'string' ? value.toUpperCase() : value
    });

    const route = [['node', 'test']] as [NodeKey, unknown][];
    cache.set(route, loadableWithValue('mapped'));

    expect(cache.size()).toBe(1);
    expect(cache.get(nodeKey => route.find(([key]) => key === nodeKey)?.[1])).toEqual(loadableWithValue('mapped'));
  });
}); 