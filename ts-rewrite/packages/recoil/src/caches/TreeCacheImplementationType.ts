/** TreeCache type definitions ported from Flow version */

export type NodeKey = string;
export type NodeCacheRoute = Array<[NodeKey, unknown]>;

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

export type TreeCacheNode<T> = TreeCacheLeaf<T> | TreeCacheBranch<T>;

export type NodeValueGet = (nodeKey: NodeKey) => unknown;
export type NodeVisitHandler<T> = (node: TreeCacheNode<T>) => void;

export interface GetHandlers<T> {
    onNodeVisit(node: TreeCacheNode<T>): void;
}
export interface SetHandlers<T> {
    onNodeVisit(node: TreeCacheNode<T>): void;
}

export interface TreeCacheImplementation<T> {
    get(getNodeValue: NodeValueGet, handlers?: GetHandlers<T>): T | undefined;
    set(route: NodeCacheRoute, value: T, handlers?: SetHandlers<T>): void;
    delete(leaf: TreeCacheLeaf<T>): boolean;
    clear(): void;
    root(): TreeCacheNode<T> | null;
    size(): number;
} 