/**
 * TypeScript port of RecoilSync_URLListen-test.js
 */

import React, { act } from 'react';
import { atom } from 'recoil';
import { expect, test } from 'vitest';
import {
  TestURLSync,
  encodeURL,
  expectURL,
  gotoURL,
} from '../__test_utils__/MockURLSerialization';
import { syncEffect } from '../RecoilSync';
import {
  ReadsAtom,
  renderElements,
} from '../__test_utils__/TestUtils';
import { string } from 'refine';

test('Listen to URL changes', async () => {
  const locFoo = { part: 'queryParams', param: 'foo' };
  const locBar = { part: 'queryParams', param: 'bar' };

  const atomA = atom({
    key: 'recoil-url-sync listen',
    default: 'DEFAULT',
    effects: [syncEffect({ storeKey: 'foo', refine: string() })],
  });
  const atomB = atom({
    key: 'recoil-url-sync listen to multiple keys',
    default: 'DEFAULT',
    effects: [
      syncEffect({ storeKey: 'foo', itemKey: 'KEY A', refine: string() }),
      syncEffect({ storeKey: 'foo', itemKey: 'KEY B', refine: string() }),
    ],
  });
  const atomC = atom({
    key: 'recoil-url-sync listen to multiple storage',
    default: 'DEFAULT',
    effects: [
      syncEffect({ storeKey: 'foo', refine: string() }),
      syncEffect({ storeKey: 'bar', refine: string() }),
    ],
  });

  history.replaceState(
    null,
    '',
    encodeURL([
      [
        locFoo,
        {
          'recoil-url-sync listen': 'A',
          'KEY A': 'B',
          'recoil-url-sync listen to multiple storage': 'C',
        },
      ],
      [
        locBar,
        {
          'recoil-url-sync listen to multiple storage': 'C',
        },
      ],
    ]),
  );

  const container = renderElements(
    React.createElement(React.Fragment, {
      children: [
        React.createElement(TestURLSync, { key: 'foo', storeKey: 'foo', location: locFoo }),
        React.createElement(TestURLSync, { key: 'bar', storeKey: 'bar', location: locBar }),
        React.createElement(ReadsAtom, { key: 'A', atom: atomA }),
        React.createElement(ReadsAtom, { key: 'B', atom: atomB }),
        React.createElement(ReadsAtom, { key: 'C', atom: atomC }),
      ],
    })
  );

  expect(container.textContent).toBe('"A""B""C"');
  expectURL([
    [
      locFoo,
      {
        'recoil-url-sync listen': 'A',
        'KEY A': 'B',
        'recoil-url-sync listen to multiple storage': 'C',
      },
    ],
    [
      locBar,
      {
        'recoil-url-sync listen to multiple storage': 'C',
      },
    ],
  ]);

  await gotoURL([
    [
      locFoo,
      {
        'recoil-url-sync listen': 'AA',
        'KEY A': 'BB',
        'recoil-url-sync listen to multiple storage': 'CC',
      },
    ],
    [
      locBar,
      {
        'recoil-url-sync listen to multiple storage': 'CC',
      },
    ],
  ]);

  expect(container.textContent).toBe('"AA""BB""CC"');
}); 