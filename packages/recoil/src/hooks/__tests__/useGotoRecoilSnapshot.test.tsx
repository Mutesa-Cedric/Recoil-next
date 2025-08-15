/**
 * TypeScript port of Recoil_useGotoRecoilSnapshot-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { act, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { RecoilRoot } from '../../core/RecoilRoot';
import { freshSnapshot } from '../../core/Snapshot';
import { useRecoilValue } from '../../hooks/Hooks';
import { useGotoRecoilSnapshot } from '../../hooks/SnapshotHooks';
import { useRecoilCallback } from '../../hooks/useRecoilCallback';
import { atom } from '../../recoil_values/atom';
import { constSelector } from '../../recoil_values/constSelector';
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

// Test component to read atom values
function ReadsAtom<T>({ atom }: { atom: any }) {
  const value = useRecoilValue(atom);
  return <>{JSON.stringify(value)}</>;
}

// Test component that reads and writes atom values
function componentThatReadsAndWritesAtom<T>(
  recoilState: any,
): [React.ComponentType<{}>, (updater: T | ((prev: T) => T)) => void] {
  let setValue: ((updater: T | ((prev: T) => T)) => void) | null = null;
  
  const Component = () => {
    const [value, setVal] = useRecoilState(recoilState);
    setValue = setVal;
    return <>{JSON.stringify(value)}</>;
  };
  
  const setter = (updater: T | ((prev: T) => T)) => {
    if (setValue) {
      setValue(updater);
    }
  };
  
  return [Component, setter];
}

// Import useRecoilState
import { useRecoilState } from '../Hooks';

// Helper function to flush promises and timers
async function flushPromisesAndTimers() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

// Helper function to flush promises and timers with fake timers
async function flushPromisesAndTimersWithFakeTimers() {
  await new Promise(resolve => {
    setImmediate(resolve);
  });
}

// Async selector helper
function asyncSelector<T, S>(): [any, (value: T) => void] {
  let resolve: (value: T) => void = () => {};
  const sel = selector({
    key: `asyncSelector${Math.random()}`,
    get: () => new Promise<T>(res => {
      resolve = res;
    }),
  });
  return [sel, resolve];
}

describe('useGotoRecoilSnapshot', () => {
  test('Goto mapped snapshot', async () => {
    const snapshot = freshSnapshot();
    snapshot.retain();

    const myAtom = atom({
      key: `Goto Snapshot Atom ${Math.random()}`,
      default: 'DEFAULT',
    });
    const [ReadsAndWritesAtom, setAtom] = componentThatReadsAndWritesAtom(myAtom);

    const mySelector = constSelector(myAtom);

    const updatedSnapshot = snapshot.map(({set}) => {
      set(myAtom, 'SET IN SNAPSHOT');
    });
    updatedSnapshot.retain();

    let gotoRecoilSnapshot: any;
    function GotoRecoilSnapshot() {
      gotoRecoilSnapshot = useGotoRecoilSnapshot();
      return null;
    }

    const c = renderElements(
      <>
        <ReadsAndWritesAtom />
        <ReadsAtom atom={mySelector} />
        <GotoRecoilSnapshot />
      </>,
    );

    expect(c.textContent).toEqual('"DEFAULT""DEFAULT"');

    act(() => setAtom('SET IN CURRENT'));
    expect(c.textContent).toEqual('"SET IN CURRENT""SET IN CURRENT"');

    await expect(updatedSnapshot.getPromise(myAtom)).resolves.toEqual(
      'SET IN SNAPSHOT',
    );

    act(() => gotoRecoilSnapshot(updatedSnapshot));
    expect(c.textContent).toEqual('"SET IN SNAPSHOT""SET IN SNAPSHOT"');

    act(() => setAtom('SET AGAIN IN CURRENT'));
    expect(c.textContent).toEqual('"SET AGAIN IN CURRENT""SET AGAIN IN CURRENT"');

    // Test that atoms set after snapshot were created are reset
    act(() => gotoRecoilSnapshot(snapshot));
    expect(c.textContent).toEqual('"DEFAULT""DEFAULT"');
  });

  test('Goto callback snapshot', () => {
    const myAtom = atom({
      key: `Goto Snapshot From Callback ${Math.random()}`,
      default: 'DEFAULT',
    });
    const [ReadsAndWritesAtom, setAtom] = componentThatReadsAndWritesAtom(myAtom);

    const mySelector = constSelector(myAtom);

    let cb: any;
    function RecoilCallback() {
      const gotoSnapshot = useGotoRecoilSnapshot();
      cb = useRecoilCallback(({snapshot}) => () => {
        const updatedSnapshot = snapshot.map(({set}) => {
          set(myAtom, 'SET IN SNAPSHOT');
        });
        gotoSnapshot(updatedSnapshot);
      });
      return null;
    }

    const c = renderElements(
      <>
        <ReadsAndWritesAtom />
        <ReadsAtom atom={mySelector} />
        <RecoilCallback />
      </>,
    );

    expect(c.textContent).toEqual('"DEFAULT""DEFAULT"');

    act(() => setAtom('SET IN CURRENT'));
    expect(c.textContent).toEqual('"SET IN CURRENT""SET IN CURRENT"');

    act(cb);
    expect(c.textContent).toEqual('"SET IN SNAPSHOT""SET IN SNAPSHOT"');
  });

  test('Goto snapshot with dependent async selector', async () => {
    const snapshot = freshSnapshot();
    snapshot.retain();

    const myAtom = atom({
      key: `atom for dep async snapshot ${Math.random()}`,
      default: 'DEFAULT',
    });
    const [ReadsAndWritesAtom, setAtom] = componentThatReadsAndWritesAtom(myAtom);
    const mySelector = selector({
      key: `selector for async snapshot ${Math.random()}`,
      get: async ({get}) => {
        const dep = get(myAtom);
        // Add a very short delay to make it properly async
        await new Promise(resolve => setTimeout(resolve, 0));
        return dep;
      },
    });

    const updatedSnapshot = snapshot.map(({set}) => {
      set(myAtom, 'SET IN SNAPSHOT');
    });
    updatedSnapshot.retain();

    let gotoRecoilSnapshot: any;
    function GotoRecoilSnapshot() {
      gotoRecoilSnapshot = useGotoRecoilSnapshot();
      return null;
    }

    const c = renderElements(
      <>
        <ReadsAndWritesAtom />
        <ReadsAtom atom={mySelector} />
        <GotoRecoilSnapshot />
      </>,
    );

    expect(c.textContent).toEqual('loading');
    
    // Wait for async selector to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(c.textContent).toEqual('"DEFAULT""DEFAULT"');

    act(() => setAtom('SET IN CURRENT'));

    // Wait for async selector to resolve with new value
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(c.textContent).toEqual('"SET IN CURRENT""SET IN CURRENT"');

    await expect(updatedSnapshot.getPromise(myAtom)).resolves.toEqual(
      'SET IN SNAPSHOT',
    );
    
    act(() => gotoRecoilSnapshot(updatedSnapshot));
    
    // Wait for async selector to resolve after snapshot change
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(c.textContent).toEqual('"SET IN SNAPSHOT""SET IN SNAPSHOT"');
  });

  test('Goto snapshot with async selector', async () => {
    const snapshot = freshSnapshot();
    snapshot.retain();

    let resolveSelector: (value: string) => void = () => {};
    const mySelector = selector({
      key: `async test selector ${Math.random()}`,
      get: () => new Promise<string>(resolve => {
        resolveSelector = resolve;
      }),
    });

    let gotoRecoilSnapshot: any;
    function GotoRecoilSnapshot() {
      gotoRecoilSnapshot = useGotoRecoilSnapshot();
      return null;
    }

    const c = renderElements(
      <>
        <ReadsAtom atom={mySelector} />
        <GotoRecoilSnapshot />
      </>,
    );

    expect(c.textContent).toEqual('loading');

    // Resolve the selector manually
    resolveSelector('RESOLVE');
    
    // Wait for the selector to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(c.textContent).toEqual('"RESOLVE"');

    act(() => gotoRecoilSnapshot(snapshot));
    expect(c.textContent).toEqual('"RESOLVE"');
  });

  // Test that going to a snapshot where an atom was not yet initialized will
  // not cause the atom to be re-initialized when used again.
  test('Effects going to previous snapshot', () => {
    const sm = 1; // Simplified for now

    let init = 0;
    const myAtom = atom({
      key: `gotoSnapshot effect ${Math.random()}`,
      default: 'DEFAULT',
      effects: [
        () => {
          init++;
        },
      ],
    });

    let forceUpdate: any;
    function ReadAtom() {
      const [, setValue] = useState({});
      forceUpdate = () => setValue({});
      return useRecoilValue(myAtom);
    }

    let gotoRecoilSnapshot: any;
    function GotoRecoilSnapshot() {
      gotoRecoilSnapshot = useGotoRecoilSnapshot();
      return null;
    }

    expect(init).toEqual(0);

    renderElements(
      <>
        <ReadAtom />
        <GotoRecoilSnapshot />
      </>,
    );

    expect(init).toEqual(1 * sm);
    act(forceUpdate);
    expect(init).toEqual(1 * sm);

    act(() => gotoRecoilSnapshot?.(freshSnapshot()));
    expect(init).toEqual(1 * sm);
    act(forceUpdate);
    expect(init).toEqual(1 * sm);

    act(forceUpdate);
    expect(init).toEqual(1 * sm);
  });
}); 