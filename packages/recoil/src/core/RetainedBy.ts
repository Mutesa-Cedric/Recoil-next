/**
 * TypeScript port of Recoil_RetainedBy.js
 */

import type { RetentionZone } from './RetentionZone';

// This is a separate module to prevent an import cycle.
// Options for how an atom can be retained:
export type RetainedBy =
    | 'components' // only retained directly by components
    | 'recoilRoot' // lives for the lifetime of the root
    | RetentionZone // retained whenever this zone or these zones are retained
    | Array<RetentionZone>; 