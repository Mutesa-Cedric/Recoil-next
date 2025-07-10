/*
 * Highly simplified React RecoilRoot for compilation.
 */

import React, { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Store, StoreRef, TreeState, StateID } from './State';
import { makeEmptyStoreState } from './State';
import { getNextStoreID } from './Keys';
import { graph as makeGraph } from './Graph';

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
    store?: Store;
}

export function RecoilRoot({ children, store }: RecoilRootProps): JSX.Element {
    const storeRef = useRef<Store | null>(null);

    if (storeRef.current === null) {
        if (store) {
            storeRef.current = store;
        } else {
            const storeState = makeEmptyStoreState();
            storeRef.current = {
                storeID: getNextStoreID(),
                getState: () => storeState,
                replaceState: (cb: (t: TreeState) => TreeState) => {
                    storeState.currentTree = cb(storeState.currentTree);
                },
                getGraph: (version: StateID) => {
                    const graph = storeState.graphsByVersion.get(version);
                    if (graph) {
                        return graph;
                    }
                    // Create a new graph for this version if it doesn't exist
                    const newGraph = makeGraph();
                    storeState.graphsByVersion.set(version, newGraph);
                    return newGraph;
                },
                subscribeToTransactions: () => ({ release: () => { } }),
                addTransactionMetadata: () => { },
            } as unknown as Store;
        }
    }

    return <AppContext.Provider value={{ current: storeRef.current }}>{children}</AppContext.Provider>;
} 