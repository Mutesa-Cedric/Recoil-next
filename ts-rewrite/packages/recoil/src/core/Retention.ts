/*
 * Simplified TypeScript port of Recoil_Retention.js
 * Only includes the public helpers referenced by other modules.
 */

import type { NodeKey } from './Keys';
import type { Store, Retainable, TreeState } from './State';
import { RetentionZone } from './RetentionZone';

export const SUSPENSE_TIMEOUT_MS = 120000;

// No-op dispatch functions – memory-management not implemented yet.
export function updateRetainCount(_store: Store, _retainable: Retainable, _delta: 1 | -1): void { }

export function updateRetainCountToZero(_store: Store, _retainable: Retainable): void { }

export function releaseScheduledRetainablesNow(_store: Store): void { }

export function retainedByOptionWithDefault(r?: 'components' | 'recoilRoot' | RetentionZone | Array<RetentionZone>) {
    // The default will change from 'recoilRoot' to 'components' in future – follow original note.
    return r === undefined ? 'recoilRoot' : r;
} 