/**
 * TypeScript port of Recoil_Graph.js
 */

'use strict';

import type { Graph } from './GraphTypes';
import type { NodeKey, StateID } from './Keys';
import type { Store } from './State';

import differenceSets from '../../../shared/src/util/Recoil_differenceSets';
import mapMap from '../../../shared/src/util/Recoil_mapMap';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';

function makeGraph(): Graph {
    return {
        nodeDeps: new Map(),
        nodeToNodeSubscriptions: new Map(),
    };
}

function cloneGraph(graph: Graph): Graph {
    return {
        nodeDeps: mapMap(graph.nodeDeps, s => new Set(s)),
        nodeToNodeSubscriptions: mapMap(graph.nodeToNodeSubscriptions, s => new Set(s)),
    };
}

// Note that this overwrites the deps of existing nodes, rather than unioning
// the new deps with the old deps.
function mergeDepsIntoGraph(
    key: NodeKey,
    newDeps: ReadonlySet<NodeKey>,
    graph: Graph,
    // If olderGraph is given then we will not overwrite changes made to the given
    // graph compared with olderGraph:
    olderGraph?: Graph,
): void {
    const { nodeDeps, nodeToNodeSubscriptions } = graph;
    const oldDeps = nodeDeps.get(key);

    if (oldDeps && olderGraph && oldDeps !== olderGraph.nodeDeps.get(key)) {
        return;
    }

    // Update nodeDeps:
    nodeDeps.set(key, newDeps);

    // Add new deps to nodeToNodeSubscriptions:
    const addedDeps = oldDeps == null ? newDeps : differenceSets(newDeps, oldDeps);
    for (const dep of addedDeps) {
        if (!nodeToNodeSubscriptions.has(dep)) {
            nodeToNodeSubscriptions.set(dep, new Set());
        }
        const existing = nullthrows(nodeToNodeSubscriptions.get(dep));
        existing.add(key);
    }

    // Remove removed deps from nodeToNodeSubscriptions:
    if (oldDeps) {
        const removedDeps = differenceSets(oldDeps, newDeps);
        for (const dep of removedDeps) {
            if (!nodeToNodeSubscriptions.has(dep)) {
                return;
            }
            const existing = nullthrows(nodeToNodeSubscriptions.get(dep));
            existing.delete(key);
            if (existing.size === 0) {
                nodeToNodeSubscriptions.delete(dep);
            }
        }
    }
}

function saveDepsToStore(
    key: NodeKey,
    deps: ReadonlySet<NodeKey>,
    store: Store,
    version: StateID,
): void {
    const storeState = store.getState();
    if (
        !(
            version === storeState.currentTree.version ||
            version === storeState.nextTree?.version ||
            version === storeState.previousTree?.version
        )
    ) {
        recoverableViolation(
            'Tried to save dependencies to a discarded tree',
            'recoil',
        );
    }

    // Merge the dependencies discovered into the store's dependency map
    // for the version that was read:
    const graph = store.getGraph(version);
    mergeDepsIntoGraph(key, deps, graph);

    // If this version is not the latest version, also write these dependencies
    // into later versions if they don't already have their own:
    if (version === storeState.previousTree?.version) {
        const currentGraph = store.getGraph(storeState.currentTree.version);
        mergeDepsIntoGraph(key, deps, currentGraph, graph);
    }
    if (
        version === storeState.previousTree?.version ||
        version === storeState.currentTree.version
    ) {
        const nextVersion = storeState.nextTree?.version;
        if (nextVersion !== undefined) {
            const nextGraph = store.getGraph(nextVersion);
            mergeDepsIntoGraph(key, deps, nextGraph, graph);
        }
    }
}

export { cloneGraph, makeGraph as graph, saveDepsToStore }; 