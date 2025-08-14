/**
 * TypeScript port of RecoilSync_URLInterface-test.js
 */

import { act } from '@testing-library/react';
import React from 'react';
import { atom } from 'recoil-next';
import { string } from 'refine-next';
import { expect, test } from 'vitest';
import {
  TestURLSync,
  expectURL as testExpectURL,
} from '../__test_utils__/MockURLSerialization';
import {
  ComponentThatReadsAndWritesAtom,
  flushPromisesAndTimers,
  renderElements,
} from '../__test_utils__/TestUtils';
import { urlSyncEffect } from '../RecoilSync_URL';

const urls: Array<string> = ['http://localhost/'];
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

  const [AtomA, atomAControls] = ComponentThatReadsAndWritesAtom(atomA);
  const [AtomB, atomBControls] = ComponentThatReadsAndWritesAtom(atomB);
  const [AtomC, atomCControls] = ComponentThatReadsAndWritesAtom(atomC);
  const container = renderElements(
    React.createElement(TestURLSync, {
      location: { part: 'queryParams' as const },
      browserInterface: mockBrowserURL,
      children: [
        React.createElement(AtomA, { key: 'A' }),
        React.createElement(AtomB, { key: 'B' }),
        React.createElement(AtomC, { key: 'C' }),
      ],
    })
  );

  expect(container.textContent).toBe('"DEFAULT""DEFAULT""DEFAULT"');
  const baseHistory = urls.length;

  // Replace A
  // 1: A__
  act(() => atomAControls.setValue('A'));
  expect(container.textContent).toBe('"A""DEFAULT""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
      },
    ],
  ]);
  expect(urls.length).toBe(baseHistory);

  // Push B
  // 1: A__
  // 2: AB_
  act(() => atomBControls.setValue('B'));
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
  expect(urls.length).toBe(baseHistory + 1);

  // Push C
  // 1: A__
  // 2: AB_
  // 3: ABC
  act(() => atomCControls.setValue('C'));
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
  expect(urls.length).toBe(baseHistory + 2);

  // Go back
  // 1: A__
  // 2: AB_
  act(() => {
    goBack();
  });
  await flushPromisesAndTimers();
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
  expect(urls.length).toBe(baseHistory + 1);

  // Go back
  // 1: A__
  act(() => {
    goBack();
  });
  await flushPromisesAndTimers();
  expect(container.textContent).toBe('"A""DEFAULT""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
      },
    ],
  ]);
  expect(urls.length).toBe(baseHistory);
}); 