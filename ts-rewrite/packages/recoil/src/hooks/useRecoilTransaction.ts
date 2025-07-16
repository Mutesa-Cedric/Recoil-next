/**
 * TypeScript port of Recoil_useRecoilTransaction
 */
'use strict';

import { useMemo } from 'react';
import { atomicUpdater, TransactionInterface } from '../core/AtomicUpdates';
import { useStoreRef } from '../core/RecoilRoot';

export function useRecoilTransaction<Args extends ReadonlyArray<unknown>>(
    fn: (ti: TransactionInterface) => (...args: Args) => void,
    deps?: ReadonlyArray<unknown>,
): (...args: Args) => void {
    const storeRef = useStoreRef();
    return useMemo(
        () =>
            (...args: Args): void => {
                const atomicUpdate = atomicUpdater(storeRef.current);
                atomicUpdate(transactionInterface => {
                    fn(transactionInterface)(...args);
                });
            },
        deps != null ? [...deps, storeRef] : [storeRef],
    );
}

export default useRecoilTransaction; 