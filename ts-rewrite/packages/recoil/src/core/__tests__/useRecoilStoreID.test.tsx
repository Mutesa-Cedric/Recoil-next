/**
 * TypeScript port of Recoil_useRecoilStoreID-test.js
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { render, screen } from '@testing-library/react';

import type { StoreID } from '../Keys';

import { RecoilRoot, useRecoilStoreID } from '../RecoilRoot';

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
    <ErrorBoundary>
      <React.Suspense fallback="loading">{element}</React.Suspense>
    </ErrorBoundary>
  );
  return container;
}

// Test component to read store ID
function ReadsStoreID(): React.ReactElement {
  const storeID = useRecoilStoreID();
  return <>{storeID}</>;
}

describe('useRecoilStoreID', () => {
  test('Returns unique store IDs for different RecoilRoot instances', () => {
    const container1 = renderElements(
      <RecoilRoot>
        <ReadsStoreID />
      </RecoilRoot>
    );
    const container2 = renderElements(
      <RecoilRoot>
        <ReadsStoreID />
      </RecoilRoot>
    );

    const storeID1 = container1.textContent;
    const storeID2 = container2.textContent;

    expect(storeID1).toBeDefined();
    expect(storeID2).toBeDefined();
    expect(storeID1).not.toBe(storeID2);
  });

  test('Returns the same store ID for nested RecoilRoot with override=false', () => {
    let outerStoreID: StoreID;
    let innerStoreID: StoreID;

    function OuterComponent() {
      outerStoreID = useRecoilStoreID();
      return (
        <RecoilRoot override={false}>
          <InnerComponent />
        </RecoilRoot>
      );
    }

    function InnerComponent() {
      innerStoreID = useRecoilStoreID();
      return <>{innerStoreID}</>;
    }

    renderElements(
      <RecoilRoot>
        <OuterComponent />
      </RecoilRoot>
    );

    expect(outerStoreID!).toBeDefined();
    expect(innerStoreID!).toBeDefined();
    expect(outerStoreID!).toBe(innerStoreID!);
  });

  test('Returns different store IDs for nested RecoilRoot with override=true', () => {
    let outerStoreID: StoreID;
    let innerStoreID: StoreID;

    function OuterComponent() {
      outerStoreID = useRecoilStoreID();
      return (
        <RecoilRoot override={true}>
          <InnerComponent />
        </RecoilRoot>
      );
    }

    function InnerComponent() {
      innerStoreID = useRecoilStoreID();
      return <>{innerStoreID}</>;
    }

    renderElements(
      <RecoilRoot>
        <OuterComponent />
      </RecoilRoot>
    );

    expect(outerStoreID!).toBeDefined();
    expect(innerStoreID!).toBeDefined();
    expect(outerStoreID!).not.toBe(innerStoreID!);
  });

  test('Returns different store IDs for nested RecoilRoot with default override', () => {
    let outerStoreID: StoreID;
    let innerStoreID: StoreID;

    function OuterComponent() {
      outerStoreID = useRecoilStoreID();
      return (
        <RecoilRoot>
          <InnerComponent />
        </RecoilRoot>
      );
    }

    function InnerComponent() {
      innerStoreID = useRecoilStoreID();
      return <>{innerStoreID}</>;
    }

    renderElements(
      <RecoilRoot>
        <OuterComponent />
      </RecoilRoot>
    );

    expect(outerStoreID!).toBeDefined();
    expect(innerStoreID!).toBeDefined();
    expect(outerStoreID!).not.toBe(innerStoreID!);
  });
}); 