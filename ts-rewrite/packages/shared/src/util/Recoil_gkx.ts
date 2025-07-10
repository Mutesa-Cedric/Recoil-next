/**
 * TypeScript port of Recoil_gkx.js
 */

'use strict';

import RecoilEnv from './Recoil_RecoilEnv';

function Recoil_gkx_OSS(gk: string): boolean {
    return RecoilEnv.RECOIL_GKS_ENABLED.has(gk);
}

Recoil_gkx_OSS.setPass = (gk: string): void => {
    RecoilEnv.RECOIL_GKS_ENABLED.add(gk);
};

Recoil_gkx_OSS.setFail = (gk: string): void => {
    RecoilEnv.RECOIL_GKS_ENABLED.delete(gk);
};

Recoil_gkx_OSS.clear = (): void => {
    RecoilEnv.RECOIL_GKS_ENABLED.clear();
};

export default Recoil_gkx_OSS; 