/**
 * TypeScript port of Recoil_Retention-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { act, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { RecoilState } from '../../core/RecoilValue';
import type { RetentionZone } from '../RetentionZone';
import { retentionZone } from '../RetentionZone';

import { useRecoilState, useRecoilValue, useRecoilValueLoadable } from '../../hooks/Hooks';
import { useRecoilCallback } from '../../hooks/useRecoilCallback';
import useRetain from '../../hooks/useRetain';
import { atom } from '../../recoil_values/atom';
import { selector } from '../../recoil_values/selector';
import { RecoilRoot } from '../RecoilRoot';

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

// Using the real retentionZone function from the core module

// Mock gkx for testing
const gkx = {
  'recoil_memory_managament_2020': true,
  setPass: vi.fn(),
  setFail: vi.fn(),
};

let nextKey = 0;
function atomRetainedBy(
  retainedBy:
    | undefined
    | RetentionZone
    | 'components'
    | Array<RetentionZone>,
) {
  return atom({
    key: `retention/${nextKey++}`,
    default: 0,
    retainedBy_UNSTABLE: retainedBy,
  });
}

function switchComponent(defaultVisible: boolean): [React.ComponentType<{ children: React.ReactNode }>, (visible: boolean) => void] {
  let innerSetVisible: (value: boolean) => void = (_: boolean) => undefined;
  const setVisible = (v: boolean) => innerSetVisible(v); // acts like a ref basically
  function Switch({ children }: { children: React.ReactNode }) {
    const [visible, setVisibleState] = useState(defaultVisible);
    innerSetVisible = setVisibleState;
    return visible ? children : null;
  }
  return [Switch, setVisible];
}

// Mounts a component that reads the given atom, sets its value, then unmounts it
// and re-mounts it again. Checks whether the value of the atom that was written
// is still observed. If otherChildren is provided, it will be mounted throughout this,
// then at the end it will be unmounted and the atom expected to be released.
function testWhetherAtomIsRetained(
  shouldBeRetained: boolean,
  node: RecoilState<number>,
  otherChildren: React.ReactNode = null,
): void {
  const [AtomSwitch, setAtomVisible] = switchComponent(false);
  const [OtherChildrenSwitch, setOtherChildrenVisible] = switchComponent(false);
  const [ReadsAtomComp, updateAtom] = componentThatReadsAndWritesAtom(node);

  const container = renderElements(
    <>
      <AtomSwitch>
        <ReadsAtomComp />
      </AtomSwitch>
      <OtherChildrenSwitch>{otherChildren}</OtherChildrenSwitch>
    </>,
  );

  expect(container.textContent).toEqual('');
  act(() => {
    setAtomVisible(true);
    setOtherChildrenVisible(true);
  });
  expect(container.textContent).toEqual('0');
  act(() => updateAtom(1));
  expect(container.textContent).toEqual('1');
  act(() => setAtomVisible(false));
  expect(container.textContent).toEqual('');
  act(() => setAtomVisible(true));
  if (shouldBeRetained) {
    expect(container.textContent).toEqual('1');
  } else {
    expect(container.textContent).toEqual('0');
  }

  if (otherChildren) {
    act(() => {
      setAtomVisible(false);
      setOtherChildrenVisible(false);
    });
    expect(container.textContent).toEqual('');
    act(() => setAtomVisible(true));
    expect(container.textContent).toEqual('0'); // Not expected for root-retained but this doesn't occur in these tests
  }
}

// Mock component that reads and writes atom
function componentThatReadsAndWritesAtom(
  recoilState: RecoilState<any>,
): [React.ComponentType<{}>, ((updater: any | ((prev: any) => any)) => void)] {
  let innerUpdateValue: ((updater: any | ((prev: any) => any)) => void) = () => undefined;
  const updateValue = (updater: any | ((prev: any) => any)) => innerUpdateValue(updater);
  
  const Component = vi.fn(() => {
    const [value, setValue] = useRecoilState(recoilState);
    innerUpdateValue = setValue;
    return <>{value}</>;
  });
  return [Component, updateValue];
}

describe('Default retention', () => {
  test('By default, atoms are retained for the lifetime of the root', () => {
    testWhetherAtomIsRetained(true, atomRetainedBy(undefined));
  });
});

describe('Component-level retention', () => {
  test('With retainedBy: components, atoms are released when not in use', () => {
    testWhetherAtomIsRetained(false, atomRetainedBy('components'));
  });

  test('An atom is retained by a component being subscribed to it', () => {
    const anAtom = atomRetainedBy('components');
    function Subscribes() {
      useRecoilValue(anAtom);
      return null;
    }
    testWhetherAtomIsRetained(true, anAtom, <Subscribes />);
  });

  test('An atom is retained by a component retaining it explicitly', () => {
    const anAtom = atomRetainedBy('components');
    function Retains() {
      useRetain(anAtom);
      return null;
    }
    testWhetherAtomIsRetained(true, anAtom, <Retains />);
  });
});

describe('RetentionZone retention', () => {
  test('An atom can be retained via a retention zone', () => {
    const zone = retentionZone();
    const anAtom = atomRetainedBy(zone);
    function RetainsZone() {
      useRetain(zone);
      return null;
    }
    testWhetherAtomIsRetained(true, anAtom, <RetainsZone />);
  });
});

describe('Retention of and via selectors', () => {
  test('An atom is retained when a depending selector is retained', () => {
    const anAtom = atomRetainedBy('components');
    const aSelector = selector({
      key: '...',
      retainedBy_UNSTABLE: 'components',
      get: ({ get }) => {
        return get(anAtom);
      },
    });
    function SubscribesToSelector() {
      useRecoilValue(aSelector);
      return null;
    }
    testWhetherAtomIsRetained(true, anAtom, <SubscribesToSelector />);
  });

  const flushPromises = async () =>
    await act(() => new Promise(window.setImmediate));

  test('An async selector is not released when its only subscribed component suspends', async () => {
    let resolve: any;
    let evalCount = 0;
    const anAtom = atomRetainedBy('components');
    const aSelector = selector({
      key: '......',
      retainedBy_UNSTABLE: 'components',
      get: ({ get }) => {
        evalCount++;
        get(anAtom);
        return new Promise(r => {
          resolve = r;
        });
      },
    });
    function SubscribesToSelector(): React.ReactElement {
      return <>{useRecoilValue(aSelector) as React.ReactNode}</>;
    }
    const c = renderElements(<SubscribesToSelector />);
    expect(c.textContent).toEqual('loading');
    expect(evalCount).toBe(1);
    act(() => resolve(123));
    // We need to let the selector promise resolve but NOT flush timeouts because
    // we do release after suspending after a timeout and we don't want that
    // to happen because we're testing what happens when it doesn't.
    await flushPromises();
    await flushPromises();
    expect(c.textContent).toEqual('123');
    expect(evalCount).toBe(1); // Still in cache, hence wasn't released.
  });

  test('An async selector ignores promises that settle after it is released', async () => {
    let resolve: any;
    let evalCount = 0;
    const anAtom = atomRetainedBy('components');
    const aSelector = selector({
      key: 'retention/asyncSettlesAfterRelease',
      retainedBy_UNSTABLE: 'components',
      get: ({ get }) => {
        evalCount++;
        get(anAtom);
        return new Promise(r => {
          resolve = r;
        });
      },
    });
    function SubscribesToSelector(): React.ReactElement {
      // Test without using Suspense to avoid complications with Jest promises
      // and timeouts when using Suspense. This doesn't affect what's under test.
      const l = useRecoilValueLoadable(aSelector);
      return <>{l.state === 'loading' ? 'loading' : (l.getValue() as React.ReactNode)}</>;
    }
    const [Switch, setMounted] = switchComponent(true);

    const c = renderElements(
      <Switch>
        <SubscribesToSelector />
      </Switch>,
    );
    expect(c.textContent).toEqual('loading');
    expect(evalCount).toBe(1);
    act(() => setMounted(false)); // release selector while promise is in flight
    act(() => resolve(123));
    await flushPromises();
    act(() => setMounted(true));
    expect(evalCount).toBe(2); // selector must be re-evaluated because the resolved value is not in cache
    expect(c.textContent).toEqual('loading');
    act(() => resolve(123));
    await flushPromises();
    expect(c.textContent).toEqual('123');
  });

  test('Selector changing deps releases old deps, retains new ones', () => {
    const switchAtom = atom({
      key: 'switch',
      default: false,
    });
    const depA = atomRetainedBy('components');
    const depB = atomRetainedBy('components');
    const theSelector = selector({
      key: 'sel',
      get: ({ get }) => {
        if (get(switchAtom)) {
          return get(depB);
        } else {
          return get(depA);
        }
      },
      retainedBy_UNSTABLE: 'components',
    });

    let setup: any;
    function Setup() {
      setup = useRecoilCallback(({ set }) => () => {
        set(depA, 123);
        set(depB, 456);
      });
      return null;
    }

    function ReadsSelector() {
      useRecoilValue(theSelector);
      return null;
    }

    let depAValue: any;
    function ReadsDepA() {
      depAValue = useRecoilValue(depA);
      return null;
    }

    let depBValue: any;
    function ReadsDepB() {
      depBValue = useRecoilValue(depB);
      return null;
    }

    const [MountSwitch, setAtomsMountedDirectly] = switchComponent(true);

    function unmountAndRemount() {
      act(() => setAtomsMountedDirectly(false));
      act(() => setAtomsMountedDirectly(true));
    }

    const [ReadsSwitch, setDepSwitch] =
      componentThatReadsAndWritesAtom(switchAtom);

    renderElements(
      <>
        <ReadsSelector />
        <ReadsSwitch />
        <MountSwitch>
          <ReadsDepA />
          <ReadsDepB />
        </MountSwitch>
        <Setup />
      </>,
    );

    act(() => {
      setup();
    });
    unmountAndRemount();
    expect(depAValue).toBe(123);
    expect(depBValue).toBe(0);
    act(() => {
      setDepSwitch(true);
    });
    unmountAndRemount();
    expect(depAValue).toBe(0);
    act(() => {
      setup();
    });
    unmountAndRemount();
    expect(depBValue).toBe(456);
  });
});

describe('Retention during a transaction', () => {
  test('Atoms are not released if unmounted and mounted within the same transaction', () => {
    // This test doesn't depend on retention system, so it should work
    const anAtom = atomRetainedBy('components');
    const [ReaderA, setAtom] = componentThatReadsAndWritesAtom(anAtom);
    const [ReaderB] = componentThatReadsAndWritesAtom(anAtom);
    const [SwitchA, setSwitchA] = switchComponent(true);
    const [SwitchB, setSwitchB] = switchComponent(false);

    const container = renderElements(
      <>
        <SwitchA>
          <ReaderA />
        </SwitchA>
        <SwitchB>
          <ReaderB />
        </SwitchB>
      </>,
    );

    act(() => setAtom(123));
    act(() => {
      setSwitchA(false);
      setSwitchB(true);
    });
    expect(container.textContent).toEqual('123');
  });

  test('An atom is released when two zones retaining it are released at the same time', () => {
    const zoneA = retentionZone();
    const zoneB = retentionZone();
    const anAtom = atomRetainedBy([zoneA, zoneB]);
    function RetainsZone({ zone }: { zone: RetentionZone }) {
      useRetain(zone);
      return null;
    }
    // It's the no-longer-retained-when-unmounting-otherChildren part that is
    // important for this test.
    testWhetherAtomIsRetained(
      true,
      anAtom,
      <>
        <RetainsZone zone={zoneA} />
        <RetainsZone zone={zoneB} />
      </>,
    );
  });

  test('An atom is released when both direct-retainer and zone-retainer are released at the same time', () => {
    const zone = retentionZone();
    const anAtom = atomRetainedBy(zone);
    function RetainsZone() {
      useRetain(zone);
      return null;
    }
    function RetainsAtom() {
      useRetain(anAtom);
      return null;
    }
    // It's the no-longer-retained-when-unmounting-otherChildren part that is
    // important for this test.
    testWhetherAtomIsRetained(
      true,
      anAtom,
      <>
        <RetainsZone />
        <RetainsAtom />
      </>,
    );
  });
}); 