/**
 * TypeScript port of Recoil_TreeCacheImplementationType.js
 */

'use strict';

import {NodeKey} from '../core/Keys';

export type NodeCacheRoute = Array<[NodeKey, unknown]>;

export type TreeCacheNode<T> = TreeCacheLeaf<T> | TreeCacheBranch<T>;

export type TreeCacheLeaf<T> = {
  type: 'leaf';
  value: T;
  branchKey?: unknown;
  parent: TreeCacheBranch<T> | null;
};

export type TreeCacheBranch<T> = {
  type: 'branch';
  nodeKey: NodeKey;
  branches: Map<unknown, TreeCacheNode<T>>;
  branchKey?: unknown;
  parent: TreeCacheBranch<T> | null;
};

export type NodeValueGet = (nodeKey: NodeKey) => unknown;

type NodeVisitHandler<T> = (node: TreeCacheNode<T>) => void;

export type GetHandlers<T> = {
  onNodeVisit: NodeVisitHandler<T>;
};

export type SetHandlers<T> = {
  onNodeVisit: NodeVisitHandler<T>;
};

export interface TreeCacheImplementation<T> {
  get(getNodeValue: NodeValueGet, handlers?: GetHandlers<T>): T | undefined;
  set(route: NodeCacheRoute, value: T, handlers?: SetHandlers<T>): void;
  delete(leaf: TreeCacheLeaf<T>): boolean;
  clear(): void;
  root(): TreeCacheNode<T> | null;
  size(): number;
}
