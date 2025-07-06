/*
 * Options for how an atom/selector can be retained.
 * Separate file to avoid import cycles (matches original design).
 */

import type { RetentionZone } from './RetentionZone';

export type RetainedBy =
    | 'components' // only retained directly by components
    | 'recoilRoot' // lives for the lifetime of the root
    | RetentionZone // retained whenever this zone is retained
    | Array<RetentionZone>; // retained by any of these zones 