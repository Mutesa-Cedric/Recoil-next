/**
 * TypeScript port of RecoilSync_URLPush-test.js
 */

import React, { act } from 'react';
import { atom } from 'recoil';
import { expect, test } from 'vitest';
import {
  TestURLSync,
  expectURL,
  goBack,
} from '../__test_utils__/MockURLSerialization';
import { urlSyncEffect } from '../RecoilSync_URL';
import {
  ComponentThatReadsAndWritesAtom,
  renderElements,
} from '../__test_utils__/TestUtils';
import { string } from 'refine';

test('Push URLs in browser history', async () => {
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

  // Pop and confirm C is reset
  // 1: A__
  // 2: AB_
  await act(goBack);
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

  // Replace Reset A
  // 1: A__
  // 2: _B_
  act(resetA);
  expect(container.textContent).toBe('"DEFAULT""B""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync push': 'B',
      },
    ],
  ]);

  // Push a Reset
  // 1: A__
  // 2: _B_
  // 3: ___
  act(resetB);
  expect(container.textContent).toBe('"DEFAULT""DEFAULT""DEFAULT"');
  expectURL([[loc, {}]]);

  // Push BB
  // 1: A__
  // 2: _B_
  // 3: ___
  // 4: _BB_
  act(() => setB('BB'));
  expect(container.textContent).toBe('"DEFAULT""BB""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync push': 'BB',
      },
    ],
  ]);

  // Replace AA
  // 1: A__
  // 2: _B_
  // 3: ___
  // 4: AABB_
  act(() => setA('AA'));
  expect(container.textContent).toBe('"AA""BB""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'AA',
        'recoil-url-sync push': 'BB',
      },
    ],
  ]);

  // Replace AAA
  // 1: A__
  // 2: _B_
  // 3: ___
  // 4: AAABB_
  act(() => setA('AAA'));
  expect(container.textContent).toBe('"AAA""BB""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'AAA',
        'recoil-url-sync push': 'BB',
      },
    ],
  ]);

  // Pop
  // 1: A__
  // 2: _B_
  // 3: ___
  await act(goBack);
  expect(container.textContent).toBe('"DEFAULT""DEFAULT""DEFAULT"');
  expectURL([[loc, {}]]);

  // Pop
  // 1: A__
  // 2: _B_
  await act(goBack);
  expect(container.textContent).toBe('"DEFAULT""B""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync push': 'B',
      },
    ],
  ]);

  // Pop
  // 1: A__
  await act(goBack);
  expect(container.textContent).toBe('"A""DEFAULT""DEFAULT"');
  expectURL([
    [
      loc,
      {
        'recoil-url-sync replace': 'A',
      },
    ],
  ]);
}); 