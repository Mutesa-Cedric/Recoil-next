/**
 * TypeScript port of Recoil_index.js
 * Main entry point that exports the public Recoil API
 */

// Export types
export type { StoreID } from './core/Keys';
export type { PersistenceType } from './core/Node';
export type {
    RecoilValue,
    RecoilState,
    RecoilValueReadOnly,
} from './core/RecoilValue';
export type {
    MutableSnapshot,
    Snapshot,
    SnapshotID,
} from './core/Snapshot';
export type { SetterOrUpdater } from './hooks/Hooks';
export type { RecoilCallbackInterface } from './hooks/useRecoilCallback';
export type { RecoilBridge } from './hooks/useRecoilBridgeAcrossReactRoots';
export type { Loadable } from './adt/Loadable';
export type {
    AtomEffect,
    PersistenceSettings,
} from './recoil_values/atom';
export type { TransactionInterface } from './core/AtomicUpdates';
export type {
    GetRecoilValue,
    SetRecoilState,
    ResetRecoilState,
} from './recoil_values/callbackTypes';
export type {
    Parameter,
    SelectorFamilyOptions,
} from './recoil_values/selectorFamily';

// Import implementations
import { RecoilLoadable } from './adt/Loadable';
import { DefaultValue } from './core/Node';
import { RecoilRoot, useRecoilStoreID } from './core/RecoilRoot';
import { isRecoilValue } from './core/RecoilValue';
import { retentionZone } from './core/RetentionZone';
import { freshSnapshot } from './core/Snapshot';
import {
    useRecoilState,
    useRecoilState_TRANSITION_SUPPORT_UNSTABLE,
    useRecoilStateLoadable,
    useRecoilValue,
    useRecoilValue_TRANSITION_SUPPORT_UNSTABLE,
    useRecoilValueLoadable,
    useRecoilValueLoadable_TRANSITION_SUPPORT_UNSTABLE,
    useResetRecoilState,
    useSetRecoilState,
} from './hooks/Hooks';
import {
    useGotoRecoilSnapshot,
    useRecoilSnapshot,
    useRecoilTransactionObserver,
} from './hooks/SnapshotHooks';
import useGetRecoilValueInfo from './hooks/useGetRecoilValueInfo';
import useRecoilBridgeAcrossReactRoots from './hooks/useRecoilBridgeAcrossReactRoots';
import { useRecoilCallback } from './hooks/useRecoilCallback';
import useRecoilRefresher from './hooks/useRecoilRefresher';
import useRecoilTransaction from './hooks/useRecoilTransaction';
import useRetain from './hooks/useRetain';
import { atom } from './recoil_values/atom';
import { atomFamily } from './recoil_values/atomFamily';
import { constSelector } from './recoil_values/constSelector';
import { errorSelector } from './recoil_values/errorSelector';
import { readOnlySelector } from './recoil_values/readOnlySelector';
import { selector } from './recoil_values/selector';
import { selectorFamily } from './recoil_values/selectorFamily';
import {
    noWait,
    waitForAll,
    waitForAllSettled,
    waitForAny,
    waitForNone,
} from './recoil_values/WaitFor';
import RecoilEnv from '../../shared/src/util/Recoil_RecoilEnv';

// Export the complete Recoil API exactly as the original Recoil_index.js
export {
    // Types
    DefaultValue,
    isRecoilValue,
    RecoilLoadable,

    // Global Recoil environment settings
    RecoilEnv,

    // Recoil Root
    RecoilRoot,
    useRecoilStoreID,

    // Atoms/Selectors
    atom,
    selector,

    // Convenience Atoms/Selectors
    atomFamily,
    selectorFamily,
    constSelector,
    errorSelector,
    readOnlySelector,

    // Concurrency Helpers for Atoms/Selectors
    noWait,
    waitForNone,
    waitForAny,
    waitForAll,
    waitForAllSettled,

    // Hooks for Atoms/Selectors
    useRecoilValue,
    useRecoilValueLoadable,
    useRecoilState,
    useRecoilStateLoadable,
    useSetRecoilState,
    useResetRecoilState,

    // Hooks for complex operations
    useRecoilCallback,

    // Snapshots
    useGotoRecoilSnapshot,
    useRecoilSnapshot,

    // Memory Management
    useRetain,
    retentionZone,

    // UNSTABLE APIs with their _UNSTABLE suffixes as the original does
    useRecoilBridgeAcrossReactRoots as useRecoilBridgeAcrossReactRoots_UNSTABLE,
    useGetRecoilValueInfo as useGetRecoilValueInfo_UNSTABLE,
    useRecoilRefresher as useRecoilRefresher_UNSTABLE,
    useRecoilValueLoadable_TRANSITION_SUPPORT_UNSTABLE,
    useRecoilValue_TRANSITION_SUPPORT_UNSTABLE,
    useRecoilState_TRANSITION_SUPPORT_UNSTABLE,
    useRecoilTransaction as useRecoilTransaction_UNSTABLE,
    useRecoilTransactionObserver as useRecoilTransactionObserver_UNSTABLE,
    freshSnapshot as snapshot_UNSTABLE,
}; 