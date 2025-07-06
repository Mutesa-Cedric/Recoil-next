/**
 * Environment helpers brought over from Recoil's shared utilities.
 */

/* eslint-disable @typescript-eslint/consistent-type-assertions */

const isSSR: boolean =
    typeof window === 'undefined' || typeof (globalThis as unknown as Window) === 'undefined';

// `Window` is not available in some environments; use a loose check.
// eslint-disable-next-line @typescript-eslint/ban-types
const isWindow = (value: unknown): boolean => {
    if (isSSR) {
        return false;
    }
    // @ts-ignore - `Window` globally available in browser envs only
    return value === window || value instanceof Window;
};

const isReactNative: boolean =
    typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';

export { isSSR, isReactNative, isWindow }; 