/**
 * TypeScript port of Recoil_useRecoilBridgeAcrossReactRoots
 */

'use strict';

import * as React from 'react';
import {useMemo} from 'react';
import {RecoilRoot, useStoreRef} from '../core/RecoilRoot';

export type RecoilBridge = React.ComponentType<{children: React.ReactNode}>;

export function useRecoilBridgeAcrossReactRoots(): RecoilBridge {
  const store = useStoreRef().current;
  return useMemo(() => {
    function RecoilBridge({children}: {children: React.ReactNode}) {
      return <RecoilRoot store={store}>{children}</RecoilRoot>;
    }
    return RecoilBridge;
  }, [store]);
}

export default useRecoilBridgeAcrossReactRoots;
