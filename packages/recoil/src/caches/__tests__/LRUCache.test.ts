/**
 * TypeScript port of Recoil_LRUCache-test.js
 */

import {describe, test, expect} from 'vitest';

import {LRUCache} from '../LRUCache';

describe('LRUCache', () => {
  test('setting and getting (without hitting max size)', () => {
    const cache = new LRUCache({
      maxSize: 10,
    });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);

    cache.delete('a');
    cache.delete('b');

    expect(cache.size()).toBe(1);
  });

  test('setting and getting (hitting max size)', () => {
    const cache = new LRUCache({
      maxSize: 2,
    });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(2);

    expect(cache.get('a')).toBe(undefined);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);

    cache.delete('a');
    cache.delete('b');

    expect(cache.size()).toBe(1);

    cache.set('d', 4);
    cache.set('e', 5);

    expect(cache.size()).toBe(2);

    expect(cache.get('b')).toBe(undefined);
    expect(cache.get('c')).toBe(undefined);
  });

  test('manually deleting LRU', () => {
    const cache = new LRUCache({
      maxSize: 10,
    });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.size()).toBe(3);

    expect(cache.get('a')).toBe(1);

    cache.delete('a');

    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBe(undefined);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);

    cache.delete('b');
    cache.delete('c');

    expect(cache.size()).toBe(0);
  });

  test('updating existing keys moves them to front', () => {
    const cache = new LRUCache({
      maxSize: 2,
    });

    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);

    // Update 'a' to move it to front
    cache.set('a', 10);

    // Add 'c' which should evict 'b' (since 'a' was moved to front)
    cache.set('c', 3);

    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(undefined); // Should be evicted
    expect(cache.get('c')).toBe(3);
  });

  test('accessing items moves them to front', () => {
    const cache = new LRUCache({
      maxSize: 2,
    });

    cache.set('a', 1);
    cache.set('b', 2);

    // Access 'a' to move it to front
    expect(cache.get('a')).toBe(1);

    // Add 'c' which should evict 'b' (since 'a' was accessed recently)
    cache.set('c', 3);

    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(undefined); // Should be evicted
    expect(cache.get('c')).toBe(3);
  });

  test('has method', () => {
    const cache = new LRUCache({
      maxSize: 2,
    });

    expect(cache.has('a')).toBe(false);

    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);

    cache.set('b', 2);
    cache.set('c', 3); // Should evict 'a'

    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  test('clear method', () => {
    const cache = new LRUCache({
      maxSize: 10,
    });

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

  test('custom key mapper', () => {
    const cache = new LRUCache<{id: number}, number>({
      maxSize: 3,
      mapKey: obj => obj.id,
    });

    const keyA = {id: 1};
    const keyB = {id: 2};
    const keyC = {id: 3};

    cache.set(keyA, 10);
    cache.set(keyB, 20);

    // Using different object instances with same id should work
    expect(cache.get({id: 1})).toBe(10);
    expect(cache.get({id: 2})).toBe(20);

    cache.set(keyC, 30);

    expect(cache.size()).toBe(3);
    expect(cache.get({id: 1})).toBe(10);
    expect(cache.get({id: 2})).toBe(20);
    expect(cache.get({id: 3})).toBe(30);
  });

  test('head and tail methods', () => {
    const cache = new LRUCache({
      maxSize: 3,
    });

    expect(cache.head()).toBeNull();
    expect(cache.tail()).toBeNull();

    cache.set('a', 1);

    expect(cache.head()?.key).toBe('a');
    expect(cache.tail()?.key).toBe('a');

    cache.set('b', 2);

    expect(cache.head()?.key).toBe('b'); // Most recently added
    expect(cache.tail()?.key).toBe('a'); // Least recently used

    cache.set('c', 3);

    expect(cache.head()?.key).toBe('c');
    expect(cache.tail()?.key).toBe('a');

    // Access 'a' to move it to head
    cache.get('a');

    expect(cache.head()?.key).toBe('a');
    expect(cache.tail()?.key).toBe('b');
  });
});
