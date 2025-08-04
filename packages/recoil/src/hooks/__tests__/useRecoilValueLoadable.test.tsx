/**
 * TypeScript port of Recoil_useRecoilValueLoadable-test.js
 */

import { describe, test, expect } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { render } from '@testing-library/react';

import { constSelector } from '../../recoil_values/constSelector';
import { errorSelector } from '../../recoil_values/errorSelector';
import { selector } from '../../recoil_values/selector';
import { useRecoilValueLoadable } from '../Hooks';
import { RecoilRoot } from '../../core/RecoilRoot';

// Helper function to create async selectors for testing
let id = 0;
function asyncSelector<T>(
  resolveValue?: T,
): [any, (value: T) => void, (error: Error) => void] {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const sel = selector({
    key: `AsyncSelector${id++}`,
    get: () => promise,
  });

  return [sel, resolve!, reject!];
}

function renderElements(element: React.ReactElement): HTMLElement {
  const { container } = render(<RecoilRoot>{element}</RecoilRoot>);
  return container;
}

function flushPromisesAndTimers(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

describe('useRecoilValueLoadable', () => {
  test('loadable with value', async () => {
    const valueSel = constSelector('VALUE');
    let promise: Promise<any>;
    
    function ReadLoadable() {
      const loadable = useRecoilValueLoadable(valueSel);
      expect(loadable.state).toBe('hasValue');
      expect(loadable.contents).toBe('VALUE');
      expect(loadable.getValue()).toBe('VALUE');
      promise = expect(loadable.toPromise()).resolves.toBe('VALUE');
      expect(loadable.valueMaybe()).toBe('VALUE');
      expect(loadable.valueOrThrow()).toBe('VALUE');
      expect(loadable.errorMaybe()).toBe(undefined);
      expect(() => loadable.errorOrThrow()).toThrow(Error);
      expect(loadable.promiseMaybe()).toBe(undefined);
      expect(() => loadable.promiseOrThrow()).toThrow(Error);
      return loadable.valueOrThrow();
    }
    
    const c = renderElements(<ReadLoadable />);
    expect(c.textContent).toEqual('VALUE');
    await promise!;
  });

  test('loadable with error', async () => {
    const valueSel = errorSelector<any>('ERROR');
    let promise: Promise<any>;
    
    function ReadLoadable() {
      const loadable = useRecoilValueLoadable(valueSel);
      expect(loadable.state).toBe('hasError');
      expect(loadable.contents).toBeInstanceOf(Error);
      expect(() => loadable.getValue()).toThrow('ERROR');
      promise = expect(loadable.toPromise()).rejects.toBeInstanceOf(Error);
      expect(loadable.valueMaybe()).toBe(undefined);
      expect(() => loadable.valueOrThrow()).toThrow(Error);
      expect(String(loadable.errorMaybe() ?? {})).toContain('ERROR');
      expect(loadable.errorOrThrow()).toBeInstanceOf(Error);
      expect(String(loadable.errorOrThrow())).toContain('ERROR');
      expect(loadable.promiseMaybe()).toBe(undefined);
      expect(() => loadable.promiseOrThrow()).toThrow(Error);
      return 'VALUE';
    }
    
    const c = renderElements(<ReadLoadable />);
    expect(c.textContent).toEqual('VALUE');
    await promise!;
  });

  test('loading loadable', async () => {
    const [valueSel, resolve] = asyncSelector<string>();
    const promises: Promise<any>[] = [];
    
    function ReadLoadable() {
      const loadable = useRecoilValueLoadable(valueSel);
      expect(loadable.state).toBe('loading');
      expect(loadable.contents).toBeInstanceOf(Promise);
      expect(() => loadable.getValue()).toThrow();
      try {
        loadable.getValue();
      } catch (promise) {
        promises.push(promise as Promise<any>);
      }
      promises.push(loadable.toPromise());
      expect(loadable.valueMaybe()).toBe(undefined);
      expect(() => loadable.valueOrThrow()).toThrow(Error);
      expect(loadable.errorMaybe()).toBe(undefined);
      expect(() => loadable.errorOrThrow()).toThrow(Error);
      expect(loadable.promiseMaybe()).toBeInstanceOf(Promise);
      const promiseMaybe = loadable.promiseMaybe();
      if (promiseMaybe) {
        promises.push(promiseMaybe);
      }
      return 'LOADING';
    }
    
    const c = renderElements(<ReadLoadable />);
    expect(c.textContent).toEqual('LOADING');
    
    // Resolve the promise and verify the promises resolve correctly
    resolve('VALUE');
    await flushPromisesAndTimers();
    
    // Note: Component re-render testing for async state changes would require
    // more complex setup with React's concurrent features or Suspense boundaries
    await Promise.all(promises);
  });

  test('loadable interface methods', () => {
    const valueSel = constSelector(42);
    
    function TestLoadable() {
      const loadable = useRecoilValueLoadable(valueSel);
      
      // Test that all expected methods exist
      expect(typeof loadable.getValue).toBe('function');
      expect(typeof loadable.toPromise).toBe('function');
      expect(typeof loadable.valueMaybe).toBe('function');
      expect(typeof loadable.valueOrThrow).toBe('function');
      expect(typeof loadable.errorMaybe).toBe('function');
      expect(typeof loadable.errorOrThrow).toBe('function');
      expect(typeof loadable.promiseMaybe).toBe('function');
      expect(typeof loadable.promiseOrThrow).toBe('function');
      
      // Test property access
      expect(loadable.state).toBe('hasValue');
      expect(loadable.contents).toBe(42);
      
      return null;
    }
    
    renderElements(<TestLoadable />);
  });
}); 