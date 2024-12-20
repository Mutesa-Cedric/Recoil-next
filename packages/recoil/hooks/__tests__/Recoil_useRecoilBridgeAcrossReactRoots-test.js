/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 * @oncall recoil
 */

'use strict';

import type {StoreID} from '../../core/Recoil_Keys';
import type {MutableSnapshot} from 'Recoil_Snapshot';
import type {Node} from 'react';

const {
  getRecoilTestFn,
} = require('recoil-shared/__test_utils__/Recoil_TestingUtils');

let React,
  renderElements,
  renderUnwrappedElements,
  useEffect,
  useRef,
  act,
  RecoilRoot,
  useRecoilStoreID,
  atom,
  componentThatReadsAndWritesAtom,
  useRecoilBridgeAcrossReactRoots;

const testRecoil = getRecoilTestFn(() => {
  React = require('react');
  ({useEffect, useRef, act} = React);

  ({
    renderElements,
    renderUnwrappedElements,
    componentThatReadsAndWritesAtom,
  } = require('recoil-shared/__test_utils__/Recoil_TestingUtils'));

  ({RecoilRoot, useRecoilStoreID} = require('../../core/Recoil_RecoilRoot'));
  atom = require('../../recoil_values/Recoil_atom');
  useRecoilBridgeAcrossReactRoots = require('../Recoil_useRecoilBridgeAcrossReactRoots');
});

function NestedReactRoot({children}: $TEMPORARY$object<{children: Node}>) {
  const ref = useRef<?HTMLDivElement>();
  const RecoilBridge = useRecoilBridgeAcrossReactRoots();

  useEffect(() => {
    renderUnwrappedElements(
      <RecoilBridge>{children}</RecoilBridge>,
      ref.current,
    );
  }, [RecoilBridge, children]);

  return <div ref={ref} />;
}

testRecoil(
  'useRecoilBridgeAcrossReactRoots - create a context bridge',
  async () => {
    const myAtom = atom({
      key: 'useRecoilBridgeAcrossReactRoots - context bridge',
      default: 'DEFAULT',
    });

    function initializeState({set, getLoadable}: MutableSnapshot) {
      expect(getLoadable(myAtom).contents).toEqual('DEFAULT');
      set(myAtom, 'INITIALIZE');
      expect(getLoadable(myAtom).contents).toEqual('INITIALIZE');
    }

    const [ReadWriteAtom, setAtom] = componentThatReadsAndWritesAtom(myAtom);

    const container = renderElements(
      <RecoilRoot initializeState={initializeState}>
        <ReadWriteAtom />

        <NestedReactRoot>
          <ReadWriteAtom />
        </NestedReactRoot>
      </RecoilRoot>,
    );

    expect(container.textContent).toEqual('"INITIALIZE""INITIALIZE"');

    act(() => setAtom('SET'));
    expect(container.textContent).toEqual('"SET""SET"');
  },
);

testRecoil('StoreID matches bridged store', () => {
  function RecoilStoreID({storeIDRef}: {storeIDRef: {current: ?StoreID}}) {
    storeIDRef.current = useRecoilStoreID();
    return null;
  }

  const rootStoreIDRef = {current: null};
  const nestedStoreIDRef = {current: null};

  const c = renderElements(
    <>
      <RecoilStoreID storeIDRef={rootStoreIDRef} />
      <NestedReactRoot>
        <RecoilStoreID storeIDRef={nestedStoreIDRef} />
      </NestedReactRoot>
      RENDER
    </>,
  );
  expect(c.textContent).toEqual('RENDER');
  expect(rootStoreIDRef.current).toBe(nestedStoreIDRef.current);
  expect(rootStoreIDRef.current).not.toBe(null);
});
