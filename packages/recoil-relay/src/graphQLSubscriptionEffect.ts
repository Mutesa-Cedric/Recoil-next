/**
 * TypeScript port of RecoilRelay_graphQLSubscriptionEffect.js
 */

'use strict';

import { AtomEffect, RecoilState } from 'recoil-next';
import { Variables } from 'react-relay';
import { IEnvironment, GraphQLTaggedNode } from 'relay-runtime';
import { EnvironmentKey, getRelayEnvironment } from './Environments';
import { requestSubscription } from 'react-relay';
import recoverableViolation from '../../shared/src/util/Recoil_recoverableViolation';

// TODO Use async atom support to set atom to error state.
// For now, log as a recoverableViolation() so errors aren't lost.
function logError<T>(node: RecoilState<T>, msg: string) {
    recoverableViolation(
        `Error syncing atom "${node.key}" with GraphQL: ${msg}`,
        'recoil',
    );
}

interface GraphQLSubscriptionEffectOptions<
    TVariables extends Variables,
    TData extends Record<string, any>,
    T
> {
    environment: IEnvironment | EnvironmentKey;
    subscription: GraphQLTaggedNode;
    variables: TVariables | null;
    mapResponse: (data: TData) => T;
}

/**
 * graphQLSubscriptionEffect()
 * Initialize and subscribe an atom to a GraphQL subscription.
 * - `environment`: The Relay Environment or an EnvironmentKey to match with
 *   the environment provided with `<RecoilRelayEnvironemnt>`.
 * - `subscription`: The GraphQL subscription to query.
 * - `variables`: Variables object provided as input to GraphQL subscription.
 *   If null, then skip subscription and use default value.
 * - `mapResponse`: Callback to map the subscription response to the atom value.
 */
export function graphQLSubscriptionEffect<
    TVariables extends Variables,
    TData extends Record<string, any>,
    T = TData
>({
    environment: environmentOpt,
    subscription,
    variables,
    mapResponse,
}: GraphQLSubscriptionEffectOptions<TVariables, TData, T>): AtomEffect<T> {
    return ({ node, setSelf, trigger, storeID, parentStoreID_UNSTABLE }) => {
        if (variables == null) {
            return;
        }

        const environment = getRelayEnvironment(
            environmentOpt,
            storeID,
            parentStoreID_UNSTABLE,
        );

        let initialResolve: ((value: T) => void) | undefined;
        let initialReject: ((error: Error) => void) | undefined;
        if (trigger === 'get') {
            setSelf(
                new Promise<T>((resolve, reject) => {
                    initialResolve = resolve;
                    initialReject = reject;
                }),
            );
        }

        // Subscribe to remote changes to update atom state
        let graphQLSubscriptionDisposable: any;
        try {
            graphQLSubscriptionDisposable = requestSubscription(environment, {
                subscription,
                variables,
                onNext: (response: unknown) => {
                    const typedResponse = response as TData | null;
                    if (typedResponse != null) {
                        const data = mapResponse(typedResponse);
                        initialResolve?.(data);
                        setSelf(data);
                    }
                },
                // TODO use Async atom support to set atom to error state on
                // subsequent errors during incremental updates.
                onError: (error: Error) => {
                    initialReject?.(error);
                    logError(node, error.message ?? 'Error');
                },
            });
        } catch (error: any) {
            initialReject?.(error);
            logError(node, error.message ?? 'Subscription Error');
        }

        return () => {
            graphQLSubscriptionDisposable?.dispose();
        };
    };
} 