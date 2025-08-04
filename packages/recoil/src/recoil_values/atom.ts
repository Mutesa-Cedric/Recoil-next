/**
 * TypeScript port of Recoil_atom.js
 */
'use strict';
const __DEV__ = process.env.NODE_ENV !== 'production';
import {
    isLoadable,
    loadableWithError,
    loadableWithPromise,
    loadableWithValue,
    Loadable,
    LoadingLoadable,
} from '../adt/Loadable';
import { WrappedValue } from '../adt/Wrapper';
import { peekNodeInfo, RecoilValueInfo } from '../core/FunctionalCore';
import { StoreID } from '../core/Keys';
import {
    DEFAULT_VALUE,
    DefaultValue,
    getConfigDeletionHandler,
    PersistenceInfo,
    ReadWriteNodeOptions,
    registerNode,
    setConfigDeletionHandler,
    Trigger,
} from '../core/Node';
import { isRecoilValue, RecoilState, RecoilValue } from '../core/RecoilValue';
import {
    getRecoilValueAsLoadable,
    markRecoilValueModified,
    setRecoilValue,
    setRecoilValueLoadable,
} from '../core/RecoilValueInterface';
import { retainedByOptionWithDefault } from '../core/Retention';
import { RetainedBy } from '../core/RetainedBy';
import { AtomWrites, NodeKey, Store, TreeState } from '../core/State';
import deepFreezeValue from '../../../shared/src/util/Recoil_deepFreezeValue';
import err from '../../../shared/src/util/Recoil_err';
import expectationViolation from '../../../shared/src/util/Recoil_expectationViolation';
import isPromise from '../../../shared/src/util/Recoil_isPromise';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';
import { selector } from './selector';
import { SetRecoilState } from './callbackTypes';

export type PersistenceSettings<Stored> = Readonly<
    PersistenceInfo & {
        validator: (
            storedValue: unknown,
            defaultValue: DefaultValue,
        ) => Stored | DefaultValue;
    }
>;

type NewValue<T> =
    | T
    | DefaultValue
    | Promise<T | DefaultValue>
    | WrappedValue<T>;

type NewValueOrUpdater<T> =
    | T
    | DefaultValue
    | Promise<T | DefaultValue>
    | WrappedValue<T>
    | ((
        currVal: T | DefaultValue,
    ) => T | DefaultValue | Promise<T | DefaultValue> | WrappedValue<T>);

export type AtomEffect<T> = (ctx: {
    node: RecoilState<T>;
    storeID: StoreID;
    parentStoreID_UNSTABLE?: StoreID;
    trigger: Trigger;
    setSelf: (value: NewValueOrUpdater<T>) => void;
    resetSelf: () => void;
    onSet: (
        handler: (
            newValue: T,
            oldValue: T | DefaultValue,
            isReset: boolean,
        ) => void,
    ) => void;
    getPromise: <S>(recoilValue: RecoilValue<S>) => Promise<S>;
    getLoadable: <S>(recoilValue: RecoilValue<S>) => Loadable<S>;
    getInfo_UNSTABLE: <S>(recoilValue: RecoilValue<S>) => RecoilValueInfo<S>;
}) => void | (() => void);

export type AtomOptionsWithoutDefault<T> = Readonly<{
    key: NodeKey;
    effects?: ReadonlyArray<AtomEffect<T>>;
    effects_UNSTABLE?: ReadonlyArray<AtomEffect<T>>;
    persistence_UNSTABLE?: PersistenceSettings<T>;
    dangerouslyAllowMutability?: boolean;
    retainedBy_UNSTABLE?: RetainedBy;
}>;

type AtomOptionsWithDefault<T> = Readonly<
    AtomOptionsWithoutDefault<T> & {
        default: RecoilValue<T> | Promise<T> | Loadable<T> | WrappedValue<T> | T;
    }
>;

export type AtomOptions<T> =
    | AtomOptionsWithDefault<T>
    | AtomOptionsWithoutDefault<T>;

type BaseAtomOptions<T> = Readonly<
    AtomOptions<T> & {
        default: Promise<T> | Loadable<T> | WrappedValue<T> | T;
    }
>;

const unwrap = <T>(x: T | WrappedValue<T>): T =>
    x instanceof WrappedValue ? x.value : x;

function baseAtom<T>(options: BaseAtomOptions<T>): RecoilState<T> {
    const { key, persistence_UNSTABLE: persistence } = options;

    const retainedBy = retainedByOptionWithDefault(options.retainedBy_UNSTABLE);
    let liveStoresCount = 0;

    function unwrapPromise(promise: Promise<T>): Loadable<T> {
        return loadableWithPromise(
            promise
                .then(value => {
                    defaultLoadable = loadableWithValue(value);
                    return value;
                })
                .catch(error => {
                    defaultLoadable = loadableWithError(error);
                    throw error;
                }),
        );
    }

    let defaultLoadable: Loadable<T> = (isPromise(options.default)
        ? unwrapPromise(options.default)
        : isLoadable(options.default)
            ? options.default.state === 'loading'
                ? unwrapPromise((options.default as LoadingLoadable<T>).contents)
                : options.default
            : loadableWithValue(unwrap(options.default))) as Loadable<T>;

    maybeFreezeValueOrPromise(defaultLoadable.contents);

    let cachedAnswerForUnvalidatedValue: void | Loadable<T> = undefined;

    const cleanupEffectsByStore: Map<Store, Array<() => void>> = new Map();

    function maybeFreezeValueOrPromise(valueOrPromise: unknown) {
        if (__DEV__) {
            if (options.dangerouslyAllowMutability !== true) {
                if (isPromise(valueOrPromise)) {
                    return valueOrPromise.then(value => {
                        deepFreezeValue(value);
                        return value;
                    });
                } else {
                    deepFreezeValue(valueOrPromise);
                    return valueOrPromise;
                }
            }
        }
        return valueOrPromise;
    }

    function wrapPendingPromise(
        store: Store,
        promise: Promise<T | DefaultValue>,
    ): Promise<T | DefaultValue> {
        const wrappedPromise: Promise<T | DefaultValue> = promise
            .then(value => {
                const state = store.getState().nextTree ?? store.getState().currentTree;

                if (state.atomValues.get(key)?.contents === wrappedPromise) {
                    markRecoilValueModified(store, node);
                    setRecoilValue(store, node, value);
                }

                return value;
            })
            .catch(error => {
                const state = store.getState().nextTree ?? store.getState().currentTree;
                if (state.atomValues.get(key)?.contents === wrappedPromise) {
                    markRecoilValueModified(store, node);
                    setRecoilValueLoadable(store, node, loadableWithError(error));
                }
                throw error;
            });

        return wrappedPromise;
    }

    function initAtom(
        store: Store,
        initState: TreeState,
        trigger: Trigger,
    ): () => void {
        liveStoresCount++;
        const cleanupAtom = () => {
            liveStoresCount--;
            cleanupEffectsByStore.get(store)?.forEach(cleanup => cleanup());
            cleanupEffectsByStore.delete(store);
        };

        store.getState().knownAtoms.add(key);

        if (defaultLoadable.state === 'loading') {
            const notifyDefaultSubscribers = () => {
                const state = store.getState().nextTree ?? store.getState().currentTree;
                if (!state.atomValues.has(key)) {
                    markRecoilValueModified(store, node);
                }
            };
            defaultLoadable.contents.finally(notifyDefaultSubscribers);
        }

        const effects = options.effects ?? options.effects_UNSTABLE;
        if (effects != null) {
            let initValue: NewValue<T> = DEFAULT_VALUE;
            let isDuringInit = true;
            let isInitError = false;
            let pendingSetSelf: {
                effect: AtomEffect<T>;
                value: T | DefaultValue;
            } | null = null;

            function getLoadable<S>(recoilValue: RecoilValue<S>): Loadable<S> {
                if (isDuringInit && recoilValue.key === key) {
                    const retValue: NewValue<S> = initValue as any;
                    return retValue instanceof DefaultValue
                        ? (peekAtom(store, initState) as any)
                        : isPromise(retValue)
                            ? loadableWithPromise(
                                retValue.then((v: S | DefaultValue): S | Promise<S> =>
                                    v instanceof DefaultValue
                                        ? (defaultLoadable as any).toPromise()
                                        : v,
                                ),
                            )
                            : loadableWithValue(retValue as S);
                }
                return getRecoilValueAsLoadable(store, recoilValue);
            }

            function getPromise<S>(recoilValue: RecoilValue<S>): Promise<S> {
                return getLoadable(recoilValue).toPromise();
            }

            function getInfo_UNSTABLE<S>(
                recoilValue: RecoilValue<S>,
            ): RecoilValueInfo<S> {
                const info = peekNodeInfo<S>(
                    store,
                    store.getState().nextTree ?? store.getState().currentTree,
                    recoilValue.key,
                );
                return isDuringInit &&
                    recoilValue.key === key &&
                    !(initValue instanceof DefaultValue)
                    ? { ...info, isSet: true, loadable: getLoadable(recoilValue) }
                    : info;
            }

            const setSelf =
                (effect: AtomEffect<T>) => (valueOrUpdater: NewValueOrUpdater<T>) => {
                    if (isDuringInit) {
                        const currentLoadable = getLoadable(node);
                        const currentValue: T | DefaultValue =
                            currentLoadable.state === 'hasValue'
                                ? currentLoadable.contents
                                : DEFAULT_VALUE;
                        initValue =
                            typeof valueOrUpdater === 'function'
                                ? (valueOrUpdater as (
                                    val: T | DefaultValue,
                                ) => T | DefaultValue | Promise<T | DefaultValue>)(
                                    currentValue,
                                )
                                : valueOrUpdater;
                        if (isPromise(initValue)) {
                            initValue = initValue.then(value => {
                                pendingSetSelf = { effect, value: value as T | DefaultValue };
                                return value;
                            });
                        }
                    } else {
                        if (isPromise(valueOrUpdater)) {
                            throw err('Setting atoms to async values is not implemented.');
                        }

                        if (typeof valueOrUpdater !== 'function') {
                            pendingSetSelf = {
                                effect,
                                value: unwrap(valueOrUpdater) as T | DefaultValue,
                            };
                        }

                        setRecoilValue(
                            store,
                            node,
                            typeof valueOrUpdater === 'function'
                                ? (currentValue: T | DefaultValue) => {
                                    const updatedValue = (valueOrUpdater as (
                                        val: T | DefaultValue,
                                    ) => T | DefaultValue | Promise<T | DefaultValue>)(
                                        currentValue,
                                    );
                                    if (isPromise(updatedValue)) {
                                        throw err(
                                            'Setting atoms to async values is not yet implemented.',
                                        );
                                    }
                                    const newValue = unwrap(updatedValue);
                                    pendingSetSelf = { effect, value: newValue };
                                    return newValue;
                                }
                                : unwrap(valueOrUpdater),
                        );
                    }
                };
            const resetSelf = (effect: AtomEffect<T>) => () =>
                setSelf(effect)(DEFAULT_VALUE);

            const onSet =
                (effect: AtomEffect<T>) =>
                    (handler: (newValue: T, oldValue: T | DefaultValue, isReset: boolean) => void) => {
                        const { release } = store.subscribeToTransactions(currentStore => {
                            let { currentTree, previousTree } = currentStore.getState();
                            if (!previousTree) {
                                recoverableViolation(
                                    'Transaction subscribers notified without a next tree being present -- this is a bug in Recoil',
                                    'recoil',
                                );
                                previousTree = currentTree;
                            }
                            const newLoadable =
                                currentTree.atomValues.get(key) ?? defaultLoadable;
                            if (newLoadable.state === 'hasValue') {
                                const newValue = newLoadable.contents as T;
                                const oldLoadable =
                                    previousTree.atomValues.get(key) ?? defaultLoadable;
                                const oldValue =
                                    oldLoadable.state === 'hasValue'
                                        ? (oldLoadable.contents as T)
                                        : DEFAULT_VALUE;

                                if (
                                    pendingSetSelf?.effect !== effect ||
                                    pendingSetSelf?.value !== newValue
                                ) {
                                    handler(newValue, oldValue, !currentTree.atomValues.has(key));
                                } else if (pendingSetSelf?.effect === effect) {
                                    pendingSetSelf = null;
                                }
                            }
                        }, key);
                        cleanupEffectsByStore.set(store, [
                            ...(cleanupEffectsByStore.get(store) ?? []),
                            release,
                        ]);
                    };

            for (const effect of effects) {
                try {
                    const cleanup = effect({
                        node,
                        storeID: store.storeID,
                        parentStoreID_UNSTABLE: store.parentStoreID,
                        trigger,
                        setSelf: setSelf(effect),
                        resetSelf: resetSelf(effect),
                        onSet: onSet(effect),
                        getPromise,
                        getLoadable,
                        getInfo_UNSTABLE,
                    });
                    if (cleanup != null) {
                        cleanupEffectsByStore.set(store, [
                            ...(cleanupEffectsByStore.get(store) ?? []),
                            cleanup,
                        ]);
                    }
                } catch (error) {
                    initValue = error as T;
                    isInitError = true;
                }
            }

            isDuringInit = false;

            if (!(initValue instanceof DefaultValue)) {
                const initLoadable = isInitError
                    ? loadableWithError<T>(initValue as Error)
                    : isPromise(initValue)
                        ? loadableWithPromise(
                            wrapPendingPromise(store, initValue as Promise<T | DefaultValue>),
                        )
                        : loadableWithValue(unwrap(initValue));
                maybeFreezeValueOrPromise(initLoadable.contents);
                initState.atomValues.set(key, initLoadable);
                store.getState().nextTree?.atomValues.set(key, initLoadable);
            }
        }

        return cleanupAtom;
    }

    function peekAtom(_store: Store, state: TreeState): Loadable<T> {
        return (
            (state.atomValues.get(key) as Loadable<T>) ??
            cachedAnswerForUnvalidatedValue ??
            defaultLoadable
        );
    }

    function getAtom(_store: Store, state: TreeState): Loadable<T> {
        if (state.atomValues.has(key)) {
            return nullthrows(state.atomValues.get(key)) as Loadable<T>;
        } else if (state.nonvalidatedAtoms.has(key)) {
            if (cachedAnswerForUnvalidatedValue != null) {
                return cachedAnswerForUnvalidatedValue;
            }

            if (persistence == null) {
                expectationViolation(
                    `Tried to restore a persisted value for atom ${key} but it has no persistence settings.`,
                );
                return defaultLoadable;
            }
            const nonvalidatedValue = state.nonvalidatedAtoms.get(key);
            const validatorResult: T | DefaultValue = persistence.validator(
                nonvalidatedValue,
                DEFAULT_VALUE,
            );

            const validatedValueLoadable =
                validatorResult instanceof DefaultValue
                    ? defaultLoadable
                    : loadableWithValue(validatorResult);

            cachedAnswerForUnvalidatedValue = validatedValueLoadable;

            return cachedAnswerForUnvalidatedValue;
        } else {
            return defaultLoadable;
        }
    }

    function invalidateAtom() {
        cachedAnswerForUnvalidatedValue = undefined;
    }

    function setAtom(
        _store: Store,
        state: TreeState,
        newValue: T | DefaultValue,
    ): AtomWrites {
        if (state.atomValues.has(key)) {
            const existing = state.atomValues.get(key);
            if (existing && existing.state === 'hasValue' && newValue === existing.contents) {
                return new Map();
            }
        } else if (
            !state.nonvalidatedAtoms.has(key) &&
            newValue instanceof DefaultValue
        ) {
            return new Map();
        }

        maybeFreezeValueOrPromise(newValue);

        cachedAnswerForUnvalidatedValue = undefined;

        return new Map<NodeKey, Loadable<unknown>>().set(
            key,
            loadableWithValue(newValue),
        );
    }

    function shouldDeleteConfigOnReleaseAtom() {
        return getConfigDeletionHandler(key) !== undefined && liveStoresCount <= 0;
    }

    const node: RecoilState<T> = registerNode<T>(
        ({
            key,
            nodeType: 'atom',
            peek: peekAtom,
            get: getAtom,
            set: setAtom,
            init: initAtom,
            invalidate: invalidateAtom,
            shouldDeleteConfigOnRelease: shouldDeleteConfigOnReleaseAtom,
            dangerouslyAllowMutability: options.dangerouslyAllowMutability,
            persistence_UNSTABLE: options.persistence_UNSTABLE
                ? {
                    type: options.persistence_UNSTABLE.type,
                    backButton: options.persistence_UNSTABLE.backButton,
                }
                : undefined,
            shouldRestoreFromSnapshots: true,
            retainedBy,
        } as unknown) as ReadWriteNodeOptions<T>,
    );
    return node;
}

function atom<T>(options: AtomOptions<T>): RecoilState<T> {
    if (__DEV__) {
        if (typeof options.key !== 'string') {
            throw err(
                'A key option with a unique string value must be provided when creating an atom.',
            );
        }
    }

    const {
        ...restOptions
    } = options;
    const optionsDefault:
        | RecoilValue<T>
        | Promise<T>
        | Loadable<T>
        | WrappedValue<T>
        | T =
        'default' in options
            ? (options as AtomOptionsWithDefault<T>).default
            : new Promise(() => { });

    if (isRecoilValue(optionsDefault)) {
        return atomWithFallback<T>({
            ...restOptions,
            default: optionsDefault,
        });
    } else {
        return baseAtom<T>({
            ...restOptions,
            default: optionsDefault as Promise<T> | Loadable<T> | WrappedValue<T> | T,
        });
    }
}

type AtomWithFallbackOptions<T> = Readonly<
    AtomOptions<T> & {
        default: RecoilValue<T> | Promise<T> | Loadable<T>;
    }
>;

function atomWithFallback<T>(
    options: AtomWithFallbackOptions<T>,
): RecoilState<T> {
    const base = atom<T | DefaultValue>({
        ...options,
        default: DEFAULT_VALUE,
        persistence_UNSTABLE:
            options.persistence_UNSTABLE === undefined
                ? undefined
                : {
                    ...options.persistence_UNSTABLE,
                    validator: (storedValue: unknown) =>
                        storedValue instanceof DefaultValue
                            ? storedValue
                            : nullthrows(options.persistence_UNSTABLE).validator(
                                storedValue,
                                DEFAULT_VALUE,
                            ),
                },
        effects: (options.effects as any) as ReadonlyArray<
            AtomEffect<T | DefaultValue>
        >,
        effects_UNSTABLE: (options.effects_UNSTABLE as any) as ReadonlyArray<
            AtomEffect<T | DefaultValue>
        >,
    });

    const sel = selector<T>({
        key: `${options.key}__withFallback`,
        get: ({ get }) => {
            const baseValue = get(base);
            return baseValue instanceof DefaultValue ? options.default : baseValue;
        },
        set: ({ set }: { set: SetRecoilState }, newValue: T | DefaultValue) => set(base, newValue),
        cachePolicy_UNSTABLE: {
            eviction: 'most-recent',
        },
        dangerouslyAllowMutability: options.dangerouslyAllowMutability,
    });
    setConfigDeletionHandler(sel.key, getConfigDeletionHandler(options.key));
    return sel;
}

const atomWithWrappedValue = (atom as unknown) as typeof atom & {
    value: <T>(value: T) => WrappedValue<T>;
};
atomWithWrappedValue.value = <T>(value: T) => new WrappedValue(value);

export { atomWithWrappedValue as atom };
export default atomWithWrappedValue; 