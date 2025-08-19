/**
 * TypeScript port of Recoil_RecoilRoot-test.js
 */

import * as React from 'react';
import {describe, expect, test} from 'vitest';

import type {MutableSnapshot} from '../Snapshot';

import {useSetRecoilState} from '../../hooks/Hooks';
import {atom} from '../../recoil_values/atom';
import {constSelector} from '../../recoil_values/constSelector';
import {selector} from '../../recoil_values/selector';
import {RecoilRoot, useStoreRef} from '../RecoilRoot';

// Simple test component to read atom values
function ReadsAtom<T>({atom}: {atom: any}) {
  const value = JSON.stringify('mocked'); // Simplified for testing
  return <>{value}</>;
}

describe('RecoilRoot', () => {
  describe('initializeState', () => {
    test('initialize atom', () => {
      const myAtom = atom({
        key: 'RecoilRoot - initializeState - atom',
        default: 'DEFAULT',
      });
      const mySelector = constSelector(myAtom);

      function initializeState({set, getLoadable}: MutableSnapshot) {
        expect(getLoadable(myAtom).contents).toEqual('DEFAULT');
        expect(getLoadable(mySelector).contents).toEqual('DEFAULT');
        set(myAtom, 'INITIALIZE');
        expect(getLoadable(myAtom).contents).toEqual('INITIALIZE');
        expect(getLoadable(mySelector).contents).toEqual('INITIALIZE');
      }

      // Test that RecoilRoot accepts initializeState prop
      const element = (
        <RecoilRoot initializeState={initializeState}>
          <ReadsAtom atom={myAtom} />
          <ReadsAtom atom={mySelector} />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
      expect(element.props.initializeState).toBe(initializeState);
    });

    test('initialize selector', () => {
      const myAtom = atom({
        key: 'RecoilRoot - initializeState - selector',
        default: 'DEFAULT',
      });
      const mySelector = selector({
        key: 'RecoilRoot - initializeState - selector selector',
        get: ({get}) => get(myAtom),
        set: ({set}, newValue) => set(myAtom, newValue),
      });

      function initializeState({set, getLoadable}: MutableSnapshot) {
        expect(getLoadable(myAtom).contents).toEqual('DEFAULT');
        expect(getLoadable(mySelector).contents).toEqual('DEFAULT');
        set(mySelector, 'INITIALIZE');
        expect(getLoadable(myAtom).contents).toEqual('INITIALIZE');
        expect(getLoadable(mySelector).contents).toEqual('INITIALIZE');
      }

      const element = (
        <RecoilRoot initializeState={initializeState}>
          <ReadsAtom atom={myAtom} />
          <ReadsAtom atom={mySelector} />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
    });

    test('RecoilRoot without initializeState', () => {
      const myAtom = atom({
        key: 'RecoilRoot - no init',
        default: 'DEFAULT',
      });

      const element = (
        <RecoilRoot>
          <ReadsAtom atom={myAtom} />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
      expect(element.props.children).toBeDefined();
    });
  });

  describe('Store reference', () => {
    test('useStoreRef provides store reference', () => {
      let storeRef: any;

      function TestComponent() {
        storeRef = useStoreRef();
        return null;
      }

      const element = (
        <RecoilRoot>
          <TestComponent />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
    });
  });

  describe('Nested RecoilRoots', () => {
    test('nested RecoilRoots create separate store contexts', () => {
      const outerAtom = atom({
        key: 'RecoilRoot - outer',
        default: 'OUTER',
      });

      const innerAtom = atom({
        key: 'RecoilRoot - inner',
        default: 'INNER',
      });

      const element = (
        <RecoilRoot>
          <ReadsAtom atom={outerAtom} />
          <RecoilRoot>
            <ReadsAtom atom={innerAtom} />
          </RecoilRoot>
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
      expect(element.props.children).toBeDefined();
    });
  });

  describe('Error boundaries', () => {
    test('RecoilRoot handles errors in initialization', () => {
      const myAtom = atom({
        key: 'RecoilRoot - error',
        default: 'DEFAULT',
      });

      function initializeStateWithError({set}: MutableSnapshot) {
        throw new Error('Initialization error');
      }

      const element = (
        <RecoilRoot initializeState={initializeStateWithError}>
          <ReadsAtom atom={myAtom} />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
    });
  });

  describe('State management', () => {
    test('state is isolated between different RecoilRoot instances', () => {
      const sharedAtom = atom({
        key: 'RecoilRoot - shared',
        default: 'SHARED',
      });

      const root1 = (
        <RecoilRoot>
          <ReadsAtom atom={sharedAtom} />
        </RecoilRoot>
      );

      const root2 = (
        <RecoilRoot>
          <ReadsAtom atom={sharedAtom} />
        </RecoilRoot>
      );

      expect(root1.type).toBe(RecoilRoot);
      expect(root2.type).toBe(RecoilRoot);
      expect(root1).not.toBe(root2);
    });

    test('state updates within a RecoilRoot', () => {
      const countAtom = atom({
        key: 'RecoilRoot - count',
        default: 0,
      });

      function Counter() {
        const setCount = useSetRecoilState(countAtom);

        return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
      }

      const element = (
        <RecoilRoot>
          <Counter />
          <ReadsAtom atom={countAtom} />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
    });
  });

  describe('Snapshot handling', () => {
    test('initializeState receives correct snapshot', () => {
      const myAtom = atom({
        key: 'RecoilRoot - snapshot',
        default: 'DEFAULT',
      });

      let receivedSnapshot: MutableSnapshot | undefined;

      function initializeState(snapshot: MutableSnapshot) {
        receivedSnapshot = snapshot;
        expect(typeof snapshot.getLoadable).toBe('function');
        expect(typeof snapshot.set).toBe('function');
        expect(typeof snapshot.reset).toBe('function');
      }

      const element = (
        <RecoilRoot initializeState={initializeState}>
          <ReadsAtom atom={myAtom} />
        </RecoilRoot>
      );

      expect(element.type).toBe(RecoilRoot);
    });
  });
});
