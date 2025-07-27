/**
 * TypeScript port of RecoilRelay_MockQueries.js
 */

// Mock GraphQL queries for testing
const mockGraphQL = (query: string) => ({
  kind: 'Request',
  fragment: { kind: 'Fragment', name: 'TestFragment' },
  operation: { kind: 'Operation', name: 'TestOperation' },
  params: { name: 'TestQuery', operationKind: 'query' },
  id: null,
  text: query,
});

export const testFeedbackQuery = mockGraphQL(`
  query RecoilRelayMockQueriesFeedbackQuery($id: ID!) {
    feedback(id: $id) {
      id
      seen_count
    }
  }
`);

export const testFeedbackSubscription = mockGraphQL(`
  subscription RecoilRelayMockQueriesFeedbackSubscription(
    $input: FeedbackLikeSubscribeData!
  ) {
    feedback_like_subscribe(data: $input) {
      ... on FeedbackLikeResponsePayload {
        feedback {
          id
          seen_count
        }
      }
    }
  }
`);

export const testFeedbackMutation = mockGraphQL(`
  mutation RecoilRelayMockQueriesMutation($data: FeedbackLikeData!) {
    feedback_like(data: $data) {
      feedback {
        id
      }
      liker {
        id
      }
    }
  }
`);

export const testFeedbackFragment = mockGraphQL(`
  fragment RecoilRelayMockQueriesFeedbackFragment on Feedback {
    id
    seen_count
  }
`);

export const testFeedbackFragmentQuery = mockGraphQL(`
  query RecoilRelayMockQueriesFeedbackFragmentQuery($id: ID!) {
    feedback(id: $id) {
      ...RecoilRelayMockQueriesFeedbackFragment
    }
  }
`); 