/**
 * TypeScript port of test utilities for recoil-relay
 */

import React from 'react';
import {act} from '@testing-library/react';
import {
  atom,
  useRecoilValue,
  useSetRecoilState,
  useResetRecoilState,
  RecoilRoot,
} from 'recoil-next';
import {render} from '@testing-library/react';

// Simple atom for testing
export function stringAtom() {
  return atom<string>({
    key: 'test-string-atom',
    default: 'DEFAULT',
  });
}

// Component that reads an atom
export function ReadsAtom({atom}: {atom: any}) {
  const value = useRecoilValue(atom);
  return React.createElement('div', null, JSON.stringify(value));
}

// Component that reads and writes an atom - returns component, setter and reset function
export function ComponentThatReadsAndWritesAtom(
  atom: any,
): [React.ComponentType, (value: any) => void, () => void] {
  let setValue: any = null;
  let resetValue: any = null;

  const Component = () => {
    const value = useRecoilValue(atom);
    setValue = useSetRecoilState(atom);
    resetValue = useResetRecoilState(atom);

    return <div>{JSON.stringify(value)}</div>;
  };

  const setAtom = (value: any) => {
    if (setValue) {
      setValue(value);
    }
  };

  const resetAtom = () => {
    if (resetValue) {
      resetValue();
    }
  };

  return [Component, setAtom, resetAtom];
}

// Utility to flush promises and timers
export async function flushPromisesAndTimers() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

// Simple render function that wraps with RecoilRoot and Suspense
export function renderElements(elements: React.ReactNode) {
  const div = document.createElement('div');
  const {container} = render(
    React.createElement(
      RecoilRoot,
      null,
      React.createElement(React.Suspense, {fallback: '"loading"'}, elements),
    ),
    {container: div},
  );
  return container;
}
