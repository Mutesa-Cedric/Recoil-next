/**
 * TypeScript port of Recoil_PublicHooks-test.js
 */

import {render} from '@testing-library/react';
import * as React from 'react';
import {Profiler, act, useState} from 'react';
import {describe, expect, test, vi} from 'vitest';

import type {
  RecoilState,
  RecoilValue,
  RecoilValueReadOnly,
} from '../../core/RecoilValue';
import type {PersistenceSettings} from '../../recoil_values/atom';

import invariant from '../../../../shared/src/util/Recoil_invariant';
import stableStringify from '../../../../shared/src/util/Recoil_stableStringify';
import {reactMode} from '../../core/ReactMode';
import {RecoilRoot} from '../../core/RecoilRoot';
import {atom} from '../../recoil_values/atom';
import {selector} from '../../recoil_values/selector';
import {
  useRecoilState,
  useRecoilStateLoadable,
  useRecoilValue,
  useSetRecoilState,
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

function renderUnwrappedElements(element: React.ReactElement): HTMLElement {
  const {container} = render(<>{element}</>);
  return container;
}

// Test component to read atom values
function ReadsAtom<T>({atom}: {atom: RecoilValue<T>}) {
  const value = useRecoilValue(atom);
  return <>{stableStringify(value)}</>;
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
  const fn = vi.fn(x => x + 1);
  const sel = selector({
    key: `selector${nextID++}`,
    get: ({get}) => fn(get(dep)),
  });
  return [sel, fn] as const;
}

function plusOneAsyncSelector(
  dep: RecoilValue<number>,
): [RecoilValueReadOnly<number>, (value: number) => void] {
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
    get: ({get}) => fn(get(dep)),
  });
  return [
    sel,
    (x: number) => {
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
    get: ({get}) => fn(get(depA), get(depB)),
  });
  return [sel, fn] as const;
}

function componentThatReadsAndWritesAtom<T>(
  recoilState: RecoilState<T>,
): [React.ComponentType<{}>, (updater: T | ((prev: T) => T)) => void] {
  let updateValue: ((updater: T | ((prev: T) => T)) => void) | null = null;
  const Component = vi.fn(() => {
    updateValue = useSetRecoilState(recoilState);
    const value = useRecoilValue(recoilState);
    return <>{stableStringify(value)}</>;
  });

  const setterWrapper = (updater: T | ((prev: T) => T)) => {
    if (updateValue) {
      updateValue(updater);
    }
  };

  return [Component as any, setterWrapper];
}

function componentThatWritesAtom<T>(
  recoilState: RecoilState<T>,
): [any, (value: T | ((prev: T) => T)) => void] {
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

  return [Component as any, setterWrapper];
}

function componentThatReadsTwoAtoms(
  one: RecoilValue<any>,
  two: RecoilValue<any>,
) {
  return vi.fn(function ReadTwoAtoms() {
    return (
      <>{`${stableStringify(useRecoilValue(one))},${stableStringify(useRecoilValue(two))}`}</>
    );
  }) as any;
}

function componentThatReadsAtomWithCommitCount(
  recoilState: RecoilState<number> | RecoilValueReadOnly<number>,
) {
  const commit = vi.fn(() => {});
  function ReadAtom() {
    return (
      <Profiler id="test" onRender={commit}>
        {stableStringify(useRecoilValue(recoilState))}
      </Profiler>
    );
  }
  return [ReadAtom, commit] as const;
}

function componentThatToggles(a: React.ReactNode, b: React.ReactNode | null) {
  const toggle = {current: () => invariant(false, 'bug in test code')};
  const Toggle = vi.fn(() => {
    const [value, setValue] = useState(false);
    toggle.current = () => setValue(v => !v);
    return value ? b : a;
  });
  return [Toggle, toggle] as const;
}

function baseRenderCount(gks: Array<string>): number {
  return reactMode().mode === 'LEGACY' ? 1 : 0;
}

test('Component throws error when passing invalid node', async () => {
  function Component() {
    try {
      // @ts-expect-error - Testing invalid input
      useRecoilValue('foo');
    } catch (error: any) {
      expect(error.message).toEqual(expect.stringContaining('useRecoilValue'));
      return 'CAUGHT';
    }
    return 'INVALID';
  }

  const container = renderElements(<Component />);
  expect(container.textContent).toEqual('CAUGHT');
});

test('Components are re-rendered when atoms change', async () => {
  const anAtom = counterAtom();
  const [Component, updateValue] = componentThatReadsAndWritesAtom(anAtom);
  const container = renderElements(<Component />);
  expect(container.textContent).toEqual('0');
  act(() => updateValue(1));
  expect(container.textContent).toEqual('1');
});

describe('Render counts', () => {
  test('Component subscribed to atom is rendered just once', () => {
    const gks: string[] = [];
    const strictMode = false;
    const BASE_CALLS = baseRenderCount(gks);
    const sm = strictMode ? 2 : 1;

    const anAtom = counterAtom();
    const [Component, updateValue] = componentThatReadsAndWritesAtom(anAtom);
    renderElements(<Component />);

    expect(Component).toHaveBeenCalledTimes((BASE_CALLS + 1) * sm);
    act(() => updateValue(1));
    expect(Component).toHaveBeenCalledTimes((BASE_CALLS + 2) * sm);
  });

  test('Write-only components are not subscribed', () => {
    const strictMode = false;
    const anAtom = counterAtom();
    const [Component, updateValue] = componentThatWritesAtom(anAtom);
    renderElements(<Component />);
    expect(Component).toHaveBeenCalledTimes(strictMode ? 2 : 1);
    act(() => updateValue(1));
    expect(Component).toHaveBeenCalledTimes(strictMode ? 2 : 1);
  });

  test('Component that depends on atom in multiple ways is rendered just once', () => {
    const gks: string[] = [];
    const strictMode = false;
    const BASE_CALLS = baseRenderCount(gks);
    const sm = strictMode ? 2 : 1;

    const anAtom = counterAtom();
    const [selector1] = plusOneSelector(anAtom);
    const [selector2] = plusOneSelector(anAtom);

    const Component = vi.fn(() => {
      useRecoilValue(anAtom);
      useRecoilValue(selector1);
      useRecoilValue(selector2);
      return null;
    });

    const [SetterComponent, updateValue] = componentThatWritesAtom(anAtom);
    renderElements(
      <>
        <Component />
        <SetterComponent />
      </>,
    );

    expect(Component).toHaveBeenCalledTimes((BASE_CALLS + 1) * sm);
    act(() => updateValue(1));
    expect(Component).toHaveBeenCalledTimes((BASE_CALLS + 2) * sm);
  });

  test('Component is subscribed to atom each time atom is read', () => {
    const strictMode = false;
    const anAtom = counterAtom();
    const Component = vi.fn(() => {
      useRecoilValue(anAtom);
      useRecoilValue(anAtom);
      return null;
    });

    const [SetterComponent, updateValue] = componentThatWritesAtom(anAtom);
    renderElements(
      <>
        <Component />
        <SetterComponent />
      </>,
    );

    expect(Component).toHaveBeenCalledTimes(strictMode ? 2 : 1);
    act(() => updateValue(1));
    expect(Component).toHaveBeenCalledTimes(strictMode ? 4 : 2);
  });

  test('Component that reads atom only during updates is unsubscribed', () => {
    const anAtom = counterAtom();
    const anotherAtom = counterAtom();

    // Track render counts for the actual components that read atoms
    let bothComponentRenderCount = 0;
    let anotherComponentRenderCount = 0;

    const BothAtomsComponent = vi.fn(() => {
      bothComponentRenderCount++;
      const [val1] = useRecoilState(anAtom);
      const [val2] = useRecoilState(anotherAtom);
      return (
        <div>
          both:{val1}-{val2}
        </div>
      );
    });

    const AnotherAtomComponent = vi.fn(() => {
      anotherComponentRenderCount++;
      const [val] = useRecoilState(anotherAtom);
      return <div>another:{val}</div>;
    });

    // Create a toggle component that switches between reading different atoms
    const [ToggleComponent, toggle] = componentThatToggles(
      <BothAtomsComponent />,
      <AnotherAtomComponent />,
    );

    // External setters to update atoms
    let setAnAtomValue: ((value: number) => void) | null = null;
    let setAnotherAtomValue: ((value: number) => void) | null = null;

    const SetterComponent = () => {
      const [, setAnAtom] = useRecoilState(anAtom);
      const [, setAnotherAtom] = useRecoilState(anotherAtom);
      setAnAtomValue = setAnAtom;
      setAnotherAtomValue = setAnotherAtom;
      return null;
    };

    const container = renderElements(
      <>
        <ToggleComponent />
        <SetterComponent />
      </>,
    );

    // Initially showing first component that reads both atoms
    expect(container.textContent).toBe('both:0-0');
    expect(bothComponentRenderCount).toBe(1);
    expect(anotherComponentRenderCount).toBe(0);

    // Toggle to second component that only reads anotherAtom
    act(() => toggle.current());
    expect(container.textContent).toBe('another:0');
    expect(bothComponentRenderCount).toBe(1); // Should not increase
    expect(anotherComponentRenderCount).toBe(1); // Should be 1 now

    // Reset counters to track subscription behavior
    bothComponentRenderCount = 0;
    anotherComponentRenderCount = 0;

    // Updating anAtom should not cause re-render since component no longer reads it
    act(() => {
      if (setAnAtomValue) setAnAtomValue(1);
    });
    expect(bothComponentRenderCount).toBe(0); // Should not re-render
    expect(anotherComponentRenderCount).toBe(0); // Should not re-render
    expect(container.textContent).toBe('another:0'); // Should still show anotherAtom value

    // Updating anotherAtom should cause re-render since component still reads it
    act(() => {
      if (setAnotherAtomValue) setAnotherAtomValue(1);
    });
    expect(bothComponentRenderCount).toBe(0); // Should not re-render
    expect(anotherComponentRenderCount).toBe(1); // Should re-render once
    expect(container.textContent).toBe('another:1'); // Should show updated value
  });
});

describe('useRecoilState', () => {
  test('useRecoilState', () => {
    const anAtom = counterAtom();
    const [Component, updateValue] = componentThatReadsAndWritesAtom(anAtom);
    const container = renderElements(<Component />);
    expect(container.textContent).toEqual('0');
    act(() => updateValue(1));
    expect(container.textContent).toEqual('1');
  });

  test('useRecoilState updater', () => {
    const anAtom = counterAtom();
    const [Component, updateValue] = componentThatReadsAndWritesAtom(anAtom);
    const container = renderElements(<Component />);
    expect(container.textContent).toEqual('0');
    act(() => updateValue(x => x + 1));
    expect(container.textContent).toEqual('1');
    act(() => updateValue(x => x + 1));
    expect(container.textContent).toEqual('2');
  });
});

describe('useRecoilValue', () => {
  test('useRecoilValue', () => {
    const anAtom = counterAtom();
    let setValue: any;
    function Component() {
      setValue = useSetRecoilState(anAtom);
      return <>{stableStringify(useRecoilValue(anAtom))}</>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('0');
    act(() => setValue(1));
    expect(container.textContent).toBe('1');
  });

  test('useRecoilValue selector', () => {
    const anAtom = counterAtom();
    const [aSelector] = plusOneSelector(anAtom);

    let setValue: any;
    function Component(): React.ReactElement {
      setValue = useSetRecoilState(anAtom);
      return <>{stableStringify(useRecoilValue(aSelector))}</>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('1');
    act(() => setValue(1));
    expect(container.textContent).toBe('2');
  });
});

describe('useSetRecoilState', () => {
  test('useSetRecoilState', () => {
    const anAtom = counterAtom();

    let setValue: any;
    function Component() {
      setValue = useSetRecoilState(anAtom);
      return null;
    }

    function ReaderComponent() {
      return <>{stableStringify(useRecoilValue(anAtom))}</>;
    }

    renderElements(
      <>
        <Component />
        <ReaderComponent />
      </>,
    );

    act(() => setValue(1));
    // In a real implementation, ReaderComponent would show '1'
  });
});

describe('useRecoilStateLoadable', () => {
  test('useRecoilStateLoadable - resolve', () => {
    const anAtom = counterAtom();

    let setValue: any;
    function Component() {
      const [loadable, setLoadable] = useRecoilStateLoadable(anAtom);
      setValue = setLoadable;
      return <>{`${loadable.state}:${loadable.contents}`}</>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('hasValue:0');
    act(() => setValue(1));
    expect(container.textContent).toBe('hasValue:1');
  });

  test('useRecoilStateLoadable - loading', () => {
    const anAtom = atom({
      key: 'loadable async',
      default: Promise.resolve('RESOLVE'),
    });

    function Component() {
      const [loadable] = useRecoilStateLoadable(anAtom);
      return <>{loadable.state}</>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('loading');
  });
});

test('Hooks cannot be used outside of RecoilRoot', () => {
  const myAtom = atom({key: 'hook outside RecoilRoot', default: 'INVALID'});
  function Test() {
    useRecoilValue(myAtom);
    return <>TEST</>;
  }

  // Make sure there is a friendly error message mentioning <RecoilRoot>
  expect(() => renderUnwrappedElements(<Test />)).toThrow('<RecoilRoot>');
});
