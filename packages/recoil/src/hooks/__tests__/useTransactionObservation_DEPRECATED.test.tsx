/**
 * TypeScript port of Recoil_useTransactionObservation_DEPRECATED-test.js
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import * as React from 'react';
import { act, useState } from 'react';
import { expect, test, vi } from 'vitest';
import type { RecoilState, RecoilValue, RecoilValueReadOnly } from '../../core/RecoilValue';
import type { PersistenceSettings } from '../../recoil_values/atom';

import stableStringify from '../../../../shared/src/util/Recoil_stableStringify';
import { DefaultValue } from '../../core/Node';
import { RecoilRoot } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { selector } from '../../recoil_values/selector';
import {
  useRecoilValue,
  useSetRecoilState,
  useSetUnvalidatedAtomValues
} from '../Hooks';
import { useTransactionObservation_DEPRECATED } from '../SnapshotHooks';

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

function renderUnwrappedElements(element: React.ReactElement): HTMLElement {
  const { container } = render(<>{element}</>);
  return container;
}

// Test component to read atom values
function ReadsAtom<T>({ atom }: { atom: RecoilValue<T> }) {
  const value = useRecoilValue(atom);
  return <>{stableStringify(value)}</>;
}

function flushPromisesAndTimers(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
}

let nextID = 0;

function counterAtom(persistence?: PersistenceSettings<number>) {
  return atom({
    key: `atom${nextID++}`,
    default: 0,
    persistence_UNSTABLE: persistence,
  });
}

function plusOneSelector(dep: RecoilValue<number>) {
  const fn = vi.fn((x: number) => x + 1);
  const sel = selector({
    key: `selector${nextID++}`,
    get: ({get}) => fn(get(dep)),
  });
  return [sel, fn] as const;
}

function plusOneAsyncSelector(
  dep: RecoilValue<number>,
): [RecoilValueReadOnly<number>, (number) => void] {
  let nextTimeoutAmount = 100;
  const fn = vi.fn((x: number) => {
    return new Promise<number>(resolve => {
      setTimeout(() => {
        resolve(x + 1);
      }, nextTimeoutAmount);
    });
  });
  const sel = selector({
    key: `selector${nextID++}`,
    get: ({get}) => fn(get(dep)),
  });
  return [
    sel,
    (timeout: number) => {
      nextTimeoutAmount = timeout;
    },
  ];
}

function ObservesTransactions({fn}: {fn: ReturnType<typeof vi.fn>}) {
  useTransactionObservation_DEPRECATED(({atomValues, atomInfo, modifiedAtoms}) => {
    fn({atomValues, atomInfo, modifiedAtoms});
  });
  return null;
}

test('useTransactionObservation_DEPRECATED - basic functionality', () => {
  const atomA = counterAtom({
    type: 'url',
    validator: (storedValue: unknown, defaultValue: DefaultValue) =>
      typeof storedValue === 'number' ? storedValue : defaultValue,
  });
  const atomB = counterAtom({
    type: 'url',
    validator: (storedValue: unknown, defaultValue: DefaultValue) =>
      typeof storedValue === 'number' ? storedValue : defaultValue,
  });
  const [selectorA, selectorAFn] = plusOneSelector(atomA);
  const [selectorB, selectorBFn] = plusOneSelector(atomB);

  const transactionObserver = vi.fn();

  function SetsUnvalidatedAtomValues() {
    const setUnvalidatedAtomValues = useSetUnvalidatedAtomValues();
    const setAtomA = useSetRecoilState(atomA);
    const setAtomB = useSetRecoilState(atomB);

    return (
      <div>
        <button
          onClick={() => {
            setAtomA(1);
            setAtomB(2);
          }}
        >
          Set Atoms
        </button>
        <button
          onClick={() => {
            setUnvalidatedAtomValues(
              new Map([
                [atomA.key, 10],
                [atomB.key, 20],
              ]),
            );
          }}
        >
          Set Unvalidated
        </button>
      </div>
    );
  }

  function Switch({children}: {children: ReactNode}) {
    const [show, setShow] = useState(true);
    return (
      <div>
        <button onClick={() => setShow(!show)}>Toggle</button>
        {show && children}
      </div>
    );
  }

  function MyReadsAtom({
    getAtom,
  }: {
    getAtom: () => null | RecoilState<number>;
  }) {
    const atom = getAtom();
    if (atom == null) {
      return <div>No atom</div>;
    }
    const value = useRecoilValue(atom);
    return <div>{value}</div>;
  }

  const c = renderElements(
    <>
      <ReadsAtom atom={atomA} />
      <ReadsAtom atom={atomB} />
      <ReadsAtom atom={selectorA} />
      <ReadsAtom atom={selectorB} />
      <SetsUnvalidatedAtomValues />
      <Switch>
        <ObservesTransactions fn={transactionObserver} />
      </Switch>
      <MyReadsAtom getAtom={() => atomA} />
    </>,
  );

  expect(c.textContent).toContain('0');
  expect(c.textContent).toContain('1');
  expect(c.textContent).toContain('1');

  // Initial render should not trigger transaction observation
  expect(transactionObserver).toHaveBeenCalledTimes(0);

  // Set atoms normally
  act(() => {
    c.querySelector('button')?.click();
  });

  expect(c.textContent).toContain('1');
  expect(c.textContent).toContain('2');
  expect(c.textContent).toContain('2');
  expect(c.textContent).toContain('3');

  // Should have observed the transaction
  expect(transactionObserver).toHaveBeenCalledTimes(1);
  const firstCall = transactionObserver.mock.calls[0][0];
  expect(firstCall.modifiedAtoms).toContain(atomA.key);
  expect(firstCall.modifiedAtoms).toContain(atomB.key);

  // Set unvalidated atom values
  act(() => {
    c.querySelectorAll('button')[1]?.click();
  });

  expect(c.textContent).toContain('10');
  expect(c.textContent).toContain('20');
  expect(c.textContent).toContain('11');
  expect(c.textContent).toContain('21');

  // Should have observed the unvalidated transaction
  expect(transactionObserver).toHaveBeenCalledTimes(2);
  const secondCall = transactionObserver.mock.calls[1][0];
  expect(secondCall.modifiedAtoms).toContain(atomA.key);
  expect(secondCall.modifiedAtoms).toContain(atomB.key);
});

// TODO: Fix async selector state update issue in test environment
test('useTransactionObservation_DEPRECATED - with async selectors', async () => {
  const atomA = counterAtom({
    type: 'url',
    validator: (storedValue: unknown, defaultValue: any) => {
      return typeof storedValue === 'number' ? storedValue : defaultValue;
    },
  });
  const asyncSelectorA = selector({
    key: `async-selector-${Math.random()}`,
    get: async ({get}) => {
      const dep = get(atomA);
      // Add a very short delay to make it properly async
      await new Promise(resolve => setTimeout(resolve, 0));
      return dep + 1;
    },
  });

  const transactionObserver = vi.fn();

  function SetsUnvalidatedAtomValues() {
    const setAtomALocal = useSetRecoilState(atomA);
    return (
      <button
        onClick={() => {
          setAtomALocal(5);
        }}
      >
        Set Atom
      </button>
    );
  }

  const c = renderElements(
    <>
      <div data-testid="atomA"><ReadsAtom atom={atomA} /></div>
      <div data-testid="asyncSelector"><ReadsAtom atom={asyncSelectorA} /></div>
      <SetsUnvalidatedAtomValues />
      <ObservesTransactions fn={transactionObserver} />
    </>,
  );

  // Wait for async selector to resolve
  await act(async () => {
    await flushPromisesAndTimers();
  });

  expect(c.textContent).toContain('0');
  expect(c.textContent).toContain('1'); // async selector resolved to 0+1

  // Set atom to trigger async selector by clicking the button
  await act(async () => {
    c.querySelector('button')?.click();
    // Give React time to update the DOM
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(c.textContent).toContain('5');
  
  // The async selector might resolve immediately or show loading briefly
  // Either way, after some time it should resolve to 6
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  expect(c.textContent).toContain('5');
  expect(c.textContent).toContain('6'); // async selector resolved to 5+1

  // Should have observed both the initial atom transaction and async resolution
  expect(transactionObserver).toHaveBeenCalledTimes(2);
});

test('useTransactionObservation_DEPRECATED - cleanup on unmount', () => {
  const atomA = counterAtom({
    type: 'url',
    validator: (storedValue: unknown, defaultValue: any) => {
      return typeof storedValue === 'number' ? storedValue : defaultValue;
    },
  });
  const transactionObserver = vi.fn();

  function Test() {
    const [show, setShow] = useState(true);
    const setAtomA = useSetRecoilState(atomA);

    return (
      <div>
        <ReadsAtom atom={atomA} />
        <button onClick={() => setAtomA(1)}>Set Atom</button>
        <button onClick={() => setShow(!show)}>Toggle Observer</button>
        {show && <ObservesTransactions fn={transactionObserver} />}
      </div>
    );
  }

  const c = renderElements(<Test />);

  // Set atom with observer mounted
  act(() => {
    c.querySelector('button')?.click();
  });

  expect(transactionObserver).toHaveBeenCalledTimes(1);

  // Unmount observer
  act(() => {
    c.querySelectorAll('button')[1]?.click();
  });

  // Set atom with observer unmounted
  act(() => {
    c.querySelector('button')?.click();
  });

  // Should not have observed the transaction
  expect(transactionObserver).toHaveBeenCalledTimes(1);
}); 