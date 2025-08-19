/**
 * TypeScript port of RecoilRelay_graphQLQueryEffect.js
 */

'use strict';

import {AtomEffect, RecoilState} from 'recoil-next';
import {Variables} from 'react-relay';
import {IEnvironment, GraphQLTaggedNode} from 'relay-runtime';
import {EnvironmentKey, getRelayEnvironment} from './Environments';
import {fetchQuery} from 'react-relay';
import recoverableViolation from '../../shared/src/util/Recoil_recoverableViolation';
import {
  createOperationDescriptor,
  getRequest,
  handlePotentialSnapshotErrors,
} from 'relay-runtime';

// TODO Use async atom support to set atom to error state.
// For now, log as a recoverableViolation() so errors aren't lost.
function logError<T>(node: RecoilState<T>, msg: string) {
  recoverableViolation(
    `Error syncing atom "${node.key}" with GraphQL: ${msg}`,
    'recoil',
  );
}

function subscribeToLocalRelayCache<
  TVariables extends Variables,
  TData extends Record<string, any>,
>(
  environment: IEnvironment,
  query: GraphQLTaggedNode,
  variables: TVariables,
  onNext: (data: TData) => void,
): () => void {
  const request = getRequest(query);
  const operation = createOperationDescriptor(request, variables);
  const operationDisposable =
    typeof environment.retain === 'function'
      ? environment.retain(operation)
      : null;
  const snapshot =
    typeof environment.lookup === 'function'
      ? environment.lookup(operation.fragment)
      : null;
  const subscriptionDisposable =
    snapshot && typeof environment.subscribe === 'function'
      ? environment.subscribe(snapshot, newSnapshot => {
          // Handle Relay snapshot types properly
          const snapshotWithFields = newSnapshot as any;
          handlePotentialSnapshotErrors(
            environment,
            snapshotWithFields.missingRequiredFields,
            snapshotWithFields.relayResolverErrors,
          );
          if (!newSnapshot.isMissingData && newSnapshot.data != null) {
            onNext(newSnapshot.data as TData);
          }
        })
      : null;

  return () => {
    operationDisposable?.dispose();
    subscriptionDisposable?.dispose();
  };
}

interface GraphQLQueryEffectOptions<
  TVariables extends Variables,
  TData extends Record<string, any>,
  T,
> {
  environment: IEnvironment | EnvironmentKey;
  query: GraphQLTaggedNode;
  variables: TVariables | null;
  mapResponse: (data: TData) => T;
  subscribeToLocalMutations_UNSTABLE?: boolean;
}

/**
 * graphQLQueryEffect()
 * Initialize an atom based on the results of a GraphQL query.
 * - `environment`: The Relay Environment or an EnvironmentKey to match with
 *   the environment provided with `<RecoilRelayEnvironemnt>`.
 * - `query`: The GraphQL query to query.
 * - `variables`: Variables object provided as input to GraphQL query.
 *   If null, then skip query and use default value.
 * - `mapResponse`: Callback to map the query response to the atom value.
 * - `subscribeToLocalMutations_UNSTABLE` - By default this effect will subscribe to
 *   mutations from local `commitMutation()` or `graphQLMutationEffect()` for the
 *   same part of the graph.  If you also need to subscribe to remote mutations,
 *   then use `graphQLSubscriptionEffect()`.
 */
export function graphQLQueryEffect<
  TVariables extends Variables,
  TData extends Record<string, any>,
  T = TData,
>({
  environment: environmentOpt,
  query,
  variables,
  mapResponse,
  subscribeToLocalMutations_UNSTABLE = true,
}: GraphQLQueryEffectOptions<TVariables, TData, T>): AtomEffect<T> {
  return ({node, setSelf, trigger, storeID, parentStoreID_UNSTABLE}) => {
    if (variables == null) {
      return;
    }

    let querySubscription: any;
    let localSubscriptionCleanup: (() => void) | undefined;
    const environment = getRelayEnvironment(
      environmentOpt,
      storeID,
      parentStoreID_UNSTABLE,
    );

    // Initialize value
    if (trigger === 'get') {
      let initialResolve: ((value: T) => void) | undefined;
      let initialReject: ((error: Error) => void) | undefined;
      setSelf(
        new Promise<T>((resolve, reject) => {
          initialResolve = resolve;
          initialReject = reject;
        }),
      );

      try {
        const queryObservable = fetchQuery(environment, query, variables, {
          fetchPolicy: 'network-only', // Force network request, don't use cached empty data
        });
        queryObservable
          .toPromise()
          .then((response: unknown) => {
            const data = mapResponse(response as TData);
            initialResolve?.(data);
            setSelf(data);
          })
          .catch((error: Error) => {
            initialReject?.(error);
            logError(node, error.message ?? 'Error');
          });
      } catch (error: any) {
        initialReject?.(error);
        logError(node, error.message ?? 'Error');
      }
    }

    // Subscribe to local changes to update atom state.
    // To get remote mutations please use graphQLSubscriptionEffect()
    if (subscribeToLocalMutations_UNSTABLE) {
      try {
        localSubscriptionCleanup = subscribeToLocalRelayCache(
          environment,
          query,
          variables,
          (data: TData) => setSelf(mapResponse(data)),
        );
      } catch (error: any) {
        logError(node, error.message ?? 'Subscription error');
      }
    }

    return () => {
      querySubscription?.unsubscribe();
      localSubscriptionCleanup?.();
    };
  };
}
