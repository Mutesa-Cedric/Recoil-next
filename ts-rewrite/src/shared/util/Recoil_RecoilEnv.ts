/**
 * Environment flags for Recoil behaviour, with ability to override via `process.env`.
 */

import err from './Recoil_err';

export interface RecoilEnv {
    RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED: boolean;
    RECOIL_GKS_ENABLED: Set<string>;
}

const env: RecoilEnv = {
    RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED: true,
    RECOIL_GKS_ENABLED: new Set<string>([
        'recoil_hamt_2020',
        'recoil_sync_external_store',
        'recoil_suppress_rerender_in_callback',
        'recoil_memory_managament_2020',
    ]),
};

function readProcessEnvBooleanFlag(name: string, set: (v: boolean) => void) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore process may not exist in some runtimes
    const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
    const sanitized = raw?.toLowerCase().trim();
    if (sanitized == null || sanitized === '') return;
    if (sanitized !== 'true' && sanitized !== 'false') {
        throw err(`process.env.${name} value must be 'true', 'false', or empty: ${sanitized}`);
    }
    set(sanitized === 'true');
}

function readProcessEnvStringArrayFlag(name: string, set: (v: string[]) => void): void {
    // @ts-ignore
    const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
    const sanitized = raw?.trim();
    if (!sanitized) return;
    set(sanitized.split(/\s*,\s*|\s+/));
}

function applyProcessEnvFlagOverrides() {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (typeof process === 'undefined' || process?.env == null) {
        return;
    }
    readProcessEnvBooleanFlag('RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED', v => {
        env.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = v;
    });
    readProcessEnvStringArrayFlag('RECOIL_GKS_ENABLED', arr => {
        arr.forEach(gk => env.RECOIL_GKS_ENABLED.add(gk));
    });
}

applyProcessEnvFlagOverrides();

export default env; 