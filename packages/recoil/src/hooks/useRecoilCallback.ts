/**
 * TypeScript port of Recoil_useRecoilCallback
 */

'use strict';

import {useCallback, useRef, useLayoutEffect} from 'react';
import err from '../../../shared/src/util/Recoil_err';
import invariant from '../../../shared/src/util/Recoil_invariant';
import isPromise from '../../../shared/src/util/Recoil_isPromise';
import lazyProxy from '../../../shared/src/util/Recoil_lazyProxy';
import {atomicUpdater, TransactionInterface} from '../core/AtomicUpdates';
import {batchUpdates} from '../core/Batching';
import {DEFAULT_VALUE} from '../core/Node';
import {useStoreRef} from '../core/RecoilRoot';
import {RecoilState, RecoilValue} from '../core/RecoilValue';
import {refreshRecoilValue, setRecoilValue} from '../core/RecoilValueInterface';
import {cloneSnapshot, Snapshot} from '../core/Snapshot';
import {Store} from '../core/State';
import {gotoSnapshot} from './SnapshotHooks';

export type RecoilCallbackInterface = Readonly<{
  set: <T>(
    recoilState: RecoilState<T>,
    newValue: T | ((currValue: T) => T),
  ) => void;
  reset: <T>(recoilState: RecoilState<T>) => void;
  refresh: <T>(recoilValue: RecoilValue<T>) => void;
  snapshot: Snapshot;
  gotoSnapshot: (snapshot: Snapshot) => void;
  transact_UNSTABLE: (
    transaction: (iface: TransactionInterface) => void,
  ) => void;
}>;

class Sentinel {}
const SENTINEL = new Sentinel();

export function recoilCallback<
  Args extends ReadonlyArray<unknown>,
  Return,
  ExtraInterface,
>(
  store: Store,
  fn: (
    iface: RecoilCallbackInterface & ExtraInterface,
  ) => (...args: Args) => Return,
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

    // Create snapshots for different read types
    let originalSnapshot: Snapshot | undefined;
    let currentSnapshot: Snapshot | undefined;

    const baseInterface = {
      ...(extraInterface ?? {}),
      set: <T>(node: RecoilState<T>, newValue: T | ((currValue: T) => T)) => {
        setRecoilValue(store, node, newValue);
      },
      reset: <T>(node: RecoilState<T>) => {
        setRecoilValue(store, node, DEFAULT_VALUE);
      },
      refresh: <T>(node: RecoilValue<T>) => refreshRecoilValue(store, node),
      gotoSnapshot: (snapshot: Snapshot) => gotoSnapshot(store, snapshot),
      transact_UNSTABLE: (transaction: (iface: TransactionInterface) => void) =>
        atomicUpdater(store)(transaction),
    } as RecoilCallbackInterface & ExtraInterface;

    const callbackInterface: RecoilCallbackInterface & ExtraInterface =
      lazyProxy(baseInterface, {
        snapshot: () => {
          if (!originalSnapshot) {
            originalSnapshot = cloneSnapshot(store, 'latest');
            releaseSnapshot = originalSnapshot.retain();
          }

          // Create a hybrid snapshot that handles both behaviors
          const hybridSnapshot = new Proxy(originalSnapshot, {
            get(target, prop) {
              if (prop === 'getLoadable') {
                // For getLoadable, return current store state (reflects changes)
                return (recoilValue: any) => {
                  currentSnapshot = cloneSnapshot(store, 'latest');
                  return currentSnapshot.getLoadable(recoilValue);
                };
              } else if (prop === 'getPromise') {
                // For getPromise, return original state (doesn't reflect changes)
                return target.getPromise.bind(target);
              }
              // For all other methods, delegate to target
              const value = (target as any)[prop];
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });

          return hybridSnapshot;
        },
      });

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
  const isRenderingRef = useRef(true);

  // Clear the render flag after render completes
  useLayoutEffect(() => {
    isRenderingRef.current = false;
  });

  return useCallback(
    (...args: Args): Return => {
      if (isRenderingRef.current) {
        throw err(
          'useRecoilCallback() hooks cannot be called during render. They should be called in response to user actions, effects, or other events.',
        );
      }
      return recoilCallback(storeRef.current, fn, args);
    },
    // Don't include storeRef in deps to avoid unnecessary re-creation
    // The store reference should be stable within a RecoilRoot
    deps ?? [],
  );
}
