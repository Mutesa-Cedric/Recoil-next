/**
 * TypeScript port of Recoil_Hooks.js
 */

'use strict';
const __DEV__ = process.env.NODE_ENV !== 'production';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setByAddingToSet } from '../../../shared/src/util/Recoil_CopyOnWrite';
import differenceSets from '../../../shared/src/util/Recoil_differenceSets';
import { isSSR } from '../../../shared/src/util/Recoil_Environment';
import err from '../../../shared/src/util/Recoil_err';
import expectationViolation from '../../../shared/src/util/Recoil_expectationViolation';
import gkx from '../../../shared/src/util/Recoil_gkx';
import isPromise from '../../../shared/src/util/Recoil_isPromise';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';
import useComponentName from '../../../shared/src/util/Recoil_useComponentName';
import { Loadable } from '../adt/Loadable';
import { batchUpdates } from '../core/Batching';
import { DefaultValue, DEFAULT_VALUE } from '../core/Node';
import {
    currentRendererSupportsUseSyncExternalStore,
    reactMode,
    useSyncExternalStore,
} from '../core/ReactMode';
import { useStoreRef } from '../core/RecoilRoot';
import { isRecoilValue, RecoilState, RecoilValue } from '../core/RecoilValue';
import {
    AbstractRecoilValue,
    getRecoilValueAsLoadable,
    setRecoilValue,
    setUnvalidatedRecoilValue,
    subscribeToRecoilValue,
} from '../core/RecoilValueInterface';
import { ComponentSubscription } from '../core/RecoilValueInterface';
import { NodeKey, StoreRef, StoreState, TreeState } from '../core/State';
import useRetain from './useRetain';

function handleLoadable<T>(
    loadable: Loadable<T>,
    recoilValue: RecoilValue<T>,
    storeRef: StoreRef,
): T {
    if (loadable.state === 'hasValue') {
        return loadable.contents;
    } else if (loadable.state === 'loading') {
        const promise = new Promise(resolve => {
            const suspendedComponentResolvers =
                storeRef.current.getState().suspendedComponentResolvers;
            suspendedComponentResolvers.add(() => resolve(undefined));

            if (isSSR && isPromise(loadable.contents)) {
                loadable.contents.finally(() => {
                    suspendedComponentResolvers.delete(() => resolve(undefined));
                });
            }
        });

        throw promise;
    } else if (loadable.state === 'hasError') {
        throw loadable.contents;
    } else {
        throw err(`Invalid value of loadable atom "${recoilValue.key}"`);
    }
}

function validateRecoilValue<T>(
    recoilValue: RecoilValue<T>,
    hookName: string,
): void {
    if (!isRecoilValue(recoilValue)) {
        throw err(
            `Invalid argument to ${hookName}: expected an atom or selector but got ${String(
                recoilValue,
            )}`,
        );
    }
}

export type SetterOrUpdater<T> = (
    newValue: T | DefaultValue | ((currVal: T) => T | DefaultValue),
) => void;
export type Resetter = () => void;
export type RecoilInterface = {
    getRecoilValue: <T>(recoilValue: RecoilValue<T>) => T;
    getRecoilValueLoadable: <T>(recoilValue: RecoilValue<T>) => Loadable<T>;
    getRecoilState: <T>(
        recoilState: RecoilState<T>,
    ) => [T, SetterOrUpdater<T>];
    getRecoilStateLoadable: <T>(
        recoilState: RecoilState<T>,
    ) => [Loadable<T>, SetterOrUpdater<T>];
    getSetRecoilState: <T>(recoilState: RecoilState<T>) => SetterOrUpdater<T>;
    getResetRecoilState: <T>(recoilState: RecoilState<T>) => Resetter;
};

function useRecoilInterface_DEPRECATED(): RecoilInterface {
    const componentName = useComponentName();
    const storeRef = useStoreRef();
    const [, forceUpdate] = useState<ReadonlyArray<any>>([]);

    const recoilValuesUsed = useRef<Set<NodeKey>>(new Set());
    recoilValuesUsed.current = new Set();
    const previousSubscriptions = useRef<Set<NodeKey>>(new Set());
    const subscriptions = useRef<Map<NodeKey, ComponentSubscription>>(new Map());

    const unsubscribeFrom = useCallback(
        (key: NodeKey) => {
            const sub = subscriptions.current.get(key);
            if (sub) {
                sub.release();
                subscriptions.current.delete(key);
            }
        },
        [subscriptions],
    );

    const updateState = useCallback(
        (_state: TreeState | StoreState, key: NodeKey) => {
            if (subscriptions.current.has(key)) {
                forceUpdate([]);
            }
        },
        [],
    );

    useEffect(() => {
        const store = storeRef.current;

        differenceSets(
            recoilValuesUsed.current,
            previousSubscriptions.current,
        ).forEach(key => {
            if (subscriptions.current.has(key)) {
                expectationViolation(`Double subscription to RecoilValue "${key}"`);
                return;
            }
            const sub = subscribeToRecoilValue(
                store,
                new AbstractRecoilValue(key),
                state => updateState(state, key),
                componentName,
            );
            subscriptions.current.set(key, sub);

            const state = store.getState();
            if (state.nextTree) {
                store.getState().queuedComponentCallbacks_DEPRECATED.push(() => {
                    updateState(store.getState(), key);
                });
            } else {
                updateState(store.getState(), key);
            }
        });

        differenceSets(
            previousSubscriptions.current,
            recoilValuesUsed.current,
        ).forEach(key => {
            unsubscribeFrom(key);
        });

        previousSubscriptions.current = recoilValuesUsed.current;
    });

    useEffect(() => {
        const currentSubscriptions = subscriptions.current;

        differenceSets(
            recoilValuesUsed.current,
            new Set(currentSubscriptions.keys()),
        ).forEach(key => {
            const sub = subscribeToRecoilValue(
                storeRef.current,
                new AbstractRecoilValue(key),
                state => updateState(state, key),
                componentName,
            );
            currentSubscriptions.set(key, sub);
        });

        return () => currentSubscriptions.forEach((_, key) => unsubscribeFrom(key));
    }, [componentName, storeRef, unsubscribeFrom, updateState]);

    return useMemo(() => {
        function useSetRecoilState<T>(
            recoilState: RecoilState<T>,
        ): SetterOrUpdater<T> {
            if (__DEV__) {
                validateRecoilValue(recoilState, 'useSetRecoilState');
            }
            return (
                newValueOrUpdater:
                    | T
                    | DefaultValue
                    | ((currVal: T) => T | DefaultValue),
            ) => {
                setRecoilValue(storeRef.current, recoilState, newValueOrUpdater);
            };
        }

        function useResetRecoilState<T>(recoilState: RecoilState<T>): Resetter {
            if (__DEV__) {
                validateRecoilValue(recoilState, 'useResetRecoilState');
            }
            return () => setRecoilValue(storeRef.current, recoilState, DEFAULT_VALUE);
        }

        function useRecoilValueLoadable<T>(
            recoilValue: RecoilValue<T>,
        ): Loadable<T> {
            if (__DEV__) {
                validateRecoilValue(recoilValue, 'useRecoilValueLoadable');
            }
            if (!recoilValuesUsed.current.has(recoilValue.key)) {
                recoilValuesUsed.current = setByAddingToSet(
                    recoilValuesUsed.current,
                    recoilValue.key,
                );
            }
            const storeState = storeRef.current.getState();
            return getRecoilValueAsLoadable(
                storeRef.current,
                recoilValue,
                reactMode().early
                    ? storeState.nextTree ?? storeState.currentTree
                    : storeState.currentTree,
            );
        }

        function useRecoilValue<T>(recoilValue: RecoilValue<T>): T {
            if (__DEV__) {
                validateRecoilValue(recoilValue, 'useRecoilValue');
            }
            const loadable = useRecoilValueLoadable(recoilValue);
            return handleLoadable(loadable, recoilValue, storeRef);
        }

        function useRecoilState<T>(
            recoilState: RecoilState<T>,
        ): [T, SetterOrUpdater<T>] {
            if (__DEV__) {
                validateRecoilValue(recoilState, 'useRecoilState');
            }
            return [useRecoilValue(recoilState), useSetRecoilState(recoilState)];
        }

        function useRecoilStateLoadable<T>(
            recoilState: RecoilState<T>,
        ): [Loadable<T>, SetterOrUpdater<T>] {
            if (__DEV__) {
                validateRecoilValue(recoilState, 'useRecoilStateLoadable');
            }
            return [
                useRecoilValueLoadable(recoilState),
                useSetRecoilState(recoilState),
            ];
        }

        return {
            getRecoilValue: useRecoilValue,
            getRecoilValueLoadable: useRecoilValueLoadable,
            getRecoilState: useRecoilState,
            getRecoilStateLoadable: useRecoilStateLoadable,
            getSetRecoilState: useSetRecoilState,
            getResetRecoilState: useResetRecoilState,
        };
    }, [recoilValuesUsed, storeRef]);
}

export const recoilComponentGetRecoilValueCount_FOR_TESTING = { current: 0 };

function useRecoilValueLoadable_SYNC_EXTERNAL_STORE<T>(
    recoilValue: RecoilValue<T>,
): Loadable<T> {
    const storeRef = useStoreRef();
    const componentName = useComponentName();

    const getSnapshot = useCallback((): {
        loadable: Loadable<T>;
        key: string;
    } => {
        if (__DEV__) {
            recoilComponentGetRecoilValueCount_FOR_TESTING.current++;
        }
        const store = storeRef.current;
        const storeState = store.getState();
        const treeState = reactMode().early
            ? storeState.nextTree ?? storeState.currentTree
            : storeState.currentTree;
        const loadable = getRecoilValueAsLoadable(store, recoilValue, treeState) as Loadable<T>;
        return { loadable, key: recoilValue.key };
    }, [storeRef, recoilValue]);

    const memoizePreviousSnapshot = useCallback(
        (getState: () => { key: NodeKey; loadable: Loadable<T> }) => {
            let prevState: { key: NodeKey; loadable: Loadable<T> } | undefined;
            return () => {
                const nextState = getState();
                if (
                    prevState?.loadable.is(nextState.loadable) &&
                    prevState?.key === nextState.key
                ) {
                    return prevState;
                }
                prevState = nextState;
                return nextState;
            };
        },
        [],
    );
    const getMemoizedSnapshot = useMemo(
        () => memoizePreviousSnapshot(getSnapshot),
        [getSnapshot, memoizePreviousSnapshot],
    );

    const subscribe = useCallback(
        (notify: () => void): (() => void) => {
            const store = storeRef.current;
            const subscription = subscribeToRecoilValue(
                store,
                recoilValue,
                notify,
                componentName,
            );
            return subscription.release;
        },
        [storeRef, recoilValue, componentName],
    );

    const ssrSnapshot = getSnapshot();

    if (useSyncExternalStore === undefined) {
        throw new Error('useSyncExternalStore is not available in this version of React');
    }

    return useSyncExternalStore(
        subscribe,
        getMemoizedSnapshot,
        () => ssrSnapshot,
    ).loadable;
}

function useRecoilValueLoadable_TRANSITION_SUPPORT<T>(
    recoilValue: RecoilValue<T>,
): Loadable<T> {
    const storeRef = useStoreRef();
    const componentName = useComponentName();

    const getLoadable = useCallback((): Loadable<T> => {
        if (__DEV__) {
            recoilComponentGetRecoilValueCount_FOR_TESTING.current++;
        }
        const store = storeRef.current;
        const storeState = store.getState();
        const treeState = reactMode().early
            ? storeState.nextTree ?? storeState.currentTree
            : storeState.currentTree;
        return getRecoilValueAsLoadable(store, recoilValue, treeState) as Loadable<T>;
    }, [storeRef, recoilValue]);
    const getState = useCallback(
        () => ({ loadable: getLoadable(), key: recoilValue.key }),
        [getLoadable, recoilValue.key],
    );

    const updateState = useCallback(
        (prevState: { key: NodeKey; loadable: Loadable<T> }) => {
            const nextState = getState();
            return prevState.loadable.is(nextState.loadable) &&
                prevState.key === nextState.key
                ? prevState
                : nextState;
        },
        [getState],
    );

    useEffect(() => {
        const subscription = subscribeToRecoilValue(
            storeRef.current,
            recoilValue,
            _state => {
                setState(updateState as any);
            },
            componentName,
        );

        setState(updateState as any);

        return subscription.release;
    }, [componentName, recoilValue, storeRef, updateState]);

    const [state, setState] = useState(getState);

    return state.key !== recoilValue.key ? getLoadable() : state.loadable;
}

function useRecoilValueLoadable_LEGACY<T>(
    recoilValue: RecoilValue<T>,
): Loadable<T> {
    const storeRef = useStoreRef();
    const [, forceUpdate] = useState<ReadonlyArray<any>>([]);
    const componentName = useComponentName();

    const getLoadable = useCallback((): Loadable<T> => {
        if (__DEV__) {
            recoilComponentGetRecoilValueCount_FOR_TESTING.current++;
        }
        const store = storeRef.current;
        const storeState = store.getState();
        const treeState = reactMode().early
            ? storeState.nextTree ?? storeState.currentTree
            : storeState.currentTree;
        return getRecoilValueAsLoadable(store, recoilValue, treeState) as Loadable<T>;
    }, [storeRef, recoilValue]);

    const loadable = getLoadable();
    const prevLoadableRef = useRef(loadable);
    useEffect(() => {
        prevLoadableRef.current = loadable;
    });

    useEffect(() => {
        const store = storeRef.current;
        const storeState = store.getState();
        const subscription = subscribeToRecoilValue(
            store,
            recoilValue,
            _state => {
                if (!gkx('recoil_suppress_rerender_in_callback')) {
                    forceUpdate([]);
                    return;
                }
                const newLoadable = getLoadable();
                if (!prevLoadableRef.current?.is(newLoadable)) {
                    forceUpdate(newLoadable as any);
                }
                prevLoadableRef.current = newLoadable;
            },
            componentName,
        );

        if (storeState.nextTree) {
            store.getState().queuedComponentCallbacks_DEPRECATED.push(() => {
                prevLoadableRef.current = undefined as any;
                forceUpdate([]);
            });
        } else {
            if (!gkx('recoil_suppress_rerender_in_callback')) {
                forceUpdate([]);
                return;
            }
            const newLoadable = getLoadable();
            if (!prevLoadableRef.current?.is(newLoadable)) {
                forceUpdate(newLoadable as any);
            }
            prevLoadableRef.current = newLoadable;
        }

        return subscription.release;
    }, [componentName, getLoadable, recoilValue, storeRef]);

    return loadable;
}

export function useRecoilValueLoadable<T>(
    recoilValue: RecoilValue<T>,
): Loadable<T> {
    if (__DEV__) {
        validateRecoilValue(recoilValue, 'useRecoilValueLoadable');
    }
    if (gkx('recoil_memory_managament_2020')) {
        useRetain(recoilValue);
    }
    return {
        TRANSITION_SUPPORT: useRecoilValueLoadable_TRANSITION_SUPPORT,
        SYNC_EXTERNAL_STORE: currentRendererSupportsUseSyncExternalStore()
            ? useRecoilValueLoadable_SYNC_EXTERNAL_STORE
            : useRecoilValueLoadable_TRANSITION_SUPPORT,
        LEGACY: useRecoilValueLoadable_LEGACY,
    }[reactMode().mode](recoilValue);
}

export function useRecoilValue<T>(recoilValue: RecoilValue<T>): T {
    if (__DEV__) {
        validateRecoilValue(recoilValue, 'useRecoilValue');
    }
    const storeRef = useStoreRef();
    const loadable = useRecoilValueLoadable(recoilValue);
    return handleLoadable(loadable, recoilValue, storeRef);
}

export function useSetRecoilState<T>(
    recoilState: RecoilState<T>,
): SetterOrUpdater<T> {
    if (__DEV__) {
        validateRecoilValue(recoilState, 'useSetRecoilState');
    }
    const storeRef = useStoreRef();
    return useCallback(
        (
            newValueOrUpdater: T | DefaultValue | ((currValue: T) => T | DefaultValue),
        ) => {
            setRecoilValue(storeRef.current, recoilState, newValueOrUpdater);
        },
        [storeRef, recoilState],
    );
}

export function useResetRecoilState<T>(recoilState: RecoilState<T>): Resetter {
    if (__DEV__) {
        validateRecoilValue(recoilState, 'useResetRecoilState');
    }
    const storeRef = useStoreRef();
    return useCallback(() => {
        setRecoilValue(storeRef.current, recoilState, DEFAULT_VALUE);
    }, [storeRef, recoilState]);
}

export function useRecoilState<T>(
    recoilState: RecoilState<T>,
): [T, SetterOrUpdater<T>] {
    if (__DEV__) {
        validateRecoilValue(recoilState, 'useRecoilState');
    }
    return [useRecoilValue(recoilState), useSetRecoilState(recoilState)];
}

export function useRecoilStateLoadable<T>(
    recoilState: RecoilState<T>,
): [Loadable<T>, SetterOrUpdater<T>] {
    if (__DEV__) {
        validateRecoilValue(recoilState, 'useRecoilStateLoadable');
    }
    return [useRecoilValueLoadable(recoilState), useSetRecoilState(recoilState)];
}

export function useSetUnvalidatedAtomValues(): (
    values: Map<NodeKey, unknown>,
    transactionMetadata?: { [key: string]: unknown },
) => void {
    const storeRef = useStoreRef();
    return (values: Map<NodeKey, unknown>, transactionMetadata: { [key: string]: unknown } = {}) => {
        batchUpdates(() => {
            storeRef.current.addTransactionMetadata(transactionMetadata);
            values.forEach((value, key) =>
                setUnvalidatedRecoilValue(
                    storeRef.current,
                    new AbstractRecoilValue(key),
                    value,
                ),
            );
        });
    };
}

export function useRecoilValueLoadable_TRANSITION_SUPPORT_UNSTABLE<T>(
    recoilValue: RecoilValue<T>,
): Loadable<T> {
    if (__DEV__) {
        validateRecoilValue(
            recoilValue,
            'useRecoilValueLoadable_TRANSITION_SUPPORT_UNSTABLE',
        );
        if (!reactMode().early) {
            recoverableViolation(
                'Attepmt to use a hook with UNSTABLE_TRANSITION_SUPPORT in a rendering mode incompatible with concurrent rendering.  Try enabling the recoil_sync_external_store or recoil_transition_support GKs.',
                'recoil',
            );
        }
    }
    if (gkx('recoil_memory_managament_2020')) {
        useRetain(recoilValue);
    }
    return useRecoilValueLoadable_TRANSITION_SUPPORT(recoilValue);
}

export function useRecoilValue_TRANSITION_SUPPORT_UNSTABLE<T>(
    recoilValue: RecoilValue<T>,
): T {
    if (__DEV__) {
        validateRecoilValue(
            recoilValue,
            'useRecoilValue_TRANSITION_SUPPORT_UNSTABLE',
        );
    }
    const storeRef = useStoreRef();
    const loadable =
        useRecoilValueLoadable_TRANSITION_SUPPORT_UNSTABLE(recoilValue);
    return handleLoadable(loadable, recoilValue, storeRef);
}

export function useRecoilState_TRANSITION_SUPPORT_UNSTABLE<T>(
    recoilState: RecoilState<T>,
): [T, SetterOrUpdater<T>] {
    if (__DEV__) {
        validateRecoilValue(
            recoilState,
            'useRecoilState_TRANSITION_SUPPORT_UNSTABLE',
        );
    }
    return [
        useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(recoilState),
        useSetRecoilState(recoilState),
    ];
}
export const useRecoilInterface = useRecoilInterface_DEPRECATED; 