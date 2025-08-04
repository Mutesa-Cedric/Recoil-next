/**
 * TypeScript port of Recoil_Hooks_TRANSITION_SUPPORT_UNSTABLE-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { RecoilRoot } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import {
  useRecoilState_TRANSITION_SUPPORT_UNSTABLE,
  useRecoilValue_TRANSITION_SUPPORT_UNSTABLE,
} from '../Hooks';

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
function ReadsAtom<T>({ atom }: { atom: any }) {
  const value = useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(atom);
  return <>{JSON.stringify(value)}</>;
}

// Test component to read and write atom values
function ReadsAndWritesAtom<T>({ atom, value }: { atom: any; value: T }) {
  const [currentValue, setValue] = useRecoilState_TRANSITION_SUPPORT_UNSTABLE(atom);
  React.useEffect(() => {
    setValue(value);
  }, [setValue, value]);
  return <>{JSON.stringify(currentValue)}</>;
}

describe('_TRANSITION_SUPPORT_UNSTABLE hooks', () => {
  test('useRecoilValue_TRANSITION_SUPPORT_UNSTABLE works with synchronous atoms', () => {
    const testAtom = atom({
      key: 'test-atom-sync',
      default: 'initial',
    });

    const container = renderElements(<ReadsAtom atom={testAtom} />);
    expect(container.textContent).toBe('"initial"');
  });

  test('useRecoilState_TRANSITION_SUPPORT_UNSTABLE works with synchronous atoms', () => {
    const testAtom = atom({
      key: 'test-atom-state',
      default: 'initial',
    });

    const container = renderElements(
      <ReadsAndWritesAtom atom={testAtom} value="updated" />
    );

    expect(container.textContent).toBe('"updated"');
  });

  test('_TRANSITION_SUPPORT_UNSTABLE hooks work in transition mode', () => {
    const testAtom = atom({
      key: 'test-atom-transition',
      default: 'initial',
    });

    const container = renderElements(
      <RecoilRoot>
        <ErrorBoundary>
          <React.Suspense fallback="loading">
            <ReadsAndWritesAtom atom={testAtom} value="transition-value" />
          </React.Suspense>
        </ErrorBoundary>
      </RecoilRoot>
    );

    expect(container.textContent).toBe('"transition-value"');
  });
}); 