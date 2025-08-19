/**
 * TypeScript port of RecoilRelay_graphQLQueryEffect-test.js
 */

import React, {act} from 'react';
import {atomFamily} from 'recoil-next';
import {expect, test} from 'vitest';
import {testFeedbackQuery} from '../__test_utils__/MockQueries';
import {mockRelayEnvironment} from '../__test_utils__/mockRelayEnvironment';
import {ReadsAtom, flushPromisesAndTimers} from '../__test_utils__/TestUtils';
import {graphQLQueryEffect} from '../graphQLQueryEffect';

test('Relay Query with <RecoilRoot>', async () => {
  const {environment, mockEnvironmentKey, renderElements} =
    mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql query',
    default: {feedback: null},
    // @ts-expect-error
    effects: (variables: any) => {
      return [
        graphQLQueryEffect({
          environment: mockEnvironmentKey,
          query: testFeedbackQuery,
          variables,
          mapResponse: (data: any) => data,
          subscribeToLocalMutations_UNSTABLE: false,
        }),
      ];
    },
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

test('Relay Query with Snapshot', async () => {
  const {environment, mockEnvironmentKey, snapshot} = mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql snapshot query',
    // @ts-expect-error
    effects: (variables: any) => {
      return [
        graphQLQueryEffect({
          environment: mockEnvironmentKey,
          query: testFeedbackQuery,
          variables,
          mapResponse: (data: any) => data,
          subscribeToLocalMutations_UNSTABLE: false,
        }),
      ];
    },
  });

  const queryAtom = query({id: 'ID'});
  const loadable = snapshot.getLoadable(queryAtom);
  expect(loadable.state).toBe('loading');

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

  const loadable2 = snapshot.getLoadable(queryAtom);
  expect(loadable2.state).toBe('hasValue');
  expect(loadable2.contents).toEqual({
    feedback: {id: 'ID', seen_count: 123},
  });
});

test('Relay Query with Local Updates', async () => {
  const {environment, mockEnvironmentKey, renderElements} =
    mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql query local updates',
    default: {feedback: null},
    // @ts-expect-error
    effects: (variables: any) => {
      return [
        graphQLQueryEffect({
          environment: mockEnvironmentKey,
          query: testFeedbackQuery,
          variables,
          mapResponse: (data: any) => data,
          subscribeToLocalMutations_UNSTABLE: true,
        }),
      ];
    },
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
  const {environment, mockEnvironmentKey, renderElements} =
    mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql query variables function',
    default: {feedback: null},
    // @ts-expect-error
    effects: (variables: any) => {
      return [
        graphQLQueryEffect({
          environment: mockEnvironmentKey,
          query: testFeedbackQuery,
          variables: () => variables,
          mapResponse: (data: any) => data,
          subscribeToLocalMutations_UNSTABLE: false,
        }),
      ];
    },
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
          id: 'ID',
          seen_count: 123,
        },
      },
    })),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('{"feedback":{"id":"ID","seen_count":123}}');
});
