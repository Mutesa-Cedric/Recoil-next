/**
 * Testing utilities for Recoil-next
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { RecoilRoot } from '../../../recoil/src';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: (error: Error) => React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    return this.state.hasError
      ? this.props.fallback && this.state.error
        ? this.props.fallback(this.state.error)
        : 'error'
      : this.props.children;
  }
}

export function renderElements(
  elements: React.ReactNode,
  container?: HTMLDivElement
): HTMLDivElement {
  const div = container ?? document.createElement('div');
  document.body.appendChild(div);

  const result = render(
    <RecoilRoot>
      <ErrorBoundary>
        <React.Suspense fallback="loading">
          {elements}
        </React.Suspense>
      </ErrorBoundary>
    </RecoilRoot>,
    { container: div }
  );

  return result.container as HTMLDivElement;
}

export function flushPromisesAndTimers(): Promise<void> {
  return act(
    () =>
      new Promise<void>(resolve => {
        setTimeout(resolve, 100);
      })
  );
}

let atomIdCounter = 0;
export function getUniqueAtomKey(prefix: string = 'atom'): string {
  return `${prefix}-${atomIdCounter++}-${Date.now()}`;
}