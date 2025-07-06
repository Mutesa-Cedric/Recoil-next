/*
 * Recoil Graph type definitions (TypeScript port)
 * Generated from Flow source Recoil_GraphTypes.js
 */

import type { NodeKey } from './Keys';

// TODO: Consider renaming these properties to be more descriptive and symmetric with Recoil's terminology.
// Upstream Node dependencies
// NOTE: If the sets in nodeDeps are ever made mutable we must change the logic in
// mergeDepsIntoGraph() that relies on reference equality of these sets to avoid
// overwriting newer dependencies with older ones.
export interface Graph {
    /**
     * Mapping of node key -> set of upstream dependencies for that node.
     */
    nodeDeps: Map<NodeKey, ReadonlySet<NodeKey>>;

    /**
     * Mapping of node key -> set of downstream nodes that subscribe to the key.
     */
    nodeToNodeSubscriptions: Map<NodeKey, Set<NodeKey>>;
} 