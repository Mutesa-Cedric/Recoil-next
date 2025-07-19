/**
 * TypeScript port of Recoil_lazyProxy-test.js
 */
import { test, expect, vi } from 'vitest';
import lazyProxy from '../Recoil_lazyProxy';

test('lazyProxy', () => {
  const lazyProp = vi.fn(() => 456);
  const proxy = lazyProxy(
    {
      foo: 123,
    },
    {
      bar: lazyProp,
    },
  );

  expect(proxy.foo).toBe(123);
  expect(proxy.bar).toBe(456);
  expect(lazyProp).toHaveBeenCalledTimes(1);

  expect(proxy.bar).toBe(456);
  expect(lazyProp).toHaveBeenCalledTimes(1);
});

test('lazyProxy - keys', () => {
  const proxy = lazyProxy(
    {
      foo: 123,
    },
    {
      bar: () => 456,
    },
  );

  expect(Object.keys(proxy)).toEqual(['foo', 'bar']);
  expect('foo' in proxy).toBe(true);
  expect('bar' in proxy).toBe(true);

  const keys: string[] = [];
  for (const key in proxy) {
    keys.push(key);
  }
  expect(keys).toEqual(['foo', 'bar']);
}); 