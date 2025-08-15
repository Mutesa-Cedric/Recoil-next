/**
 * TypeScript port of Recoil_useRecoilStateReset-test.js
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { act } from 'react';
import { describe, expect, test } from 'vitest';

import { RecoilRoot } from '../../core/RecoilRoot';
import { atom } from '../../recoil_values/atom';
import { selector } from '../../recoil_values/selector';
import { useRecoilState, useResetRecoilState } from '../Hooks';

function renderElements(element: React.ReactElement): HTMLElement {
  const { container } = render(<RecoilRoot>{element}</RecoilRoot>);
  return container;
}

// Helper component that reads and writes atom with reset capability
function ComponentWithReset<T>({ 
  recoilState 
}: { 
  recoilState: any 
}): React.ReactElement {
  const [value, setValue] = useRecoilState(recoilState);
  const resetValue = useResetRecoilState(recoilState);
  
  return (
    <div>
      <span>"{JSON.stringify(value)}"</span>
      <button onClick={() => setValue('set value')}>Set</button>
      <button onClick={resetValue}>Reset</button>
    </div>
  );
}

describe('useResetRecoilState', () => {
  test('value default', () => {
    const myAtom = atom({
      key: 'useResetRecoilState/atom',
      default: 'default',
    });

    const container = renderElements(<ComponentWithReset recoilState={myAtom} />);
    expect(container.textContent).toContain('"default"');
    
    const buttons = container.querySelectorAll('button');
    const setButton = buttons[0];
    const resetButton = buttons[1];
    
    act(() => {
      setButton.click();
    });
    expect(container.textContent).toContain('"set value"');
    
    act(() => {
      resetButton.click();
    });
    expect(container.textContent).toContain('"default"');
  });

  test('sync selector default', () => {
    const mySelector = selector({
      key: 'useResetRecoilState/sync_selector/default',
      get: () => 'fallback',
    });
    
    const myAtom = atom({
      key: 'useResetRecoilState/sync_selector',
      default: mySelector,
    });

    const container = renderElements(<ComponentWithReset recoilState={myAtom} />);
    expect(container.textContent).toContain('"fallback"');
    
    const buttons = container.querySelectorAll('button');
    const setButton = buttons[0];
    const resetButton = buttons[1];
    
    act(() => {
      setButton.click();
    });
    expect(container.textContent).toContain('"set value"');
    
    act(() => {
      resetButton.click();
    });
    expect(container.textContent).toContain('"fallback"');
  });

  test('reset multiple times', () => {
    const myAtom = atom({
      key: 'useResetRecoilState/multiple',
      default: 42,
    });

    function TestComponent() {
      const [value, setValue] = useRecoilState(myAtom);
      const resetValue = useResetRecoilState(myAtom);
      
      return (
        <div>
          <span>{value}</span>
          <button onClick={() => setValue(100)}>Set100</button>
          <button onClick={() => setValue(200)}>Set200</button>
          <button onClick={resetValue}>Reset</button>
        </div>
      );
    }

    const container = renderElements(<TestComponent />);
    expect(container.textContent).toContain('42');
    
    const set100Button = container.querySelector('button:nth-child(2)') as HTMLElement;
    const set200Button = container.querySelector('button:nth-child(3)') as HTMLElement;
    const resetButton = container.querySelector('button:last-child') as HTMLElement;
    
    act(() => {
      set100Button.click();
    });
    expect(container.textContent).toContain('100');
    
    act(() => {
      resetButton.click();
    });
    expect(container.textContent).toContain('42');
    
    act(() => {
      set200Button.click();
    });
    expect(container.textContent).toContain('200');
    
    act(() => {
      resetButton.click();
    });
    expect(container.textContent).toContain('42');
  });

  test('reset hook returns consistent function reference', () => {
    const myAtom = atom({
      key: 'useResetRecoilState/consistent',
      default: 'test',
    });

    let resetFn1: (() => void) | null = null;
    let resetFn2: (() => void) | null = null;
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const resetValue = useResetRecoilState(myAtom);
      
      if (renderCount === 1) {
        resetFn1 = resetValue;
      } else if (renderCount === 2) {
        resetFn2 = resetValue;
      }
      
      return <div>test</div>;
    }

    const { rerender } = render(
      <RecoilRoot>
        <TestComponent />
      </RecoilRoot>
    );
    
    rerender(
      <RecoilRoot>
        <TestComponent />
      </RecoilRoot>
    );

    // The reset function should be stable across renders
    expect(resetFn1).toBe(resetFn2);
  });
}); 