/**
 * TypeScript port of Recoil_useRetain.js
 */

import { useEffect, useRef } from 'react';
import type { RecoilValue } from '../core/RecoilValue';

import { isSSR } from '../../../shared/src/util/Recoil_Environment';
import gkx from '../../../shared/src/util/Recoil_gkx';
import shallowArrayEqual from '../../../shared/src/util/Recoil_shallowArrayEqual';
import usePrevious from '../../../shared/src/util/Recoil_usePrevious';
import { useStoreRef } from '../core/RecoilRoot';
import { SUSPENSE_TIMEOUT_MS, updateRetainCount } from '../core/Retention';
import { RetentionZone } from '../core/RetentionZone';

export type Retainable = RecoilValue<unknown> | RetentionZone;

export default function useRetain(retainable: Retainable): void {
    if (!gkx('recoil_memory_managament_2020')) {
        return;
    }
    return useRetain_ACTUAL(retainable);
}

function useRetain_ACTUAL(retainable: Retainable): void {
    const array = Array.isArray(retainable) ? retainable : [retainable];
    const retainables = array.map(a => (a instanceof RetentionZone ? a : a.key));
    const storeRef = useStoreRef();
    const timeoutID = useRef<number | null>(null);

    useEffect(() => {
        if (!gkx('recoil_memory_managament_2020')) {
            return;
        }
        const store = storeRef.current;
        if (timeoutID.current && !isSSR) {
            // Already performed a temporary retain on render, simply cancel the release
            // of that temporary retain.
            window.clearTimeout(timeoutID.current);
            timeoutID.current = null;
        } else {
            for (const r of retainables) {
                updateRetainCount(store, r, 1);
            }
        }
        return () => {
            for (const r of retainables) {
                updateRetainCount(store, r, -1);
            }
        };
    }, [storeRef, ...retainables]);

    // We want to retain if the component suspends. This is terrible but the Suspense
    // API affords us no better option. If we suspend and never commit after some
    // seconds, then release. The 'actual' retain/release in the effect above
    // cancels this.
    const previousRetainables = usePrevious(retainables);
    if (
        !isSSR &&
        (previousRetainables === undefined ||
            !shallowArrayEqual(previousRetainables, retainables))
    ) {
        const store = storeRef.current;
        for (const r of retainables) {
            updateRetainCount(store, r, 1);
        }
        if (previousRetainables) {
            for (const r of previousRetainables) {
                updateRetainCount(store, r, -1);
            }
        }
        if (timeoutID.current) {
            window.clearTimeout(timeoutID.current);
        }
        timeoutID.current = window.setTimeout(() => {
            timeoutID.current = null;
            for (const r of retainables) {
                updateRetainCount(store, r, -1);
            }
        }, SUSPENSE_TIMEOUT_MS);
    }
} 