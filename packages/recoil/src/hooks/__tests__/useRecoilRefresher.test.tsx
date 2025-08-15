/**
 * TypeScript port of Recoil_useRecoilRefresher-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { RecoilRoot } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { selector } from '../../recoil_values/selector';
import { useRecoilValue, useSetRecoilState } from '../Hooks';
import { useRecoilRefresher } from '../useRecoilRefresher';

function renderElements(element: React.ReactElement): HTMLElement {
  const { container } = render(<RecoilRoot>{element}</RecoilRoot>);
  return container;
}

describe('useRecoilRefresher', () => {
  test('no-op for atom', () => {
    const myAtom = atom({
      key: 'useRecoilRefresher no-op',
      default: 'default',
    });

    let refresh: (() => void) | null = null;
    function Component() {
      const value = useRecoilValue(myAtom);
      refresh = useRecoilRefresher(myAtom);
      return <div>{value}</div>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('default');
    
    act(() => {
      refresh!();
    });
    expect(container.textContent).toBe('default');
  });

  test('re-executes selector', () => {
    let i = 0;
    const mySelector = selector({
      key: 'useRecoilRefresher re-execute',
      get: () => i++,
    });

    let refresh: (() => void) | null = null;
    function Component() {
      const value = useRecoilValue(mySelector);
      refresh = useRecoilRefresher(mySelector);
      return <div>{value}</div>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('0');
    
    // Test that refresh function exists and can be called
    expect(typeof refresh).toBe('function');
    act(() => {
      refresh!();
    });
    // After refresh, selector should re-execute and show incremented value
    expect(container.textContent).toBe('1');
  });

  test('clears entire cache', () => {
    const myAtom = atom({
      key: 'useRecoilRefresher entire cache atom',
      default: 'a',
    });

    let i = 0;
    const mySelector = selector({
      key: 'useRecoilRefresher entire cache selector',
      get: ({ get }) => [get(myAtom), i++] as [string, number],
    });

    let setMyAtom: ((value: string) => void) | null = null;
    let refresh: (() => void) | null = null;
    
    function Component() {
      const [atomValue, iValue] = useRecoilValue(mySelector) as [string, number];
      refresh = useRecoilRefresher(mySelector);
      setMyAtom = useSetRecoilState(myAtom);
      return <div>{`${atomValue}-${iValue}`}</div>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('a-0');

    act(() => {
      setMyAtom!('b');
    });
    expect(container.textContent).toBe('b-1');

    act(() => {
      refresh!();
    });
    // After refresh, selector should re-execute and show incremented counter
    expect(container.textContent).toBe('b-2');

    act(() => {
      setMyAtom!('a');
    });
    // After changing atom back, selector should execute again with new counter
    expect(container.textContent).toBe('a-3');
  });

  test('clears ancestor selectors', () => {
    const getA = vi.fn(() => 'A');
    const selectorA = selector({
      key: 'useRecoilRefresher ancestors A',
      get: getA,
    });

    const getB = vi.fn(({ get }) => get(selectorA) + 'B');
    const selectorB = selector({
      key: 'useRecoilRefresher ancestors B',
      get: getB,
    });

    const getC = vi.fn(({ get }) => get(selectorB) + 'C');
    const selectorC = selector({
      key: 'useRecoilRefresher ancestors C',
      get: getC,
    });

    let refresh: (() => void) | null = null;
    function Component() {
      refresh = useRecoilRefresher(selectorC);
      const value = useRecoilValue(selectorC);
      return <div>{value}</div>;
    }

    const container = renderElements(<Component />);
    expect(container.textContent).toBe('ABC');
    expect(getC).toHaveBeenCalledTimes(1);
    expect(getB).toHaveBeenCalledTimes(1);
    expect(getA).toHaveBeenCalledTimes(1);

    act(() => {
      refresh!();
    });
    expect(container.textContent).toBe('ABC');
    // After refresh, selectors should be re-executed due to cache clearing
    expect(getC).toHaveBeenCalledTimes(2); // Initial + refresh
    expect(getB).toHaveBeenCalledTimes(2); // Initial + refresh  
    expect(getA).toHaveBeenCalledTimes(2); // Initial + refresh
  });
}); 