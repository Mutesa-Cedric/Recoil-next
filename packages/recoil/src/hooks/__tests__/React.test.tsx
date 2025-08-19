/**
 * TypeScript port of Recoil_React-test.js
 */

import {render} from '@testing-library/react';
import * as React from 'react';
import {act, useState} from 'react';
import {flushSync} from 'react-dom';
import {describe, expect, test} from 'vitest';

import {RecoilRoot} from '../../core/RecoilRoot';
import {atom} from '../../recoil_values/atom';
import {useRecoilState} from '../Hooks';

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

describe('React and Recoil integration', () => {
  test('Sync React and Recoil state changes', () => {
    const myAtom = atom({key: 'sync react recoil', default: 0});

    let setReact: any, setRecoil: any;
    function Component() {
      const [reactState, setReactState] = useState(0);
      const [recoilState, setRecoilState] = useRecoilState(myAtom);
      setReact = setReactState;
      setRecoil = setRecoilState;

      expect(reactState).toBe(recoilState);

      return `${reactState} - ${recoilState}`;
    }

    const c = renderElements(<Component />);
    expect(c.textContent).toBe('0 - 0');

    // Set both React and Recoil state in the same batch and ensure the component
    // render always seems consistent picture of both state changes.
    act(() => {
      flushSync(() => {
        setReact(1);
        setRecoil(1);
      });
    });
    expect(c.textContent).toBe('1 - 1');
  });

  test('React and Recoil state change ordering', () => {
    const myAtom = atom({key: 'sync react recoil', default: 0});

    let setReact: any, setRecoil: any;
    function Component() {
      const [reactState, setReactState] = useState(0);
      const [recoilState, setRecoilState] = useRecoilState(myAtom);
      setReact = setReactState;
      setRecoil = setRecoilState;

      // State changes may not be atomic.  However, render functions should
      // still see state changes in the order in which they were made.
      expect(reactState).toBeGreaterThanOrEqual(recoilState);

      return `${reactState} - ${recoilState}`;
    }

    const c = renderElements(<Component />);
    expect(c.textContent).toBe('0 - 0');

    // Test that changing React state before Recoil is seen in order
    act(() => {
      setReact(1);
      setRecoil(1);
    });
    expect(c.textContent).toBe('1 - 1');

    // Test that changing Recoil state before React is seen in order
    act(() => {
      setRecoil(0);
      setReact(0);
    });
    expect(c.textContent).toBe('0 - 0');
  });
});
