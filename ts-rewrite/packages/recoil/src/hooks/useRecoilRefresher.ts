/**
 * TypeScript port of Recoil_useRecoilRefresher
 */
'use strict';

import { useCallback } from 'react';
import { useStoreRef } from '../core/RecoilRoot';
import { RecoilValue } from '../core/RecoilValue';
import { refreshRecoilValue } from '../core/RecoilValueInterface';

export function useRecoilRefresher<T>(recoilValue: RecoilValue<T>): () => void {
    const storeRef = useStoreRef();
    return useCallback(() => {
        const store = storeRef.current;
        refreshRecoilValue(store, recoilValue);
    }, [recoilValue, storeRef]);
}

export default useRecoilRefresher; 