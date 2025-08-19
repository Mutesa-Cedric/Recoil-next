/**
 * TypeScript port of RecoilRelay_graphQLMutationEffect-test.js
 */

import React, {act} from 'react';
import {atom} from 'recoil-next';
import {expect, test, vi} from 'vitest';
import {testFeedbackMutation} from '../__test_utils__/MockQueries';
import {mockRelayEnvironment} from '../__test_utils__/mockRelayEnvironment';
import {
  ComponentThatReadsAndWritesAtom,
  flushPromisesAndTimers,
} from '../__test_utils__/TestUtils';
import {graphQLMutationEffect} from '../graphQLMutationEffect';

// Test that mutating an atom will commit a mutation operation
test('Atom Mutation', async () => {
  const {environment, renderElements} = mockRelayEnvironment();

  const myAtom = atom({
    key: 'graphql atom mutation',
    default: 'DEFAULT',
    effects: [
      graphQLMutationEffect({
        environment,
        mutation: testFeedbackMutation as any,
        variables: (actor_id: string) => ({
          data: {feedback_id: 'ID', actor_id},
        }),
      }),
    ],
  });

  const [ReadAtom, setAtom, resetAtom] =
    ComponentThatReadsAndWritesAtom(myAtom);
  const c = renderElements(React.createElement(ReadAtom));
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"DEFAULT"');

  act(() => setAtom('SET'));
  expect(c.textContent).toBe('"SET"');

  expect(
    environment.mock.getMostRecentOperation().request.variables.data,
  ).toEqual({feedback_id: 'ID', actor_id: 'SET'});

  // Mutation error reverts atom to previous value.
  act(() =>
    environment.mock.rejectMostRecentOperation(() => new Error('ERROR')),
  );
  expect(c.textContent).toBe('"DEFAULT"');

  // Rejecting a previous set won't revert the value.
  act(() => setAtom('SET2'));
  expect(c.textContent).toBe('"SET2"');
  act(() => setAtom('SET3'));
  expect(c.textContent).toBe('"SET3"');
  expect(environment.mock.getAllOperations().length).toBe(2);
  act(() =>
    environment.mock.reject(
      environment.mock.getAllOperations()[0],
      new Error('ERROR2'),
    ),
  );
  expect(c.textContent).toBe('"SET3"');

  // Reset atom
  act(resetAtom);
  expect(c.textContent).toBe('"DEFAULT"');
  expect(
    environment.mock.getMostRecentOperation().request.variables.data,
  ).toEqual({feedback_id: 'ID', actor_id: 'DEFAULT'});
});

test('Updaters', async () => {
  const {environment, renderElements} = mockRelayEnvironment();

  const updater = vi.fn((store, data) => {
    expect(data?.feedback_like?.feedback?.id).toEqual('ID');
    expect(data?.feedback_like?.liker?.id).toEqual('ACTOR');

    const feedback = store.get('ID');
    expect(feedback?.getValue('id')).toBe('ID');
    const liker = store.get('ACTOR');
    expect(liker?.getValue('id')).toBe('ACTOR');
  });

  const optimisticUpdater = vi.fn((store, data) => {
    expect(data?.feedback_like?.feedback?.id).toEqual('ID');
    expect(data?.feedback_like?.liker?.id).toEqual('OPTIMISTIC_SET');

    const feedback = store.get('ID');
    expect(feedback?.getValue('id')).toBe('ID');
    const liker = store.get('OPTIMISTIC_SET');
    expect(liker?.getValue('id')).toBe('OPTIMISTIC_SET');
  });

  const myAtom = atom({
    key: 'graphql atom mutation updater',
    default: 'DEFAULT',
    effects: [
      graphQLMutationEffect({
        environment,
        mutation: testFeedbackMutation as any,
        variables: (actor_id: string) => ({
          data: {feedback_id: 'ID', actor_id},
        }),
        updater_UNSTABLE: updater,
        optimisticUpdater_UNSTABLE: optimisticUpdater,
        optimisticResponse_UNSTABLE: (actor_id: string) => ({
          feedback_like: {
            __typename: 'FeedbackLike',
            feedback: {__typename: 'Feedback', id: 'ID'},
            liker: {__typename: 'Actor', id: 'OPTIMISTIC_' + actor_id},
          },
        }),
      }),
    ],
  });

  const [ReadAtom, setAtom] = ComponentThatReadsAndWritesAtom(myAtom);
  const c = renderElements(React.createElement(ReadAtom));
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"DEFAULT"');

  act(() => setAtom('SET'));
  expect(c.textContent).toBe('"SET"');

  expect(
    environment.mock.getMostRecentOperation().request.variables.data,
  ).toEqual({feedback_id: 'ID', actor_id: 'SET'});

  act(() =>
    environment.mock.resolveMostRecentOperation(operation => ({
      data: {
        feedback_like: {
          __typename: 'FeedbackLike',
          feedback: {__typename: 'Feedback', id: 'ID'},
          liker: {__typename: 'Actor', id: 'ACTOR'},
        },
      },
    })),
  );
  expect(c.textContent).toBe('"SET"'); // Errors in updaters will revert value
  expect(optimisticUpdater).toHaveBeenCalledTimes(1);
  expect(updater).toHaveBeenCalledTimes(1);
});

test('Aborted mutation', async () => {
  const {environment, renderElements} = mockRelayEnvironment();

  const myAtom = atom({
    key: 'graphql atom mutation abort',
    default: 'DEFAULT',
    effects: [
      graphQLMutationEffect({
        environment,
        mutation: testFeedbackMutation as any,
        variables: () => null,
      }),
    ],
  });

  const [ReadAtom, setAtom] = ComponentThatReadsAndWritesAtom(myAtom);
  const c = renderElements(React.createElement(ReadAtom));
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"DEFAULT"');

  act(() => setAtom('SET'));
  expect(c.textContent).toBe('"SET"');
  expect(environment.mock.getAllOperations().length).toBe(0);
});
