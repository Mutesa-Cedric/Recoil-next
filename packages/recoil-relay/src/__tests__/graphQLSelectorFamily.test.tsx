/**
 * TypeScript port of RecoilRelay_graphQLSelectorFamily-test.js
 */

import React, { act } from 'react';
import { MockPayloadGenerator } from 'relay-test-utils';
import { expect, test } from 'vitest';
import {
    testFeedbackMutation,
    testFeedbackQuery,
} from '../__test_utils__/MockQueries';
import { mockRelayEnvironment } from '../__test_utils__/mockRelayEnvironment';
import { ComponentThatReadsAndWritesAtom, flushPromisesAndTimers, ReadsAtom } from '../__test_utils__/TestUtils';
import { graphQLSelectorFamily } from '../graphQLSelectorFamily';

test('Relay Query with <RecoilRoot>', async () => {
  const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

  const query = graphQLSelectorFamily({
    key: 'graphql query',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: (vars: any) => vars,
    mapResponse: (data: any) => data,
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

test('Relay Query with Snapshot Preloaded', async () => {
  const { environment, mockEnvironmentKey, snapshot } = mockRelayEnvironment();

  environment.mock.queueOperationResolver(operation =>
    MockPayloadGenerator.generate(operation, {
      ID: () => operation.request.variables.id,
      Feedback: () => ({ seen_count: 123 }),
    }),
  );

  const query = graphQLSelectorFamily({
    key: 'graphql snapshot query',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: (vars: any) => vars,
    mapResponse: (data: any) => data,
  });

  const queryAtom = query({ id: 'ID' });
  const loadable = snapshot.getLoadable(queryAtom);
  expect(loadable.state).toBe('loading');

  await flushPromisesAndTimers();

  const loadable2 = snapshot.getLoadable(queryAtom);
  expect(loadable2.state).toBe('hasValue');
  expect(loadable2.contents).toEqual({
    feedback: { id: 'ID', seen_count: 123 },
  });
});

test('Relay Query with Mutations', async () => {
  const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

  const query = graphQLSelectorFamily({
    key: 'graphql query with mutations',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: (vars: any) => vars,
    mapResponse: (data: any) => data,
    mutations: {
      mutation: testFeedbackMutation,
      variables: (count: any) => ({
        data: { feedback_id: 'ID', actor_id: count?.toString() },
      }),
    },
  });

  const [Atom, setAtom] = ComponentThatReadsAndWritesAtom(query({ id: 'ID' }));
  const c = renderElements(Atom);
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

  act(() => setAtom('SET'));
  expect(c.textContent).toBe('"SET"');
  expect(
    environment.mock.getMostRecentOperation().request.variables.data,
  ).toEqual({ feedback_id: 'ID', actor_id: 'SET' });
});

test('Relay Query with Variables Function', async () => {
  const { environment, mockEnvironmentKey, renderElements } = mockRelayEnvironment();

  const query = graphQLSelectorFamily({
    key: 'graphql query variables function',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: ({ id }: { id: string }) => ({ id }),
    mapResponse: (data: any) => data,
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