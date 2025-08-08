/**
 * TypeScript port of RecoilRelay_graphQLQueryEffect-test.js
 */

import { test, expect, describe } from 'vitest';
import { act } from 'react';
import { atom, atomFamily } from 'recoil';
import { MockPayloadGenerator } from 'relay-test-utils';
import { mockRelayEnvironment } from '../__test_utils__/mockRelayEnvironment';
import { testFeedbackQuery } from '../__test_utils__/MockQueries';
import { graphQLQueryEffect } from '../graphQLQueryEffect';
import { ReadsAtom, flushPromisesAndTimers } from '../__test_utils__/TestUtils';

test('Relay Query with <RecoilRoot>', async () => {
  const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql query',
    default: { feedback: null },
    effects: (variables: any) => [
      graphQLQueryEffect({
        environment: mockEnvironmentKey,
        query: testFeedbackQuery,
        variables,
        mapResponse: (data: any) => data,
        subscribeToLocalMutations_UNSTABLE: false,
      }),
    ],
  });

  const c = renderElements(React.createElement(ReadsAtom, { atom: query({ id: 'ID' }) }));
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"loading"');

  act(() =>
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        ID: () => operation.request.variables.id,
        Feedback: () => ({ seen_count: 123 }),
      }),
    ),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');
});

test('Relay Query with Snapshot', async () => {
  const { environment, mockEnvironmentKey, snapshot } = mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql snapshot query',
    effects: (variables: any) => [
      graphQLQueryEffect({
        environment: mockEnvironmentKey,
        query: testFeedbackQuery,
        variables,
        mapResponse: (data: any) => data,
        subscribeToLocalMutations_UNSTABLE: false,
      }),
    ],
  });

  const queryAtom = query({ id: 'ID' });
  const loadable = snapshot.getLoadable(queryAtom);
  expect(loadable.state).toBe('loading');

  act(() =>
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        ID: () => operation.request.variables.id,
        Feedback: () => ({ seen_count: 123 }),
      }),
    ),
  );
  await flushPromisesAndTimers();

  const loadable2 = snapshot.getLoadable(queryAtom);
  expect(loadable2.state).toBe('hasValue');
  expect(loadable2.contents).toEqual({
    feedback: { id: 'ID', seen_count: 123 },
  });
});

test('Relay Query with Local Updates', async () => {
  const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql query local updates',
    default: { feedback: null },
    effects: (variables: any) => [
      graphQLQueryEffect({
        environment: mockEnvironmentKey,
        query: testFeedbackQuery,
        variables,
        mapResponse: (data: any) => data,
        subscribeToLocalMutations_UNSTABLE: true,
      }),
    ],
  });

  const c = renderElements(React.createElement(ReadsAtom, { atom: query({ id: 'ID' }) }));
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"loading"');

  act(() =>
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        ID: () => operation.request.variables.id,
        Feedback: () => ({ seen_count: 123 }),
      }),
    ),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');

  // Test local update
  act(() => {
    environment.commitUpdate(store => {
      const feedback = store.get('ID');
      if (feedback) {
        feedback.setValue(456, 'seen_count');
      }
    });
  });
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":456}}');
});

test('Relay Query with Variables Function', async () => {
  const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql query variables function',
    default: { feedback: null },
    effects: (variables: any) => [
      graphQLQueryEffect({
        environment: mockEnvironmentKey,
        query: testFeedbackQuery,
        variables: () => variables,
        mapResponse: (data: any) => data,
        subscribeToLocalMutations_UNSTABLE: false,
      }),
    ],
  });

  const c = renderElements(React.createElement(ReadsAtom, { atom: query({ id: 'ID' }) }));
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"loading"');

  act(() =>
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        ID: () => operation.request.variables.id,
        Feedback: () => ({ seen_count: 123 }),
      }),
    ),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');
}); 