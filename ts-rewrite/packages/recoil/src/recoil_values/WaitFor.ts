/**
 * TypeScript port of Recoil_WaitFor.js
 */

'use strict';

import {
    loadableWithError,
    loadableWithPromise,
    loadableWithValue,
    Loadable,
} from '../adt/Loadable';
import { RecoilValue, RecoilValueReadOnly } from '../core/RecoilValue';
import { GetRecoilValue } from './callbackTypes';
import selector from './selector';
import selectorFamily from './selectorFamily';
import isPromise from '../../../shared/src/util/Recoil_isPromise';

function concurrentRequests(
    getRecoilValue: GetRecoilValue,
    deps: ReadonlyArray<RecoilValue<unknown>>,
): [Array<unknown>, Array<unknown>] {
    const results = Array(deps.length).fill(undefined);
    const exceptions = Array(deps.length).fill(undefined);
    for (const [i, dep] of deps.entries()) {
        try {
            results[i] = getRecoilValue(dep);
        } catch (e) {
            exceptions[i] = e;
        }
    }
    return [results, exceptions];
}

function isError(exp: unknown): exp is Error {
    return exp != null && !isPromise(exp);
}

function unwrapDependencies(
    dependencies:
        | ReadonlyArray<RecoilValueReadOnly<unknown>>
        | { [key: string]: RecoilValueReadOnly<unknown> },
): ReadonlyArray<RecoilValue<unknown>> {
    return Array.isArray(dependencies)
        ? dependencies
        : Object.getOwnPropertyNames(dependencies).map(key => (dependencies as any)[key]);
}

function wrapResults<T>(
    dependencies:
        | ReadonlyArray<RecoilValueReadOnly<unknown>>
        | { [key: string]: RecoilValueReadOnly<unknown> },
    results: Array<T>,
): Array<T> | { [key: string]: T } {
    return Array.isArray(dependencies)
        ? results
        : Object.getOwnPropertyNames(dependencies).reduce(
            (out, key, idx) => ({ ...out, [key as string]: results[idx] }),
            {},
        );
}

function wrapLoadables(
    dependencies:
        | ReadonlyArray<RecoilValueReadOnly<unknown>>
        | { [key: string]: RecoilValueReadOnly<unknown> },
    results: Array<unknown>,
    exceptions: Array<unknown>,
): Array<Loadable<unknown>> | { [key: string]: Loadable<unknown> } {
    const output = exceptions.map((exception, idx) =>
        exception == null
            ? loadableWithValue(results[idx])
            : isPromise(exception)
                ? loadableWithPromise(exception as Promise<unknown>)
                : loadableWithError<unknown>(exception as Error),
    );
    return wrapResults(dependencies, output);
}

function combineAsyncResultsWithSyncResults<T>(
    syncResults: Array<T>,
    asyncResults: Array<T>,
): Array<T> {
    return asyncResults.map((result, idx) =>
        result === undefined ? syncResults[idx] : result,
    );
}

type RecoilValues =
    | ReadonlyArray<RecoilValueReadOnly<unknown>>
    | Readonly<{ [key: string]: RecoilValueReadOnly<unknown> }>;

export const waitForNone: <T extends RecoilValues>(
    recoilValues: T,
) => RecoilValueReadOnly<
    T extends
    | ReadonlyArray<RecoilValueReadOnly<any>>
    | Readonly<{}>
    ? {
        [K in keyof T]: Loadable<
            T[K] extends RecoilValue<infer V> ? V : never
        >;
    }
    : never
> = selectorFamily({
    key: '__waitForNone',
    get: (dependencies: RecoilValues) => ({ get }) => {
        const deps = unwrapDependencies(dependencies);
        const [results, exceptions] = concurrentRequests(get, deps);
        return wrapLoadables(dependencies, results, exceptions);
    },
    dangerouslyAllowMutability: true,
}) as any;

export const waitForAny: <T extends RecoilValues>(
    recoilValues: T,
) => RecoilValueReadOnly<
    T extends
    | ReadonlyArray<RecoilValueReadOnly<any>>
    | Readonly<{}>
    ? {
        [K in keyof T]: Loadable<
            T[K] extends RecoilValue<infer V> ? V : never
        >;
    }
    : never
> = selectorFamily({
    key: '__waitForAny',
    get: (dependencies: RecoilValues) => ({ get }) => {
        const deps = unwrapDependencies(dependencies);
        const [results, exceptions] = concurrentRequests(get, deps);

        if (exceptions.some(exp => !isPromise(exp))) {
            return wrapLoadables(dependencies, results, exceptions);
        }

        return new Promise(resolve => {
            for (const [i, exp] of exceptions.entries()) {
                if (isPromise(exp)) {
                    (exp as Promise<unknown>)
                        .then(result => {
                            results[i] = result;
                            exceptions[i] = undefined;
                            resolve(wrapLoadables(dependencies, results, exceptions));
                        })
                        .catch(error => {
                            exceptions[i] = error;
                            resolve(wrapLoadables(dependencies, results, exceptions));
                        });
                }
            }
        });
    },
    dangerouslyAllowMutability: true,
}) as any;

export const waitForAll: <T extends RecoilValues>(
    recoilValues: T,
) => RecoilValueReadOnly<
    T extends
    | ReadonlyArray<RecoilValueReadOnly<any>>
    | Readonly<{}>
    ? { [K in keyof T]: T[K] extends RecoilValue<infer V> ? V : never }
    : never
> = selectorFamily({
    key: '__waitForAll',
    get: (dependencies: RecoilValues) => ({ get }) => {
        const deps = unwrapDependencies(dependencies);
        const [results, exceptions] = concurrentRequests(get, deps);

        if (exceptions.every(exp => exp == null)) {
            return wrapResults(dependencies, results);
        }

        const error = exceptions.find(isError);
        if (error != null) {
            throw error;
        }

        return Promise.all(exceptions).then(exceptionResults =>
            wrapResults(
                dependencies,
                combineAsyncResultsWithSyncResults(results, exceptionResults),
            ),
        );
    },
    dangerouslyAllowMutability: true,
}) as any;

export const waitForAllSettled: <T extends RecoilValues>(
    recoilValues: T,
) => RecoilValueReadOnly<
    T extends
    | ReadonlyArray<RecoilValueReadOnly<any>>
    | Readonly<{}>
    ? {
        [K in keyof T]: Loadable<
            T[K] extends RecoilValue<infer V> ? V : never
        >;
    }
    : never
> = selectorFamily({
    key: '__waitForAllSettled',
    get: (dependencies: RecoilValues) => ({ get }) => {
        const deps = unwrapDependencies(dependencies);
        const [results, exceptions] = concurrentRequests(get, deps);

        if (exceptions.every(exp => !isPromise(exp))) {
            return wrapLoadables(dependencies, results, exceptions);
        }

        return (
            Promise.all(
                exceptions.map((exp, i) =>
                    isPromise(exp)
                        ? (exp as Promise<unknown>)
                            .then(result => {
                                results[i] = result;
                                exceptions[i] = undefined;
                            })
                            .catch(error => {
                                results[i] = undefined;
                                exceptions[i] = error;
                            })
                        : null,
                ),
            )
                .then(() => wrapLoadables(dependencies, results, exceptions))
        );
    },
    dangerouslyAllowMutability: true,
}) as any;

export const noWait: <T>(
    recoilValue: RecoilValue<T>,
) => RecoilValueReadOnly<Loadable<T>> = selectorFamily({
    key: '__noWait',
    get: (dependency: RecoilValue<unknown>) => ({ get }) => {
        try {
            return selector.value(loadableWithValue(get(dependency)));
        } catch (exception) {
            return selector.value(
                isPromise(exception)
                    ? loadableWithPromise(exception)
                    : loadableWithError(exception as Error),
            );
        }
    },
    dangerouslyAllowMutability: true,
}) as any; 