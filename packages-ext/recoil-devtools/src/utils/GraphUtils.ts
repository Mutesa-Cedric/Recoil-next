// TypeScript port of GraphUtils.js

import type {
  DependenciesSetType,
  DependenciesSnapshotType,
  NodesSnapshotType,
} from '../types/DevtoolsTypes';

function nullthrows<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error('Value is null or undefined');
  }
  return value;
}

function depsHaveChaged(
  prev: DependenciesSetType | null | undefined,
  next: DependenciesSetType,
): boolean {
  if (prev == null || next == null) {
    return true;
  }
  if (prev.size !== next.size) {
    return true;
  }
  for (const dep of next) {
    if (!prev.has(dep)) {
      return true;
    }
  }
  return false;
}

function createGraph(deps: DependenciesSnapshotType): {
  // TODO: define proper types
  levels: readonly (readonly string[])[];
  edges: readonly any[];
} {
  const nodes = new Map<string, readonly [number, number]>();
  const edges: any[] = [];
  const levels: string[][] = [[]];

  let queue = Object.keys(deps);
  let solved;
  let it = 0;
  do {
    it++;
    solved = 0;
    const newQueue = [];
    for (const key of queue) {
      const blockers = deps[key];
      let add = true;
      let level = 0;
      const links = [];

      for (const blocker of blockers) {
        if (nodes.has(blocker)) {
          const info = nodes.get(blocker);
          level = Math.max(level, nullthrows(info)[0] + 1);
          links.push(info);
        } else {
          add = false;
          break;
        }
      }

      if (add) {
        if (!levels[level]) {
          levels[level] = [];
        }
        const coors: readonly [number, number] = [level, levels[level].length];
        nodes.set(key, coors);
        levels[level].push(key);
        links.forEach(link => {
          edges.push([link, coors]);
        });
        solved++;
      } else {
        newQueue.push(key);
      }
    }
    queue = newQueue;
  } while (solved > 0 && queue.length && it < 10);

  return {levels, edges};
}

function flattenLevels(
  levels: readonly (readonly string[])[],
): readonly {x: number; y: number; name: string}[] {
  const result: {x: number; y: number; name: string}[] = [];
  levels.forEach((level, x) => {
    level.forEach((name, y) => {
      result.push({x, y, name});
    });
  });

  return result;
}

function createSankeyData(
  deps: DependenciesSnapshotType,
  nodeWeights: NodesSnapshotType,
): {
  nodes: string[];
  edges: readonly {value: number; source: string; target: string}[];
} {
  const nodes = Object.keys(deps);
  const edges = nodes.reduce(
    (agg: {value: number; source: string; target: string}[], target) => {
      agg.push(
        ...Array.from(deps[target]).map(source => ({
          value: nodeWeights[source]?.updateCount ?? 1,
          source,
          target,
        })),
      );
      return agg;
    },
    [],
  );
  return {nodes, edges};
}

export {createGraph, depsHaveChaged, flattenLevels, createSankeyData};
