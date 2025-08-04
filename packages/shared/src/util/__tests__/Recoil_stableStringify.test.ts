/**
 * TypeScript port of Recoil_stableStringify-test.js
 */

import { describe, expect, test } from 'vitest';
import stableStringify from '../Recoil_stableStringify';

describe('stableStringify', () => {
  // undefined
  test('undefined', () => {
    expect(stableStringify(undefined)).toBe('');
  });

  // Primitives
  test('primitives', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(false)).toBe('false');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify('hello world')).toBe('"hello world"');
    expect(stableStringify('contains \\ backslash')).toBe(
      '"contains \\\\ backslash"',
    );
    expect(stableStringify('nested "quotes"')).toBe('"nested \\"quotes\\""');
    expect(stableStringify('nested escaped \\" quote')).toBe(
      '"nested escaped \\\\\\" quote"',
    );
    // expect(stableStringify(BigInt(42))).toBe('42'); // BigInt is not supported in www
  });

  test('Symbol', () => {
    expect(stableStringify(Symbol('foo'))).toBe('Symbol(foo)');
  });

  // Array
  test('Array', () => {
    expect(stableStringify([1, 2])).toBe('[1,2]');
  });

  // Object
  test('Object', () => {
    // Object with stable key order
    expect(stableStringify({foo: 2, bar: 1})).toBe('{"bar":1,"foo":2}');
    expect(stableStringify({bar: 1, foo: 2})).toBe('{"bar":1,"foo":2}');
    // Object with quote in key
    expect(stableStringify({'key with "quotes"': 'value'})).toBe(
      '{"key with \\"quotes\\"":"value"}',
    );
    // Object with undefined values
    expect(stableStringify({foo: undefined, bar: 2})).toBe('{"bar":2}');
  });

  // Nested objects
  test('Nested Objects', () => {
    expect(stableStringify({arr: [1, 2]})).toBe('{"arr":[1,2]}');
    expect(stableStringify([{foo: 1}, {bar: 2}])).toBe('[{"foo":1},{"bar":2}]');
  });

  // Set
  test('Set', () => {
    // Built-in Set with stable order
    expect(stableStringify(new Set([1, 2]))).toBe('[1,2]');
    expect(stableStringify(new Set([2, 1]))).toBe('[1,2]');
    expect(stableStringify(new Set([{foo: 2, bar: 1}]))).toBe(
      '[{"bar":1,"foo":2}]',
    );
    expect(stableStringify(new Set([{bar: 1, foo: 2}]))).toBe(
      '[{"bar":1,"foo":2}]',
    );
  });

  // Map
  test('Map', () => {
    // Built-in Map with stable key order
    expect(
      stableStringify(
        new Map([
          ['foo', 2],
          ['bar', 1],
        ]),
      ),
    ).toBe('{"bar":1,"foo":2}');
    expect(
      stableStringify(
        new Map([
          ['bar', 1],
          ['foo', 2],
        ]),
      ),
    ).toBe('{"bar":1,"foo":2}');
  });

  // Mixed types
  test('Mixed Types', () => {
    const mixed = {
      array: [1, 2, 3],
      set: new Set(['a', 'b']),
      map: new Map([
        ['x', 1],
        ['y', 2],
      ]),
    };

    expect(stableStringify(mixed)).toBe(
      '{"array":[1,2,3],"map":{"x":1,"y":2},"set":["a","b"]}',
    );
  });

  // Edge cases
  test('Edge Cases', () => {
    // Empty structures
    expect(stableStringify([])).toBe('[]');
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify(new Set())).toBe('[]');
    expect(stableStringify(new Map())).toBe('{}');

    // Null values in structures
    expect(stableStringify([null, 1, null])).toBe('[null,1,null]');
    expect(stableStringify({a: null, b: 1})).toBe('{"a":null,"b":1}');
    expect(stableStringify(new Set([null, 1]))).toBe('[null,1]');
    expect(stableStringify(new Map([['a', null], ['b', 1]]))).toBe(
      '{"a":null,"b":1}',
    );

    // Functions (should be ignored)
    const objWithFunction = {
      a: 1,
      b: () => {},
      c: 2,
    };
    expect(stableStringify(objWithFunction)).toBe('{"a":1,"c":2}');
  });

  // Circular references
  test('Circular References', () => {
    const circular: any = {a: 1};
    circular.self = circular;

    // Should handle circular references gracefully
    expect(() => stableStringify(circular)).not.toThrow();
  });
}); 