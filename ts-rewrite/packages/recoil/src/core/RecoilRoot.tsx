/*
 * Highly simplified React RecoilRoot for compilation.
 */

import React, { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Store, StoreRef, TreeState } from './State';
import { makeEmptyStoreState } from './State';
import { getNextStoreID } from './Keys';
import { batchUpdates } from './Batching';

const defaultStore: Store = {
    storeID: getNextStoreID(),
    getState: () => {
        throw new Error('No RecoilRoot');
    },
    replaceState: (_cb: (t: TreeState) => TreeState) => {
        throw new Error('No RecoilRoot');
    },
    getGraph: () => ({ nodeDeps: new Map(), nodeToNodeSubscriptions: new Map() }),
    subscribeToTransactions: () => ({ release: () => { } }),
    addTransactionMetadata: () => { },
};

const AppContext = createContext<StoreRef>({ current: defaultStore });
export const useStoreRef = (): StoreRef => useContext(AppContext);

export interface RecoilRootProps {
    children: ReactNode;
}

export function RecoilRoot({ children }: RecoilRootProps): JSX.Element {
    const storeRef = useRef<Store | null>(null);

    if (storeRef.current === null) {
        const storeState = makeEmptyStoreState();
        storeRef.current = {
            storeID: getNextStoreID(),
            getState: () => storeState,
            replaceState: (_cb: (t: TreeState) => TreeState) => {
                storeState.currentTree = _cb(storeState.currentTree);
            },
            getGraph: () => ({ nodeDeps: new Map(), nodeToNodeSubscriptions: new Map() }),
            subscribeToTransactions: () => ({ release: () => { } }),
            addTransactionMetadata: () => { },
        } as unknown as Store;
    }

    return <AppContext.Provider value={{ current: storeRef.current }}>{children}</AppContext.Provider>;
} 