/**
 * TypeScript port of Recoil_selector.js
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
  ValueLoadable,
} from '../adt/Loadable';
import {WrappedValue} from '../adt/Wrapper';
import {CachePolicy} from '../caches/CachePolicy';
import treeCacheFromPolicy from '../caches/treeCacheFromPolicy';
import {
  NodeCacheRoute,
  TreeCacheImplementation,
} from '../caches/TreeCacheImplementationType';
import {
  getNodeLoadable,
  peekNodeLoadable,
  setNodeValue,
} from '../core/FunctionalCore';
import {saveDepsToStore} from '../core/Graph';
import {StateID} from '../core/Keys';
import {
  DefaultValue,
  DEFAULT_VALUE,
  getConfigDeletionHandler,
  getNode,
  registerNode,
} from '../core/Node';
import {
  isRecoilValue,
  RecoilState,
  RecoilValue,
  RecoilValueReadOnly,
} from '../core/RecoilValue';
import {markRecoilValueModified} from '../core/RecoilValueInterface';
import {retainedByOptionWithDefault} from '../core/Retention';
import {RetainedBy} from '../core/RetainedBy';
import {AtomWrites, NodeKey, Store, TreeState} from '../core/State';
import {
  recoilCallback,
  RecoilCallbackInterface,
} from '../hooks/useRecoilCallback';
import concatIterables from '../../../shared/src/util/Recoil_concatIterables';
import deepFreezeValue from '../../../shared/src/util/Recoil_deepFreezeValue';
import err from '../../../shared/src/util/Recoil_err';
import filterIterable from '../../../shared/src/util/Recoil_filterIterable';
import gkx from '../../../shared/src/util/Recoil_gkx';
import invariant from '../../../shared/src/util/Recoil_invariant';
import isPromise from '../../../shared/src/util/Recoil_isPromise';
import mapIterable from '../../../shared/src/util/Recoil_mapIterable';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import {startPerfBlock} from '../../../shared/src/util/Recoil_PerformanceTimings';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';
import {
  GetRecoilValue,
  ResetRecoilState,
  SetRecoilState,
  ValueOrUpdater,
} from './callbackTypes';

type SelectorCallbackInterface<T> = Readonly<
  RecoilCallbackInterface & {
    node: RecoilState<T>;
  }
>;
export type GetCallback<T> = <Args extends ReadonlyArray<unknown>, Return>(
  fn: (
    callbackInterface: SelectorCallbackInterface<T>,
  ) => (...args: Args) => Return,
) => (...args: Args) => Return;

type BaseSelectorOptions = Readonly<{
  key: string;
  dangerouslyAllowMutability?: boolean;
  retainedBy_UNSTABLE?: RetainedBy;
  cachePolicy_UNSTABLE?: CachePolicy;
}>;

export type ReadOnlySelectorOptions<T> = Readonly<
  BaseSelectorOptions & {
    get: (opts: {
      get: GetRecoilValue;
      getCallback: GetCallback<T>;
    }) => RecoilValue<T> | Promise<T> | Loadable<T> | WrappedValue<T> | T;
  }
>;

export type ReadWriteSelectorOptions<T> = Readonly<
  ReadOnlySelectorOptions<T> & {
    set: (
      opts: {
        set: SetRecoilState;
        get: GetRecoilValue;
        reset: ResetRecoilState;
      },
      newValue: T | DefaultValue,
    ) => void;
  }
>;

export type SelectorOptions<T> =
  | ReadOnlySelectorOptions<T>
  | ReadWriteSelectorOptions<T>;

export type DepValues = Map<NodeKey, Loadable<unknown>>;

class Canceled {}
const CANCELED: Canceled = new Canceled();

type ExecutionID = number;

type ExecutionInfo<T> = {
  depValuesDiscoveredSoFarDuringAsyncWork: DepValues;
  loadingLoadable: LoadingLoadable<T>;
  executionID: ExecutionID;
  stateVersions: Map<StateID, boolean>;
};

type LoadingDepsState = {
  loadingDepKey: NodeKey | null;
  loadingDepPromise: Promise<unknown> | null;
};

export function selector<T>(
  options: ReadOnlySelectorOptions<T>,
): RecoilValueReadOnly<T>;
export function selector<T>(
  options: ReadWriteSelectorOptions<T>,
): RecoilState<T>;
export function selector<T>(
  options: ReadOnlySelectorOptions<T> | ReadWriteSelectorOptions<T>,
): RecoilValue<T> {
  let recoilValue: RecoilValue<T> | null = null;

  const {key, get, cachePolicy_UNSTABLE: cachePolicy} = options;
  const set = 'set' in options ? options.set : undefined;
  if (__DEV__) {
    if (typeof key !== 'string') {
      throw err(
        'A key option with a unique string value must be provided when creating a selector.',
      );
    }
    if (typeof get !== 'function') {
      throw err(
        'Selectors must specify a get callback option to get the selector value.',
      );
    }
  }

  const discoveredDependencyNodeKeys = new Set<NodeKey>();

  const cache: TreeCacheImplementation<Loadable<T>> = treeCacheFromPolicy(
    cachePolicy ?? {
      equality: 'reference',
      eviction: 'keep-all',
    },
    key,
  );

  const retainedBy = retainedByOptionWithDefault(options.retainedBy_UNSTABLE);

  const executionInfoMap: Map<Store, ExecutionInfo<T>> = new Map();
  const waitingStores: Map<ExecutionID, Set<Store>> = new Map();
  const dependencyStack: Array<NodeKey> = [];
  const getNewExecutionID: () => ExecutionID = (() => {
    let executionID = 0;
    return () => executionID++;
  })();
  let liveStoresCount = 0;

  function selectorIsLive() {
    return !gkx('recoil_memory_managament_2020') || liveStoresCount > 0;
  }

  function selectorInit(store: Store): () => void {
    store.getState().knownSelectors.add(key);
    liveStoresCount++;
    return () => {
      liveStoresCount--;
    };
  }

  function selectorShouldDeleteConfigOnRelease() {
    return getConfigDeletionHandler(key) !== undefined && !selectorIsLive();
  }

  function resolveAsync(
    store: Store,
    state: TreeState,
    executionID: ExecutionID,
    loadable: Loadable<T>,
    depValues: DepValues,
  ): void {
    setCache(state, loadable, depValues);
    notifyStoresOfResolvedAsync(store, executionID);
  }

  function notifyStoresOfResolvedAsync(
    store: Store,
    executionID: ExecutionID,
  ): void {
    if (isLatestExecution(store, executionID)) {
      clearExecutionInfo(store);
    }
    notifyWaitingStores(executionID, true);
  }

  function notifyStoresOfNewAsyncDep(
    store: Store,
    executionID: ExecutionID,
  ): void {
    if (isLatestExecution(store, executionID)) {
      const executionInfo = nullthrows(getExecutionInfo(store));
      executionInfo.stateVersions.clear();
      notifyWaitingStores(executionID, false);
    }
  }

  function notifyWaitingStores(
    executionID: ExecutionID,
    clearWaitlist: boolean,
  ) {
    const stores = waitingStores.get(executionID);
    if (stores != null) {
      for (const waitingStore of stores) {
        markRecoilValueModified(waitingStore, nullthrows(recoilValue));
      }
      if (clearWaitlist) {
        waitingStores.delete(executionID);
      }
    }
  }

  function markStoreWaitingForResolvedAsync(
    store: Store,
    executionID: ExecutionID,
  ): void {
    let stores = waitingStores.get(executionID);
    if (stores == null) {
      waitingStores.set(executionID, (stores = new Set()));
    }
    stores.add(store);
  }

  function wrapResultPromise(
    store: Store,
    promise: Promise<T>,
    state: TreeState,
    depValues: DepValues,
    executionID: ExecutionID,
    loadingDepsState: LoadingDepsState,
  ): Promise<T> {
    return promise
      .then(value => {
        if (!selectorIsLive()) {
          clearExecutionInfo(store);
          throw CANCELED;
        }

        const loadable = loadableWithValue(value);
        resolveAsync(store, state, executionID, loadable, depValues);
        return value;
      })
      .catch(errorOrPromise => {
        if (!selectorIsLive()) {
          clearExecutionInfo(store);
          throw CANCELED;
        }

        if (isPromise(errorOrPromise)) {
          return wrapPendingDependencyPromise(
            store,
            errorOrPromise,
            state,
            depValues,
            executionID,
            loadingDepsState,
          );
        }

        const loadable = loadableWithError<T>(errorOrPromise);
        resolveAsync(store, state, executionID, loadable, depValues);
        throw errorOrPromise;
      });
  }

  function wrapPendingDependencyPromise(
    store: Store,
    promise: Promise<unknown>,
    state: TreeState,
    existingDeps: DepValues,
    executionID: ExecutionID,
    loadingDepsState: LoadingDepsState,
  ): Promise<T> {
    return promise
      .then(resolvedDep => {
        if (!selectorIsLive()) {
          clearExecutionInfo(store);
          throw CANCELED;
        }

        if (
          loadingDepsState.loadingDepKey != null &&
          loadingDepsState.loadingDepPromise === promise
        ) {
          state.atomValues.set(
            loadingDepsState.loadingDepKey,
            loadableWithValue(resolvedDep),
          );
        } else {
          store.getState().knownSelectors.forEach(nodeKey => {
            state.atomValues.delete(nodeKey);
          });
        }

        const cachedLoadable = getLoadableFromCacheAndUpdateDeps(store, state);
        if (cachedLoadable && cachedLoadable.state !== 'loading') {
          if (
            isLatestExecution(store, executionID) ||
            getExecutionInfo(store) == null
          ) {
            notifyStoresOfResolvedAsync(store, executionID);
          }

          if (cachedLoadable.state === 'hasValue') {
            return cachedLoadable.contents;
          } else {
            throw cachedLoadable.contents;
          }
        }

        if (!isLatestExecution(store, executionID)) {
          const executionInfo = getInProgressExecutionInfo(store, state);
          if (executionInfo != null) {
            return executionInfo.loadingLoadable.contents as Promise<T>;
          }
        }

        const [loadable, depValues] = evaluateSelectorGetter(
          store,
          state,
          executionID,
        );

        if (loadable.state !== 'loading') {
          resolveAsync(store, state, executionID, loadable, depValues);
        }

        if (loadable.state === 'hasError') {
          throw loadable.contents;
        }
        return loadable.contents as T;
      })
      .catch(error => {
        if (error instanceof Canceled) {
          throw CANCELED;
        }
        if (!selectorIsLive()) {
          clearExecutionInfo(store);
          throw CANCELED;
        }

        const loadable = loadableWithError<T>(error);
        resolveAsync(store, state, executionID, loadable, existingDeps);
        throw error;
      });
  }

  function updateDeps(
    store: Store,
    state: TreeState,
    deps: ReadonlySet<NodeKey>,
    executionID: ExecutionID | null,
  ): void {
    if (
      (executionID != null && isLatestExecution(store, executionID)) ||
      state.version === store.getState()?.currentTree?.version ||
      state.version === store.getState()?.nextTree?.version
    ) {
      saveDepsToStore(
        key,
        deps,
        store,
        store.getState()?.nextTree?.version ??
          store.getState().currentTree.version,
      );
    }
    for (const nodeKey of deps) {
      discoveredDependencyNodeKeys.add(nodeKey);
    }
  }

  function evaluateSelectorGetter(
    store: Store,
    state: TreeState,
    executionID: ExecutionID,
  ): [Loadable<T>, DepValues] {
    const endPerfBlock = startPerfBlock(key);
    let duringSynchronousExecution = true;
    let duringAsynchronousExecution = true;
    const finishEvaluation = () => {
      endPerfBlock();
      duringAsynchronousExecution = false;
    };

    let result;
    let resultIsError = false;
    let loadable: Loadable<T>;
    const loadingDepsState: LoadingDepsState = {
      loadingDepKey: null,
      loadingDepPromise: null,
    };

    const depValues = new Map<NodeKey, Loadable<unknown>>();

    function getRecoilValue<S>(recoilValue: RecoilValue<S>): S {
      const depLoadable = getNodeLoadable<S>(store, state, recoilValue.key);

      depValues.set(recoilValue.key, depLoadable);

      if (!duringSynchronousExecution) {
        updateDeps(store, state, new Set(depValues.keys()), executionID);
        notifyStoresOfNewAsyncDep(store, executionID);
      }

      switch (depLoadable.state) {
        case 'hasValue':
          return depLoadable.contents;
        case 'hasError':
          throw depLoadable.contents;
        case 'loading':
          loadingDepsState.loadingDepKey = recoilValue.key;
          loadingDepsState.loadingDepPromise = depLoadable.contents;
          throw depLoadable.contents;
      }
      throw err('Invalid Loadable state');
    }

    const getCallback = <Args extends ReadonlyArray<unknown>, Return>(
      fn: (
        callbackInterface: SelectorCallbackInterface<T>,
      ) => (...args: Args) => Return,
    ): ((...args: Args) => Return) => {
      return (...args) => {
        if (duringAsynchronousExecution) {
          throw err(
            'Callbacks from getCallback() should only be called asynchronously after the selector is evalutated.  It can be used for selectors to return objects with callbacks that can work with Recoil state without a subscription.',
          );
        }
        invariant(recoilValue != null, 'Recoil Value can never be null');
        return recoilCallback<Args, Return, {node: RecoilState<T>}>(
          store,
          fn,
          args,
          {node: recoilValue as RecoilState<T>},
        );
      };
    };

    try {
      result = get({get: getRecoilValue, getCallback});
      result = isRecoilValue(result) ? getRecoilValue(result) : result;

      if (isLoadable(result)) {
        if (result.state === 'hasError') {
          resultIsError = true;
        }
        result = (result as ValueLoadable<T>).contents;
      }

      if (isPromise(result)) {
        result = wrapResultPromise(
          store,
          result as Promise<T>,
          state,
          depValues,
          executionID,
          loadingDepsState,
        ).finally(finishEvaluation);
      } else {
        finishEvaluation();
      }

      result = result instanceof WrappedValue ? result.value : result;
    } catch (errorOrDepPromise) {
      result = errorOrDepPromise;

      if (isPromise(result)) {
        result = wrapPendingDependencyPromise(
          store,
          result,
          state,
          depValues,
          executionID,
          loadingDepsState,
        ).finally(finishEvaluation);
      } else {
        resultIsError = true;
        finishEvaluation();
      }
    }

    if (resultIsError) {
      loadable = loadableWithError(result as Error);
    } else if (isPromise(result)) {
      loadable = loadableWithPromise<T>(result as Promise<T>);
    } else {
      loadable = loadableWithValue<T>(result as T);
    }

    duringSynchronousExecution = false;
    updateExecutionInfoDepValues(store, executionID, depValues);
    updateDeps(store, state, new Set(depValues.keys()), executionID);
    return [loadable, depValues];
  }

  function getLoadableFromCacheAndUpdateDeps(
    store: Store,
    state: TreeState,
  ): Loadable<T> | undefined {
    let cachedLoadable: Loadable<T> | undefined = state.atomValues.get(key) as
      | Loadable<T>
      | undefined;
    if (cachedLoadable != null) {
      return cachedLoadable;
    }

    const depsAfterCacheLookup = new Set<NodeKey>();
    try {
      cachedLoadable = cache.get(
        nodeKey => {
          invariant(
            typeof nodeKey === 'string',
            'Cache nodeKey is type string',
          );

          return getNodeLoadable<unknown>(store, state, nodeKey).contents;
        },
        {
          onNodeVisit: node => {
            if (node.type === 'branch' && node.nodeKey !== key) {
              depsAfterCacheLookup.add(node.nodeKey);
            }
          },
        },
      );
    } catch (error) {
      throw err(
        `Problem with cache lookup for selector "${key}": ${
          (error as Error).message
        }`,
      );
    }

    if (cachedLoadable) {
      state.atomValues.set(key, cachedLoadable);
      updateDeps(
        store,
        state,
        depsAfterCacheLookup,
        getExecutionInfo(store)?.executionID ?? null,
      );
    }

    return cachedLoadable;
  }

  function getSelectorLoadableAndUpdateDeps(
    store: Store,
    state: TreeState,
  ): Loadable<T> {
    const cachedVal = getLoadableFromCacheAndUpdateDeps(store, state);
    if (cachedVal != null) {
      clearExecutionInfo(store);
      return cachedVal;
    }

    const inProgressExecutionInfo = getInProgressExecutionInfo(store, state);
    if (inProgressExecutionInfo != null) {
      if (inProgressExecutionInfo.loadingLoadable?.state === 'loading') {
        markStoreWaitingForResolvedAsync(
          store,
          inProgressExecutionInfo.executionID,
        );
      }

      return inProgressExecutionInfo.loadingLoadable;
    }

    const newExecutionID = getNewExecutionID();
    const [loadable, newDepValues] = evaluateSelectorGetter(
      store,
      state,
      newExecutionID,
    );

    if (loadable.state === 'loading') {
      setExecutionInfo(store, newExecutionID, loadable, newDepValues, state);
      markStoreWaitingForResolvedAsync(store, newExecutionID);
    } else {
      clearExecutionInfo(store);
      setCache(state, loadable, newDepValues);
    }

    return loadable;
  }

  function getInProgressExecutionInfo(
    store: Store,
    state: TreeState,
  ): ExecutionInfo<T> | undefined {
    const pendingExecutions = Array.from(
      concatIterables([
        executionInfoMap.has(store)
          ? [nullthrows(executionInfoMap.get(store))]
          : [],
        mapIterable(
          filterIterable(executionInfoMap, ([s]) => s !== store),
          ([, execInfo]) => execInfo,
        ),
      ]),
    );

    function anyDepChanged(execDepValues: DepValues): boolean {
      for (const [depKey, execLoadable] of execDepValues) {
        if (!getNodeLoadable<unknown>(store, state, depKey).is(execLoadable)) {
          return true;
        }
      }
      return false;
    }

    for (const execInfo of pendingExecutions) {
      if (
        execInfo.stateVersions.get(state.version) ||
        !anyDepChanged(execInfo.depValuesDiscoveredSoFarDuringAsyncWork)
      ) {
        execInfo.stateVersions.set(state.version, true);
        return execInfo;
      } else {
        execInfo.stateVersions.set(state.version, false);
      }
    }

    return undefined;
  }

  function getExecutionInfo(store: Store): ExecutionInfo<T> | undefined {
    return executionInfoMap.get(store);
  }

  function setExecutionInfo(
    store: Store,
    newExecutionID: ExecutionID,
    loadable: LoadingLoadable<T>,
    depValues: DepValues,
    state: TreeState,
  ) {
    executionInfoMap.set(store, {
      depValuesDiscoveredSoFarDuringAsyncWork: depValues,
      executionID: newExecutionID,
      loadingLoadable: loadable,
      stateVersions: new Map([[state.version, true]]),
    });
  }

  function updateExecutionInfoDepValues(
    store: Store,
    executionID: ExecutionID,
    depValues: DepValues,
  ) {
    if (isLatestExecution(store, executionID)) {
      const executionInfo = getExecutionInfo(store);
      if (executionInfo != null) {
        executionInfo.depValuesDiscoveredSoFarDuringAsyncWork = depValues;
      }
    }
  }

  function clearExecutionInfo(store: Store) {
    executionInfoMap.delete(store);
  }

  function isLatestExecution(
    store: Store,
    executionID: ExecutionID | null,
  ): boolean {
    return executionID === getExecutionInfo(store)?.executionID;
  }

  function depValuesToDepRoute(depValues: DepValues): NodeCacheRoute {
    return Array.from(depValues.entries()).map(([depKey, valLoadable]) => [
      depKey,
      valLoadable.contents,
    ]);
  }

  function setCache(
    state: TreeState,
    loadable: Loadable<T>,
    depValues: DepValues,
  ) {
    if (__DEV__) {
      if (
        loadable.state !== 'loading' &&
        options.dangerouslyAllowMutability !== true
      ) {
        deepFreezeValue(loadable.contents);
      }
    }

    state.atomValues.set(key, loadable);
    try {
      cache.set(depValuesToDepRoute(depValues), loadable);
    } catch (error) {
      throw err(
        `Problem with setting cache for selector "${key}": ${
          (error as Error).message
        }`,
      );
    }
  }

  function detectCircularDependencies(fn: () => Loadable<T>): Loadable<T> {
    if (dependencyStack.includes(key)) {
      const message = `Recoil selector has circular dependencies: ${dependencyStack
        .slice(dependencyStack.indexOf(key))
        .join(' \u2192 ')}`;
      return loadableWithError<T>(err(message));
    }
    dependencyStack.push(key);
    try {
      return fn();
    } finally {
      dependencyStack.pop();
    }
  }

  function selectorPeek(
    store: Store,
    state: TreeState,
  ): Loadable<T> | undefined {
    const cachedLoadable = state.atomValues.get(key) as Loadable<T> | undefined;
    if (cachedLoadable != null) {
      return cachedLoadable;
    }
    return cache.get(nodeKey => {
      invariant(typeof nodeKey === 'string', 'Cache nodeKey is type string');
      return peekNodeLoadable<unknown>(store, state, nodeKey)?.contents;
    });
  }

  function selectorGet(store: Store, state: TreeState): Loadable<T> {
    if (store.skipCircularDependencyDetection_DANGEROUS === true) {
      return getSelectorLoadableAndUpdateDeps(store, state);
    }
    return detectCircularDependencies(() =>
      getSelectorLoadableAndUpdateDeps(store, state),
    );
  }

  function invalidateSelector(state: TreeState) {
    state.atomValues.delete(key);
  }

  function clearSelectorCache(store: Store, treeState: TreeState) {
    invariant(recoilValue != null, 'Recoil Value can never be null');
    for (const nodeKey of discoveredDependencyNodeKeys) {
      const node = getNode(nodeKey);
      node.clearCache?.(store, treeState);
    }
    discoveredDependencyNodeKeys.clear();
    invalidateSelector(treeState);
    cache.clear();
    // Don't call markRecoilValueModified here as it causes nested state updates
    // The caller (like refreshRecoilValue) should handle marking as dirty
  }

  if (set != null) {
    const selectorSet = (
      store: Store,
      state: TreeState,
      newValue: T | DefaultValue,
    ): AtomWrites => {
      let syncSelectorSetFinished = false;
      const writes: AtomWrites = new Map();

      function getRecoilValue<S>(recoilValue: RecoilValue<S>): S {
        if (syncSelectorSetFinished) {
          throw err('Recoil: Async selector sets are not currently supported.');
        }

        const loadable = getNodeLoadable<S>(store, state, recoilValue.key);

        if (loadable.state === 'hasValue') {
          return loadable.contents;
        } else if (loadable.state === 'loading') {
          const msg = `Getting value of asynchronous atom or selector "${recoilValue.key}" in a pending state while setting selector "${key}" is not yet supported.`;
          recoverableViolation(msg, 'recoil');
          throw err(msg);
        } else {
          throw loadable.contents;
        }
      }

      function setRecoilState<S>(
        recoilState: RecoilState<S>,
        valueOrUpdater: ValueOrUpdater<S>,
      ) {
        if (syncSelectorSetFinished) {
          const msg =
            'Recoil: Async selector sets are not currently supported.';
          recoverableViolation(msg, 'recoil');
          throw err(msg);
        }

        const setValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: S) => S | DefaultValue)(
                getRecoilValue(recoilState),
              )
            : valueOrUpdater;

        const upstreamWrites = setNodeValue(
          store,
          state,
          recoilState.key,
          setValue,
        );

        upstreamWrites.forEach((v, k) => writes.set(k, v));
      }

      function resetRecoilState<S>(recoilState: RecoilState<S>) {
        setRecoilState(recoilState, DEFAULT_VALUE);
      }

      const ret = set(
        {set: setRecoilState, get: getRecoilValue, reset: resetRecoilState},
        newValue,
      );

      if (ret !== undefined) {
        throw isPromise(ret)
          ? err('Recoil: Async selector sets are not currently supported.')
          : err('Recoil: selector set should be a void function.');
      }
      syncSelectorSetFinished = true;

      return writes;
    };

    recoilValue = registerNode<T>({
      key,
      nodeType: 'selector',
      peek: selectorPeek,
      get: selectorGet,
      set: selectorSet,
      init: selectorInit,
      invalidate: invalidateSelector,
      clearCache: clearSelectorCache,
      shouldDeleteConfigOnRelease: selectorShouldDeleteConfigOnRelease,
      dangerouslyAllowMutability: options.dangerouslyAllowMutability,
      shouldRestoreFromSnapshots: false,
      retainedBy,
    });
    return recoilValue;
  } else {
    recoilValue = registerNode<T>({
      key,
      nodeType: 'selector',
      peek: selectorPeek,
      get: selectorGet,
      init: selectorInit,
      invalidate: invalidateSelector,
      clearCache: clearSelectorCache,
      shouldDeleteConfigOnRelease: selectorShouldDeleteConfigOnRelease,
      dangerouslyAllowMutability: options.dangerouslyAllowMutability,
      shouldRestoreFromSnapshots: false,
      retainedBy,
    });
    return recoilValue;
  }
}

const selectorWithWrappedValue = selector as any;
selectorWithWrappedValue.value = <T>(value: T) => new WrappedValue(value);

export default selectorWithWrappedValue;
