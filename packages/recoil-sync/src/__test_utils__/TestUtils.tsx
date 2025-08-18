/**
 * TypeScript port of test utilities for recoil-sync
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot, useRecoilValue, useResetRecoilState, useSetRecoilState } from 'recoil-next';

// Simple stringify that handles Set and Map like the original stableStringify
function simpleStringify(value: any): string {
  if (value instanceof Set) {
    return JSON.stringify(Array.from(value).sort());
  }
  if (value instanceof Map) {
    const obj: any = {};
    for (const [k, v] of value) {
      obj[typeof k === 'string' ? k : String(k)] = v;
    }
    return JSON.stringify(obj);
  }
  return JSON.stringify(value);
}

// Component that reads an atom
export function ReadsAtom({ atom }: { atom: any }) {
  const value = useRecoilValue(atom);
  return React.createElement('div', null, simpleStringify(value));
}

// Component that reads and writes an atom - returns component and reference objects for setters
export function ComponentThatReadsAndWritesAtom(atom: any): [React.ComponentType, { setValue: any; resetValue: any }] {
  const refs: { setValue: any; resetValue: any } = { setValue: null, resetValue: null };
  
  const Component = () => {
    const value = useRecoilValue(atom);
    const setValue = useSetRecoilState(atom);
    const resetValue = useResetRecoilState(atom);
    
    // Assign immediately during render
    refs.setValue = setValue;
    refs.resetValue = resetValue;
    
    return <div>{JSON.stringify(value)}</div>;
  };
  
  return [Component, refs];
}

// Utility to flush promises and timers
export async function flushPromisesAndTimers() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

// Simple render function that wraps with RecoilRoot
export function renderElements(elements: React.ReactNode) {
  const div = document.createElement('div');
  const { container } = render(
    <RecoilRoot override={false}>{elements}</RecoilRoot>,
    { container: div }
  );
  return container;
}