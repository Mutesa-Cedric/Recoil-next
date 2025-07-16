/**
 * TypeScript port of Recoil_GraphTypes.js
 */

'use strict';

import type { NodeKey } from './Keys';

export type Graph = Readonly<{
    nodeDeps: Map<NodeKey, ReadonlySet<NodeKey>>;
    nodeToNodeSubscriptions: Map<NodeKey, Set<NodeKey>>;
}>; 