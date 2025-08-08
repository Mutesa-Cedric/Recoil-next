/**
 * TypeScript port of Recoil_useGetRecoilValueInfo
 */
'use strict';

import { peekNodeInfo, RecoilValueInfo } from '../core/FunctionalCore';
import { useStoreRef } from '../core/RecoilRoot';
import { RecoilValue } from '../core/RecoilValue';

export function useGetRecoilValueInfo(): (<T>(
    recoilValue: RecoilValue<T>,
) => RecoilValueInfo<T>) {
    const storeRef = useStoreRef();

    return <T>(recoilValue: RecoilValue<T>): RecoilValueInfo<T> =>
        peekNodeInfo<T>(
            storeRef.current,
            storeRef.current.getState().currentTree,
            recoilValue.key,
        );
}

export default useGetRecoilValueInfo; 