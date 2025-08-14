/**
 * TypeScript port of RecoilRelay_graphQLSelectorFamily.js
 */

'use strict';

import { Variables } from 'react-relay';
import {
    AtomEffect,
    DefaultValue,
    GetRecoilValue,
    ResetRecoilState,
    SetRecoilState,
    atomFamily,
    selectorFamily
} from 'recoil-next';
import { GraphQLTaggedNode, IEnvironment } from 'relay-runtime';
import nullthrows from '../../shared/src/util/Recoil_nullthrows';
import { EnvironmentKey } from './Environments';
import { graphQLMutationEffect } from './graphQLMutationEffect';
import { graphQLQueryEffect } from './graphQLQueryEffect';
import { graphQLSubscriptionEffect } from './graphQLSubscriptionEffect';

// Compatible parameter type that includes undefined but not void/null 
// to satisfy SerializableParam constraint from older type definitions
type Primitive = undefined | boolean | number | string;
interface HasToJSON {
    toJSON(): Parameter;
}
export type Parameter =
    | Primitive
    | HasToJSON
    | ReadonlySet<Parameter>
    | ReadonlyMap<Parameter, Parameter>
    | ReadonlyArray<Parameter>
    | { [key: string]: Parameter };

interface GraphQLSelectorFamilyOptions<
    P extends Parameter,
    TVariables extends Variables,
    TData extends Record<string, any>,
    T
> {
    key: string;
    environment: IEnvironment | EnvironmentKey;
    query: GraphQLTaggedNode;
    variables: TVariables | ((param: P) => TVariables | null | ((callbacks: { get: GetRecoilValue }) => TVariables | null));
    mapResponse: (
        data: TData,
        callbacks: { get: GetRecoilValue; variables: TVariables }
    ) => T | ((param: P) => T);
    default?: T | ((param: P) => T);
    mutations?: {
        mutation: GraphQLTaggedNode;
        variables: (data: T) => TVariables | null | ((param: P) => TVariables | null);
    };
}

type InternalAtomData<P, TData, T> =
    | { source: 'local'; parameter: P; data: T }
    | { source: 'remote'; response: TData }
    | DefaultValue;

/**
 * graphQLSelectorFamily() implements a selectorFamily() that syncs with a
 * GraphQL Query or Subscription. The family parameter or other upstream
 * atoms/selectors can be used to define the query variables or transform the
 * results.
 */
export function graphQLSelectorFamily<
    P extends Parameter,
    TVariables extends Variables,
    TData extends Record<string, any>,
    T = TData
>({
    key,
    environment,
    query,
    variables,
    mapResponse,
    mutations,
    ...options
}: GraphQLSelectorFamilyOptions<P, TVariables, TData, T>) {
    const internalAtoms = atomFamily<InternalAtomData<P, TData, T>, TVariables | null>({
        key,
        default: new DefaultValue(),
        effects: ((vars: TVariables | null): ReadonlyArray<AtomEffect<InternalAtomData<P, TData, T>>> => {
            const effects: AtomEffect<InternalAtomData<P, TData, T>>[] = [
                // Check if it's a query or subscription based on operationKind
                (query as any).params?.operationKind === 'query'
                    ? (graphQLQueryEffect({
                        environment,
                        variables: vars,
                        query,
                        mapResponse: (response: TData) => ({ source: 'remote', response } as const),
                    }) as AtomEffect<InternalAtomData<P, TData, T>>)
                    : (graphQLSubscriptionEffect({
                        environment,
                        variables: vars,
                        subscription: query,
                        mapResponse: (response: TData) => ({ source: 'remote', response } as const),
                    }) as AtomEffect<InternalAtomData<P, TData, T>>),
            ];

            if (mutations) {
                effects.push(
                    graphQLMutationEffect({
                        environment,
                        mutation: mutations.mutation,
                        variables: (localUpdate: InternalAtomData<P, TData, T>) => {
                            if (
                                // commit mutation only if atom is updated locally
                                typeof localUpdate === 'object' &&
                                localUpdate !== null &&
                                'source' in localUpdate &&
                                localUpdate.source === 'local' &&
                                // Avoid mutation operation if user issued a reset and
                                // did not provide a default value.
                                !(localUpdate instanceof DefaultValue)
                            ) {
                                const variablesIntermediate = mutations.variables(localUpdate.data);
                                return typeof variablesIntermediate === 'function'
                                    ? variablesIntermediate(localUpdate.parameter)
                                    : variablesIntermediate;
                            } else {
                                return null;
                            }
                        },
                    }) as AtomEffect<InternalAtomData<P, TData, T>>
                );
            }

            return effects;
        }) as any,
    });

    function getVariables(parameter: P, get: GetRecoilValue): TVariables | null {
        const variablesIntermediate:
            | null
            | TVariables
            | ((callbacks: { get: GetRecoilValue }) => TVariables | null) =
            typeof variables === 'function' ? variables(parameter) : variables;
        return typeof variablesIntermediate === 'function'
            ? variablesIntermediate({ get })
            : variablesIntermediate;
    }

    const defaultValue = (parameter: P): T =>
        typeof options.default === 'function'
            ? (options.default as (param: P) => T)(parameter)
            : (options.default as T);

    return selectorFamily<T, P>({
        key: `${key}__Wrapper`,
        get:
            (parameter: P) =>
                ({ get }) => {
                    const vars = getVariables(parameter, get);
                    const result = get(internalAtoms(vars));
                    if (result instanceof DefaultValue) {
                        return 'default' in options
                            ? defaultValue(parameter)
                            : new Promise(() => { });
                    }
                    if (result.source === 'local') {
                        return result.data;
                    }
                    const mapped = mapResponse(result.response, {
                        get,
                        variables: nullthrows(vars),
                    });
                    return typeof mapped === 'function'
                        ? (mapped as (param: P) => T)(parameter)
                        : mapped;
                },
        set:
            (parameter: P) =>
                ({ set, get }: { set: SetRecoilState; get: GetRecoilValue; reset: ResetRecoilState }, newValue: T | DefaultValue) => {
                    set(
                        internalAtoms(getVariables(parameter, get)),
                        newValue instanceof DefaultValue
                            ? 'default' in options
                                ? { source: 'local', parameter, data: defaultValue(parameter) }
                                : newValue
                            : { source: 'local', parameter, data: newValue },
                    );
                },
    });
} 