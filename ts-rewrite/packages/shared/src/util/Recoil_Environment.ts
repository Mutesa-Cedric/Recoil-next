/**
 * TypeScript port of Recoil_Environment.js
 */

'use strict';

export const isSSR: boolean =
    typeof window === 'undefined';

export const isWindow = (value: unknown): value is Window =>
    !isSSR &&
    (value === window || value instanceof Window);

export const isReactNative: boolean =
    typeof navigator !== 'undefined' && navigator.product === 'ReactNative'; 