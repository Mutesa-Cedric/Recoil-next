/**
 * TypeScript port of Recoil_selectorFamily.js
 */

'use strict';
import cacheFromPolicy from '../caches/cacheFromPolicy';
import { CachePolicy, CachePolicyWithoutEviction } from '../caches/CachePolicy';
import { setConfigDeletionHandler } from '../core/Node';
import { DefaultValue } from '../core/Node';
import { RecoilState, RecoilValue, RecoilValueReadOnly } from '../core/RecoilValue';
import { RetainedBy } from '../core/RetainedBy';
import { Loadable } from '../adt/Loadable';
import { WrappedValue } from '../adt/Wrapper';
import selector, { GetCallback } from './selector';
import {
    GetRecoilValue,
    ResetRecoilState,
    SetRecoilState,
} from './callbackTypes';
import err from '../../../shared/src/util/Recoil_err';
import stableStringify from '../../../shared/src/util/Recoil_stableStringify';

type Primitive = void | null | boolean | number | string;
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

type BaseSelectorFamilyOptions<P extends Parameter> = Readonly<{
    key: string;
    cachePolicyForParams_UNSTABLE?: CachePolicyWithoutEviction;
    cachePolicy_UNSTABLE?: CachePolicy;
    dangerouslyAllowMutability?: boolean;
    retainedBy_UNSTABLE?: RetainedBy | ((param: P) => RetainedBy);
}>;

export type ReadOnlySelectorFamilyOptions<T, P extends Parameter> = Readonly<
    BaseSelectorFamilyOptions<P> & {
        get: (
            param: P,
        ) => (callbacks: {
            get: GetRecoilValue;
            getCallback: GetCallback<T>;
        }) => Promise<T> | Loadable<T> | WrappedValue<T> | RecoilValue<T> | T;
    }
>;

export type ReadWriteSelectorFamilyOptions<T, P extends Parameter> = Readonly<
    ReadOnlySelectorFamilyOptions<T, P> & {
        set: (
            param: P,
        ) => (
            callbacks: {
                set: SetRecoilState;
                get: GetRecoilValue;
                reset: ResetRecoilState;
            },
            newValue: T | DefaultValue,
        ) => void;
    }
>;

export type SelectorFamilyOptions<T, P extends Parameter> =
    | ReadOnlySelectorFamilyOptions<T, P>
    | ReadWriteSelectorFamilyOptions<T, P>;

let nextIndex = 0;

export function selectorFamily<T, Params extends Parameter>(
    options: ReadOnlySelectorFamilyOptions<T, Params>,
): (params: Params) => RecoilValueReadOnly<T>;
export function selectorFamily<T, Params extends Parameter>(
    options: ReadWriteSelectorFamilyOptions<T, Params>,
): (params: Params) => RecoilState<T>;
export function selectorFamily<T, Params extends Parameter>(
    options: SelectorFamilyOptions<T, Params>,
): (params: Params) => RecoilValue<T> {
    const selectorCache = cacheFromPolicy<
        Params,
        RecoilState<T> | RecoilValueReadOnly<T>
    >({
        equality: options.cachePolicyForParams_UNSTABLE?.equality ?? 'value',
        eviction: 'keep-all',
    });

    return (params: Params) => {
        let cachedSelector;
        try {
            cachedSelector = selectorCache.get(params);
        } catch (error) {
            throw err(
                `Problem with cache lookup for selector ${options.key}: ${(
                    error as Error
                ).message}`,
            );
        }
        if (cachedSelector != null) {
            return cachedSelector;
        }

        const myKey = `${options.key}__selectorFamily/${stableStringify(params, {
            allowFunctions: true,
        }) ?? 'void'
            }/${nextIndex++}`;

        const myGet = (callbacks: {
            get: GetRecoilValue;
            getCallback: GetCallback<T>;
        }) => options.get(params)(callbacks);

        const myCachePolicy = options.cachePolicy_UNSTABLE;

        const retainedBy =
            typeof options.retainedBy_UNSTABLE === 'function'
                ? options.retainedBy_UNSTABLE(params)
                : options.retainedBy_UNSTABLE;

        let newSelector;
        if ('set' in options && options.set != null) {
            const set = options.set;
            const mySet = (
                callbacks: {
                    get: GetRecoilValue;
                    reset: ResetRecoilState;
                    set: SetRecoilState;
                },
                newValue: T | DefaultValue,
            ) => set(params)(callbacks, newValue);
            newSelector = selector<T>({
                key: myKey,
                get: myGet,
                set: mySet,
                cachePolicy_UNSTABLE: myCachePolicy,
                dangerouslyAllowMutability: options.dangerouslyAllowMutability,
                retainedBy_UNSTABLE: retainedBy,
            });
        } else {
            newSelector = selector<T>({
                key: myKey,
                get: myGet,
                cachePolicy_UNSTABLE: myCachePolicy,
                dangerouslyAllowMutability: options.dangerouslyAllowMutability,
                retainedBy_UNSTABLE: retainedBy,
            });
        }

        selectorCache.set(params, newSelector);

        setConfigDeletionHandler(newSelector.key, () => {
            selectorCache.delete(params);
        });

        return newSelector;
    };
}

export default selectorFamily; 