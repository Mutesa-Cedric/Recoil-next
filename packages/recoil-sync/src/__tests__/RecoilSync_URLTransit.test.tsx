/**
 * TypeScript port of RecoilSync_URLTransit-test.js
 */

import React from 'react';
import { atom, selector } from 'recoil';
import { expect, test, describe } from 'vitest';
import { LocationOption } from '../RecoilSync_URL';
import { TransitHandler } from '../RecoilSync_URLTransit';
import { syncEffect } from '../RecoilSync';
import { RecoilURLSyncTransit } from '../RecoilSync_URLTransit';
import {
  ReadsAtom,
  flushPromisesAndTimers,
  renderElements,
} from '../__test_utils__/TestUtils';
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
} from 'refine';

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
  effects: [syncEffect({ refine: tuple(number(), string()), syncDefault: true })],
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
      'nulltrue123"STRING"[1,"a"]{"foo":[1,2]}{"~#set":[1,2]}{"~#cmap":[[1,"a"]]}"1985-10-26T07:00:00.000Z"{"~#cmap":[["MyClass",{"prop":"CUSTOM"}]]}',
      '/path/page.html?foo=bar',
      '/path/page.html?foo=bar#%7B%22null%22%3Anull%2C%22boolean%22%3Atrue%2C%22number%22%3A123%2C%22string%22%3A%22STRING%22%2C%22array%22%3A%5B1%2C%22a%22%5D%2C%22object%22%3A%7B%22foo%22%3A%5B1%2C2%5D%7D%2C%22set%22%3A%7B%22~%23set%22%3A%5B1%2C2%5D%7D%2C%22map%22%3A%7B%22~%23cmap%22%3A%5B%5B1%2C%22a%22%5D%5D%7D%2C%22date%22%3A%221985-10-26T07%3A00%3A00.000Z%22%2C%22user%22%3A%7B%22~%23cmap%22%3A%5B%5B%22MyClass%22%2C%7B%22prop%22%3A%22CUSTOM%22%7D%5D%5D%7D%7D',
    ));

  test('Search', async () =>
    testTransit(
      { part: 'search' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nulltrue123"STRING"[1,"a"]{"foo":[1,2]}{"~#set":[1,2]}{"~#cmap":[[1,"a"]]}"1985-10-26T07:00:00.000Z"{"~#cmap":[["MyClass",{"prop":"CUSTOM"}]]}',
      '/path/page.html#anchor',
      '/path/page.html?%7B%22null%22%3Anull%2C%22boolean%22%3Atrue%2C%22number%22%3A123%2C%22string%22%3A%22STRING%22%2C%22array%22%3A%5B1%2C%22a%22%5D%2C%22object%22%3A%7B%22foo%22%3A%5B1%2C2%5D%7D%2C%22set%22%3A%7B%22~%23set%22%3A%5B1%2C2%5D%7D%2C%22map%22%3A%7B%22~%23cmap%22%3A%5B%5B1%2C%22a%22%5D%5D%7D%2C%22date%22%3A%221985-10-26T07%3A00%3A00.000Z%22%2C%22user%22%3A%7B%22~%23cmap%22%3A%5B%5B%22MyClass%22%2C%7B%22prop%22%3A%22CUSTOM%22%7D%5D%5D%7D%7D#anchor',
    ));

  test('Query Param', async () =>
    testTransit(
      { part: 'queryParams', param: 'param' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nulltrue123"STRING"[1,"a"]{"foo":[1,2]}{"~#set":[1,2]}{"~#cmap":[[1,"a"]]}"1985-10-26T07:00:00.000Z"{"~#cmap":[["MyClass",{"prop":"CUSTOM"}]]}',
      '/path/page.html?foo=bar#anchor',
      '/path/page.html?foo=bar&param=%7B%22null%22%3Anull%2C%22boolean%22%3Atrue%2C%22number%22%3A123%2C%22string%22%3A%22STRING%22%2C%22array%22%3A%5B1%2C%22a%22%5D%2C%22object%22%3A%7B%22foo%22%3A%5B1%2C2%5D%7D%2C%22set%22%3A%7B%22~%23set%22%3A%5B1%2C2%5D%7D%2C%22map%22%3A%7B%22~%23cmap%22%3A%5B%5B1%2C%22a%22%5D%5D%7D%2C%22date%22%3A%221985-10-26T07%3A00%3A00.000Z%22%2C%22user%22%3A%7B%22~%23cmap%22%3A%5B%5B%22MyClass%22%2C%7B%22prop%22%3A%22CUSTOM%22%7D%5D%5D%7D%7D#anchor',
    ));
});

describe('URL Transit Parse', () => {
  test('Anchor', async () =>
    testTransit(
      { part: 'hash' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nullfalse456"SET"[2,"b"]{"foo":[]}{"~#set":[2,3]}{"~#cmap":[[2,"b"]]}"1955-11-05T07:00:00.000Z"{"~#cmap":[["MyClass",{"prop":"SET"}]]}',
      '/#{"null":null,"boolean":false,"number":456,"string":"SET","array":[2,"b"],"object":{"foo":[]},"set":{"~#set":[2,3]},"map":{"~#cmap":[[2,"b"]]},"date":"1955-11-05T07:00:00.000Z","user":{"~#cmap":[["MyClass",{"prop":"SET"}]]}}',
      '/#%7B%22null%22%3Anull%2C%22boolean%22%3Afalse%2C%22number%22%3A456%2C%22string%22%3A%22SET%22%2C%22array%22%3A%5B2%2C%22b%22%5D%2C%22object%22%3A%7B%22foo%22%3A%5B%5D%7D%2C%22set%22%3A%7B%22~%23set%22%3A%5B2%2C3%5D%7D%2C%22map%22%3A%7B%22~%23cmap%22%3A%5B%5B2%2C%22b%22%5D%5D%7D%2C%22date%22%3A%221955-11-05T07%3A00%3A00.000Z%22%2C%22user%22%3A%7B%22~%23cmap%22%3A%5B%5B%22MyClass%22%2C%7B%22prop%22%3A%22SET%22%7D%5D%5D%7D%7D',
    ));

  test('Search', async () =>
    testTransit(
      { part: 'search' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nullfalse456"SET"[2,"b"]{"foo":[]}{"~#set":[2,3]}{"~#cmap":[[2,"b"]]}"1955-11-05T07:00:00.000Z"{"~#cmap":[["MyClass",{"prop":"SET"}]]}',
      '/?{"null":null,"boolean":false,"number":456,"string":"SET","array":[2,"b"],"object":{"foo":[]},"set":{"~#set":[2,3]},"map":{"~#cmap":[[2,"b"]]},"date":"1955-11-05T07:00:00.000Z","user":{"~#cmap":[["MyClass",{"prop":"SET"}]]}}',
      '/?%7B%22null%22%3Anull%2C%22boolean%22%3Afalse%2C%22number%22%3A456%2C%22string%22%3A%22SET%22%2C%22array%22%3A%5B2%2C%22b%22%5D%2C%22object%22%3A%7B%22foo%22%3A%5B%5D%7D%2C%22set%22%3A%7B%22~%23set%22%3A%5B2%2C3%5D%7D%2C%22map%22%3A%7B%22~%23cmap%22%3A%5B%5B2%2C%22b%22%5D%5D%7D%2C%22date%22%3A%221955-11-05T07%3A00%3A00.000Z%22%2C%22user%22%3A%7B%22~%23cmap%22%3A%5B%5B%22MyClass%22%2C%7B%22prop%22%3A%22SET%22%7D%5D%5D%7D%7D',
    ));

  test('Query Param', async () =>
    testTransit(
      { part: 'queryParams', param: 'param' },
      [atomNull, atomBoolean, atomNumber, atomString, atomArray, atomObject, atomSet, atomMap, atomDate, atomUser],
      'nullfalse456"SET"[2,"b"]{"foo":[]}{"~#set":[2,3]}{"~#cmap":[[2,"b"]]}"1955-11-05T07:00:00.000Z"{"~#cmap":[["MyClass",{"prop":"SET"}]]}',
      '/?param={"null":null,"boolean":false,"number":456,"string":"SET","array":[2,"b"],"object":{"foo":[]},"set":{"~#set":[2,3]},"map":{"~#cmap":[[2,"b"]]},"date":"1955-11-05T07:00:00.000Z","user":{"~#cmap":[["MyClass",{"prop":"SET"}]]}}',
      '/?param=%7B%22null%22%3Anull%2C%22boolean%22%3Afalse%2C%22number%22%3A456%2C%22string%22%3A%22SET%22%2C%22array%22%3A%5B2%2C%22b%22%5D%2C%22object%22%3A%7B%22foo%22%3A%5B%5D%7D%2C%22set%22%3A%7B%22~%23set%22%3A%5B2%2C3%5D%7D%2C%22map%22%3A%7B%22~%23cmap%22%3A%5B%5B2%2C%22b%22%5D%5D%7D%2C%22date%22%3A%221955-11-05T07%3A00%3A00.000Z%22%2C%22user%22%3A%7B%22~%23cmap%22%3A%5B%5B%22MyClass%22%2C%7B%22prop%22%3A%22SET%22%7D%5D%5D%7D%7D',
    ));
}); 