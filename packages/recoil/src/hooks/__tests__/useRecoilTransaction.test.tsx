/**
 * TypeScript port of Recoil_useRecoilTransaction-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { act, useEffect } from 'react';
import { describe, expect, test } from 'vitest';

import { RecoilRoot } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { useRecoilValue } from '../Hooks';
import useRecoilTransaction from '../useRecoilTransaction';

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
  const value = useRecoilValue(atom);
  return <>{JSON.stringify(value)}</>;
}

describe('useRecoilTransaction', () => {
  test('Get with transaction', () => {
    const myAtom = atom({
      key: 'useRecoilTransaction atom get',
      default: 'DEFAULT',
    });

    let readAtom: any;
    let ranTransaction = false;
    function Component() {
      readAtom = useRecoilTransaction(({ get }) => () => {
        expect(get(myAtom)).toEqual('DEFAULT');
        ranTransaction = true;
      });
      return null;
    }
    renderElements(<Component />);
    expect(ranTransaction).toBe(false);

    act(() => readAtom());
    expect(ranTransaction).toBe(true);
  });

  test('Set with transaction', () => {
    const myAtom = atom<string>({
      key: 'useRecoilTransaction atom set',
      default: 'DEFAULT',
    });

    function Component() {
      const transact = useRecoilTransaction(({ set, get }) => (value: string) => {
        set(myAtom, 'TMP');
        expect(get(myAtom)).toEqual('TMP');
        set(myAtom, (old: string) => {
          expect(old).toEqual('TMP');
          return value;
        });
        expect(get(myAtom)).toEqual(value);
      });
      useEffect(() => {
        transact('TRANSACT');
      });
      return null;
    }

    const c = renderElements(
      <>
        <ReadsAtom atom={myAtom} />
        <Component />
      </>,
    );
    expect(c.textContent).toEqual('"TRANSACT"');
  });

  test('Transaction with multiple atoms', () => {
    const atomA = atom({
      key: 'useRecoilTransaction atom A',
      default: 'A',
    });
    const atomB = atom({
      key: 'useRecoilTransaction atom B',
      default: 'B',
    });

    let transaction: any;
    function Component() {
      transaction = useRecoilTransaction(({ set, get }) => () => {
        expect(get(atomA)).toEqual('A');
        expect(get(atomB)).toEqual('B');
        set(atomA, 'A_UPDATED');
        set(atomB, 'B_UPDATED');
        expect(get(atomA)).toEqual('A_UPDATED');
        expect(get(atomB)).toEqual('B_UPDATED');
      });
      return null;
    }

    renderElements(<Component />);
    act(() => transaction());
  });

  test('Transaction with async operations', async () => {
    const myAtom = atom({
      key: 'useRecoilTransaction async',
      default: 'DEFAULT',
    });

    let transaction: any;
    function Component() {
      transaction = useRecoilTransaction(({ set, get }) => async () => {
        expect(get(myAtom)).toEqual('DEFAULT');
        set(myAtom, 'UPDATED');
        expect(get(myAtom)).toEqual('UPDATED');
        await new Promise(resolve => setTimeout(resolve, 10));
        set(myAtom, 'FINAL');
        expect(get(myAtom)).toEqual('FINAL');
      });
      return null;
    }

    renderElements(<Component />);
    await act(async () => {
      await transaction();
    });
  });

  test('Transaction with error handling', () => {
    const myAtom = atom({
      key: 'useRecoilTransaction error',
      default: 'DEFAULT',
    });

    let transaction: any;
    function Component() {
      transaction = useRecoilTransaction(({ set, get }) => () => {
        try {
          set(myAtom, 'BEFORE_ERROR');
          expect(get(myAtom)).toEqual('BEFORE_ERROR');
          throw new Error('Transaction error');
        } catch (error) {
          // Error should not affect the transaction state
          expect(get(myAtom)).toEqual('BEFORE_ERROR');
        }
      });
      return null;
    }

    renderElements(<Component />);
    expect(() => act(() => transaction())).not.toThrow();
  });
}); 