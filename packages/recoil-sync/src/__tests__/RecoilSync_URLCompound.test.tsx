/**
 * TypeScript port of RecoilSync_URLCompound-test.js
 */

import { act } from '@testing-library/react';
import React from 'react';
import { atom, atomFamily, DefaultValue } from 'recoil-next';
import { dict, nullable, number, string } from 'refine-next';
import { expect, test } from 'vitest';
import {
  encodeURL,
  expectURL
} from '../__test_utils__/MockURLSerialization';
import {
  ComponentThatReadsAndWritesAtom,
  renderElements,
} from '../__test_utils__/TestUtils';
import { syncEffect } from '../RecoilSync';
import { RecoilURLSyncJSON } from '../RecoilSync_URLJSON';

test('Upgrade item ID', async () => {
  const loc = { part: 'queryParams' } as const;

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

  history.replaceState(null, '', encodeURL([[{ part: 'queryParams' }, { old_key: 'OLD' }]]));

  const [Atom, atomControls] = ComponentThatReadsAndWritesAtom(myAtom);
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: React.createElement(Atom),
    })
  );

  // Test that we can load based on old key
  expect(container.textContent).toEqual('"OLD"');

  // Test that we can save to the new key
  act(() => atomControls.setValue('NEW'));
  expect(container.textContent).toEqual('"NEW"');
  expectURL([[loc, { new_key: 'NEW' }]]);

  // Test that we can reset the atom and get the default instead of the old key's value
  act(() => atomControls.resetValue());
  expect(container.textContent).toEqual('"DEFAULT"');
  expectURL([[loc, {}]]);
});

test('Many items to one atom', async () => {
  const loc = { part: 'queryParams' } as const;

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
      write: ({ write, reset, read }, newValue: any) => {
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

  const [Atom, atomControls] = ComponentThatReadsAndWritesAtom(myAtom);
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: React.createElement(Atom),
    })
  );

  expect(container.textContent).toEqual('{"foo":123,"bar":456}');

  act(() => atomControls.setValue({ foo: 789, bar: undefined }));
  expect(container.textContent).toEqual('{"foo":789}');
  expectURL([[loc, { foo: 789 }]]);

  act(() => atomControls.resetValue());
  expect(container.textContent).toEqual('{}');
  expectURL([[loc, {}]]);
});

test('One atom to many items', async () => {
  const loc = { part: 'queryParams' } as const;

  const oneToManySyncEffect = (prop: string) =>
    syncEffect({
      refine: number(),
      itemKey: prop,
      read: ({ read }) => {
        const obj = read('obj');
        return obj instanceof DefaultValue ? undefined : obj?.[prop];
      },
      write: ({ write, reset, read }, newValue: any) => {
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

  const [AtomFoo, atomFooControls] = ComponentThatReadsAndWritesAtom(atomFoo);
  const [AtomBar, atomBarControls] = ComponentThatReadsAndWritesAtom(atomBar);
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: [
        React.createElement(AtomFoo, { key: 'Foo' }),
        React.createElement(AtomBar, { key: 'Bar' }),
      ],
    })
  );

  expect(container.textContent).toEqual('123456');

  act(() => atomFooControls.setValue(789));
  expect(container.textContent).toEqual('789456');
  expectURL([[loc, { obj: { foo: 789, bar: 456 } }]]);

  act(() => atomFooControls.resetValue());
  expect(container.textContent).toEqual('456');
  expectURL([[loc, { obj: { bar: 456 } }]]);
});

test('One atom to atom family', async () => {
  const loc = { part: 'queryParams' } as const;

  const oneToFamilyEffect = (prop: string) =>
    syncEffect({
      refine: number(),
      itemKey: prop,
      read: ({ read }) => {
        const obj = read('obj');
        return obj instanceof DefaultValue ? undefined : obj?.[prop];
      },
      write: ({ write, reset, read }, newValue) => {
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
    // @ts-expect-error
    effects: (param: string) => [oneToFamilyEffect(param)],
  });

  history.replaceState(null, '', encodeURL([[loc, { obj: { foo: 123, bar: 456 } }]]));

  const [AtomFoo, atomFooControls] = ComponentThatReadsAndWritesAtom(atomFamilyFoo('foo'));
  const [AtomBar, atomBarControls] = ComponentThatReadsAndWritesAtom(atomFamilyFoo('bar'));
  const container = renderElements(
    React.createElement(RecoilURLSyncJSON, {
      location: loc,
      children: [
        React.createElement(AtomFoo, { key: 'Foo' }),
        React.createElement(AtomBar, { key: 'Bar' }),
      ],
    })
  );

  expect(container.textContent).toEqual('123456');

  act(() => atomFooControls.setValue(789));
  expect(container.textContent).toEqual('789456');
  expectURL([[loc, { obj: { foo: 789, bar: 456 } }]]);

  act(() => atomFooControls.resetValue());
  expect(container.textContent).toEqual('456');
  expectURL([[loc, { obj: { bar: 456 } }]]);
}); 