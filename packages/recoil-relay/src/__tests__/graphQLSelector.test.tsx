/**
 * TypeScript port of RecoilRelay_graphQLSelector-test.js
 */

import { act } from '@testing-library/react';
import React from 'react';
import { expect, test } from 'vitest';
import {
    testFeedbackFragmentQuery,
    testFeedbackMutation,
    testFeedbackQuery,
    testFeedbackSubscription
} from '../__test_utils__/MockQueries';
import { mockRelayEnvironment } from '../__test_utils__/mockRelayEnvironment';
import { ComponentThatReadsAndWritesAtom, flushPromisesAndTimers, ReadsAtom, stringAtom } from '../__test_utils__/TestUtils';
import { graphQLSelector } from '../graphQLSelector';

// Sanity test for graphQLSelector(), which is just a wrapper.
// Most functionality is test as part of graphQLSelectorFamily()
test('Sanity Query', async () => {
    const { environment, renderElements } = mockRelayEnvironment();

    const myAtom = stringAtom();

    const query = graphQLSelector({
        key: 'graphql derived state',
        environment,
        query: testFeedbackQuery,
        // @ts-expect-error
        variables: ({ get }) => {
            return { id: 'ID-' + get(myAtom) }
        },
        mapResponse: ({ feedback }, { get, variables }) => {
            expect(variables).toEqual({ id: 'ID-' + get(myAtom) });
            return `${feedback?.id ?? ''}:${get(myAtom)}-${feedback?.seen_count ?? ''
                }`;
        },
        mutations: {
            mutation: testFeedbackMutation as any,
            variables: (count: any) => ({
                data: { feedback_id: 'ID', actor_id: count?.toString() },
            }),
        },
    });

    const [Atom, setAtom] = ComponentThatReadsAndWritesAtom(query);
    const c = renderElements(React.createElement(Atom));
    expect(c.textContent).toBe('"loading"');

    act(() =>
        environment.mock.resolveMostRecentOperation(operation => ({
            data: {
                feedback: {
                    __typename: 'Feedback',
                    id: operation.request.variables.id,
                    seen_count: 123
                }
            }
        })),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"ID-DEFAULT:DEFAULT-123"');

    act(() => setAtom('SET'));
    expect(c.textContent).toBe('"SET"');
    expect(
        environment.mock.getMostRecentOperation().request.variables.data,
    ).toEqual({ feedback_id: 'ID', actor_id: 'SET' });
});

test('Sanity Subscription', async () => {
    const { environment, renderElements } = mockRelayEnvironment();

    const query = graphQLSelector({
        key: 'graphql remote subscription',
        environment,
        query: testFeedbackSubscription as any,
        variables: { input: { feedback_id: 'ID' } },
        mapResponse: ({ feedback_like_subscribe }) =>
            feedback_like_subscribe?.feedback?.seen_count,
    });

    const c = renderElements(React.createElement(ReadsAtom, { atom: query }));
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"loading"');

    const operation = environment.mock.getMostRecentOperation();

    act(() =>
        environment.mock.nextValue(
            operation,
            {
                data: {
                    feedback_like_subscribe: {
                        __typename: 'FeedbackLikeResponsePayload',
                        feedback: {
                            __typename: 'Feedback',
                            id: operation.request.variables.input.feedback_id,
                            seen_count: 123
                        }
                    }
                }
            }
        ),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('123');

    act(() =>
        environment.mock.nextValue(
            operation,
            {
                data: {
                    feedback_like_subscribe: {
                        __typename: 'FeedbackLikeResponsePayload',
                        feedback: {
                            __typename: 'Feedback',
                            id: operation.request.variables.input.feedback_id,
                            seen_count: 456
                        }
                    }
                }
            }
        ),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('456');

    act(() =>
        environment.mock.nextValue(
            operation,
            {
                data: {
                    feedback_like_subscribe: {
                        __typename: 'FeedbackLikeResponsePayload',
                        feedback: {
                            __typename: 'Feedback',
                            id: operation.request.variables.input.feedback_id,
                            seen_count: 789
                        }
                    }
                }
            }
        ),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('789');
});

test('GraphQL Fragments', async () => {
    const { environment, renderElements } = mockRelayEnvironment();

    const query = graphQLSelector({
        key: 'graphql fragment query',
        environment,
        query: testFeedbackFragmentQuery,
        variables: { id: 'ID1' },
        mapResponse: ({ feedback: response }, { variables }) => {
            expect(variables).toEqual({ id: 'ID1' });
            // Access fragment data directly from response instead of using readInlineData
            return response?.seen_count;
        },
    });

    const c = renderElements(React.createElement(ReadsAtom, { atom: query }));
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"loading"');

    act(() =>
        environment.mock.resolveMostRecentOperation(operation => ({
            data: {
                feedback: {
                    __typename: 'Feedback',
                    id: operation.request.variables.id,
                    seen_count: 123
                }
            }
        })),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('123');
}); 