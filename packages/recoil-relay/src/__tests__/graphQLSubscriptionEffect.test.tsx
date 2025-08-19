/**
 * TypeScript port of RecoilRelay_graphQLSubscriptionEffect-test.js
 */

import React, {act} from 'react';
import {atomFamily} from 'recoil-next';
import {expect, test} from 'vitest';
import {testFeedbackSubscription} from '../__test_utils__/MockQueries';
import {mockRelayEnvironment} from '../__test_utils__/mockRelayEnvironment';
import {ReadsAtom, flushPromisesAndTimers} from '../__test_utils__/TestUtils';
import {graphQLSubscriptionEffect} from '../graphQLSubscriptionEffect';

test('GraphQL Subscription', async () => {
  const {environment, renderElements} = mockRelayEnvironment();

  const query = atomFamily({
    key: 'graphql remote subscription',
    // @ts-expect-error
    effects: ({id}: {id: string}) => {
      return [
        graphQLSubscriptionEffect({
          environment,
          subscription: testFeedbackSubscription as any,
          variables: {input: {feedback_id: id}},
          mapResponse: ({feedback_like_subscribe}) =>
            feedback_like_subscribe?.feedback?.seen_count,
        }),
      ];
    },
  });

  const c = renderElements(
    React.createElement(ReadsAtom, {atom: query({id: 'ID'})}),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('"loading"');

  const operation = environment.mock.getMostRecentOperation();

  act(() =>
    environment.mock.nextValue(operation, {
      data: {
        feedback_like_subscribe: {
          __typename: 'FeedbackLikeResponsePayload',
          feedback: {
            __typename: 'Feedback',
            id: operation.request.variables.input.feedback_id,
            seen_count: 123,
          },
        },
      },
    }),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('123');

  act(() =>
    environment.mock.nextValue(operation, {
      data: {
        feedback_like_subscribe: {
          __typename: 'FeedbackLikeResponsePayload',
          feedback: {
            __typename: 'Feedback',
            id: operation.request.variables.input.feedback_id,
            seen_count: 456,
          },
        },
      },
    }),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('456');

  act(() =>
    environment.mock.nextValue(operation, {
      data: {
        feedback_like_subscribe: {
          __typename: 'FeedbackLikeResponsePayload',
          feedback: {
            __typename: 'Feedback',
            id: operation.request.variables.input.feedback_id,
            seen_count: 789,
          },
        },
      },
    }),
  );
  await flushPromisesAndTimers();
  expect(c.textContent).toBe('789');
});
