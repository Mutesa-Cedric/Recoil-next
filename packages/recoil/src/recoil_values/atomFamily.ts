/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @oncall recoil
 */

'use strict';
import cacheFromPolicy from '../caches/cacheFromPolicy';
import { CachePolicyWithoutEviction } from '../caches/CachePolicy';
import { setConfigDeletionHandler } from '../core/Node';
import { RecoilState, RecoilValue } from '../core/RecoilValue';
import { RetainedBy } from '../core/RetainedBy';
import { Loadable } from '../adt/Loadable';
import { WrappedValue } from '../adt/Wrapper';
import atom, { AtomEffect, AtomOptionsWithoutDefault } from './atom';
import stableStringify from '../../../shared/src/util/Recoil_stableStringify';
import { Parameter } from './selectorFamily';

export type AtomFamilyOptionsWithoutDefault<T, P extends Parameter> = Readonly<
    AtomOptionsWithoutDefault<T> & {
        effects?:
        | ReadonlyArray<AtomEffect<T>>
        | ((param: P) => ReadonlyArray<AtomEffect<T>>);
        retainedBy_UNSTABLE?: RetainedBy | ((param: P) => RetainedBy);
        cachePolicyForParams_UNSTABLE?: CachePolicyWithoutEviction;
    }
>;

export type AtomFamilyOptions<T, P extends Parameter> =
    | (Readonly<
        AtomFamilyOptionsWithoutDefault<T, P> & {
            default:
            | RecoilValue<T>
            | Promise<T>
            | Loadable<T>
            | WrappedValue<T>
            | T
            | ((
                param: P,
            ) =>
                | T
                | RecoilValue<T>
                | Promise<T>
                | Loadable<T>
                | WrappedValue<T>);
        }
    >)
    | AtomFamilyOptionsWithoutDefault<T, P>;

export function atomFamily<T, P extends Parameter>(
    options: AtomFamilyOptions<T, P>,
): (params: P) => RecoilState<T> {
    const atomCache = cacheFromPolicy<P, RecoilState<T>>({
        equality: options.cachePolicyForParams_UNSTABLE?.equality ?? 'value',
        eviction: 'keep-all',
    });

    return (params: P) => {
        const cachedAtom = atomCache.get(params);
        if (cachedAtom != null) {
            return cachedAtom;
        }

        const { cachePolicyForParams_UNSTABLE, ...atomOptions } = options;
        const optionsDefault =
            'default' in options
                ? ((options as { default?: unknown }).default as
                    | RecoilValue<T>
                    | Promise<T>
                    | Loadable<T>
                    | WrappedValue<T>
                    | T
                    | ((
                        param: P,
                    ) =>
                        | T
                        | RecoilValue<T>
                        | Promise<T>
                        | Loadable<T>
                        | WrappedValue<T>))
                : new Promise<T>(() => { });

        const newAtom = atom<T>({
            ...atomOptions,
            key: `${options.key}__${stableStringify(params) ?? 'void'}`,
            default:
                typeof optionsDefault === 'function'
                    ? (optionsDefault as (
                        param: P,
                    ) =>
                        | T
                        | RecoilValue<T>
                        | Promise<T>
                        | Loadable<T>
                        | WrappedValue<T>)(params)
                    : optionsDefault,

            retainedBy_UNSTABLE:
                typeof options.retainedBy_UNSTABLE === 'function'
                    ? options.retainedBy_UNSTABLE(params)
                    : options.retainedBy_UNSTABLE,

            effects:
                typeof options.effects === 'function'
                    ? options.effects(params)
                    : typeof options.effects_UNSTABLE === 'function'
                        ? (
                            options.effects_UNSTABLE as (
                                param: P,
                            ) => ReadonlyArray<AtomEffect<T>>
                        )(params)
                        : options.effects ?? options.effects_UNSTABLE,
        });

        atomCache.set(params, newAtom);

        setConfigDeletionHandler(newAtom.key, () => {
            atomCache.delete(params);
        });

        return newAtom;
    };
}

export default atomFamily; 