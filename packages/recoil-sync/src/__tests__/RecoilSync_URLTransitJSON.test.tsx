/**
 * TypeScript port of RecoilSync_URLTransitJSON-test.js
 */

import React from 'react';
import { atom } from 'recoil-next';
import { array, bool, number, object, string, tuple } from 'refine-next';
import { expect, test } from 'vitest';
import { syncEffect } from '../RecoilSync';
import { RecoilURLSyncJSON } from '../RecoilSync_URLJSON';
import { RecoilURLSyncTransit } from '../RecoilSync_URLTransit';
import {
  ReadsAtom,
  flushPromisesAndTimers,
  renderElements,
} from '../__test_utils__/TestUtils';

const atomBoolean = atom({
  key: 'boolean',
  default: true,
  effects: [syncEffect({ storeKey: 'json', refine: bool(), syncDefault: true })],
});
const atomNumber = atom({
  key: 'number',
  default: 123,
  effects: [
    syncEffect({ storeKey: 'json', refine: number(), syncDefault: true }),
  ],
});
const atomString = atom({
  key: 'string',
  default: 'STRING',
  effects: [
    syncEffect({ storeKey: 'json', refine: string(), syncDefault: true }),
  ],
});
const atomArray = atom({
  key: 'array',
  default: [1, 'a'],
  effects: [
    syncEffect({
      storeKey: 'transit',
      refine: tuple([number(), string()]),
      syncDefault: true,
    }),
  ],
});
const atomObject = atom({
  key: 'object',
  default: { foo: [1, 2] },
  effects: [
    syncEffect({
      storeKey: 'transit',
      refine: object({ foo: array(number()) }),
      syncDefault: true,
    }),
  ],
});

async function testURL(contents: string, beforeURL: string, afterURL: string) {
  history.replaceState(null, '', beforeURL);

  const container = renderElements(
    React.createElement(RecoilURLSyncTransit, {
      storeKey: 'transit',
      location: { part: 'queryParams', param: 'transit' },
      children: React.createElement(RecoilURLSyncJSON, {
        storeKey: 'json',
        location: { part: 'queryParams' },
        children: [
          React.createElement(ReadsAtom, { key: 'boolean', atom: atomBoolean }),
          React.createElement(ReadsAtom, { key: 'number', atom: atomNumber }),
          React.createElement(ReadsAtom, { key: 'string', atom: atomString }),
          React.createElement(ReadsAtom, { key: 'array', atom: atomArray }),
          React.createElement(ReadsAtom, { key: 'object', atom: atomObject }),
        ],
      }),
    })
  );
  expect(container.textContent).toBe(contents);
  await flushPromisesAndTimers();
  expect(window.location.href).toBe(window.location.origin + afterURL);
}

test('URL Encode JSON & Transit', async () =>
  testURL(
    'true123"STRING"[1,"a"]{"foo":[1,2]}',
    '/path/page.html?foo=bar',
    '/path/page.html?foo=bar&boolean=true&number=123&string=%22STRING%22&transit=%5B%22%5E+%22%2C%22array%22%2C%5B1%2C%22a%22%5D%2C%22object%22%2C%5B%22%5E+%22%2C%22foo%22%2C%5B1%2C2%5D%5D%5D',
  ));

test('URL Parse JSON & Transit', async () =>
  testURL(
    'false456"SET"[2,"b"]{"foo":[]}',
    '/?foo=bar&boolean=false&number=456&string="SET"&transit=["^ ","array",[2,"b"],"object",["^ ","foo",[]],"user",["~%23USER",["PROP"]]]',
    '/?foo=bar&boolean=false&number=456&string=%22SET%22&transit=%5B%22%5E+%22%2C%22array%22%2C%5B2%2C%22b%22%5D%2C%22object%22%2C%5B%22%5E+%22%2C%22foo%22%2C%5B%5D%5D%5D',
  )); 