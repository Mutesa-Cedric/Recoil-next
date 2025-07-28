/**
 * TypeScript port of RecoilSync_URLCompound-test.js
 */

import React, { act } from 'react';
import { atom, atomFamily, DefaultValue } from 'recoil';
import { expect, test } from 'vitest';
import {
  encodeURL,
  expectURL,
  gotoURL,
} from '../__test_utils__/MockURLSerialization';
import { syncEffect } from '../RecoilSync';
import { RecoilURLSyncJSON } from '../RecoilSync_URLJSON';
import {
  ComponentThatReadsAndWritesAtom,
  renderElements,
} from '../__test_utils__/TestUtils';
import { assertion, dict, nullable, number, string } from 'refine';

test('Upgrade item ID', async () => {
  const loc = { part: 'queryParams' };

  const myAtom = atom({
    key: 'recoil-url-sync upgrade itemID',
    default: 'DEFAULT',
    effects: [
      syncEffect({
        refine: string(),
        itemKey: 'new_key',
        read: ({ read }) => read('old_key') ?? read('new_key'),
      }),
    ],
  });

  history.replaceState(null, '', encodeURL([[loc, { old_key: 'OLD' }]]));

  const [Atom, setAtom, resetAtom] = ComponentThatReadsAndWritesAtom(myAtom);
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: Atom,
    })
  );

  // Test that we can load based on old key
  expect(container.textContent).toEqual('"OLD"');

  // Test that we can save to the new key
  act(() => setAtom('NEW'));
  expect(container.textContent).toEqual('"NEW"');
  expectURL([[loc, { new_key: 'NEW' }]]);

  // Test that we can reset the atom and get the default instead of the old key's value
  act(resetAtom);
  expect(container.textContent).toEqual('"DEFAULT"');
  expectURL([[loc, {}]]);
});

test('Many items to one atom', async () => {
  const loc = { part: 'queryParams' };

  const manyToOneSyncEffect = () =>
    syncEffect({
      refine: dict(nullable(number())),
      read: ({ read }) => {
        const foo = read('foo');
        const bar = read('bar');
        return {
          foo: foo instanceof DefaultValue ? undefined : foo,
          bar: bar instanceof DefaultValue ? undefined : bar,
        };
      },
      write: ({ write, reset }, newValue) => {
        if (newValue instanceof DefaultValue) {
          reset('foo');
          reset('bar');
        } else {
          write('foo', newValue.foo);
          write('bar', newValue.bar);
        }
      },
    });

  const myAtom = atom({
    key: 'recoil-url-sync many to one',
    default: { foo: undefined, bar: undefined },
    effects: [manyToOneSyncEffect()],
  });

  history.replaceState(null, '', encodeURL([[loc, { foo: 123, bar: 456 }]]));

  const [Atom, setAtom, resetAtom] = ComponentThatReadsAndWritesAtom(myAtom);
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: Atom,
    })
  );

  expect(container.textContent).toEqual('{"foo":123,"bar":456}');

  act(() => setAtom({ foo: 789, bar: undefined }));
  expect(container.textContent).toEqual('{"foo":789,"bar":undefined}');
  expectURL([[loc, { foo: 789 }]]);

  act(resetAtom);
  expect(container.textContent).toEqual('{"foo":undefined,"bar":undefined}');
  expectURL([[loc, {}]]);
});

test('One atom to many items', async () => {
  const loc = { part: 'queryParams' };

  const oneToManySyncEffect = (prop: string) =>
    syncEffect({
      refine: number(),
      itemKey: prop,
      read: ({ read }) => {
        const obj = read('obj');
        return obj instanceof DefaultValue ? undefined : obj?.[prop];
      },
      write: ({ write, reset }, newValue) => {
        const obj = read('obj');
        if (newValue instanceof DefaultValue) {
          reset('obj');
        } else {
          const newObj = obj instanceof DefaultValue ? {} : { ...obj };
          newObj[prop] = newValue;
          write('obj', newObj);
        }
      },
    });

  const atomFoo = atom({
    key: 'recoil-url-sync one to many foo',
    default: undefined,
    effects: [oneToManySyncEffect('foo')],
  });
  const atomBar = atom({
    key: 'recoil-url-sync one to many bar',
    default: undefined,
    effects: [oneToManySyncEffect('bar')],
  });

  history.replaceState(null, '', encodeURL([[loc, { obj: { foo: 123, bar: 456 } }]]));

  const [AtomFoo, setFoo, resetFoo] = ComponentThatReadsAndWritesAtom(atomFoo);
  const [AtomBar, setBar, resetBar] = ComponentThatReadsAndWritesAtom(atomBar);
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: [AtomFoo, AtomBar],
    })
  );

  expect(container.textContent).toEqual('123456');

  act(() => setFoo(789));
  expect(container.textContent).toEqual('789456');
  expectURL([[loc, { obj: { foo: 789, bar: 456 } }]]);

  act(resetFoo);
  expect(container.textContent).toEqual('undefined456');
  expectURL([[loc, { obj: { bar: 456 } }]]);
});

test('One atom to atom family', async () => {
  const loc = { part: 'queryParams' };

  const oneToFamilyEffect = (prop: string) =>
    syncEffect({
      refine: number(),
      itemKey: prop,
      read: ({ read }) => {
        const obj = read('obj');
        return obj instanceof DefaultValue ? undefined : obj?.[prop];
      },
      write: ({ write, reset }, newValue) => {
        const obj = read('obj');
        if (newValue instanceof DefaultValue) {
          reset('obj');
        } else {
          const newObj = obj instanceof DefaultValue ? {} : { ...obj };
          newObj[prop] = newValue;
          write('obj', newObj);
        }
      },
    });

  const atomFamilyFoo = atomFamily({
    key: 'recoil-url-sync one to family foo',
    default: undefined,
    effects: (param: string) => [oneToFamilyEffect(param)],
  });

  history.replaceState(null, '', encodeURL([[loc, { obj: { foo: 123, bar: 456 } }]]));

  const [AtomFoo, setFoo, resetFoo] = ComponentThatReadsAndWritesAtom(atomFamilyFoo('foo'));
  const [AtomBar, setBar, resetBar] = ComponentThatReadsAndWritesAtom(atomFamilyFoo('bar'));
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: [AtomFoo, AtomBar],
    })
  );

  expect(container.textContent).toEqual('123456');

  act(() => setFoo(789));
  expect(container.textContent).toEqual('789456');
  expectURL([[loc, { obj: { foo: 789, bar: 456 } }]]);

  act(resetFoo);
  expect(container.textContent).toEqual('undefined456');
  expectURL([[loc, { obj: { bar: 456 } }]]);
}); 