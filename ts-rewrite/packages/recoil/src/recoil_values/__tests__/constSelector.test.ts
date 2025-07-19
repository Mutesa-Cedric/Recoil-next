/**
 * TypeScript port of Recoil_constSelector-test.js
 */

import { test, expect } from 'vitest';
import { constSelector } from '../constSelector';
import { makeEmptyStoreState } from '../../core/State';
import { getRecoilValueAsLoadable } from '../../core/RecoilValueInterface';

// Simple store setup for testing
const store = {
  storeID: 'test',
  getState: () => makeEmptyStoreState(),
  replaceState: () => {},
  getGraph: () => ({ nodeDeps: new Map(), nodeToNodeSubscriptions: new Map() }),
  subscribeToTransactions: () => ({ release: () => {} }),
  addTransactionMetadata: () => {},
};

function get<T>(recoilValue: any): T {
  return getRecoilValueAsLoadable<T>(store as any, recoilValue).valueOrThrow();
}

test('constSelector - string', () => {
  const mySelector = constSelector('HELLO');
  expect(get(mySelector)).toEqual('HELLO');
  expect(get(mySelector)).toBe('HELLO');
});

test('constSelector - number', () => {
  const mySelector = constSelector(42);
  expect(get(mySelector)).toEqual(42);
  expect(get(mySelector)).toBe(42);
});

test('constSelector - null', () => {
  const mySelector = constSelector(null);
  expect(get(mySelector)).toEqual(null);
  expect(get(mySelector)).toBe(null);
});

test('constSelector - boolean', () => {
  const mySelector = constSelector(true);
  expect(get(mySelector)).toEqual(true);
  expect(get(mySelector)).toBe(true);
});

test('constSelector - array', () => {
  const emptyArraySelector = constSelector([]);
  expect(get(emptyArraySelector)).toEqual([]);

  const numberArray = [1, 2, 3];
  const numberArraySelector = constSelector(numberArray);
  expect(get(numberArraySelector)).toEqual([1, 2, 3]);
  expect(get(numberArraySelector)).toBe(numberArray);
});

test('constSelector - object', () => {
  const emptyObjSelector = constSelector({});
  expect(get(emptyObjSelector)).toEqual({});

  const obj = {foo: 'bar'};
  const objSelector = constSelector(obj);
  expect(get(objSelector)).toEqual({foo: 'bar'});
  expect(get(objSelector)).toBe(obj);

  // Calling a second time with same object provides the same selector
  const objSelector2 = constSelector(obj);
  expect(objSelector2).toBe(objSelector);
  expect(get(objSelector2)).toEqual({foo: 'bar'});
  expect(get(objSelector2)).toBe(obj);

  // Calling a third time with similar but different object provides
  // a new selector for the new reference.
  const newObj = {foo: 'bar'};
  const objSelector3 = constSelector(newObj);
  expect(get(objSelector3)).toEqual({foo: 'bar'});
  expect(get(objSelector3)).toBe(newObj);
});

test('constSelector - function', () => {
  const foo = () => 'FOO';
  const bar = () => 'BAR';

  const fooSelector = constSelector(foo as any);
  const barSelector = constSelector(bar as any);

  expect((get(fooSelector) as any)()).toEqual('FOO');
  expect((get(barSelector) as any)()).toEqual('BAR');

  expect(constSelector(foo as any)).toEqual(fooSelector);
}); 