/**
 * TypeScript port of Recoil_useRecoilBridgeAcrossReactRoots-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { act, useEffect, useRef } from 'react';
import { describe, expect, test } from 'vitest';

import type { StoreID } from '../../core/Keys';
import type { MutableSnapshot } from '../../core/Snapshot';

import { RecoilRoot, useRecoilStoreID } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { useRecoilBridgeAcrossReactRoots } from '../useRecoilBridgeAcrossReactRoots';

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

function renderUnwrappedElements(element: React.ReactElement, container?: HTMLElement): HTMLElement {
  if (container) {
    const { container: newContainer } = render(element, { container });
    return newContainer;
  }
  const { container: newContainer } = render(<>{element}</>);
  return newContainer;
}

// Test component that reads and writes atom values
function componentThatReadsAndWritesAtom<T>(
  recoilState: any,
): [React.ComponentType<{}>, ((updater: T | ((prev: T) => T)) => void)] {
  let updateValue: any;
  const Component = () => {
    const [value, setValue] = useRecoilState(recoilState);
    updateValue = setValue;
    return <>{JSON.stringify(value)}</>;
  };
  return [Component, updateValue];
}

// Import useRecoilState
import { useRecoilState } from '../Hooks';

function NestedReactRoot({children}: {children: React.ReactNode}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const RecoilBridge = useRecoilBridgeAcrossReactRoots();

  useEffect(() => {
    if (ref.current) {
      renderUnwrappedElements(
        <RecoilBridge>{children}</RecoilBridge>,
        ref.current,
      );
    }
  }, [RecoilBridge, children]);

  return <div ref={ref} />;
}

describe('useRecoilBridgeAcrossReactRoots', () => {
  test('create a context bridge', async () => {
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
  });

  test('StoreID matches bridged store', () => {
    function RecoilStoreID({storeIDRef}: {storeIDRef: {current: StoreID | null}}) {
      storeIDRef.current = useRecoilStoreID();
      return null;
    }

    const rootStoreIDRef = {current: null as StoreID | null};
    const nestedStoreIDRef = {current: null as StoreID | null};

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
}); 