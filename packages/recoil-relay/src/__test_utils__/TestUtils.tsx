/**
 * TypeScript port of test utilities for recoil-relay
 */

import React from 'react';
import { act } from 'react';
import { atom, useRecoilValue, useSetRecoilState, useResetRecoilState, RecoilRoot } from 'recoil';
import { render, screen } from '@testing-library/react';

// Simple atom for testing
export function stringAtom() {
  return atom<string>({
    key: 'test-string-atom',
    default: 'DEFAULT',
  });
}

// Component that reads an atom
export function ReadsAtom({ atom }: { atom: any }) {
  const value = useRecoilValue(atom);
  return React.createElement('div', null, JSON.stringify(value));
}

// Component that reads and writes an atom
export function ComponentThatReadsAndWritesAtom(atom: any) {
  const value = useRecoilValue(atom);
  const setValue = useSetRecoilState(atom);
  const resetValue = useResetRecoilState(atom);
  
  return [
    React.createElement('div', { key: 'read' }, JSON.stringify(value)),
    setValue,
    resetValue,
  ] as const;
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
    React.createElement(RecoilRoot, null, elements),
    { container: div }
  );
  return container;
} 