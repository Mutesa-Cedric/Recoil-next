/**
 * TypeScript port of RecoilRelay_graphQLSelectorFamily-test.js
 */

import React, {act} from 'react';
import {expect, test} from 'vitest';
import {
  testFeedbackMutation,
  testFeedbackQuery,
} from '../__test_utils__/MockQueries';
import {mockRelayEnvironment} from '../__test_utils__/mockRelayEnvironment';
import {
  ComponentThatReadsAndWritesAtom,
  flushPromisesAndTimers,
  ReadsAtom,
} from '../__test_utils__/TestUtils';
import {graphQLSelectorFamily} from '../graphQLSelectorFamily';

test('Relay Query with <RecoilRoot>', async () => {
  const {environment, mockEnvironmentKey, renderElements} =
    mockRelayEnvironment();

  const query = graphQLSelectorFamily({
    key: 'graphql query',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: (vars: any) => vars,
    mapResponse: (data: any) => data,
  });

  const c = renderElements(
    React.createElement(ReadsAtom, {atom: query({id: 'ID'})}),
  );
  // Check if there are pending operations
  console.log(
    'Test: Pending operations after render:',
    environment.mock.getAllOperations().length,
  );
  console.log('Test: Component content after render:', c.textContent);
  await flushPromisesAndTimers();
  console.log('Test: Component content after flush:', c.textContent);
  console.log(
    'Test: Pending operations after flush:',
    environment.mock.getAllOperations().length,
  );
  expect(c.textContent).toBe('"loading"');

  act(() => {
    const operation = environment.mock.getMostRecentOperation();
    console.log(
      'Test: Resolving operation:',
      operation?.request?.node?.params?.name,
    );
    console.log('Test: Operation variables:', operation?.request?.variables);
    console.log(
      'Test: Operation node structure keys:',
      Object.keys(operation?.request?.node || {}),
    );

    environment.mock.resolveMostRecentOperation(operation => {
      const mockData = {
        data: {
          feedback: {
            __typename: 'Feedback',
            id: operation.request.variables.id,
            seen_count: 123,
          },
        },
      };
      console.log(
        'Test: Generated mock data:',
        JSON.stringify(mockData, null, 2),
      );
      return mockData;
    });
  });
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');
});

test('Relay Query with Snapshot Preloaded', async () => {
  const {environment, mockEnvironmentKey, snapshot} = mockRelayEnvironment();

  environment.mock.queueOperationResolver(operation => ({
    data: {
      feedback: {
        __typename: 'Feedback',
        id: operation.request.variables.id,
        seen_count: 123,
      },
    },
  }));

  const query = graphQLSelectorFamily({
    key: 'graphql snapshot query',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: (vars: any) => vars,
    mapResponse: (data: any) => data,
  });

  const queryAtom = query({id: 'ID'});
  const loadable = snapshot.getLoadable(queryAtom);
  expect(loadable.state).toBe('loading');

  await flushPromisesAndTimers();

  const loadable2 = snapshot.getLoadable(queryAtom);
  expect(loadable2.state).toBe('hasValue');
  expect(loadable2.contents).toEqual({
    feedback: {id: 'ID', seen_count: 123},
  });
});

test('Relay Query with Mutations', async () => {
  const {environment, mockEnvironmentKey, renderElements} =
    mockRelayEnvironment();

  const query = graphQLSelectorFamily({
    key: 'graphql query with mutations',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: (vars: any) => vars,
    mapResponse: (data: any) => data,
    mutations: {
      mutation: testFeedbackMutation as any,
      variables: (count: any) => ({
        data: {feedback_id: 'ID', actor_id: count?.toString()},
      }),
    },
  });

  const [Atom, setAtom, _resetAtom] = ComponentThatReadsAndWritesAtom(
    query({id: 'ID'}),
  );
  const c = renderElements(React.createElement(Atom));
  expect(c.textContent).toBe('"loading"');

  act(() =>
    environment.mock.resolveMostRecentOperation(operation => ({
      data: {
        feedback: {
          __typename: 'Feedback',
          id: operation.request.variables.id,
          seen_count: 123,
        },
      },
    })),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');

  act(() => setAtom('SET'));
  expect(c.textContent).toBe('"SET"');
  expect(
    environment.mock.getMostRecentOperation().request.variables.data,
  ).toEqual({feedback_id: 'ID', actor_id: 'SET'});
});

test('Relay Query with Variables Function', async () => {
  const {environment, mockEnvironmentKey, renderElements} =
    mockRelayEnvironment();

  const query = graphQLSelectorFamily({
    key: 'graphql query variables function',
    environment: mockEnvironmentKey,
    query: testFeedbackQuery,
    variables: ({id}: {id: string}) => ({id}),
    mapResponse: (data: any) => data,
  });

  const c = renderElements(
    React.createElement(ReadsAtom, {atom: query({id: 'ID'})}),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"loading"');

  act(() =>
    environment.mock.resolveMostRecentOperation(operation => ({
      data: {
        feedback: {
          __typename: 'Feedback',
          id: operation.request.variables.id,
          seen_count: 123,
        },
      },
    })),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');
});
