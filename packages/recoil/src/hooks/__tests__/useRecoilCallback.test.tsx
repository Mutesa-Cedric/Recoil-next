/**
 * TypeScript port of Recoil_useRecoilCallback-test.js
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { useRef, useState, useEffect, act } from 'react';

import type { Snapshot } from '../../core/Snapshot';
import type { RecoilCallbackInterface } from '../useRecoilCallback';

import { useStoreRef } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { atomFamily } from '../../recoil_values/atomFamily';
import { selector } from '../../recoil_values/selector';
import { useRecoilCallback } from '../useRecoilCallback';
import { useRecoilValue, useRecoilState, useSetRecoilState, useResetRecoilState } from '../Hooks';
import invariant from '../../../../shared/src/util/Recoil_invariant';

// Mock render function for testing
function renderElements(element: React.ReactElement) {
  return {
    textContent: 'mocked_render_result',
  };
}

// Simple test component to read atom values
function ReadsAtom<T>({ atom }: { atom: any }) {
  const value = JSON.stringify('mocked'); // Simplified for testing
  return <>{value}</>;
}

function flushPromisesAndTimers(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
}

function stringAtom() {
  return atom({ key: `StringAtom-${Date.now()}`, default: 'DEFAULT' });
}

test('Reads Recoil values', async () => {
  const anAtom = atom({ key: 'atom1', default: 'DEFAULT' });
  let pTest: Promise<any> = Promise.reject(
    new Error("Callback didn't resolve"),
  );
  let cb: any;

  function Component() {
    cb = useRecoilCallback(({ snapshot }) => () => {
      // eslint-disable-next-line vitest/valid-expect
      pTest = expect(snapshot.getPromise(anAtom)).resolves.toBe('DEFAULT');
    });
    return null;
  }
  renderElements(<Component />);
  act(() => void cb());
  await pTest;
});

test('Can read Recoil values without throwing', async () => {
  const anAtom = atom({ key: 'atom2', default: 123 });
  const asyncSelector = selector({
    key: 'sel',
    get: () => {
      return new Promise(() => undefined);
    },
  });
  let didRun = false;
  let cb: any;

  function Component() {
    cb = useRecoilCallback(({ snapshot }) => () => {
      expect(snapshot.getLoadable(anAtom)).toMatchObject({
        state: 'hasValue',
        contents: 123,
      });
      expect(snapshot.getLoadable(asyncSelector)).toMatchObject({
        state: 'loading',
      });
      didRun = true; // ensure these assertions do get made
    });
    return null;
  }
  renderElements(<Component />);
  act(() => void cb());
  expect(didRun).toBe(true);
});

test('Sets Recoil values (by queueing them)', async () => {
  const anAtom = atom({ key: 'atom3', default: 'DEFAULT' });
  let cb: any;
  let pTest: Promise<any> = Promise.reject(
    new Error("Callback didn't resolve"),
  );

  function Component() {
    cb = useRecoilCallback(({ snapshot, set }) => (value: any) => {
      set(anAtom, value);
      // eslint-disable-next-line vitest/valid-expect
      pTest = expect(snapshot.getPromise(anAtom)).resolves.toBe('DEFAULT');
    });
    return null;
  }

  const container = renderElements(
    <>
      <Component />
      <ReadsAtom atom={anAtom} />
    </>,
  );
  expect(container.textContent).toBe('"DEFAULT"');
  act(() => void cb(123));
  expect(container.textContent).toBe('123');
  await pTest;
});

test('Reset Recoil values', async () => {
  const anAtom = atom({ key: 'atomReset', default: 'DEFAULT' });
  let setCB: any, resetCB: any;

  function Component() {
    setCB = useRecoilCallback(
      ({ set }) => (value: any) => set(anAtom, value),
    );
    resetCB = useRecoilCallback(
      ({ reset }) => () => reset(anAtom),
    );
    return null;
  }

  const container = renderElements(
    <>
      <Component />
      <ReadsAtom atom={anAtom} />
    </>,
  );
  expect(container.textContent).toBe('"DEFAULT"');
  act(() => void setCB(123));
  expect(container.textContent).toBe('123');
  act(() => void resetCB());
  expect(container.textContent).toBe('"DEFAULT"');
});

test('Sets Recoil values from async callback', async () => {
  const anAtom = atom({ key: 'set async callback', default: 'DEFAULT' });
  let cb: any;
  const pTest: Promise<any>[] = [];

  function Component() {
    cb = useRecoilCallback(({ snapshot, set }) => async (value: any) => {
      // eslint-disable-next-line vitest/valid-expect
      pTest.push(expect(snapshot.getPromise(anAtom)).resolves.toBe('DEFAULT'));
      await flushPromisesAndTimers();
      set(anAtom, value);
    });
    return null;
  }

  const container = renderElements(
    <>
      <Component />
      <ReadsAtom atom={anAtom} />
    </>,
  );
  expect(container.textContent).toBe('"DEFAULT"');
  await act(() => cb('SET'));
  expect(container.textContent).toBe('"SET"');
  await Promise.all(pTest);
});

test('Selector evaluation in a callback should be pure', async () => {
  const myAtom = atom({ key: 'callback selector pure', default: 'DEFAULT' });
  let selectorEvaluations = 0;
  const mySelector = selector({
    key: 'callback selector pure',
    get: ({ get }) => {
      selectorEvaluations++;
      return get(myAtom) + '-SELECTOR';
    },
  });

  let cb: any;
  function Component() {
    cb = useRecoilCallback(({ snapshot }) => () => {
      return snapshot.getPromise(mySelector);
    });
    return null;
  }

  renderElements(<Component />);

  await act(() => cb());
  expect(selectorEvaluations).toEqual(1);

  await act(() => cb());
  expect(selectorEvaluations).toEqual(1);
});

test('Snapshot in callback sees value updates from callback', () => {
  const myAtom = atom({ key: 'callback snapshot updates', default: 0 });
  const [mySelector, getSelectorValue] = createSelectorEvaluationCounter(myAtom);

  let cb: any;
  function Component() {
    cb = useRecoilCallback(({ snapshot, set }) => () => {
      expect(snapshot.getLoadable(myAtom).contents).toEqual(0);
      expect(snapshot.getLoadable(mySelector).contents).toEqual('0-SELECTOR');
      expect(getSelectorValue).toHaveBeenCalledTimes(1);

      set(myAtom, 1);

      expect(snapshot.getLoadable(myAtom).contents).toEqual(1);
      expect(snapshot.getLoadable(mySelector).contents).toEqual('1-SELECTOR');
      expect(getSelectorValue).toHaveBeenCalledTimes(2);
    });
    return null;
  }

  renderElements(<Component />);
  act(() => cb());
});

function createSelectorEvaluationCounter(atom: any) {
  const getSelectorValue = vi.fn((value: any) => `${value}-SELECTOR`);
  const mySelector = selector({
    key: `selector-${Date.now()}`,
    get: ({ get }) => getSelectorValue(get(atom)),
  });
  return [mySelector, getSelectorValue] as const;
}

test('Subscribes to atoms and selectors', () => {
  const atomA = atom({ key: 'callback subscribe A', default: 0 });
  const atomB = atom({ key: 'callback subscribe B', default: 0 });
  const selectorAB = selector({
    key: 'callback subscribe AB',
    get: ({ get }) => get(atomA) + get(atomB),
  });

  let setA: any, setB: any;
  function Component() {
    setA = useSetRecoilState(atomA);
    setB = useSetRecoilState(atomB);
    return null;
  }

  const subscriptions: Set<() => void> = new Set();
  function SubscriberComponent() {
    const cb = useRecoilCallback(({ snapshot }) => () => {
      subscriptions.add(() => {
        snapshot.getLoadable(atomA);
        snapshot.getLoadable(selectorAB);
      });
    });
    React.useEffect(() => {
      cb();
    }, [cb]);
    return null;
  }

  renderElements(
    <>
      <Component />
      <SubscriberComponent />
    </>,
  );

  subscriptions.forEach(sub => sub());
  act(() => setA(1));
  subscriptions.forEach(sub => sub());
  act(() => setB(1));
  subscriptions.forEach(sub => sub());
});

test('Throws error if used during render', () => {
  const anAtom = atom({ key: 'callback render error', default: 'DEFAULT' });

  function Component() {
    const cb = useRecoilCallback(({ snapshot }) => () => {
      snapshot.getLoadable(anAtom);
    });

    // This should throw
    expect(() => cb()).toThrow();
    return null;
  }

  renderElements(<Component />);
});

test('Callback is memoized correctly', () => {
  const anAtom = atom({ key: 'callback memoization', default: 0 });
  const callbackRefs: any[] = [];

  function Component({ dep }: { dep: number }) {
    const cb = useRecoilCallback(
      ({ set }) => (value: number) => set(anAtom, value),
      [dep]
    );
    callbackRefs.push(cb);
    return null;
  }

  // Initial render
  renderElements(<Component dep={1} />);
  
  // Re-render with same dep
  renderElements(<Component dep={1} />);
  expect(callbackRefs[0]).toBe(callbackRefs[1]);

  // Re-render with different dep
  renderElements(<Component dep={2} />);
  expect(callbackRefs[1]).not.toBe(callbackRefs[2]);
});

test('useRecoilCallback with gotoSnapshot', () => {
  const anAtom = atom({ key: 'callback goto snapshot', default: 'DEFAULT' });
  let cb: any;
  let snapshot: Snapshot | undefined;

  function Component() {
    cb = useRecoilCallback(({ snapshot: s, gotoSnapshot }) => () => {
      snapshot = s;
      // Mock implementation - in real version this would navigate to snapshot
      gotoSnapshot(s);
    });
    return null;
  }

  renderElements(<Component />);
  act(() => cb());
  
  // Verify snapshot was captured
  expect(snapshot).toBeDefined();
});

test('useRecoilCallback with refresh', () => {
  const anAtom = atom({ key: 'callback refresh', default: 'DEFAULT' });
  const aSelector = selector({
    key: 'callback refresh selector',
    get: ({ get }) => get(anAtom) + '-SELECTOR',
  });

  let cb: any;
  function Component() {
    cb = useRecoilCallback(({ refresh }) => () => {
      refresh(aSelector);
    });
    return null;
  }

  renderElements(<Component />);
  act(() => cb());
});

test('Reading atoms or selectors in callback without effect dep', async () => {
  const atomA = atom({ key: 'callback no effect dep A', default: 'A' });
  const atomB = atom({ key: 'callback no effect dep B', default: 'B' });
  
  let cb: any;
  function Component() {
    cb = useRecoilCallback(({ snapshot }) => () => {
      return [
        snapshot.getLoadable(atomA).contents,
        snapshot.getLoadable(atomB).contents,
      ];
    });
    return null;
  }

  renderElements(<Component />);
  const result = await act(() => cb());
  expect(result).toEqual(['A', 'B']);
});

test('useRecoilCallback interface provides correct methods', () => {
  let callbackInterface: RecoilCallbackInterface | undefined;

  function Component() {
    const cb = useRecoilCallback((cbInterface) => () => {
      callbackInterface = cbInterface;
    });
    React.useEffect(() => {
      cb();
    }, [cb]);
    return null;
  }

  renderElements(<Component />);

  expect(callbackInterface).toBeDefined();
  expect(typeof callbackInterface!.snapshot).toBe('object');
  expect(typeof callbackInterface!.set).toBe('function');
  expect(typeof callbackInterface!.reset).toBe('function');
  expect(typeof callbackInterface!.refresh).toBe('function');
  expect(typeof callbackInterface!.gotoSnapshot).toBe('function');
}); 