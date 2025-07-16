/*
 * Simplified TypeScript port of Recoil_Snapshot.js sufficient for compilation.
 */

import type { Store, StoreState, TreeState, StateID } from './State';
import type { Loadable } from '../adt/Loadable';
import type { RecoilValue } from './RecoilValue';
import { makeEmptyStoreState, getNextTreeStateVersion } from './State';
import { getRecoilValueAsLoadable } from './RecoilValueInterface';
import { setInvalidateMemoizedSnapshot } from './SnapshotCache';
import { StoreID } from './Keys';

import nullthrows from '../../../shared/src/util/Recoil_nullthrows';

export type SnapshotID = StateID;

// Very lightweight store wrapper for snapshot
function makeStore(storeState: StoreState): Store {
    return {
        storeID: -1 as any, // not used in stub
        getState: () => storeState,
        replaceState: (cb: (t: TreeState) => TreeState) => {
            storeState.currentTree = cb(storeState.currentTree);
        },
        getGraph: () => ({ nodeDeps: new Map(), nodeToNodeSubscriptions: new Map() }),
        subscribeToTransactions: () => ({ release: () => { } }),
        addTransactionMetadata: () => { },
    } as unknown as Store;
}

export class Snapshot {
    private _store: Store;
    constructor(storeState?: StoreState | TreeState, parentStoreID?: StoreID) {
        this._store = makeStore(storeState as StoreState ?? makeEmptyStoreState());
    }

    getID(): SnapshotID {
        return this._store.getState().currentTree.stateID;
    }

    getLoadable<T>(rv: RecoilValue<T>): Loadable<T> {
        return getRecoilValueAsLoadable(this._store, rv);
    }

    map(fn: (mutable: MutableSnapshot) => void): Snapshot {
        const mutable = new MutableSnapshot(this);
        fn(mutable);
        return mutable;
    }

    getStore_INTERNAL(): Store {
        return this._store;
    }

    retain(): () => void {
        return () => { };
    }
}

export class MutableSnapshot extends Snapshot {
    constructor(parent: Snapshot) {
        super(JSON.parse(JSON.stringify(parent.getStore_INTERNAL().getState())));
    }

    // stubbed set/reset; defer to RecoilValueInterface helpers
}

export function freshSnapshot(init?: (snap: MutableSnapshot) => void): Snapshot {
    const snap = new Snapshot();
    if (init) {
        return snap.map(init);
    }
    return snap;
}

export function cloneSnapshot(store: Store, version: 'latest' | 'previous' = 'latest'): Snapshot {
    const storeState = store.getState();
    const treeState =
        version === 'latest'
            ? storeState.nextTree ?? storeState.currentTree
            : nullthrows(storeState.previousTree);
    return new Snapshot(treeState, store.storeID);
}

// tie into cache helper
setInvalidateMemoizedSnapshot(() => { }); 