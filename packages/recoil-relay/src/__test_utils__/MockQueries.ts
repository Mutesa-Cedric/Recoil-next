/**
 * TypeScript port of RecoilRelay_MockQueries.js
 */

// Mock GraphQL queries for testing that properly mirrors Relay's expected structure
const mockGraphQL = (
  name: string,
  query: string,
  operationKind = 'query',
  argumentDefinitions: any[] = [],
) => {
  // Create the query object that Relay expects
  const concreteRequest = {
    kind: 'Request',
    fragment: {
      argumentDefinitions: argumentDefinitions,
      kind: 'Fragment',
      metadata: null,
      name: name + 'Fragment',
      selections: [
        {
          kind: 'LinkedField',
          name: 'feedback',
          storageKey: null,
          type: 'Feedback',
          args: [{kind: 'Variable', name: 'id', variableName: 'id'}],
          selections: [
            {kind: 'ScalarField', name: 'id', storageKey: null},
            {kind: 'ScalarField', name: 'seen_count', storageKey: null},
          ],
        },
      ],
      type: 'Query',
    },
    operation: {
      argumentDefinitions: argumentDefinitions,
      kind: 'Operation',
      name: name,
      selections: [
        {
          kind: 'LinkedField',
          name: 'feedback',
          storageKey: null,
          type: 'Feedback',
          args: [{kind: 'Variable', name: 'id', variableName: 'id'}],
          selections: [
            {kind: 'ScalarField', name: 'id', storageKey: null},
            {kind: 'ScalarField', name: 'seen_count', storageKey: null},
          ],
        },
      ],
    },
    params: {
      cacheID: `mock-${name}-cache-id`,
      id: `mock-${name}-id`,
      metadata: {
        argumentDefinitions: argumentDefinitions,
      },
      name: name,
      operationKind: operationKind,
      text: null,
    },
  };

  return concreteRequest;
};

export const testFeedbackQuery = mockGraphQL(
  'TestFeedbackQuery',
  `
  query RecoilRelayMockQueriesFeedbackQuery($id: ID!) {
    feedback(id: $id) {
      id
      seen_count
    }
  }
`,
  'query',
  [{name: 'id', type: 'ID!'}],
);

export const testFeedbackSubscription = {
  kind: 'Request',
  fragment: {
    argumentDefinitions: [{name: 'input', type: 'FeedbackLikeSubscribeData!'}],
    kind: 'Fragment',
    metadata: null,
    name: 'TestFeedbackSubscriptionFragment',
    selections: [
      {
        kind: 'LinkedField',
        name: 'feedback_like_subscribe',
        storageKey: null,
        args: [{kind: 'Variable', name: 'data', variableName: 'input'}],
        selections: [
          {
            kind: 'InlineFragment',
            type: 'FeedbackLikeResponsePayload',
            selections: [
              {
                kind: 'LinkedField',
                name: 'feedback',
                storageKey: null,
                args: [],
                selections: [
                  {kind: 'ScalarField', name: 'id', storageKey: null},
                  {kind: 'ScalarField', name: 'seen_count', storageKey: null},
                ],
              },
            ],
          },
        ],
      },
    ],
    type: 'Subscription',
  },
  operation: {
    argumentDefinitions: [{name: 'input', type: 'FeedbackLikeSubscribeData!'}],
    kind: 'Operation',
    name: 'TestFeedbackSubscription',
    selections: [
      {
        kind: 'LinkedField',
        name: 'feedback_like_subscribe',
        storageKey: null,
        args: [{kind: 'Variable', name: 'data', variableName: 'input'}],
        selections: [
          {
            kind: 'InlineFragment',
            type: 'FeedbackLikeResponsePayload',
            selections: [
              {
                kind: 'LinkedField',
                name: 'feedback',
                storageKey: null,
                args: [],
                selections: [
                  {kind: 'ScalarField', name: 'id', storageKey: null},
                  {kind: 'ScalarField', name: 'seen_count', storageKey: null},
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  params: {
    cacheID: 'mock-TestFeedbackSubscription-cache-id',
    id: 'mock-TestFeedbackSubscription-id',
    metadata: {
      argumentDefinitions: [
        {name: 'input', type: 'FeedbackLikeSubscribeData!'},
      ],
    },
    name: 'TestFeedbackSubscription',
    operationKind: 'subscription',
    text: null,
  },
};

export const testFeedbackMutation = {
  kind: 'Request',
  fragment: {
    argumentDefinitions: [{name: 'data', type: 'FeedbackLikeData!'}],
    kind: 'Fragment',
    metadata: null,
    name: 'TestFeedbackMutationFragment',
    selections: [
      {
        kind: 'LinkedField',
        name: 'feedback_like',
        storageKey: null,
        args: [{kind: 'Variable', name: 'data', variableName: 'data'}],
        selections: [
          {
            kind: 'LinkedField',
            name: 'feedback',
            storageKey: null,
            args: [],
            selections: [{kind: 'ScalarField', name: 'id', storageKey: null}],
          },
          {
            kind: 'LinkedField',
            name: 'liker',
            storageKey: null,
            args: [],
            selections: [{kind: 'ScalarField', name: 'id', storageKey: null}],
          },
        ],
      },
    ],
    type: 'Mutation',
  },
  operation: {
    argumentDefinitions: [{name: 'data', type: 'FeedbackLikeData!'}],
    kind: 'Operation',
    name: 'TestFeedbackMutation',
    selections: [
      {
        kind: 'LinkedField',
        name: 'feedback_like',
        storageKey: null,
        args: [{kind: 'Variable', name: 'data', variableName: 'data'}],
        selections: [
          {
            kind: 'LinkedField',
            name: 'feedback',
            storageKey: null,
            args: [],
            selections: [{kind: 'ScalarField', name: 'id', storageKey: null}],
          },
          {
            kind: 'LinkedField',
            name: 'liker',
            storageKey: null,
            args: [],
            selections: [{kind: 'ScalarField', name: 'id', storageKey: null}],
          },
        ],
      },
    ],
  },
  params: {
    cacheID: 'mock-TestFeedbackMutation-cache-id',
    id: 'mock-TestFeedbackMutation-id',
    metadata: {
      argumentDefinitions: [{name: 'data', type: 'FeedbackLikeData!'}],
    },
    name: 'TestFeedbackMutation',
    operationKind: 'mutation',
    text: null,
  },
};

export const testFeedbackFragment = {
  argumentDefinitions: [],
  kind: 'Fragment',
  metadata: null,
  name: 'RecoilRelayMockQueriesFeedbackFragment',
  selections: [
    {kind: 'ScalarField', name: 'id', storageKey: null},
    {kind: 'ScalarField', name: 'seen_count', storageKey: null},
  ],
  type: 'Feedback',
};

export const testFeedbackFragmentQuery = mockGraphQL(
  'TestFeedbackFragmentQuery',
  `
  query RecoilRelayMockQueriesFeedbackFragmentQuery($id: ID!) {
    feedback(id: $id) {
      ...RecoilRelayMockQueriesFeedbackFragment
    }
  }
`,
  'query',
  [{name: 'id', type: 'ID!'}],
);
