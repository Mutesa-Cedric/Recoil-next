/**
 * TypeScript port of RecoilSync_index.js
 */

// Core Recoil Sync exports
export {RecoilSync, syncEffect, registries_FOR_TESTING} from './RecoilSync';

export type {
  ItemKey,
  StoreKey,
  ItemDiff,
  ItemSnapshot,
  WriteInterface,
  WriteItem,
  WriteItems,
  ResetItem,
  ReadItem,
  UpdateItem,
  UpdateItems,
  UpdateAllKnownItems,
  ListenInterface,
  ListenToItems,
  RecoilSyncOptions,
  ReadAtomInterface,
  ReadAtom,
  WriteAtomInterface,
  WriteAtom,
  SyncEffectOptions,
} from './RecoilSync';

// URL Synchronization exports
export {RecoilURLSync, urlSyncEffect} from './RecoilSync_URL';

export type {
  LocationOption,
  BrowserInterface,
  RecoilURLSyncOptions,
} from './RecoilSync_URL';

// JSON URL Synchronization exports
export {RecoilURLSyncJSON} from './RecoilSync_URLJSON';

export type {RecoilURLSyncJSONOptions} from './RecoilSync_URLJSON';

// Transit URL Synchronization exports
export {RecoilURLSyncTransit} from './RecoilSync_URLTransit';

export type {
  TransitHandler,
  RecoilURLSyncTransitOptions,
} from './RecoilSync_URLTransit';
