/**
 * TreeCache implementation (simplified) – used for selector caches.
 */

import recoverableViolation from 'recoil-shared/util/Recoil_recoverableViolation';
import type {
    GetHandlers,
    NodeCacheRoute,
    NodeValueGet,
    SetHandlers,
    TreeCacheBranch,
    TreeCacheLeaf,
    TreeCacheNode,
    TreeCacheImplementation,
} from './TreeCacheImplementationType';

// Placeholder until core module is ported
const isFastRefreshEnabled = () => false;

export interface TreeCacheOptions<T> {
    name?: string;
    mapNodeValue?: (val: unknown) => unknown;
    onHit?: (node: TreeCacheLeaf<T>) => void;
    onSet?: (node: TreeCacheLeaf<T>) => void;
}

class ChangedPathError extends Error { }

export default class TreeCache<T> implements TreeCacheImplementation<T> {
    private _name?: string;
    private _numLeafs = 0;
    private _root: TreeCacheNode<T> | null = null;
    private _onHit: (node: TreeCacheLeaf<T>) => void;
    private _onSet: (node: TreeCacheLeaf<T>) => void;
    private _mapNodeValue: (v: unknown) => unknown;

    constructor(opts: TreeCacheOptions<T> = {}) {
        this._name = opts.name;
        this._onHit = opts.onHit ?? (() => { });
        this._onSet = opts.onSet ?? (() => { });
        this._mapNodeValue = opts.mapNodeValue ?? (v => v);
    }

    size(): number {
        return this._numLeafs;
    }
    root(): TreeCacheNode<T> | null {
        return this._root;
    }

    get(getNodeValue: NodeValueGet, handlers?: GetHandlers<T>): T | undefined {
        return this.getLeafNode(getNodeValue, handlers)?.value;
    }

    getLeafNode(getNodeValue: NodeValueGet, handlers?: GetHandlers<T>): TreeCacheLeaf<T> | undefined {
        let node: TreeCacheNode<T> | null = this._root;
        while (node) {
            handlers?.onNodeVisit(node);
            if (node.type === 'leaf') {
                this._onHit(node);
                return node;
            }
            const nodeValue = this._mapNodeValue(getNodeValue(node.nodeKey));
            node = node.branches.get(nodeValue) ?? null;
        }
        return undefined;
    }

    set(route: NodeCacheRoute, value: T, handlers?: SetHandlers<T>): void {
        const addLeaf = () => {
            let parent: TreeCacheBranch<T> | null = null;
            let branchKey: unknown = undefined;
            // iterate route to create/find branches
            for (const [nodeKey, nodeValue] of route) {
                let current: TreeCacheNode<T> | null = parent ? parent.branches.get(branchKey!) ?? null : this._root;
                if (current && current.type === 'leaf') {
                    throw this.invalidCacheError();
                }
                if (!current) {
                    current = {
                        type: 'branch',
                        nodeKey,
                        branches: new Map(),
                        branchKey,
                        parent,
                    };
                    if (parent) parent.branches.set(branchKey!, current);
                    else this._root = current;
                }
                handlers?.onNodeVisit?.(current);
                parent = current;
                branchKey = this._mapNodeValue(nodeValue);
            }
            // leaf
            const leaf: TreeCacheLeaf<T> = { type: 'leaf', value, parent, branchKey };
            parent ? parent.branches.set(branchKey!, leaf) : (this._root = leaf);
            this._numLeafs++;
            this._onSet(leaf);
            handlers?.onNodeVisit?.(leaf);
        };

        try {
            addLeaf();
        } catch (e) {
            if (e instanceof ChangedPathError) {
                this.clear();
                addLeaf();
            } else {
                throw e;
            }
        }
    }

    delete(leaf: TreeCacheLeaf<T>): boolean {
        if (!this._root) return false;
        if (leaf === this._root) {
            this.clear();
            return true;
        }
        // detach from parent chain
        let node: TreeCacheBranch<T> | null = leaf.parent;
        let branchKey = leaf.branchKey;
        while (node) {
            node.branches.delete(branchKey!);
            if (node.branches.size || node === this._root) break;
            branchKey = node.branchKey;
            node = node.parent;
        }
        this._numLeafs--;
        return true;
    }

    clear(): void {
        this._numLeafs = 0;
        this._root = null;
    }

    private invalidCacheError(): ChangedPathError {
        const message = isFastRefreshEnabled()
            ? 'Possible Fast Refresh module reload detected. Resetting cache.'
            : 'Invalid cache values. Resetting cache.';
        recoverableViolation(message + (this._name ? ` - ${this._name}` : ''), 'recoil');
        throw new ChangedPathError();
    }
} 