/** React mode and feature detection helpers */

import React from 'react';
import gkx from '../../../shared/src/util/Recoil_gkx';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';

// Polyfill type for React 18's useSyncExternalStore.
// We intentionally use the same over-broad signature as the Flow source.
type UseSyncExternalStore = <T>(
  subscribe: () => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
) => T;

// Access either useSyncExternalStore or unstable_useSyncExternalStore depending on React version.

const useSyncExternalStore: UseSyncExternalStore | undefined =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as any).useSyncExternalStore ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as any).unstable_useSyncExternalStore;

let ReactRendererVersionMismatchWarnOnce = false;

// Borrowed from original: checks if current renderer supports useSyncExternalStore()
export function currentRendererSupportsUseSyncExternalStore(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internals = (React as any)
    .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  if (!internals) return false;
  const {ReactCurrentDispatcher, ReactCurrentOwner} = internals;
  // The dispatcher can be on ReactCurrentDispatcher.current (newer) or ReactCurrentOwner.currentDispatcher (older)
  const dispatcher: any =
    ReactCurrentDispatcher?.current ?? ReactCurrentOwner?.currentDispatcher;
  const isSupported = dispatcher?.useSyncExternalStore != null;

  if (
    useSyncExternalStore !== undefined &&
    !isSupported &&
    !ReactRendererVersionMismatchWarnOnce
  ) {
    ReactRendererVersionMismatchWarnOnce = true;
    recoverableViolation(
      'A React renderer without React 18+ API support is being used with React 18+.',
      'recoil',
    );
  }
  return isSupported;
}

export type ReactMode = 'TRANSITION_SUPPORT' | 'SYNC_EXTERNAL_STORE' | 'LEGACY';

interface ReactModeResult {
  mode: ReactMode;
  early: boolean;
  concurrent: boolean;
}

export function reactMode(): ReactModeResult {
  // NOTE: This mode is currently broken with some Suspense cases
  if (gkx('recoil_transition_support')) {
    return {mode: 'TRANSITION_SUPPORT', early: true, concurrent: true};
  }

  if (gkx('recoil_sync_external_store') && useSyncExternalStore != null) {
    return {mode: 'SYNC_EXTERNAL_STORE', early: true, concurrent: false};
  }

  return gkx('recoil_suppress_rerender_in_callback')
    ? {mode: 'LEGACY', early: true, concurrent: false}
    : {mode: 'LEGACY', early: false, concurrent: false};
}

// TODO OSS: Determine if fast refresh detection is needed; returning false suffices.
export function isFastRefreshEnabled(): boolean {
  // Placeholder; React Native / internal FB env uses different approach.
  return false;
}

export {useSyncExternalStore};
