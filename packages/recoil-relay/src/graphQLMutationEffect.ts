/**
 * TypeScript port of RecoilRelay_graphQLMutationEffect.js
 */

'use strict';

import {AtomEffect, RecoilState, DefaultValue} from 'recoil-next';
import {Variables} from 'react-relay';
import {
  IEnvironment,
  GraphQLTaggedNode,
  SelectorStoreUpdater,
  UploadableMap,
} from 'relay-runtime';
import {EnvironmentKey, getRelayEnvironment} from './Environments';
import {commitMutation} from 'react-relay';
import recoverableViolation from '../../shared/src/util/Recoil_recoverableViolation';

// TODO Use async atom support to set atom to error state.
// For now, log as a recoverableViolation() so errors aren't lost.
function logError<T>(node: RecoilState<T>, msg: string) {
  recoverableViolation(
    `Error syncing atom "${node.key}" with GraphQL: ${msg}`,
    'recoil',
  );
}

interface GraphQLMutationEffectOptions<
  T,
  TVariables extends Variables,
  TResponse extends Record<string, any>,
> {
  environment: IEnvironment | EnvironmentKey;
  mutation: GraphQLTaggedNode;
  variables: (newData: T) => TVariables | null;
  updater_UNSTABLE?: SelectorStoreUpdater<TResponse>;
  optimisticUpdater_UNSTABLE?: SelectorStoreUpdater<TResponse>;
  optimisticResponse_UNSTABLE?: (newData: T) => TResponse;
  uploadables_UNSTABLE?: UploadableMap;
}

/**
 * graphQLMutationEffect()
 * Commit a GraphQL mutation each time the atom value is mutated.
 * - `environment`: The Relay Environment or an EnvironmentKey to match with
 *   the environment provided with `<RecoilRelayEnvironemnt>`.
 * - `mutation`: The GraphQL mutation.
 * - `variables`: Variables object provided as input to GraphQL mutation.  It is
 *   a callback that receives the updated atom value as the parameter.
 *   If null, then skip mutation.
 * - `updater`: Optional `updater()` function passed to `commitMutation()`.
 * - `optimisticUpdater`: Optional `optimisticUpdater()` function passed to `commitMutation()`.
 * - `optimisticResponse`: Optional optimistic response passed to `commitMutation()`.
 * - `uploadables`: Optional `uploadables` passed to `commitMutation()`.
 */
export function graphQLMutationEffect<
  T,
  TVariables extends Variables,
  TResponse extends Record<string, any> = Record<string, any>,
>({
  environment: environmentOpt,
  mutation,
  variables,
  updater_UNSTABLE: updater,
  optimisticUpdater_UNSTABLE: optimisticUpdater,
  optimisticResponse_UNSTABLE: optimisticResponse,
  uploadables_UNSTABLE: uploadables,
}: GraphQLMutationEffectOptions<T, TVariables, TResponse>): AtomEffect<T> {
  let currentMutationID = 0;
  return ({node, onSet, setSelf, storeID, parentStoreID_UNSTABLE}) => {
    const environment = getRelayEnvironment(
      environmentOpt,
      storeID,
      parentStoreID_UNSTABLE,
    );

    // Local atom mutations will sync to update remote state
    // Treat as write-through cache, so local atom will update immediatly
    // and then write through to GraphQL mutation.
    onSet((newValue, oldValue) => {
      const mutationID = ++currentMutationID;
      const mutationVariables = variables(newValue);
      if (mutationVariables != null) {
        commitMutation(environment, {
          mutation,
          variables: mutationVariables,
          onError: (error: Error) => {
            logError(node, error.message ?? 'GraphQL Mutation');
            // TODO, use logError() to set atom to error state instead?
            if (mutationID === currentMutationID) {
              setSelf((potentiallyBadValue: T | DefaultValue) =>
                // Avoid reverting value if atom was set in the meantime even if
                // the newer commitMutation() hasn't started yet.
                potentiallyBadValue === newValue
                  ? oldValue
                  : potentiallyBadValue,
              );
            }
          },
          updater: updater as any,
          optimisticUpdater: optimisticUpdater as any,
          optimisticResponse: optimisticResponse?.(newValue) as any,
          uploadables,
        });
      }
    });
  };
}
