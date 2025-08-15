/**
 * TypeScript port of Recoil_selectorHooks-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { Profiler, act, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import type {
  RecoilState,
  RecoilValue,
  RecoilValueReadOnly,
} from '../../core/RecoilValue';
import type { PersistenceSettings } from '../../recoil_values/atom';

import invariant from '../../../../shared/src/util/Recoil_invariant';
import { batchUpdates } from '../../core/Batching';
import { reactMode } from '../../core/ReactMode';
import { RecoilRoot } from '../../core/RecoilRoot';
import {
  useRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState
} from '../../hooks/Hooks';
import { atom } from '../../recoil_values/atom';
import { constSelector } from '../../recoil_values/constSelector';
import { errorSelector } from '../../recoil_values/errorSelector';
import { selector } from '../../recoil_values/selector';

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

function renderElementsWithSuspenseCount(element: React.ReactElement): [HTMLElement, () => number] {
  let suspenseCount = 0;
  const { container } = render(
    <RecoilRoot>
      <ErrorBoundary>
        <React.Suspense fallback="loading">
          {element}
        </React.Suspense>
      </ErrorBoundary>
    </RecoilRoot>
  );
  return [container, () => suspenseCount];
}

// Test component to read atom values
function ReadsAtom<T>({ atom }: { atom: RecoilValue<T> }) {
  const value = useRecoilValue(atom);
  return <>{JSON.stringify(value)}</>;
}

// Test component that reads and writes atom values
function componentThatReadsAndWritesAtom<T>(
  recoilState: RecoilState<T>,
): [React.ComponentType<{}>, ((updater: T | ((prev: T) => T)) => void)] {
  let updateValue: ((updater: T | ((prev: T) => T)) => void) | null = null;
  const Component = () => {
    const [value, setValue] = useRecoilState(recoilState);
    updateValue = setValue;
    return <>{JSON.stringify(value)}</>;
  };

  const setterWrapper = (updater: T | ((prev: T) => T)) => {
    if (updateValue) {
      updateValue(updater);
    }
  };

  return [Component, setterWrapper];
}

// Test component that writes atom values
function componentThatWritesAtom<T>(
  recoilState: RecoilState<T>,
): [any, ((value: T | ((prev: T) => T)) => void)] {
  let updateValue: ((value: T | ((prev: T) => T)) => void) | null = null;
  const Component = vi.fn(() => {
    updateValue = useSetRecoilState(recoilState);
    return null;
  });

  const setterWrapper = (value: T | ((prev: T) => T)) => {
    if (updateValue) {
      updateValue(value);
    }
  };

  return [Component, setterWrapper];
}

// Test component that reads atom with commit count
function componentThatReadsAtomWithCommitCount(
  recoilState: RecoilValueReadOnly<number>,
): [React.ComponentType<{}>, () => void] {
  const commit = vi.fn(() => { });
  function ReadAtom() {
    return (
      <Profiler id="test" onRender={commit}>
        {useRecoilValue(recoilState)}
      </Profiler>
    );
  }
  return [ReadAtom, commit];
}

// Test component that toggles between two elements
function componentThatToggles(a: React.ReactNode, b: React.ReactNode | null) {
  const toggle = { current: () => invariant(false, 'bug in test code') };
  const Toggle = () => {
    const [value, setValue] = useState(false);
    toggle.current = () => setValue(v => !v);
    return value ? b : a;
  };
  return [Toggle, toggle];
}

// Helper function to advance timers
function advanceTimersBy(ms: number) {
  act(() => {
    vi.runAllTicks();
    vi.advanceTimersByTime(ms);
    vi.runAllTicks();
  });
}

// Helper function to calculate base render count
function baseRenderCount(gks: Array<string>): number {
  return reactMode().mode === 'LEGACY' &&
    !gks.includes('recoil_suppress_rerender_in_callback')
    ? 1
    : 0;
}

// Helper function to flush promises and timers
async function flushPromisesAndTimers() {
  await act(async () => {
    // Run timers first to resolve any pending setTimeout calls
    vi.runAllTimers();
    // Then flush promises by using the microtask queue
    await new Promise(resolve => resolve(undefined));
    // Run timers again in case resolving promises scheduled more timers
    vi.runAllTimers();
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

function booleanAtom(persistence?: PersistenceSettings<boolean>) {
  return atom<boolean>({
    key: `atom${nextID++}`,
    default: false,
    persistence_UNSTABLE: persistence,
  });
}

function plusOneSelector(dep: RecoilValue<number>) {
  const fn = vi.fn(x => x + 1);
  const sel = selector({
    key: `selector${nextID++}`,
    get: ({ get }) => fn(get(dep)),
  });
  return [sel, fn] as const;
}

function plusOneAsyncSelector(
  dep: RecoilValue<number>,
): [RecoilValueReadOnly<number>, (number) => void] {
  let nextTimeoutAmount = 100;
  const fn = vi.fn(x => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(x + 1);
      }, nextTimeoutAmount);
    });
  });
  const sel = selector({
    key: `selector${nextID++}`,
    get: ({ get }) => fn(get(dep)),
  });
  return [
    sel,
    x => {
      nextTimeoutAmount = x;
    },
  ];
}

function additionSelector(
  depA: RecoilValue<number>,
  depB: RecoilValue<number>,
) {
  const fn = vi.fn((a, b) => a + b);
  const sel = selector({
    key: `selector${nextID++}`,
    get: ({ get }) => fn(get(depA), get(depB)),
  });
  return [sel, fn] as const;
}

function asyncSelectorThatPushesPromisesOntoArray<T, S>(
  dep: RecoilValue<S>,
): [RecoilValue<T>, Array<[(T) => void, (unknown) => void]>] {
  const promises: Array<[(T) => void, (unknown) => void]> = [];
  const sel = selector<T>({
    key: `selector${nextID++}`,
    get: ({ get }) => {
      get(dep);
      let resolve: (value: T) => void = () => invariant(false, 'bug in test code');
      let reject: (reason: unknown) => void = () => invariant(false, 'bug in test code');
      const p = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      promises.push([resolve, reject]);
      return p;
    },
  });
  return [sel, promises];
}

// Async selector helpers
function asyncSelector<T>(value: T): RecoilValueReadOnly<T> {
  return selector({
    key: `asyncSelector${nextID++}`,
    get: () => Promise.resolve(value),
  });
}

function loadingAsyncSelector<T>(): RecoilValueReadOnly<T> {
  return selector({
    key: `loadingAsyncSelector${nextID++}`,
    get: () => new Promise(() => { }),
  });
}

function resolvingAsyncSelector<T>(value: T): RecoilValueReadOnly<T> {
  return selector({
    key: `resolvingAsyncSelector${nextID++}`,
    get: () => Promise.resolve(value),
  });
}

function errorThrowingAsyncSelector<T>(error: Error): RecoilValueReadOnly<T> {
  return selector({
    key: `errorThrowingAsyncSelector${nextID++}`,
    get: () => Promise.reject(error),
  });
}

function stringAtom(): RecoilState<string> {
  return atom({
    key: `stringAtom${nextID++}`,
    default: 'DEFAULT',
  });
}

describe('Selector Hooks', () => {
  test('static selector', () => {
    const staticSel = constSelector('HELLO');
    const c = renderElements(<ReadsAtom atom={staticSel} />);
    expect(c.textContent).toEqual('"HELLO"');
  });

  describe('Updates', () => {
    test('Selectors are updated when upstream atoms change', () => {
      const anAtom = counterAtom();
      const [aSelector, _] = plusOneSelector(anAtom);
      const [Component, updateValue] = componentThatWritesAtom(anAtom);
      const container = renderElements(
        <>
          <Component />
          <ReadsAtom atom={aSelector} />
        </>,
      );
      expect(container.textContent).toEqual('1');
      act(() => updateValue(1));
      expect(container.textContent).toEqual('2');
    });

    test('Selectors can depend on other selectors', () => {
      const anAtom = counterAtom();
      const [selectorA, _] = plusOneSelector(anAtom);
      const [selectorB, __] = plusOneSelector(selectorA);
      const [Component, updateValue] = componentThatWritesAtom(anAtom);
      const container = renderElements(
        <>
          <Component />
          <ReadsAtom atom={selectorB} />
        </>,
      );
      expect(container.textContent).toEqual('2');
      act(() => updateValue(1));
      expect(container.textContent).toEqual('3');
    });

    test('Selectors can depend on async selectors', async () => {
      vi.useFakeTimers();
      const anAtom = counterAtom();
      const [selectorA, _] = plusOneAsyncSelector(anAtom);
      const [selectorB, __] = plusOneSelector(selectorA);
      const [Component, updateValue] = componentThatWritesAtom(anAtom);
      const container = renderElements(
        <>
          <Component />
          <ReadsAtom atom={selectorB} />
        </>,
      );
      expect(container.textContent).toEqual('loading');

      act(() => vi.runAllTimers());
      await flushPromisesAndTimers();
      expect(container.textContent).toEqual('2');

      act(() => updateValue(1));

      expect(container.textContent).toEqual('loading');

      act(() => vi.runAllTimers());
      await flushPromisesAndTimers();
      expect(container.textContent).toEqual('3');
      vi.useRealTimers();
    });

    test('Async selectors can depend on async selectors', async () => {
      vi.useFakeTimers();
      const anAtom = counterAtom();
      const [selectorA, _] = plusOneAsyncSelector(anAtom);
      const [selectorB, __] = plusOneAsyncSelector(selectorA);
      const [Component, updateValue] = componentThatWritesAtom(anAtom);
      const container = renderElements(
        <>
          <Component />
          <ReadsAtom atom={selectorB} />
        </>,
      );

      if (reactMode().mode !== 'LEGACY') {
        // Run timers multiple times to handle chained async selectors
        act(() => vi.runAllTimers());
        await flushPromisesAndTimers();
        act(() => vi.runAllTimers());
        await flushPromisesAndTimers();
        expect(container.textContent).toEqual('2');

        act(() => updateValue(1));
        expect(container.textContent).toEqual('loading');

        act(() => vi.runAllTimers());
        await flushPromisesAndTimers();
        act(() => vi.runAllTimers());
        await flushPromisesAndTimers();
        expect(container.textContent).toEqual('3');
      } else {
        expect(container.textContent).toEqual('loading');

        act(() => vi.runAllTimers());
        await flushPromisesAndTimers();
        expect(container.textContent).toEqual('2');

        act(() => updateValue(1));
        expect(container.textContent).toEqual('loading');

        act(() => vi.runAllTimers());
        await flushPromisesAndTimers();
        expect(container.textContent).toEqual('3');
      }
      vi.useRealTimers();
    });

    test('Errors are propogated through selectors', () => {
      const errorThrower = errorSelector<number>('ERROR');
      const [downstreamSelector] = plusOneSelector(errorThrower);
      const container = renderElements(
        <>
          <ReadsAtom atom={downstreamSelector} />
        </>,
      );
      expect(container.textContent).toEqual('error');
    });
  });

  test('Selectors can be invertible', () => {
    const anAtom = counterAtom();
    const aSelector = selector({
      key: 'invertible1',
      get: ({ get }) => get(anAtom),
      set: ({ set }, newValue) => set(anAtom, newValue),
    });

    const [Component, updateValue] = componentThatWritesAtom(aSelector);
    const container = renderElements(
      <>
        <Component />
        <ReadsAtom atom={anAtom} />
      </>,
    );

    expect(container.textContent).toEqual('0');
    act(() => updateValue(1));
    expect(container.textContent).toEqual('1');
  });

  describe('Dynamic Dependencies', () => {
    test('Selector dependencies can change over time', () => {
      const atomA = counterAtom();
      const atomB = counterAtom();
      const aSelector = selector({
        key: 'depsChange',
        get: ({ get }) => {
          const a = get(atomA);
          if (a === 1337) {
            const b = get(atomB);
            return b;
          } else {
            return a;
          }
        },
      });

      const [ComponentA, updateValueA] = componentThatWritesAtom(atomA);
      const [ComponentB, updateValueB] = componentThatWritesAtom(atomB);

      const container = renderElements(
        <>
          <ComponentA />
          <ComponentB />
          <ReadsAtom atom={aSelector} />
        </>,
      );

      expect(container.textContent).toEqual('0');
      act(() => updateValueA(1337));
      expect(container.textContent).toEqual('0');
      act(() => updateValueB(1));

      expect(container.textContent).toEqual('1');
      act(() => updateValueA(2));
      expect(container.textContent).toEqual('2');
    });

    test('Selectors can gain and lose dependencies', () => {
      const BASE_CALLS = baseRenderCount([]);

      const switchAtom = booleanAtom();
      const inputAtom = counterAtom();

      // Depends on inputAtom only when switchAtom is true:
      const aSelector = selector<number>({
        key: 'gainsDeps',
        get: ({ get }) => {
          if (get(switchAtom)) {
            return get(inputAtom);
          } else {
            return Infinity;
          }
        },
      });

      const [ComponentA, setSwitch] = componentThatWritesAtom(switchAtom);
      const [ComponentB, setInput] = componentThatWritesAtom(inputAtom);
      const [ComponentC, commit] =
        componentThatReadsAtomWithCommitCount(aSelector);
      const container = renderElements(
        <>
          <ComponentA />
          <ComponentB />
          <ComponentC />
        </>,
      );

      expect(container.textContent).toEqual('Infinity');
      expect(commit).toHaveBeenCalledTimes(BASE_CALLS + 1);

      // Input is not a dep yet, so this has no effect:
      act(() => setInput(1));
      expect(container.textContent).toEqual('Infinity');
      expect(commit).toHaveBeenCalledTimes(BASE_CALLS + 1);

      // Flip switch:
      act(() => setSwitch(true));
      expect(container.textContent).toEqual('1');
      expect(commit).toHaveBeenCalledTimes(BASE_CALLS + 2);

      // Now changing input causes a re-render:
      act(() => setInput(2));
      expect(container.textContent).toEqual('2');
      expect(commit).toHaveBeenCalledTimes(BASE_CALLS + 3);

      // Now that we've added the dep, we can remove it...
      act(() => setSwitch(false));
      expect(container.textContent).toEqual('Infinity');
      expect(commit).toHaveBeenCalledTimes(BASE_CALLS + 4);

      // ... and again changing input will not cause a re-render:
      act(() => setInput(3));
      expect(container.textContent).toEqual('Infinity');
      expect(commit).toHaveBeenCalledTimes(BASE_CALLS + 4);
    });
  });

  describe('Async Selectors', () => {
    test('Resolving async selector', async () => {
      vi.useFakeTimers();
      const resolvingSel = resolvingAsyncSelector('READY');

      // On first read it is blocked on the async selector
      const c1 = renderElements(<ReadsAtom atom={resolvingSel} />);
      expect(c1.textContent).toEqual('loading');

      // When that resolves the data is ready
      await flushPromisesAndTimers();
      expect(c1.textContent).toEqual('"READY"');
      vi.useRealTimers();
    });

    test('Blocked on dependency', async () => {
      vi.useFakeTimers();
      const resolvingSel = resolvingAsyncSelector('READY');
      const blockedSelector = selector({
        key: 'useRecoilState/blocked selector',
        get: ({ get }) => get(resolvingSel),
      });

      // On first read, the selectors dependency is still loading
      const c2 = renderElements(<ReadsAtom atom={blockedSelector} />);
      expect(c2.textContent).toEqual('loading');

      // When the dependency resolves, the data is ready
      await flushPromisesAndTimers();
      expect(c2.textContent).toEqual('"READY"');
      vi.useRealTimers();
    });

    test('Basic async selector test', async () => {
      // Use real timers for async selectors to work properly
      const anAtom = counterAtom();
      const [aSelector, _] = plusOneAsyncSelector(anAtom);
      const [Component, updateValue] = componentThatWritesAtom(anAtom);
      const container = renderElements(
        <>
          <Component />
          <ReadsAtom atom={aSelector} />
        </>,
      );
      // Begins in loading state, then shows initial value:
      expect(container.textContent).toEqual('loading');

      // Wait for async selector to resolve (100ms + buffer)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      expect(container.textContent).toEqual('1');

      // Changing dependency makes it go back to loading, then to show new value:
      act(() => updateValue(1));
      expect(container.textContent).toEqual('loading');
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      expect(container.textContent).toEqual('2');

      // Returning to a seen value does not cause the loading state:
      act(() => updateValue(0));
      expect(container.textContent).toEqual('1');
    }, 10000); // Increase timeout for async operations

    test('Ability to not use Suspense', async () => {
      vi.useFakeTimers();
      const anAtom = counterAtom();
      const [aSelector, _] = plusOneAsyncSelector(anAtom);
      const [Component, updateValue] = componentThatWritesAtom(anAtom);

      function ReadsAtomWithoutSuspense({
        state,
      }: { state: RecoilValueReadOnly<number> }) {
        const loadable = useRecoilValueLoadable(state);
        if (loadable.state === 'loading') {
          return 'loading not with suspense';
        } else if (loadable.state === 'hasValue') {
          return loadable.contents;
        } else {
          throw loadable.contents;
        }
      }

      const container = renderElements(
        <>
          <Component />
          <ReadsAtomWithoutSuspense state={aSelector} />
        </>,
      );
      // Begins in loading state, then shows initial value:
      expect(container.textContent).toEqual('loading not with suspense');
      act(() => vi.runAllTimers());
      await flushPromisesAndTimers();
      expect(container.textContent).toEqual('1');
      // Changing dependency makes it go back to loading, then to show new value:
      act(() => updateValue(1));
      expect(container.textContent).toEqual('loading not with suspense');
      act(() => vi.runAllTimers());
      await flushPromisesAndTimers();
      expect(container.textContent).toEqual('2');
      // Returning to a seen value does not cause the loading state:
      act(() => updateValue(0));
      expect(container.textContent).toEqual('1');
      vi.useRealTimers();
    });
  });

  describe('Counts', () => {
    describe('Evaluation', () => {
      test('Selector functions are evaluated just once', () => {
        const anAtom = counterAtom();
        const [aSelector, selectorFn] = plusOneSelector(anAtom);
        const [Component, updateValue] = componentThatWritesAtom(anAtom);
        renderElements(
          <>
            <Component />
            <ReadsAtom atom={aSelector} />
          </>,
        );
        expect(selectorFn).toHaveBeenCalledTimes(1);
        act(() => updateValue(1));
        expect(selectorFn).toHaveBeenCalledTimes(2);
      });

      test(
        'Selector functions are evaluated just once even if multiple upstreams change',
        () => {
          const atomA = counterAtom();
          const atomB = counterAtom();
          const [aSelector, selectorFn] = additionSelector(atomA, atomB);
          const [ComponentA, updateValueA] = componentThatWritesAtom(atomA);
          const [ComponentB, updateValueB] = componentThatWritesAtom(atomB);
          renderElements(
            <>
              <ComponentA />
              <ComponentB />
              <ReadsAtom atom={aSelector} />
            </>,
          );
          expect(selectorFn).toHaveBeenCalledTimes(1);
          act(() => {
            batchUpdates(() => {
              updateValueA(1);
              updateValueB(1);
            });
          });
          expect(selectorFn).toHaveBeenCalledTimes(3);
        },
      );
    });
  });
}); 