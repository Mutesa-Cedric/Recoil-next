/**
 * TypeScript port of RecoilRelay_RecoilRelayEnvironment-test.js
 */

import React, { act } from 'react';
import { atom } from 'recoil-next';
import { describe, expect, test } from 'vitest';
import { testFeedbackQuery } from '../__test_utils__/MockQueries';
import { mockRelayEnvironment } from '../__test_utils__/mockRelayEnvironment';
import { flushPromisesAndTimers, ReadsAtom } from '../__test_utils__/TestUtils';
import { graphQLQueryEffect } from '../graphQLQueryEffect';
import { graphQLSelectorFamily } from '../graphQLSelectorFamily';

describe('Multiple Environments', () => {
  test('graphQLQueryEffect() with multiple atoms', async () => {
    const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

    const myAtomA = atom({
      key: 'graphql environments A',
      default: 'DEFAULT',
      effects: [
        graphQLQueryEffect({
          environment: mockEnvironmentKey,
          query: testFeedbackQuery,
          variables: { id: 'A' },
          mapResponse: ({ feedback }: any) => feedback?.seen_count,
        }),
      ],
    });

    const myAtomB = atom({
      key: 'graphql environments B',
      default: 'DEFAULT',
      effects: [
        graphQLQueryEffect({
          environment: mockEnvironmentKey,
          query: testFeedbackQuery,
          variables: { id: 'B' },
          mapResponse: ({ feedback }: any) => feedback?.seen_count,
        }),
      ],
    });

    const c = renderElements(
      React.createElement('div', null,
        React.createElement(React.Suspense, { fallback: '"loading"' },
          React.createElement(ReadsAtom, { key: 'A', atom: myAtomA })
        ),
        React.createElement(React.Suspense, { fallback: '"loading"' },
          React.createElement(ReadsAtom, { key: 'B', atom: myAtomB })
        )
      )
    );

    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"loading""loading"');

    // Resolve both operations
    act(() =>
      environment.mock.getAllOperations().forEach(operation => {
        environment.mock.resolve(operation, {
          data: {
            feedback: {
              __typename: 'Feedback',
              id: operation.request.variables.id,
              seen_count: 123,
            },
          },
        });
      })
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('123123');
  });

  test('graphQLSelectorFamily() basic functionality', async () => {
    const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

    const mySelector = graphQLSelectorFamily({
      key: 'graphql environments selector',
      environment: mockEnvironmentKey,
      query: testFeedbackQuery,
      variables: ({ id }: { id: string }) => ({ id }),
      mapResponse: ({ feedback }: any) => feedback?.seen_count,
    });

    const c = renderElements(
      React.createElement(React.Suspense, { fallback: '"loading"' },
        React.createElement(ReadsAtom, { atom: mySelector({ id: 'TEST' }) })
      )
    );

    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"loading"');

    act(() =>
      environment.mock.resolveMostRecentOperation({
        data: {
          feedback: {
            __typename: 'Feedback',
            id: 'TEST',
            seen_count: 456,
          },
        },
      }),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('456');
  });
}); 