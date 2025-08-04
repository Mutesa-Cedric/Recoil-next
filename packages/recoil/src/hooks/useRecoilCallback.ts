/**
 * TypeScript port of Recoil_useRecoilCallback
 */

'use strict';

import { useCallback } from 'react';
import err from '../../../shared/src/util/Recoil_err';
import invariant from '../../../shared/src/util/Recoil_invariant';
import isPromise from '../../../shared/src/util/Recoil_isPromise';
import lazyProxy from '../../../shared/src/util/Recoil_lazyProxy';
import { atomicUpdater, TransactionInterface } from '../core/AtomicUpdates';
import { batchUpdates } from '../core/Batching';
import { DEFAULT_VALUE } from '../core/Node';
import { useStoreRef } from '../core/RecoilRoot';
import { RecoilState, RecoilValue } from '../core/RecoilValue';
import {
    refreshRecoilValue,
    setRecoilValue,
} from '../core/RecoilValueInterface';
import { cloneSnapshot, Snapshot } from '../core/Snapshot';
import { Store } from '../core/State';
import { gotoSnapshot } from './SnapshotHooks';

export type RecoilCallbackInterface = Readonly<{
    set: <T>(recoilState: RecoilState<T>, newValue: T | ((currValue: T) => T)) => void;
    reset: <T>(recoilState: RecoilState<T>) => void;
    refresh: <T>(recoilValue: RecoilValue<T>) => void;
    snapshot: Snapshot;
    gotoSnapshot: (snapshot: Snapshot) => void;
    transact_UNSTABLE: (transaction: (iface: TransactionInterface) => void) => void;
}>;

class Sentinel { }
const SENTINEL = new Sentinel();

export function recoilCallback<
    Args extends ReadonlyArray<unknown>,
    Return,
    ExtraInterface,
>(
    store: Store,
    fn: (iface: RecoilCallbackInterface & ExtraInterface) => (...args: Args) => Return,
    args: Args,
    extraInterface?: ExtraInterface,
): Return {
    let ret: Return | Sentinel = SENTINEL;
    let releaseSnapshot: (() => void) | undefined;
    batchUpdates(() => {
        const errMsg =
            'useRecoilCallback() expects a function that returns a function: ' +
            'it accepts a function of the type (RecoilInterface) => (Args) => ReturnType ' +
            'and returns a callback function (Args) => ReturnType, where RecoilInterface is ' +
            'an object {snapshot, set, ...} and Args and ReturnType are the argument and return ' +
            'types of the callback you want to create.  Please see the docs ' +
            'at recoiljs.org for details.';
        if (typeof fn !== 'function') {
            throw err(errMsg);
        }

        const callbackInterface: RecoilCallbackInterface & ExtraInterface = lazyProxy(
            {
                ...(extraInterface ?? {}),
                set: <T>(node: RecoilState<T>, newValue: T | ((currValue: T) => T)) =>
                    setRecoilValue(store, node, newValue),
                reset: <T>(node: RecoilState<T>) =>
                    setRecoilValue(store, node, DEFAULT_VALUE),
                refresh: <T>(node: RecoilValue<T>) => refreshRecoilValue(store, node),
                gotoSnapshot: (snapshot: Snapshot) => gotoSnapshot(store, snapshot),
                transact_UNSTABLE: (transaction: (iface: TransactionInterface) => void) =>
                    atomicUpdater(store)(transaction),
            } as RecoilCallbackInterface & ExtraInterface,
            {
                snapshot: () => {
                    const snapshot = cloneSnapshot(store);
                    releaseSnapshot = snapshot.retain();
                    return snapshot;
                },
            },
        );

        const callback = fn(callbackInterface);
        if (typeof callback !== 'function') {
            throw err(errMsg);
        }
        ret = callback(...args);
    });
    invariant(
        !(ret instanceof Sentinel),
        'batchUpdates should return immediately',
    );
    if (isPromise(ret)) {
        ret = ret.finally(() => {
            releaseSnapshot?.();
        });
    } else {
        releaseSnapshot?.();
    }
    return ret as Return;
}

export function useRecoilCallback<Args extends ReadonlyArray<unknown>, Return>(
    fn: (iface: RecoilCallbackInterface) => (...args: Args) => Return,
    deps?: ReadonlyArray<unknown>,
): (...args: Args) => Return {
    const storeRef = useStoreRef();

    return useCallback(
        (...args: Args): Return => {
            return recoilCallback(storeRef.current, fn, args);
        },
        // eslint-disable-next-line fb-www/react-hooks-deps
        deps != null ? [...deps, storeRef] : [storeRef],
    );
} 