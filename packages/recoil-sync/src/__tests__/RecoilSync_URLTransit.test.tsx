/**
 * TypeScript port of RecoilSync_URLTransit-test.js
 */

import React from 'react';
import { atom } from 'recoil-next';
import {
  array,
  bool,
  custom,
  date,
  literal,
  map,
  number,
  object,
  set,
  string,
  tuple,
} from 'refine-next';
import { describe, expect, test } from 'vitest';
import { syncEffect } from '../RecoilSync';
import { LocationOption } from '../RecoilSync_URL';
import { RecoilURLSyncTransit, TransitHandler } from '../RecoilSync_URLTransit';
import {
  ReadsAtom,
  flushPromisesAndTimers,
  renderElements,
} from '../__test_utils__/TestUtils';

class MyClass {
  prop: string;
  constructor(msg: string) {
    this.prop = msg;
  }
}

const atomNull = atom({
  key: 'null',
  default: null,
  effects: [syncEffect({ refine: literal(null), syncDefault: true })],
});
const atomBoolean = atom({
  key: 'boolean',
  default: true,
  effects: [syncEffect({ refine: bool(), syncDefault: true })],
});
const atomNumber = atom({
  key: 'number',
  default: 123,
  effects: [syncEffect({ refine: number(), syncDefault: true })],
});
const atomString = atom({
  key: 'string',
  default: 'STRING',
  effects: [syncEffect({ refine: string(), syncDefault: true })],
});
const atomArray = atom({
  key: 'array',
  default: [1, 'a'],
  effects: [syncEffect({ refine: tuple([number(), string()]), syncDefault: true })],
});
const atomObject = atom({
  key: 'object',
  default: { foo: [1, 2] },
  effects: [
    syncEffect({ refine: object({ foo: array(number()) }), syncDefault: true }),
  ],
});
const atomSet = atom({
  key: 'set',
  default: new Set([1, 2]),
  effects: [syncEffect({ refine: set(number()), syncDefault: true })],
});
const atomMap = atom({
  key: 'map',
  default: new Map([[1, 'a']]),
  effects: [syncEffect({ refine: map(number(), string()), syncDefault: true })],
});
const atomDate = atom({
  key: 'date',
  default: new Date('7:00 GMT October 26, 1985'),
  effects: [syncEffect({ refine: date(), syncDefault: true })],
});
const atomUser = atom({
  key: 'user',
  default: new MyClass('CUSTOM'),
  effects: [
    syncEffect({
      refine: custom(x => (x instanceof MyClass ? x : null)),
      syncDefault: true,
    }),
  ],
});

const customHandlers: TransitHandler<MyClass, any>[] = [
  {
    tag: 'USER',
    class: MyClass,
    write: (obj: MyClass) => [obj.prop],
    read: ([prop]: any[]) => new MyClass(prop),
  },
];

async function testTransit(
  loc: LocationOption,
  atoms: any[],
  contents: string,
  beforeURL: string,
  afterURL: string,
) {
  history.replaceState(null, '', beforeURL);

  const container = renderElements(
    React.createElement(RecoilURLSyncTransit, {
      location: loc,
      handlers: customHandlers,
      children: atoms.map((atom, index) =>
        React.createElement(ReadsAtom, { key: index, atom })
      ),
    })
  );
  expect(container.textContent).toBe(contents);
  await flushPromisesAndTimers();
  expect(window.location.href).toBe(window.location.origin + afterURL);
}

describe('URL Transit Encode', () => {
  test('Anchor', async () =>
    testTransit(
      { part: 'hash' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nulltrue123"STRING"[1,"a"]{"foo":[1,2]}[1,2]{"1":"a"}"1985-10-26T07:00:00.000Z"{"prop":"CUSTOM"}',
      '/path/page.html?foo=bar',
      '/path/page.html?foo=bar#%5B%22%5E%20%22%2C%22null%22%2Cnull%2C%22boolean%22%2Ctrue%2C%22number%22%2C123%2C%22string%22%2C%22STRING%22%2C%22array%22%2C%5B1%2C%22a%22%5D%2C%22object%22%2C%5B%22%5E%20%22%2C%22foo%22%2C%5B1%2C2%5D%5D%2C%22set%22%2C%5B%22~%23Set%22%2C%5B1%2C2%5D%5D%2C%22map%22%2C%5B%22~%23Map%22%2C%5B%5B1%2C%22a%22%5D%5D%5D%2C%22date%22%2C%5B%22~%23Date%22%2C%221985-10-26T07%3A00%3A00.000Z%22%5D%2C%22user%22%2C%5B%22~%23USER%22%2C%5B%22CUSTOM%22%5D%5D%5D',
    ));

  test('Search', async () =>
    testTransit(
      { part: 'search' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nulltrue123"STRING"[1,"a"]{"foo":[1,2]}[1,2]{"1":"a"}"1985-10-26T07:00:00.000Z"{"prop":"CUSTOM"}',
      '/path/page.html#anchor',
      '/path/page.html?%5B%22%5E%20%22%2C%22null%22%2Cnull%2C%22boolean%22%2Ctrue%2C%22number%22%2C123%2C%22string%22%2C%22STRING%22%2C%22array%22%2C%5B1%2C%22a%22%5D%2C%22object%22%2C%5B%22%5E%20%22%2C%22foo%22%2C%5B1%2C2%5D%5D%2C%22set%22%2C%5B%22~%23Set%22%2C%5B1%2C2%5D%5D%2C%22map%22%2C%5B%22~%23Map%22%2C%5B%5B1%2C%22a%22%5D%5D%5D%2C%22date%22%2C%5B%22~%23Date%22%2C%221985-10-26T07%3A00%3A00.000Z%22%5D%2C%22user%22%2C%5B%22~%23USER%22%2C%5B%22CUSTOM%22%5D%5D%5D#anchor',
    ));

  test('Query Param', async () =>
    testTransit(
      { part: 'queryParams', param: 'param' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nulltrue123"STRING"[1,"a"]{"foo":[1,2]}[1,2]{"1":"a"}"1985-10-26T07:00:00.000Z"{"prop":"CUSTOM"}',
      '/path/page.html?foo=bar#anchor',
      '/path/page.html?foo=bar&param=%5B%22%5E+%22%2C%22null%22%2Cnull%2C%22boolean%22%2Ctrue%2C%22number%22%2C123%2C%22string%22%2C%22STRING%22%2C%22array%22%2C%5B1%2C%22a%22%5D%2C%22object%22%2C%5B%22%5E+%22%2C%22foo%22%2C%5B1%2C2%5D%5D%2C%22set%22%2C%5B%22%7E%23Set%22%2C%5B1%2C2%5D%5D%2C%22map%22%2C%5B%22%7E%23Map%22%2C%5B%5B1%2C%22a%22%5D%5D%5D%2C%22date%22%2C%5B%22%7E%23Date%22%2C%221985-10-26T07%3A00%3A00.000Z%22%5D%2C%22user%22%2C%5B%22%7E%23USER%22%2C%5B%22CUSTOM%22%5D%5D%5D#anchor',
    ));
});

describe('URL Transit Parse', () => {
  test('Anchor', async () =>
    testTransit(
      { part: 'hash' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nullfalse456"SET"[2,"b"]{"foo":[]}[2,3]{"2":"b"}"1955-11-05T07:00:00.000Z"{"prop":"SET"}',
      '/#["^ ","null",null,"boolean",false,"number",456,"string","SET","array",[2,"b"],"object",["^ ","foo",[]],"set",["~#Set",[2,3]],"map",["~#Map",[[2,"b"]]],"date",["~#Date","1955-11-05T07:00:00.000Z"],"user",["~#USER",["SET"]]]',
      '/#%5B%22%5E%20%22%2C%22null%22%2Cnull%2C%22boolean%22%2Cfalse%2C%22number%22%2C456%2C%22string%22%2C%22SET%22%2C%22array%22%2C%5B2%2C%22b%22%5D%2C%22object%22%2C%5B%22%5E%20%22%2C%22foo%22%2C%5B%5D%5D%2C%22set%22%2C%5B%22~%23Set%22%2C%5B2%2C3%5D%5D%2C%22map%22%2C%5B%22~%23Map%22%2C%5B%5B2%2C%22b%22%5D%5D%5D%2C%22date%22%2C%5B%22~%23Date%22%2C%221955-11-05T07%3A00%3A00.000Z%22%5D%2C%22user%22%2C%5B%22~%23USER%22%2C%5B%22SET%22%5D%5D%5D',
    ));

  test('Search', async () =>
    testTransit(
      { part: 'search' },
      [atomNull, atomBoolean, atomNumber, atomString],
      'nullfalse456"SET"',
      '/?["^ ","null",null,"boolean",false,"number",456,"string","SET"]',
      '/?%5B%22%5E%20%22%2C%22null%22%2Cnull%2C%22boolean%22%2Cfalse%2C%22number%22%2C456%2C%22string%22%2C%22SET%22%5D',
    ));

  test('Query Param', async () =>
    testTransit(
      { part: 'queryParams', param: 'param' },
      [atomNull, atomBoolean, atomNumber, atomString],
      'nullfalse456"SET"',
      '/?param=["^ ","null",null,"boolean",false,"number",456,"string","SET"]',
      '/?param=%5B%22%5E+%22%2C%22null%22%2Cnull%2C%22boolean%22%2Cfalse%2C%22number%22%2C456%2C%22string%22%2C%22SET%22%5D',
    ));
}); 