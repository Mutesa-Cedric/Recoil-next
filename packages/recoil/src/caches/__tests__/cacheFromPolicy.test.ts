/**
 * TypeScript port of Recoil_cacheFromPolicy-test.js
 */

import { describe, expect, test } from 'vitest';

import cacheFromPolicy from '../cacheFromPolicy';

describe('cacheFromPolicy()', () => {
  test('equality: reference, eviction: keep-all', () => {
    const policy = { equality: 'reference' as const, eviction: 'keep-all' as const };
    const cache = cacheFromPolicy<{ [key: string]: number }, boolean>(policy);

    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const obj3 = { c: 3 };

    cache.set(obj1, true);
    cache.set(obj2, true);
    cache.set(obj3, true);

    expect(cache.size()).toBe(3);

    expect(cache.get(obj1)).toBe(true);
    expect(cache.get(obj2)).toBe(true);
    expect(cache.get(obj3)).toBe(true);

    expect(cache.get({ ...obj1 })).toBe(undefined);
    expect(cache.get({ ...obj2 })).toBe(undefined);
    expect(cache.get({ ...obj3 })).toBe(undefined);
  });

  test('equality: value, eviction: keep-all', () => {
    const policy = { equality: 'value' as const, eviction: 'keep-all' as const };
    const cache = cacheFromPolicy<{ [key: string]: number }, boolean>(policy);

    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const obj3 = { c: 3 };

    cache.set(obj1, true);
    cache.set(obj2, true);
    cache.set(obj3, true);

    expect(cache.size()).toBe(3);

    expect(cache.get(obj1)).toBe(true);
    expect(cache.get(obj2)).toBe(true);
    expect(cache.get(obj3)).toBe(true);

    expect(cache.get({ ...obj1 })).toBe(true);
    expect(cache.get({ ...obj2 })).toBe(true);
    expect(cache.get({ ...obj3 })).toBe(true);
  });

  test('equality: reference, eviction: lru', () => {
    const policy = { 
      equality: 'reference' as const, 
      eviction: 'lru' as const, 
      maxSize: 2 
    };
    const cache = cacheFromPolicy<{ [key: string]: number }, boolean>(policy);

    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const obj3 = { c: 3 };

    cache.set(obj1, true);
    cache.set(obj2, true);
    cache.set(obj3, true);

    expect(cache.size()).toBe(2);

    expect(cache.get(obj1)).toBe(undefined);

    expect(cache.get(obj2)).toBe(true);
    expect(cache.get(obj3)).toBe(true);

    cache.set(obj1, true);

    expect(cache.size()).toBe(2);

    expect(cache.get(obj2)).toBe(undefined);

    expect(cache.get(obj1)).toBe(true);
    expect(cache.get(obj3)).toBe(true);

    expect(cache.get({ ...obj1 })).toBe(undefined);
    expect(cache.get({ ...obj3 })).toBe(undefined);
  });

  test('equality: value, eviction: lru', () => {
    const policy = { 
      equality: 'value' as const, 
      eviction: 'lru' as const, 
      maxSize: 2 
    };
    const cache = cacheFromPolicy<{ [key: string]: number }, boolean>(policy);

    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const obj3 = { c: 3 };

    cache.set(obj1, true);
    cache.set(obj2, true);
    cache.set(obj3, true);

    expect(cache.size()).toBe(2);

    expect(cache.get(obj1)).toBe(undefined);
    expect(cache.get({ ...obj1 })).toBe(undefined);

    expect(cache.get(obj2)).toBe(true);
    expect(cache.get({ ...obj2 })).toBe(true);
    expect(cache.get(obj3)).toBe(true);
    expect(cache.get({ ...obj3 })).toBe(true);

    cache.set({ ...obj1 }, true);

    expect(cache.size()).toBe(2);

    expect(cache.get(obj2)).toBe(undefined);
    expect(cache.get({ ...obj2 })).toBe(undefined);

    expect(cache.get(obj1)).toBe(true);
    expect(cache.get({ ...obj1 })).toBe(true);
    expect(cache.get(obj3)).toBe(true);
    expect(cache.get({ ...obj3 })).toBe(true);
  });

  test('cache clear', () => {
    const policy = { equality: 'reference' as const, eviction: 'keep-all' as const };
    const cache = cacheFromPolicy<string, number>(policy);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(3);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBe(undefined);
    expect(cache.get('b')).toBe(undefined);
    expect(cache.get('c')).toBe(undefined);
  });

  test('cache delete', () => {
    const policy = { equality: 'reference' as const, eviction: 'keep-all' as const };
    const cache = cacheFromPolicy<string, number>(policy);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(3);
    expect(cache.delete('b')).toBe(true);
    expect(cache.size()).toBe(2);
    expect(cache.get('b')).toBe(undefined);
    expect(cache.delete('b')).toBe(false); // Already deleted

    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  test('cache with complex keys', () => {
    const policy = { equality: 'value' as const, eviction: 'keep-all' as const };
    const cache = cacheFromPolicy<{ nested: { deep: string } }, string>(policy);

    const key1 = { nested: { deep: 'value1' } };
    const key2 = { nested: { deep: 'value2' } };

    cache.set(key1, 'result1');
    cache.set(key2, 'result2');

    expect(cache.get(key1)).toBe('result1');
    expect(cache.get(key2)).toBe('result2');

    // Test value equality
    expect(cache.get({ nested: { deep: 'value1' } })).toBe('result1');
    expect(cache.get({ nested: { deep: 'value2' } })).toBe('result2');
  });

  test('cache with primitive keys', () => {
    const policy = { equality: 'reference' as const, eviction: 'keep-all' as const };
    const cache = cacheFromPolicy<string | number, boolean>(policy);

    cache.set('string-key', true);
    cache.set(42, false);
    cache.set('another-key', true);

    expect(cache.get('string-key')).toBe(true);
    expect(cache.get(42)).toBe(false);
    expect(cache.get('another-key')).toBe(true);
    expect(cache.get('non-existent')).toBe(undefined);

    expect(cache.size()).toBe(3);
  });

  test('cache eviction policies', () => {
    // Test most-recently-used eviction
    const lruPolicy = { 
      equality: 'reference' as const, 
      eviction: 'lru' as const, 
      maxSize: 3 
    };
    const lruCache = cacheFromPolicy<string, number>(lruPolicy);

    lruCache.set('a', 1);
    lruCache.set('b', 2);
    lruCache.set('c', 3);
    expect(lruCache.size()).toBe(3);

    // Access 'a' to make it recently used
    lruCache.get('a');
    
    // Add new item - should evict 'b' (least recently used)
    lruCache.set('d', 4);
    expect(lruCache.size()).toBe(3);
    expect(lruCache.get('a')).toBe(1);
    expect(lruCache.get('b')).toBe(undefined);
    expect(lruCache.get('c')).toBe(3);
    expect(lruCache.get('d')).toBe(4);
  });
}); 