/**
 * TypeScript port of Recoil_useTransition-test.js
 */

import {render} from '@testing-library/react';
import * as React from 'react';
import {useTransition} from 'react';
import {expect, test} from 'vitest';

import {reactMode} from '../../core/ReactMode';
import {RecoilRoot} from '../../core/RecoilRoot';
import {atom} from '../../recoil_values/atom';
import {selectorFamily} from '../../recoil_values/selectorFamily';
import {
  useRecoilState_TRANSITION_SUPPORT_UNSTABLE,
  useRecoilValue_TRANSITION_SUPPORT_UNSTABLE,
} from '../Hooks';

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

function flushPromisesAndTimers(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
}

let nextID = 0;

test('Works with useTransition', async () => {
  if (!reactMode().concurrent) {
    return;
  }

  const indexAtom = atom({
    key: `index${nextID++}`,
    default: 0,
  });

  // Basic implementation of a cache that suspends:
  const cache = new Map<
    number,
    | {promise: null; state: string; value: string}
    | {promise: Promise<void>; state: string; value: null}
  >();
  const resolvers: Array<() => void> = [];
  function getItem(index: number) {
    if (cache.has(index) && cache.get(index)?.state === 'ready') {
      return cache.get(index)?.value;
    } else if (cache.has(index)) {
      throw cache.get(index)?.promise;
    } else {
      const promise = new Promise<void>(resolve => {
        const onComplete = () => {
          cache.set(index, {
            state: 'ready',
            value: `v${index}`,
            promise: null,
          });
          resolve();
        };
        resolvers.push(onComplete);
      });
      const newEntry = {
        state: 'loading',
        value: null,
        promise,
      };
      cache.set(index, newEntry);
      throw promise;
    }
  }

  function ItemContents({index}: {index: number}) {
    const item = getItem(index);
    return <div>{item}</div>;
  }

  function Item({index}: {index: number}) {
    const [isPending, startTransition] = useTransition();
    const currentIndex = useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(indexAtom);

    if (index !== currentIndex) {
      return (
        <div>
          <button
            onClick={() => {
              startTransition(() => {
                // This should be wrapped in a transition
              });
            }}>
            Switch to {index}
          </button>
          {isPending && <div>Loading...</div>}
        </div>
      );
    }

    return (
      <div>
        <ItemContents index={index} />
        {isPending && <div>Loading...</div>}
      </div>
    );
  }

  function resolveSelectors() {
    const resolver = resolvers.shift();
    if (resolver) {
      resolver();
    }
  }

  function Component({index}: {index: number}) {
    return <Item index={index} />;
  }

  function Main() {
    const [index, setIndex] =
      useRecoilState_TRANSITION_SUPPORT_UNSTABLE(indexAtom);
    const [isPending, startTransition] = useTransition();

    return (
      <div>
        <button
          onClick={() => {
            startTransition(() => {
              setIndex(1);
            });
          }}>
          Switch to 1
        </button>
        <button
          onClick={() => {
            startTransition(() => {
              setIndex(2);
            });
          }}>
          Switch to 2
        </button>
        <Component index={index} />
        {isPending && <div>Main Loading...</div>}
      </div>
    );
  }

  const c = renderElements(<Main />);

  expect(c.textContent).toContain('Switch to 1');
  expect(c.textContent).toContain('Switch to 2');
  expect(c.textContent).toContain('v0');

  // Click to switch to index 1
  c.querySelector('button')?.click();

  // Should show loading state
  expect(c.textContent).toContain('Main Loading...');

  // Resolve the selector
  resolveSelectors();

  await flushPromisesAndTimers();

  expect(c.textContent).toContain('v1');
  expect(c.textContent).not.toContain('Main Loading...');

  // Test with selector family
  const selectorFamilyInstance = selectorFamily({
    key: `selectorFamily${nextID++}`,
    get:
      (index: number) =>
      ({get}: {get: any}) => {
        const baseValue = get(indexAtom);
        return getItem(index + baseValue);
      },
  });

  function SelectorFamilyComponent({index}: {index: number}) {
    const value = useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(
      selectorFamilyInstance(index),
    );
    return <div>{value}</div>;
  }

  function Main2() {
    const [index, setIndex] =
      useRecoilState_TRANSITION_SUPPORT_UNSTABLE(indexAtom);
    const [isPending, startTransition] = useTransition();

    return (
      <div>
        <button
          onClick={() => {
            startTransition(() => {
              setIndex(1);
            });
          }}>
          Switch to 1
        </button>
        <SelectorFamilyComponent index={index} />
        {isPending && <div>Main Loading...</div>}
      </div>
    );
  }

  const c2 = renderElements(<Main2 />);

  expect(c2.textContent).toContain('v0');

  c2.querySelector('button')?.click();

  expect(c2.textContent).toContain('Main Loading...');

  resolveSelectors();

  await flushPromisesAndTimers();

  expect(c2.textContent).toContain('v1');
  expect(c2.textContent).not.toContain('Main Loading...');
});
