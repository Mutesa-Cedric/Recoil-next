/**
 * TypeScript port of RecoilSync_URLInterface-test.js
 */

import React, { act } from 'react';
import { atom } from 'recoil';
import { expect, test } from 'vitest';
import {
  TestURLSync,
  expectURL: testExpectURL,
} from '../__test_utils__/MockURLSerialization';
import { urlSyncEffect } from '../RecoilSync_URL';
import {
  ComponentThatReadsAndWritesAtom,
  renderElements,
} from '../__test_utils__/TestUtils';
import { string } from 'refine';

const urls: Array<string> = [];
const subscriptions: Set<() => void> = new Set();
const currentURL = () => urls[urls.length - 1];
const link = window.document.createElement('a');
const absoluteURL = (url: string) => {
  link.href = url;
  return link.href;
};
const expectURL = (parts: any) => testExpectURL(parts, currentURL());
const mockBrowserURL = {
  replaceURL: (url: string) => {
    urls[urls.length - 1] = absoluteURL(url);
  },
  pushURL: (url: string) => void urls.push(absoluteURL(url)),
  getURL: () => absoluteURL(currentURL()),
  listenChangeURL: (handler: () => void) => {
    subscriptions.add(handler);
    return () => void subscriptions.delete(handler);
  },
};
const goBack = () => {
  urls.pop();
  subscriptions.forEach(handler => handler());
};

test('Push URLs in mock history', async () => {
  const loc = { part: 'queryParams' };

  const atomA = atom({
    key: 'recoil-url-sync replace',
    default: 'DEFAULT',
    effects: [urlSyncEffect({ refine: string(), history: 'replace' })],
  });
  const atomB = atom({
    key: 'recoil-url-sync push',
    default: 'DEFAULT',
    effects: [urlSyncEffect({ refine: string(), history: 'push' })],
  });
  const atomC = atom({
    key: 'recoil-url-sync push 2',
    default: 'DEFAULT',
    effects: [urlSyncEffect({ refine: string(), history: 'push' })],
  });

  const [AtomA, setA, resetA] = ComponentThatReadsAndWritesAtom(atomA);
  const [AtomB, setB, resetB] = ComponentThatReadsAndWritesAtom(atomB);
  const [AtomC, setC, resetC] = ComponentThatReadsAndWritesAtom(atomC);
  const container = renderElements(
    React.createElement(TestURLSync, {
      location: loc,
      browserInterface: mockBrowserURL,
      children: [AtomA, AtomB, AtomC],
    })
  );

  expect(container.textContent).toBe('"DEFAULT""DEFAULT""DEFAULT"');
  const baseHistory = history.length;

  // Replace A
  // 1: A__
  act(() => setA('A'));
  expect(container.textContent).toBe('"A""DEFAULT""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
      },
    ],
  ]);
  expect(history.length).toBe(baseHistory);

  // Push B
  // 1: A__
  // 2: AB_
  act(() => setB('B'));
  expect(container.textContent).toBe('"A""B""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
        'recoil-url-sync push': 'B',
      },
    ],
  ]);
  expect(history.length).toBe(baseHistory + 1);

  // Push C
  // 1: A__
  // 2: AB_
  // 3: ABC
  act(() => setC('C'));
  expect(container.textContent).toBe('"A""B""C"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
        'recoil-url-sync push': 'B',
        'recoil-url-sync push 2': 'C',
      },
    ],
  ]);
  expect(history.length).toBe(baseHistory + 2);

  // Go back
  // 1: A__
  // 2: AB_
  goBack();
  expect(container.textContent).toBe('"A""B""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
        'recoil-url-sync push': 'B',
      },
    ],
  ]);
  expect(history.length).toBe(baseHistory + 1);

  // Go back
  // 1: A__
  goBack();
  expect(container.textContent).toBe('"A""DEFAULT""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
      },
    ],
  ]);
  expect(history.length).toBe(baseHistory);
}); 