/**
 * TypeScript port of RecoilRelay_graphQLSelector.js
 */

'use strict';

import { GetRecoilValue, RecoilState } from 'recoil';
import { Variables } from 'react-relay';
import { IEnvironment, GraphQLTaggedNode } from 'relay-runtime';
import { EnvironmentKey } from './Environments';
import { graphQLSelectorFamily } from './graphQLSelectorFamily';

interface GraphQLSelectorOptions<TVariables extends Variables, T> {
    key: string;
    environment: IEnvironment | EnvironmentKey;
    query: GraphQLTaggedNode;
    variables: TVariables | ((callbacks: { get: GetRecoilValue }) => TVariables | null);
    mapResponse: (
        response: any,
        callbacks: { get: GetRecoilValue; variables: TVariables }
    ) => T;
    default?: T;
    mutations?: {
        mutation: GraphQLTaggedNode;
        variables: (newData: T) => TVariables | null;
    };
}

/**
 * graphQLSelector() implements a Recoil selector that syncs with a
 * GraphQL Query or Subscription. Other upstream atoms/selectors can be used
 * to help define the query variables or transform the results.
 *
 * The selector is writable to act as a local cache of the server.
 * A GraphQL Mutation may also be provided to use the selector as a
 * write-through cache for updates to commit to the server.
 */
export function graphQLSelector<TVariables extends Variables, T>({
    variables,
    mutations,
    ...options
}: GraphQLSelectorOptions<TVariables, T>): RecoilState<T> {
    return graphQLSelectorFamily({
        ...options,
        variables: () => (cbs: { get: GetRecoilValue }) =>
            typeof variables === 'function' ? variables(cbs) : variables,
        mutations: mutations == null ? undefined : { ...mutations },
    })(undefined); // Pass undefined as the parameter
} 