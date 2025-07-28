/**
 * TypeScript port of RecoilSync_MockURLSerialization.js
 */

import React, { useCallback } from 'react';
import { RecoilURLSync, LocationOption, BrowserInterface } from '../RecoilSync_URL';
import { flushPromisesAndTimers } from '../../../shared/src/util/__tests__/TestUtils';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';

// ////////////////////////////
// // Mock Serialization
// ////////////////////////////

interface TestURLSyncProps {
  storeKey?: string;
  location: LocationOption;
  browserInterface?: BrowserInterface;
  children?: React.ReactNode;
}

function TestURLSync({
  storeKey,
  location,
  browserInterface,
  children = null,
}: TestURLSyncProps): React.ReactElement {
  const serialize = useCallback(
    (items: any) => {
      const str = nullthrows(JSON.stringify(items));
      return location.part === 'href'
        ? `/TEST#${encodeURIComponent(str)}`
        : str;
    },
    [location.part],
  );
  const deserialize = useCallback(
    (str: string) => {
      const stateStr =
        location.part === 'href' ? decodeURIComponent(str.split('#')[1]) : str;
      // Skip the default URL parts which don't conform to the serialized standard.
      // 'bar' also doesn't conform, but we want to test coexistence of foreign
      // query parameters.
      if (stateStr == null || stateStr === 'anchor' || stateStr === 'foo=bar') {
        return {};
      }
      try {
        return JSON.parse(stateStr);
      } catch {
        // Catch errors for open source CI tests which tend to keep previous tests alive so they are
        // still subscribed to URL changes from future tests and may get invalid JSON as a result.
        return { error: 'PARSE ERROR' };
      }
    },
    [location.part],
  );

  return React.createElement(RecoilURLSync, {
    storeKey,
    location,
    serialize,
    deserialize,
    browserInterface,
    children,
  });
}

function encodeState(obj: Record<string, any>) {
  return encodeURIComponent(JSON.stringify(obj));
}

function encodeURLPart(href: string, loc: LocationOption, obj: Record<string, any>): string {
  const url = new URL(href);
  switch (loc.part) {
    case 'href':
      url.pathname = '/TEST';
      url.hash = encodeState(obj);
      break;
    case 'hash':
      url.hash = encodeState(obj);
      break;
    case 'search': {
      url.search = encodeState(obj);
      break;
    }
    case 'queryParams': {
      const { param } = loc;
      const { searchParams } = url;
      if (param != null) {
        searchParams.set(param, JSON.stringify(obj));
      } else {
        for (const [key, value] of Object.entries(obj)) {
          searchParams.set(key, JSON.stringify(value) ?? '');
        }
      }
      url.search = searchParams.toString();
      break;
    }
  }
  return url.href;
}

function encodeURL(
  parts: Array<[LocationOption, Record<string, any>]>,
  url: string = window.location.href,
): string {
  let href = url;
  for (const [loc, obj] of parts) {
    href = encodeURLPart(href, loc, obj);
  }
  return href;
}

function expectURL(
  parts: Array<[LocationOption, Record<string, any>]>,
  url: string = window.location.href,
) {
  expect(url).toBe(encodeURL(parts, url));
}

async function gotoURL(parts: Array<[LocationOption, Record<string, any>]>) {
  history.replaceState(null, '', encodeURL(parts));
  history.pushState(null, '', '/POPSTATE');
  history.back();
  await flushPromisesAndTimers();
}

async function goBack() {
  history.back();
  await flushPromisesAndTimers();
}

export {
  TestURLSync,
  encodeURL,
  expectURL,
  gotoURL,
  goBack,
}; 