/**
 * TypeScript port of Recoil_DevTools_GraphUtils.test.ts
 * Recoil DevTools browser extension.
 */

import { createGraph, depsHaveChaged } from '../GraphUtils';
import { describe, it, expect } from 'vitest';

describe('base cases', () => {
  const emptySet = new Set<string>();
  it('empty snapshot and deps', () => {
    expect(createGraph({})).toEqual({ levels: [[]], edges: [] });
  });

  it('only snapshot', () => {
    expect(createGraph({ a: new Set(), b: new Set() })).toEqual({
      levels: [['a', 'b']],
      edges: [],
    });
  });

  it('snapshot with single dep', () => {
    expect(createGraph({ a: emptySet, b: emptySet, c: new Set<string>(['a']) })).toEqual({
      levels: [['a', 'b'], ['c']],
      edges: [
        [
          [0, 0],
          [1, 0],
        ],
      ],
    });
  });

  it('more deps', () => {
    expect(
      createGraph({
        c: new Set<string>(['b']),
        d: new Set<string>(['a', 'b']),
        a: emptySet,
        b: emptySet,
      }),
    ).toEqual({
      levels: [
        ['a', 'b'],
        ['c', 'd'],
      ],
      edges: [
        [
          [0, 1],
          [1, 0],
        ],
        [
          [0, 0],
          [1, 1],
        ],
        [
          [0, 1],
          [1, 1],
        ],
      ],
    });
  });

  it('nested deps', () => {
    expect(
      createGraph({
        a: emptySet,
        b: emptySet,
        e: new Set<string>(['c']),
        c: new Set<string>(['b']),
        d: new Set<string>(['a', 'b']),
      }),
    ).toEqual({
      levels: [['a', 'b'], ['c', 'd'], ['e']],
      edges: [
        [
          [0, 1],
          [1, 0],
        ],
        [
          [0, 0],
          [1, 1],
        ],
        [
          [0, 1],
          [1, 1],
        ],
        [
          [1, 0],
          [2, 0],
        ],
      ],
    });
  });

  it('not found deps are ignored', () => {
    expect(
      createGraph({
        a: emptySet,
        b: emptySet,
        e: new Set<string>(['c']),
        c: new Set<string>(['b']),
        d: new Set<string>(['a', 'b']),
        f: new Set<string>(['g', 'a']),
      }),
    ).toEqual({
      levels: [['a', 'b'], ['c', 'd'], ['e']],
      edges: [
        [
          [0, 1],
          [1, 0],
        ],
        [
          [0, 0],
          [1, 1],
        ],
        [
          [0, 1],
          [1, 1],
        ],
        [
          [1, 0],
          [2, 0],
        ],
      ],
    });
  });
});

describe('depsHaveChaged util', () => {
  const newSet = new Set<string>(['a', 'b']);

  it('returns true when prev is null', () => {
    expect(depsHaveChaged(null, newSet)).toBeTruthy();
  });

  it('returns true when sets have different sizes', () => {
    expect(depsHaveChaged(new Set<string>(['a']), newSet)).toBeTruthy();
    expect(depsHaveChaged(new Set<string>(['a', 'b', 'c']), newSet)).toBeTruthy();
  });

  it('returns false when sets are equal', () => {
    expect(depsHaveChaged(new Set<string>(['a', 'b']), newSet)).toBeFalsy();
    expect(depsHaveChaged(new Set<string>(['b', 'a']), newSet)).toBeFalsy();
  });
});
