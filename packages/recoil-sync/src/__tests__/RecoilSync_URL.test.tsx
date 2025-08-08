/**
 * TypeScript port of RecoilSync_URL-test.js
 */

import React, { act } from 'react';
import { atom } from 'recoil';
import { expect, test, describe, beforeEach } from 'vitest';
import { LocationOption } from '../RecoilSync_URL';
import { syncEffect } from '../RecoilSync';
import { urlSyncEffect } from '../RecoilSync_URL';
import { asType, match, number, string } from 'refine';
import {
  TestURLSync,
  encodeURL,
  expectURL,
} from '../__test_utils__/MockURLSerialization';
import {
  ReadsAtom,
  ComponentThatReadsAndWritesAtom,
  flushPromisesAndTimers,
  renderElements,
} from '../__test_utils__/TestUtils';

let atomIndex = 0;
const nextKey = () => `recoil-url-sync/${atomIndex++}`;

describe('Test URL Persistence', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/path/page.html?foo=bar#anchor');
  });

  function testWriteToURL(loc: LocationOption, remainder: () => void) {
    const atomA = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'a', refine: string() })],
    });
    const atomB = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'b', refine: string() })],
    });
    const ignoreAtom = atom({
      key: nextKey(),
      default: 'DEFAULT',
    });

    const [AtomA, setA, resetA] = ComponentThatReadsAndWritesAtom(atomA);
    const [AtomB, setB] = ComponentThatReadsAndWritesAtom(atomB);
    const [IgnoreAtom, setIgnore] = ComponentThatReadsAndWritesAtom(ignoreAtom);
    const container = renderElements(
      React.createElement(TestURLSync, {
        location: loc,
        children: [
          AtomA,
          AtomB,
          IgnoreAtom,
        ],
      })
    );

    expect(container.textContent).toBe('"DEFAULT""DEFAULT""DEFAULT"');

    act(() => setA('A'));
    act(() => setB('B'));
    act(() => setIgnore('IGNORE'));
    expect(container.textContent).toBe('"A""B""IGNORE"');
    expectURL([[loc, { a: 'A', b: 'B' }]]);

    act(() => resetA());
    act(() => setB('BB'));
    expect(container.textContent).toBe('"DEFAULT""BB""IGNORE"');
    expectURL([[loc, { b: 'BB' }]]);

    remainder();
  }

  test('Write to URL', () =>
    testWriteToURL({ part: 'href' }, () => {
      expect(location.search).toBe('');
      expect(location.pathname).toBe('/TEST');
    }));

  test('Write to URL - Anchor Hash', () =>
    testWriteToURL({ part: 'hash' }, () => {
      expect(location.search).toBe('?foo=bar');
    }));

  test('Write to URL - Query Search', () =>
    testWriteToURL({ part: 'search' }, () => {
      expect(location.hash).toBe('#anchor');
      expect(new URL(location.href).searchParams.get('foo')).toBe(null);
      expect(new URL(location.href).searchParams.get('bar')).toBe(null);
    }));

  test('Write to URL - Query Params', () =>
    testWriteToURL({ part: 'queryParams' }, () => {
      expect(location.hash).toBe('#anchor');
      expect(new URL(location.href).searchParams.get('foo')).toBe('bar');
    }));

  test('Write to URL - Query Param', () =>
    testWriteToURL({ part: 'queryParams', param: 'state' }, () => {
      expect(location.hash).toBe('#anchor');
      expect(new URL(location.href).searchParams.get('foo')).toBe('bar');
    }));

  test('Read from URL', async () => {
    const atomA = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'a', refine: string() })],
    });
    const atomB = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'b', refine: string() })],
    });

    const container = renderElements(
      React.createElement(TestURLSync, {
        location: { part: 'href' },
        children: [
          React.createElement(ReadsAtom, { key: 'A', atom: atomA }),
          React.createElement(ReadsAtom, { key: 'B', atom: atomB }),
        ],
      })
    );

    expect(container.textContent).toBe('"DEFAULT""DEFAULT"');

    history.replaceState(null, '', '/TEST#' + encodeURIComponent(JSON.stringify({ a: 'A', b: 'B' })));
    await flushPromisesAndTimers();

    expect(container.textContent).toBe('"A""B"');
  });

  test('Read from URL - Anchor Hash', async () => {
    const atomA = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'a', refine: string() })],
    });

    const container = renderElements(
      React.createElement(TestURLSync, {
        location: { part: 'hash' },
        children: React.createElement(ReadsAtom, { atom: atomA }),
      })
    );

    expect(container.textContent).toBe('"DEFAULT"');

    history.replaceState(null, '', '/path/page.html?foo=bar#' + encodeURIComponent(JSON.stringify({ a: 'A' })));
    await flushPromisesAndTimers();

    expect(container.textContent).toBe('"A"');
  });

  test('Read from URL - Query Search', async () => {
    const atomA = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'a', refine: string() })],
    });

    const container = renderElements(
      React.createElement(TestURLSync, {
        location: { part: 'search' },
        children: React.createElement(ReadsAtom, { atom: atomA }),
      })
    );

    expect(container.textContent).toBe('"DEFAULT"');

    history.replaceState(null, '', '/path/page.html?' + encodeURIComponent(JSON.stringify({ a: 'A' })) + '#anchor');
    await flushPromisesAndTimers();

    expect(container.textContent).toBe('"A"');
  });

  test('Read from URL - Query Params', async () => {
    const atomA = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'a', refine: string() })],
    });

    const container = renderElements(
      React.createElement(TestURLSync, {
        location: { part: 'queryParams' },
        children: React.createElement(ReadsAtom, { atom: atomA }),
      })
    );

    expect(container.textContent).toBe('"DEFAULT"');

    const url = new URL(location.href);
    url.searchParams.set('a', JSON.stringify('A'));
    url.searchParams.set('foo', 'bar');
    history.replaceState(null, '', url.href);
    await flushPromisesAndTimers();

    expect(container.textContent).toBe('"A"');
  });

  test('Read from URL - Query Param', async () => {
    const atomA = atom({
      key: nextKey(),
      default: 'DEFAULT',
      effects: [urlSyncEffect({ itemKey: 'a', refine: string() })],
    });

    const container = renderElements(
      React.createElement(TestURLSync, {
        location: { part: 'queryParams', param: 'state' },
        children: React.createElement(ReadsAtom, { atom: atomA }),
      })
    );

    expect(container.textContent).toBe('"DEFAULT"');

    const url = new URL(location.href);
    url.searchParams.set('state', JSON.stringify({ a: 'A' }));
    url.searchParams.set('foo', 'bar');
    history.replaceState(null, '', url.href);
    await flushPromisesAndTimers();

    expect(container.textContent).toBe('"A"');
  });
}); 