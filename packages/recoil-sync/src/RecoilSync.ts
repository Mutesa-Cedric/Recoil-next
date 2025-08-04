/**
 * TypeScript port of RecoilSync.js
 */

import type { AtomEffect, Loadable, RecoilState, StoreID } from 'recoil';
import type { RecoilValueInfo } from '../../recoil/src/core/FunctionalCore';
import type { RecoilValue } from '../../recoil/src/core/RecoilValue';
import type { Checker } from '@recoiljs/refine';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  DefaultValue,
  RecoilLoadable,
  useRecoilSnapshot,
  useRecoilStoreID,
  useRecoilTransaction_UNSTABLE,
} from 'recoil';
import err from '../../shared/src/util/Recoil_err';
import lazyProxy from '../../shared/src/util/Recoil_lazyProxy';

type NodeKey = string;
export type ItemKey = string;
export type StoreKey = string | void;
type EffectKey = number;

export type ItemDiff = Map<ItemKey, DefaultValue | any>;
export type ItemSnapshot = Map<ItemKey, DefaultValue | any>;
export type WriteInterface = {
  diff: ItemDiff;
  allItems: ItemSnapshot;
};
export type WriteItem = <T>(itemKey: ItemKey, value: DefaultValue | T) => void;
export type WriteItems = (writeInterface: WriteInterface) => void;
export type ResetItem = (itemKey: ItemKey) => void;

export type ReadItem = (itemKey: ItemKey) =>
  | DefaultValue
  | Promise<DefaultValue | any>
  | Loadable<DefaultValue | any>
  | any;

export type UpdateItem = <T>(itemKey: ItemKey, newValue: DefaultValue | T) => void;
export type UpdateItems = (itemSnapshot: ItemSnapshot) => void;
export type UpdateAllKnownItems = (itemSnapshot: ItemSnapshot) => void;
export type ListenInterface = {
  updateItem: UpdateItem;
  updateItems: UpdateItems;
  updateAllKnownItems: UpdateAllKnownItems;
};
export type ListenToItems = (listenInterface: ListenInterface) => void | (() => void);
type ActionOnFailure = 'errorState' | 'defaultValue';

const DEFAULT_VALUE = new DefaultValue();

function setIntersectsMap<U, V>(a: Set<U>, b: Map<U, V>): boolean {
  if (a.size <= b.size) {
    for (const x of a) {
      if (b.has(x)) {
        return true;
      }
    }
  } else {
    for (const x of b.keys()) {
      if (a.has(x)) {
        return true;
      }
    }
  }
  return false;
}

type AtomSyncOptions<T> = {
  itemKey: ItemKey;
  read: ReadAtom;
  write: WriteAtom<T>;
  storeKey?: StoreKey;
  refine: Checker<T>;
  syncDefault?: boolean;
  actionOnFailure_UNSTABLE?: ActionOnFailure;
};

type EffectRegistration<T> = {
  options: AtomSyncOptions<T>;
  subscribedItemKeys: Set<ItemKey>;
};

type AtomRegistration<T> = {
  atom: RecoilState<T>;
  effects: Map<EffectKey, EffectRegistration<T>>;
  // In-flight updates to avoid feedback loops
  pendingUpdate?: { value: any | DefaultValue };
};

type Storage = {
  write?: WriteItems;
  read?: ReadItem;
};

class Registries {
  atomRegistries: Map<
    StoreID,
    Map<StoreKey, Map<NodeKey, AtomRegistration<any>>>
  > = new Map();
  nextEffectKey: EffectKey = 0;

  getAtomRegistry(
    recoilStoreID: StoreID,
    externalStoreKey: StoreKey,
  ): Map<NodeKey, AtomRegistration<any>> {
    if (!this.atomRegistries.has(recoilStoreID)) {
      this.atomRegistries.set(recoilStoreID, new Map());
    }
    const storeRegistries = this.atomRegistries.get(recoilStoreID);
    const registry = storeRegistries?.get(externalStoreKey);
    if (registry != null) {
      return registry;
    }
    const newRegistry = new Map<NodeKey, AtomRegistration<any>>();
    storeRegistries?.set(externalStoreKey, newRegistry);
    return newRegistry;
  }

  setAtomEffect<T>(
    recoilStoreID: StoreID,
    externalStoreKey: StoreKey,
    node: RecoilState<T>,
    options: AtomSyncOptions<T>,
  ): { effectRegistration: EffectRegistration<T>; unregisterEffect: () => void } {
    const atomRegistry = this.getAtomRegistry(recoilStoreID, externalStoreKey);
    if (!atomRegistry.has(node.key)) {
      atomRegistry.set(node.key, { atom: node, effects: new Map() });
    }
    const effectKey = this.nextEffectKey++;
    const effectRegistration = {
      options,
      subscribedItemKeys: new Set([options.itemKey]),
    };
    atomRegistry.get(node.key)?.effects.set(effectKey, effectRegistration);
    return {
      effectRegistration,
      unregisterEffect: () =>
        void atomRegistry.get(node.key)?.effects.delete(effectKey),
    };
  }

  storageRegistries: Map<StoreID, Map<StoreKey, Storage>> = new Map();

  getStorage(recoilStoreID: StoreID, externalStoreKey: StoreKey): Storage | undefined {
    return this.storageRegistries.get(recoilStoreID)?.get(externalStoreKey);
  }

  setStorage(
    recoilStoreID: StoreID,
    externalStoreKey: StoreKey,
    storage: Storage,
  ): () => void {
    if (!this.storageRegistries.has(recoilStoreID)) {
      this.storageRegistries.set(recoilStoreID, new Map());
    }
    this.storageRegistries.get(recoilStoreID)?.set(externalStoreKey, storage);
    return () =>
      void this.storageRegistries.get(recoilStoreID)?.delete(externalStoreKey);
  }
}

const registries: Registries = new Registries();

function validateLoadable<T>(
  input:
    | DefaultValue
    | Promise<any | DefaultValue>
    | Loadable<any | DefaultValue>
    | any,
  { refine, actionOnFailure_UNSTABLE }: AtomSyncOptions<T>,
): Loadable<T | DefaultValue> {
  return RecoilLoadable.of(input).map<T | DefaultValue>(x => {
    if (x instanceof DefaultValue) {
      return x;
    }
    const result = refine(x);
    if (result.type === 'success') {
      return result.value;
    }
    if (actionOnFailure_UNSTABLE === 'defaultValue') {
      return new DefaultValue();
    }
    throw err(`[${result.path.toString()}]: ${result.message}`);
  });
}

function readAtomItems<T>(
  effectRegistration: EffectRegistration<T>,
  readFromStorage?: ReadItem,
  diff?: ItemDiff,
): Loadable<T | DefaultValue> | null {
  const { options } = effectRegistration;
  const readFromStorageRequired =
    readFromStorage ??
    ((itemKey: ItemKey) =>
      RecoilLoadable.error(
        `Read functionality not provided for ${
          options.storeKey != null ? `"${options.storeKey}" ` : ''
        }store in useRecoilSync() hook while updating item "${itemKey}".`,
      ));

  effectRegistration.subscribedItemKeys = new Set();
  const read: ReadItem = (itemKey: ItemKey) => {
    effectRegistration.subscribedItemKeys.add(itemKey);
    const value = diff?.has(itemKey)
      ? diff?.get(itemKey)
      : readFromStorageRequired(itemKey);

    if (RecoilLoadable.isLoadable(value)) {
      const loadable = value as Loadable<any>;
      if (loadable.state === 'hasError') {
        throw loadable.contents;
      }
    }
    return value;
  };

  let value;
  try {
    value = options.read({ read });
  } catch (error) {
    return RecoilLoadable.error(error);
  }
  return value instanceof DefaultValue ? null : validateLoadable(value, options);
}

function writeAtomItemsToDiff<T>(
  diff: ItemDiff,
  options: AtomSyncOptions<T>,
  readFromStorage?: ReadItem,
  loadable?: Loadable<T> | null,
): ItemDiff {
  if (loadable != null && loadable?.state !== 'hasValue') {
    return diff;
  }
  const readFromStorageRequired =
    readFromStorage ??
    ((_: ItemKey) => {
      throw err(
        `Read functionality not provided for ${
          options.storeKey != null ? `"${options.storeKey}" ` : ''
        }store in useRecoilSync() hook while writing item "${options.itemKey}".`,
      );
    });
  const read = (itemKey: ItemKey) =>
    diff.has(itemKey) ? diff.get(itemKey) : readFromStorageRequired(itemKey);
  const write = <S>(k: ItemKey, l: DefaultValue | S) => void diff.set(k, l);
  const reset = (k: ItemKey) => void diff.set(k, DEFAULT_VALUE);

  options.write(
    { write, reset, read },
    loadable == null ? DEFAULT_VALUE : loadable.contents,
  );
  return diff;
}

const itemsFromSnapshot = (
  recoilStoreID: StoreID,
  storeKey: StoreKey,
  getInfo: <T>(recoilValue: RecoilValue<T>) => RecoilValueInfo<T>,
): ItemSnapshot => {
  const items: ItemSnapshot = new Map();
  for (const [, { atom, effects }] of registries.getAtomRegistry(
    recoilStoreID,
    storeKey,
  )) {
    for (const [, { options }] of effects) {
      const atomInfo = getInfo(atom);
      writeAtomItemsToDiff(
        items,
        options,
        registries.getStorage(recoilStoreID, storeKey)?.read,
        atomInfo.isSet || options.syncDefault === true
          ? (atomInfo.loadable as any)
          : null,
      );
    }
  }
  return items;
};

function getWriteInterface(
  recoilStoreID: StoreID,
  storeKey: StoreKey,
  diff: ItemDiff,
  getInfo: <T>(recoilValue: RecoilValue<T>) => RecoilValueInfo<T>,
): WriteInterface {
  // Use a Proxy so we only generate `allItems` if it's actually used.
  return lazyProxy(
    { diff },
    { allItems: () => itemsFromSnapshot(recoilStoreID, storeKey, getInfo) },
  );
}

///////////////////////
// useRecoilSync()
///////////////////////
export type RecoilSyncOptions = {
  storeKey?: StoreKey;
  write?: WriteItems;
  read?: ReadItem;
  listen?: ListenToItems;
};

export function useRecoilSync({
  storeKey,
  write,
  read,
  listen,
}: RecoilSyncOptions): void {
  const recoilStoreID = useRecoilStoreID();

  // Subscribe to Recoil state changes
  const snapshot = useRecoilSnapshot();
  const previousSnapshotRef = useRef(snapshot);
  useEffect(() => {
    if (write != null && snapshot !== previousSnapshotRef.current) {
      previousSnapshotRef.current = snapshot;
      const diff: ItemDiff = new Map();
      const atomRegistry = registries.getAtomRegistry(recoilStoreID, storeKey);
      const modifiedAtoms = snapshot.getNodes_UNSTABLE({ isModified: true });
      for (const atom of modifiedAtoms) {
        const registration = atomRegistry.get(atom.key);
        if (registration != null) {
          const atomInfo = snapshot.getInfo_UNSTABLE(registration.atom);
          // Avoid feedback loops:
          // Don't write to storage updates that came from listening to storage
          if (
            (atomInfo.isSet &&
              atomInfo.loadable?.contents !==
                registration.pendingUpdate?.value) ||
            (!atomInfo.isSet &&
              !(registration.pendingUpdate?.value instanceof DefaultValue))
          ) {
            for (const [, { options }] of registration.effects) {
              writeAtomItemsToDiff(
                diff,
                options,
                read,
                atomInfo.isSet || options.syncDefault === true
                  ? atomInfo.loadable
                  : null,
              );
            }
          }
          delete registration.pendingUpdate;
        }
      }
      if (diff.size) {
        write(
          getWriteInterface(
            recoilStoreID,
            storeKey,
            diff,
            snapshot.getInfo_UNSTABLE as any,
          ),
        );
      }
    }
  }, [read, recoilStoreID, snapshot, storeKey, write]);

  const updateItems = useRecoilTransaction_UNSTABLE(
    ({ set, reset }) =>
      (diff: ItemDiff) => {
        const atomRegistry = registries.getAtomRegistry(
          recoilStoreID,
          storeKey,
        );
        // TODO iterating over all atoms registered with the store could be
        // optimized if we maintain a reverse look-up map of subscriptions.
        for (const [, atomRegistration] of atomRegistry) {
          // Iterate through the effects for this storage in reverse order as
          // the last effect takes priority.
          for (const [, effectRegistration] of Array.from(
            atomRegistration.effects,
          ).reverse()) {
            const { options, subscribedItemKeys } = effectRegistration;
            if (setIntersectsMap(subscribedItemKeys, diff)) {
              const loadable = readAtomItems(
                effectRegistration,
                read,
                diff,
              );
              if (loadable != null) {
                switch (loadable.state) {
                  case 'hasValue':
                    if (loadable.contents instanceof DefaultValue) {
                      reset(atomRegistration.atom);
                    } else {
                      // Avoid updating with the same value
                      atomRegistration.pendingUpdate = {
                        value: loadable.contents,
                      };
                      set(atomRegistration.atom, loadable.contents);
                    }
                    break;
                  case 'hasError':
                    if (options.actionOnFailure_UNSTABLE === 'errorState') {
                      atomRegistration.pendingUpdate = {
                        value: loadable.contents,
                      };
                      set(atomRegistration.atom, loadable);
                    } else {
                      reset(atomRegistration.atom);
                    }
                    break;
                  case 'loading':
                    atomRegistration.pendingUpdate = {
                      value: loadable.contents,
                    };
                    set(atomRegistration.atom, loadable);
                    break;
                }
              }
              break;
            }
          }
        }
      },
    [recoilStoreID, storeKey, read],
  );

  const updateItem = useCallback(
    <T>(itemKey: ItemKey, newValue: DefaultValue | T) => {
      updateItems(new Map([[itemKey, newValue]]));
    },
    [updateItems],
  );

  const updateAllKnownItems = useCallback(
    (itemSnapshot: ItemSnapshot) => {
      // Reset the value of any items that are registered and not included in
      // the user-provided snapshot.
      const atomRegistry = registries.getAtomRegistry(recoilStoreID, storeKey);
      for (const [, registration] of atomRegistry) {
        for (const [, { subscribedItemKeys }] of registration.effects) {
          for (const itemKey of subscribedItemKeys) {
            if (!itemSnapshot.has(itemKey)) {
              itemSnapshot.set(itemKey, DEFAULT_VALUE);
            }
          }
        }
      }
      updateItems(itemSnapshot);
    },
    [recoilStoreID, storeKey, updateItems],
  );

  useEffect(
    () =>
      // TODO try/catch errors and set atom to error state if actionOnFailure is errorState
      listen?.({ updateItem, updateItems, updateAllKnownItems }),
    [updateItem, updateItems, updateAllKnownItems, listen],
  );

  // Register Storage
  // Save before effects so that we can initialize atoms for initial render
  registries.setStorage(recoilStoreID, storeKey, { write, read });
  useEffect(
    () => registries.setStorage(recoilStoreID, storeKey, { write, read }),
    [recoilStoreID, storeKey, read, write],
  );
}

export function RecoilSync({
  children,
  ...props
}: RecoilSyncOptions & {
  children: React.ReactNode;
}): React.ReactNode {
  useRecoilSync(props);
  return children;
}

///////////////////////
// syncEffect()
///////////////////////
export type ReadAtomInterface = { read: ReadItem };
export type ReadAtom = (readInterface: ReadAtomInterface) =>
  | DefaultValue
  | Promise<DefaultValue | unknown>
  | Loadable<DefaultValue | unknown>
  | unknown;

export type WriteAtomInterface = {
  write: WriteItem;
  reset: ResetItem;
  read: ReadItem;
};
export type WriteAtom<T> = (writeInterface: WriteAtomInterface, value: DefaultValue | T) => void;

export type SyncEffectOptions<T> = {
  storeKey?: StoreKey;
  itemKey?: ItemKey;
  refine: Checker<T>;
  read?: ReadAtom;
  write?: WriteAtom<T>;
  // Sync actual default value instead of empty when atom is in default state
  syncDefault?: boolean;
  // If there is a failure reading or refining the value, should the atom
  // silently use the default value or be put in an error state
  actionOnFailure_UNSTABLE?: ActionOnFailure;
};

export function syncEffect<T>(opt: SyncEffectOptions<T>): AtomEffect<T> {
  return ({ node, trigger, storeID, setSelf, getLoadable, getInfo_UNSTABLE }) => {
    // Get options with defaults
    const itemKey = opt.itemKey ?? node.key;
    const options: AtomSyncOptions<T> = {
      itemKey,
      read: ({ read }) => read(itemKey),
      write: ({ write }, loadable) => write(itemKey, loadable),
      syncDefault: false,
      actionOnFailure_UNSTABLE: 'errorState',
      ...opt,
    };
    const { storeKey } = options;
    const storage = registries.getStorage(storeID, storeKey);

    // Register Atom
    const { effectRegistration, unregisterEffect } = registries.setAtomEffect(
      storeID,
      storeKey,
      node,
      options,
    );

    if (trigger === 'get') {
      // Initialize Atom value
      const readFromStorage = storage?.read;
      if (readFromStorage != null) {
        try {
          const loadable = readAtomItems(effectRegistration, readFromStorage);
          if (loadable != null) {
            switch (loadable.state) {
              case 'hasValue':
                if (!(loadable.contents instanceof DefaultValue)) {
                  setSelf(loadable.contents);
                }
                break;
              case 'hasError':
                if (options.actionOnFailure_UNSTABLE === 'errorState') {
                  throw loadable.contents;
                }
                break;
              case 'loading':
                setSelf(loadable.toPromise());
                break;
            }
          }
        } catch (error) {
          if (options.actionOnFailure_UNSTABLE === 'errorState') {
            throw error;
          }
        }
      }

      // Persist on Initial Read
      const writeToStorage = storage?.write;
      if (options.syncDefault === true && writeToStorage != null) {
        setTimeout(() => {
          const loadable = getLoadable(node);
          if (loadable.state === 'hasValue') {
            const diff = writeAtomItemsToDiff(
              new Map(),
              options,
              storage?.read,
              loadable,
            );
            writeToStorage(
              getWriteInterface(storeID, storeKey, diff, getInfo_UNSTABLE as any),
            );
          }
        }, 0);
      }
    }

    // Cleanup atom effect registration
    return unregisterEffect;
  };
}

export const registries_FOR_TESTING = registries; 