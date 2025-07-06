/**
 * OSS implementation of gkx backed by RecoilEnv.RECOIL_GKS_ENABLED.
 */

import RecoilEnv from './Recoil_RecoilEnv';

function gkx(gk: string): boolean {
    return RecoilEnv.RECOIL_GKS_ENABLED.has(gk);
}

gkx.setPass = (gk: string): void => {
    RecoilEnv.RECOIL_GKS_ENABLED.add(gk);
};

gkx.setFail = (gk: string): void => {
    RecoilEnv.RECOIL_GKS_ENABLED.delete(gk);
};

gkx.clear = (): void => {
    RecoilEnv.RECOIL_GKS_ENABLED.clear();
};

export default gkx as typeof gkx & {
    setPass: (gk: string) => void;
    setFail: (gk: string) => void;
    clear: () => void;
}; 