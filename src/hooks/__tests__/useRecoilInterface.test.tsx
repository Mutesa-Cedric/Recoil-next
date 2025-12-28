/**
 * TypeScript port of Recoil_useRecoilInterface-test.js
 */

import {render} from '@testing-library/react';
import * as React from 'react';
import {act, useRef, useState} from 'react';
import {describe, expect, test} from 'vitest';

import type {RecoilInterface} from '../Hooks';

import {RecoilRoot} from '../../core/RecoilRoot';
import {atom} from '../../recoil_values/atom';
import {useRecoilInterface} from '../Hooks';

// Error boundary component for testing
class ErrorBoundary extends React.Component<
  {children: React.ReactNode; fallback?: (error: Error) => React.ReactNode},
  {hasError: boolean; error?: Error}
> {
  state: {hasError: boolean; error?: Error} = {hasError: false};

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error?: Error;
  } {
    return {hasError: true, error};
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
  const {container} = render(
    <RecoilRoot>
      <ErrorBoundary>
        <React.Suspense fallback="loading">{element}</React.Suspense>
      </ErrorBoundary>
    </RecoilRoot>,
  );
  return container;
}

const counterAtom = atom({
  key: 'counterAtom',
  default: 0,
});

describe('useRecoilInterface', () => {
  test('Interface for non-react code - useRecoilState', () => {
    function nonReactCode(recoilInterface: RecoilInterface) {
      return recoilInterface.getRecoilState(counterAtom);
    }

    let updateValue: any;
    const Component = () => {
      const recoilInterface = useRecoilInterface();
      const [value, _updateValue] = nonReactCode(recoilInterface);
      updateValue = _updateValue;
      return <>{String(value)}</>;
    };

    const container = renderElements(<Component />);
    expect(container.textContent).toEqual('0');
    act(() => updateValue(1));
    expect(container.textContent).toEqual('1');
  });

  test('Interface for non-react code - useRecoilStateNoThrow', () => {
    function nonReactCode(recoilInterface: RecoilInterface) {
      const [loadable, setValue] =
        recoilInterface.getRecoilStateLoadable(counterAtom);
      const value = loadable.state === 'hasValue' ? loadable.contents : null;
      return [value, setValue];
    }

    let updateValue: any;
    const Component = () => {
      const recoilInterface = useRecoilInterface();
      const [value, _updateValue] = nonReactCode(recoilInterface);
      updateValue = _updateValue;
      return <>{String(value)}</>;
    };

    const container = renderElements(<Component />);
    expect(container.textContent).toEqual('0');
    act(() => updateValue(1));
    expect(container.textContent).toEqual('1');
  });

  test('Interface for non-react code - useRecoilValue, useSetRecoilState', () => {
    function nonReactCode(recoilInterface: RecoilInterface) {
      return [
        recoilInterface.getRecoilValue(counterAtom),
        recoilInterface.getSetRecoilState(counterAtom),
      ];
    }

    let updateValue: any;
    const Component = () => {
      const recoilInterface = useRecoilInterface();
      const [value, _updateValue] = nonReactCode(recoilInterface);
      updateValue = _updateValue;
      return <>{String(value)}</>;
    };

    const container = renderElements(<Component />);
    expect(container.textContent).toEqual('0');
    act(() => updateValue(1));
    expect(container.textContent).toEqual('1');
  });

  test('Interface for non-react code - useRecoilValueNoThrow', () => {
    function nonReactCode(recoilInterface: RecoilInterface) {
      const value = recoilInterface
        .getRecoilValueLoadable(counterAtom)
        .valueMaybe();
      const setValue = recoilInterface.getSetRecoilState(counterAtom);
      return [value, setValue];
    }

    let updateValue: any;
    const Component = () => {
      const recoilInterface = useRecoilInterface();
      const [value, _updateValue] = nonReactCode(recoilInterface);
      updateValue = _updateValue;
      return <>{String(value)}</>;
    };

    const container = renderElements(<Component />);
    expect(container.textContent).toEqual('0');
    act(() => updateValue(1));
    expect(container.textContent).toEqual('1');
  });

  // Test that we always get a consistent instance of the interface object and
  // hooks from useRecoilInterface() (at least for a given <AppRoot> store)
  test('Consistent interface object', () => {
    let setValue: any;
    const Component = () => {
      const [value, _setValue] = useState(0);
      const recoilInterface = useRecoilInterface();
      const recoilInterfaceRef = useRef(recoilInterface);
      expect(recoilInterface).toBe(recoilInterfaceRef.current);
      expect(recoilInterface.getRecoilState).toBe(
        recoilInterface.getRecoilState,
      );
      setValue = _setValue;
      return <>{value}</>;
    };
    const out = renderElements(<Component />);
    expect(out.textContent).toBe('0');
    act(() => setValue(1)); // Force a re-render of the Component
    expect(out.textContent).toBe('1');
  });
});
