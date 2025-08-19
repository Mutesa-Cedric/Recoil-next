/**
 * TypeScript port of Recoil_Memoize-test.js
 */
import {describe, it, expect, vi} from 'vitest';
import {
  memoizeOneWithArgsHash,
  memoizeOneWithArgsHashAndInvalidation,
  memoizeWithArgsHash,
} from '../Recoil_Memoize';

describe('memoizeWithArgsHash', () => {
  it('caches functions based on the hash function', () => {
    let i = 0;
    const f = vi.fn(() => i++);
    const mem = (memoizeWithArgsHash as any)(f, (_a: any, _b: any, c: any) =>
      String(c),
    );
    expect(mem()).toBe(0);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(1);
    expect(f.mock.calls.length).toBe(2);
  });
  it('handles "hasOwnProperty" as a hash key with no errors', () => {
    let i = 0;
    const f = vi.fn(() => i++);
    const mem = (memoizeWithArgsHash as any)(f, () => 'hasOwnProperty');
    expect(mem()).toBe(0);
    expect(() => mem()).not.toThrow();
    expect(mem(1)).toBe(0);
    expect(f.mock.calls.length).toBe(1);
  });
});

describe('memoizeOneWithArgsHash', () => {
  it('caches functions based on the arguments', () => {
    let i = 0;
    const f = vi.fn(() => i++);
    const mem = (memoizeOneWithArgsHash as any)(
      f,
      (a: any, b: any, c: any) => String(a) + String(b) + String(c),
    );
    expect(mem()).toBe(0);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(2);
    expect(mem(0, 0, 3)).toBe(2);
    expect(mem(1, 2, 3)).toBe(3);
    expect(f.mock.calls.length).toBe(4);
  });
  it('caches functions based on partial arguments', () => {
    let i = 0;
    const f = vi.fn(() => i++);
    const mem = (memoizeOneWithArgsHash as any)(f, (_a: any, _b: any, c: any) =>
      String(c),
    );
    expect(mem()).toBe(0);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(1);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(1, 2, 4)).toBe(2);
    expect(f.mock.calls.length).toBe(3);
  });
});

describe('memoizeOneWithArgsHashAndInvalidation', () => {
  it('caches functions based on the arguments', () => {
    let i = 0;
    const f = vi.fn(() => i++);
    const [mem, invalidate] = (memoizeOneWithArgsHashAndInvalidation as any)(
      f,
      (a: any, b: any, c: any) => String(a) + String(b) + String(c),
    );
    expect(mem()).toBe(0);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(2);
    expect(mem(0, 0, 3)).toBe(2);
    expect(mem(1, 2, 3)).toBe(3);
    expect(mem(1, 2, 3)).toBe(3);
    invalidate();
    expect(mem(1, 2, 3)).toBe(4);
    expect(mem(1, 2, 3)).toBe(4);
    expect(f.mock.calls.length).toBe(5);
  });
  it('caches functions based on partial arguments', () => {
    let i = 0;
    const f = vi.fn(() => i++);
    const [mem, invalidate] = (memoizeOneWithArgsHashAndInvalidation as any)(
      f,
      (_a: any, _b: any, c: any) => String(c),
    );
    expect(mem()).toBe(0);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(1);
    expect(mem(0, 0, 3)).toBe(1);
    expect(mem(1, 2, 3)).toBe(1);
    expect(mem(1, 2, 4)).toBe(2);
    expect(mem(1, 2, 4)).toBe(2);
    invalidate();
    expect(mem(1, 2, 4)).toBe(3);
    expect(mem(1, 2, 4)).toBe(3);
    expect(f.mock.calls.length).toBe(4);
  });
});
