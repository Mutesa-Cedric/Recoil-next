/**
 * TypeScript port of Recoil_useRetain
 */
'use strict';
import { useEffect, useRef } from 'react';
import gkx from '../../../shared/src/util/Recoil_gkx';
import { isSSR } from '../../../shared/src/util/Recoil_Environment';
import shallowArrayEqual from '../../../shared/src/util/Recoil_shallowArrayEqual';
import usePrevious from '../../../shared/src/util/Recoil_usePrevious';
import { useStoreRef } from '../core/RecoilRoot';
import { RecoilValue } from '../core/RecoilValue';
import { SUSPENSE_TIMEOUT_MS, updateRetainCount } from '../core/Retention';
import { RetentionZone } from '../core/RetentionZone';

type ToRetain =
    | RecoilValue<any>
    | RetentionZone
    | ReadonlyArray<RecoilValue<any> | RetentionZone>;

function useRetain(toRetain: ToRetain): void {
    if (!gkx('recoil_memory_managament_2020')) {
        return;
    }
    // eslint-disable-next-line fb-www/react-hooks
    return useRetain_ACTUAL(toRetain);
}

function useRetain_ACTUAL(toRetain: ToRetain): void {
    const array = Array.isArray(toRetain) ? toRetain : [toRetain];
    const retainables = array.map(a => (a instanceof RetentionZone ? a : a.key));
    const storeRef = useStoreRef();
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
        // eslint-disable-next-line fb-www/react-hooks-deps
    }, [storeRef, ...retainables]);

    const timeoutID = useRef<any>(null);
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

export default useRetain; 