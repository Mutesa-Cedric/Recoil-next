/**
 * TypeScript port of Recoil_treeCacheFromPolicy-test.js
 */

import {describe, expect, test} from 'vitest';
import type {NodeKey} from '../../core/Keys';
import type {NodeCacheRoute} from '../TreeCacheImplementationType';
import treeCacheFromPolicy from '../treeCacheFromPolicy';

const valGetterFromPath = (path: NodeCacheRoute) => (nodeKey: NodeKey) =>
  path.find(([k]) => k === nodeKey)?.[1];

const clonePath = (path: NodeCacheRoute): NodeCacheRoute =>
  JSON.parse(JSON.stringify(path));

describe('treeCacheFromPolicy()', () => {
  test('equality: reference, eviction: keep-all', () => {
    const policy = {
      equality: 'reference' as const,
      eviction: 'keep-all' as const,
    };
    const cache = treeCacheFromPolicy<{[key: string]: number}>(policy);

    // Use objects as values to test reference equality properly
    const val1 = {x: 1};
    const val2 = {x: 2};
    const val3 = {x: 3};
    const val4 = {x: 4};

    const path1: NodeCacheRoute = [
      ['a', val1],
      ['b', val2],
    ];
    const obj1 = {a: 1};

    const path2: NodeCacheRoute = [['a', val3]];
    const obj2 = {b: 2};

    const path3: NodeCacheRoute = [
      ['a', val4],
      ['c', val4], // Note: reusing val4 to test reference equality
    ];
    const obj3 = {c: 3};

    cache.set(path1, obj1);
    cache.set(path2, obj2);
    cache.set(path3, obj3);

    expect(cache.size()).toBe(3);

    expect(cache.get(valGetterFromPath(path1))).toBe(obj1);
    expect(cache.get(valGetterFromPath(path2))).toBe(obj2);
    expect(cache.get(valGetterFromPath(path3))).toBe(obj3);

    // With reference equality, cloned paths should not match because
    // the object references in the paths are different
    expect(cache.get(valGetterFromPath(clonePath(path1)))).toBe(undefined);
    expect(cache.get(valGetterFromPath(clonePath(path2)))).toBe(undefined);
    expect(cache.get(valGetterFromPath(clonePath(path3)))).toBe(undefined);
  });

  test('equality: value, eviction: keep-all', () => {
    const policy = {equality: 'value' as const, eviction: 'keep-all' as const};
    const cache = treeCacheFromPolicy<{[key: string]: number}>(policy);

    const path1: NodeCacheRoute = [
      ['a', 1],
      ['b', 2],
    ];
    const obj1 = {a: 1};

    const path2: NodeCacheRoute = [['a', 2]];
    const obj2 = {b: 2};

    const path3: NodeCacheRoute = [
      ['a', 3],
      ['c', 4],
    ];
    const obj3 = {c: 3};

    cache.set(path1, obj1);
    cache.set(path2, obj2);
    cache.set(path3, obj3);

    expect(cache.size()).toBe(3);

    expect(cache.get(valGetterFromPath(path1))).toBe(obj1);
    expect(cache.get(valGetterFromPath(path2))).toBe(obj2);
    expect(cache.get(valGetterFromPath(path3))).toBe(obj3);

    expect(cache.get(valGetterFromPath(clonePath(path1)))).toBe(obj1);
    expect(cache.get(valGetterFromPath(clonePath(path2)))).toBe(obj2);
    expect(cache.get(valGetterFromPath(clonePath(path3)))).toBe(obj3);
  });

  test('equality: value, eviction: lru', () => {
    const policy = {
      equality: 'value' as const,
      eviction: 'lru' as const,
      maxSize: 2,
    };
    const cache = treeCacheFromPolicy<{[key: string]: number}>(policy);

    const path1: NodeCacheRoute = [
      ['a', 1],
      ['b', 2],
    ];
    const obj1 = {a: 1};

    const path2: NodeCacheRoute = [['a', 2]];
    const obj2 = {b: 2};

    const path3: NodeCacheRoute = [
      ['a', 3],
      ['c', 4],
    ];
    const obj3 = {c: 3};

    cache.set(path1, obj1);
    cache.set(path2, obj2);
    expect(cache.size()).toBe(2);

    cache.set(path3, obj3);
    expect(cache.size()).toBe(2); // Should evict oldest

    // path1 should be evicted
    expect(cache.get(valGetterFromPath(path1))).toBe(undefined);
    expect(cache.get(valGetterFromPath(path2))).toBe(obj2);
    expect(cache.get(valGetterFromPath(path3))).toBe(obj3);
  });

  test('clear cache', () => {
    const policy = {
      equality: 'reference' as const,
      eviction: 'keep-all' as const,
    };
    const cache = treeCacheFromPolicy<{[key: string]: number}>(policy);

    const path1: NodeCacheRoute = [['a', 1]];
    const obj1 = {a: 1};

    cache.set(path1, obj1);
    expect(cache.size()).toBe(1);
    expect(cache.get(valGetterFromPath(path1))).toBe(obj1);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get(valGetterFromPath(path1))).toBe(undefined);
  });

  test('empty path', () => {
    const policy = {
      equality: 'reference' as const,
      eviction: 'keep-all' as const,
    };
    const cache = treeCacheFromPolicy<{[key: string]: number}>(policy);

    const emptyPath: NodeCacheRoute = [];
    const obj = {a: 1};

    cache.set(emptyPath, obj);
    expect(cache.size()).toBe(1);
    expect(cache.get(valGetterFromPath(emptyPath))).toBe(obj);
  });

  test('overwrite existing path', () => {
    const policy = {
      equality: 'reference' as const,
      eviction: 'keep-all' as const,
    };
    const cache = treeCacheFromPolicy<{[key: string]: number}>(policy);

    const path: NodeCacheRoute = [['a', 1]];
    const obj1 = {a: 1};
    const obj2 = {a: 2};

    cache.set(path, obj1);
    expect(cache.size()).toBe(1);
    expect(cache.get(valGetterFromPath(path))).toBe(obj1);

    cache.set(path, obj2);
    expect(cache.size()).toBe(1);
    expect(cache.get(valGetterFromPath(path))).toBe(obj2);
  });
});
