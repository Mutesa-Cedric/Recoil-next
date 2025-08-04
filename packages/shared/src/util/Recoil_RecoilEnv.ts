/**
 * TypeScript port of Recoil_RecoilEnv.js
 */

'use strict';

import err from './Recoil_err';

export type RecoilEnv = {
    RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED: boolean;
    RECOIL_GKS_ENABLED: Set<string>;
};

const env: RecoilEnv = {
    RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED: true,
    RECOIL_GKS_ENABLED: new Set([
        'recoil_hamt_2020',
        'recoil_sync_external_store',
        'recoil_suppress_rerender_in_callback',
        'recoil_memory_managament_2020',
    ]),
};

function readProcessEnvBooleanFlag(name: string, set: (value: boolean) => void) {
    const sanitizedValue = process.env[name]?.toLowerCase()?.trim();

    if (sanitizedValue == null || sanitizedValue === '') {
        return;
    }

    const allowedValues = ['true', 'false'];
    if (!allowedValues.includes(sanitizedValue)) {
        throw err(
            `process.env.${name} value must be 'true', 'false', or empty: ${sanitizedValue}`,
        );
    }

    set(sanitizedValue === 'true');
}

function readProcessEnvStringArrayFlag(
    name: string,
    set: (value: Array<string>) => void,
) {
    const sanitizedValue = process.env[name]?.trim();

    if (sanitizedValue == null || sanitizedValue === '') {
        return;
    }

    set(sanitizedValue.split(/\s*,\s*|\s+/));
}

function applyProcessEnvFlagOverrides() {
    if (typeof process === 'undefined') {
        return;
    }

    if (process?.env == null) {
        return;
    }

    readProcessEnvBooleanFlag(
        'RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED',
        value => {
            env.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = value;
        },
    );
    readProcessEnvStringArrayFlag('RECOIL_GKS_ENABLED', value => {
        value.forEach(gk => {
            env.RECOIL_GKS_ENABLED.add(gk);
        });
    });
}

applyProcessEnvFlagOverrides();

export default env; 