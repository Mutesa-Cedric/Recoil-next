/**
 * TypeScript port of Recoil_useGetRecoilValueInfo-test.js
 */

import { describe, test, expect } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { render } from '@testing-library/react';

import type { RecoilState, RecoilValue, RecoilValueReadOnly } from '../../core/RecoilValue';
import type { RecoilValueInfo } from '../../core/FunctionalCore';

import { RecoilRoot } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { selector } from '../../recoil_values/selector';
import { useGetRecoilValueInfo } from '../useGetRecoilValueInfo';
import { useRecoilValue, useRecoilState, useResetRecoilState } from '../Hooks';

// Error boundary component for testing
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: (error: Error) => React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state: { hasError: boolean; error?: Error } = { hasError: false };

  static getDerivedStateFromError(error: Error): { hasError: boolean; error?: Error } {
    return { hasError: true, error };
  }

  render(): React.ReactNode {
    return this.state.hasError
      ? this.props.fallback != null && this.state.error != null
        ? this.props.fallback(this.state.error)
        : 'error'
      : this.props.children;
  }
}

// React rendering utilities for testing
function renderElements(element: React.ReactElement): HTMLElement {
  const { container } = render(
    <RecoilRoot>
      <ErrorBoundary>
        <React.Suspense fallback="loading">{element}</React.Suspense>
      </ErrorBoundary>
    </RecoilRoot>
  );
  return container;
}

// Test component to read atom values
function ReadsAtom<T>({ atom }: { atom: RecoilValue<T> }) {
  const value = useRecoilValue(atom);
  return <>{JSON.stringify(value)}</>;
}

// Test component that reads and writes atom values
function componentThatReadsAndWritesAtom<T>(
  recoilState: RecoilState<T>,
): [React.ComponentType<{}>, ((updater: T | ((prev: T) => T)) => void), () => void] {
  let updateValue: ((updater: T | ((prev: T) => T)) => void) | null = null;
  let resetValue: (() => void) | null = null;
  
  const Component = () => {
    const [value, setValue] = useRecoilState(recoilState);
    const resetRecoilState = useResetRecoilState(recoilState);
    updateValue = setValue;
    resetValue = resetRecoilState;
    return <>{JSON.stringify(value)}</>;
  };
  
  const setterWrapper = (updater: T | ((prev: T) => T)) => {
    if (updateValue) {
      updateValue(updater);
    }
  };
  
  const resetWrapper = () => {
    if (resetValue) {
      resetValue();
    }
  };
  
  return [Component, setterWrapper, resetWrapper];
}

describe('useGetRecoilValueInfo', () => {
  test('useGetRecoilValueInfo', () => {
    const myAtom = atom<string>({
      key: `useGetRecoilValueInfo atom ${Math.random()}`,
      default: 'DEFAULT',
    });
    const selectorA = selector({
      key: `useGetRecoilValueInfo A ${Math.random()}`,
      get: ({get}) => get(myAtom),
    });
    const selectorB = selector({
      key: `useGetRecoilValueInfo B ${Math.random()}`,
      get: ({get}) => get(selectorA) + get(myAtom),
    });

    let getNodeInfo = (_: RecoilState<string> | RecoilValueReadOnly<string>): RecoilValueInfo<string> => {
      expect(false).toBe(true);
      throw new Error('getRecoilValue not set');
    };
    function GetRecoilValueInfo() {
      const getRecoilValueInfo = useGetRecoilValueInfo();
      getNodeInfo = node => ({...getRecoilValueInfo(node)});
      return null;
    }

    // Initial status
    renderElements(<GetRecoilValueInfo />);

    expect(getNodeInfo(myAtom)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULT',
      }),
      isActive: false,
      isSet: false,
      isModified: false,
      type: 'atom',
    });
    expect(Array.from(getNodeInfo(myAtom).deps)).toEqual([]);
    expect(Array.from(getNodeInfo(myAtom).subscribers.nodes)).toEqual([]);
    expect(getNodeInfo(selectorA)).toMatchObject({
      loadable: null,
      isActive: false,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorA).deps)).toEqual([]);
    expect(Array.from(getNodeInfo(selectorA).subscribers.nodes)).toEqual([]);
    expect(getNodeInfo(selectorB)).toMatchObject({
      loadable: null,
      isActive: false,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorB).deps)).toEqual([]);
    expect(Array.from(getNodeInfo(selectorB).subscribers.nodes)).toEqual([]);

    // After reading values
    const [ReadWriteAtom, setAtom, resetAtom] =
      componentThatReadsAndWritesAtom(myAtom);
    const c = renderElements(
      <>
        <GetRecoilValueInfo />
        <ReadWriteAtom />
        <ReadsAtom atom={selectorB} />
      </>,
    );
    expect(c.textContent).toEqual('"DEFAULT""DEFAULTDEFAULT"');

    expect(getNodeInfo(myAtom)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULT',
      }),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'atom',
    });
    expect(Array.from(getNodeInfo(myAtom).deps)).toEqual([]);
    expect(Array.from(getNodeInfo(myAtom).subscribers.nodes)).toEqual(
      expect.arrayContaining([selectorA, selectorB]),
    );
    expect(getNodeInfo(selectorA)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULT',
      }),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorA).deps)).toEqual(
      expect.arrayContaining([myAtom]),
    );
    expect(Array.from(getNodeInfo(selectorA).subscribers.nodes)).toEqual(
      expect.arrayContaining([selectorB]),
    );
    expect(getNodeInfo(selectorB)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULTDEFAULT',
      }),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorB).deps)).toEqual(
      expect.arrayContaining([myAtom, selectorA]),
    );
    expect(Array.from(getNodeInfo(selectorB).subscribers.nodes)).toEqual([]);

    // After setting a value
    act(() => setAtom('SET'));

    expect(getNodeInfo(myAtom)).toMatchObject({
      loadable: expect.objectContaining({state: 'hasValue', contents: 'SET'}),
      isActive: true,
      isSet: true,
      isModified: true,
      type: 'atom',
    });
    expect(Array.from(getNodeInfo(myAtom).deps)).toEqual([]);
    expect(Array.from(getNodeInfo(myAtom).subscribers.nodes)).toEqual(
      expect.arrayContaining([selectorA, selectorB]),
    );
    expect(getNodeInfo(selectorA)).toMatchObject({
      loadable: expect.objectContaining({state: 'hasValue', contents: 'SET'}),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorA).deps)).toEqual(
      expect.arrayContaining([myAtom]),
    );
    expect(Array.from(getNodeInfo(selectorA).subscribers.nodes)).toEqual(
      expect.arrayContaining([selectorB]),
    );
    expect(getNodeInfo(selectorB)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'SETSET',
      }),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorB).deps)).toEqual(
      expect.arrayContaining([myAtom, selectorA]),
    );
    expect(Array.from(getNodeInfo(selectorB).subscribers.nodes)).toEqual([]);

    // After reseting a value
    act(resetAtom);

    expect(getNodeInfo(myAtom)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULT',
      }),
      isActive: true,
      isSet: false,
      isModified: true,
      type: 'atom',
    });
    expect(Array.from(getNodeInfo(myAtom).deps)).toEqual([]);
    expect(Array.from(getNodeInfo(myAtom).subscribers.nodes)).toEqual(
      expect.arrayContaining([selectorA, selectorB]),
    );
    expect(getNodeInfo(selectorA)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULT',
      }),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorA).deps)).toEqual(
      expect.arrayContaining([myAtom]),
    );
    expect(Array.from(getNodeInfo(selectorA).subscribers.nodes)).toEqual(
      expect.arrayContaining([selectorB]),
    );
    expect(getNodeInfo(selectorB)).toMatchObject({
      loadable: expect.objectContaining({
        state: 'hasValue',
        contents: 'DEFAULTDEFAULT',
      }),
      isActive: true,
      isSet: false,
      isModified: false,
      type: 'selector',
    });
    expect(Array.from(getNodeInfo(selectorB).deps)).toEqual(
      expect.arrayContaining([myAtom, selectorA]),
    );
    expect(Array.from(getNodeInfo(selectorB).subscribers.nodes)).toEqual([]);
  });
}); 