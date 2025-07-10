/**
 * TypeScript port of Recoil_TreeCache.js
 */

'use strict';

import {
    GetHandlers,
    NodeCacheRoute,
    NodeValueGet,
    SetHandlers,
    TreeCacheBranch,
    TreeCacheLeaf,
    TreeCacheNode,
} from './TreeCacheImplementationType';

import { isFastRefreshEnabled } from '../core/ReactMode';
import recoverableViolation from '../../../shared/src/util/Recoil_recoverableViolation';

export type Options<T> = {
    name?: string;
    mapNodeValue?: (value: unknown) => unknown;
    onHit?: (node: TreeCacheLeaf<T>) => void;
    onSet?: (node: TreeCacheLeaf<T>) => void;
};

class ChangedPathError extends Error { }

export default class TreeCache<T = unknown> {
    _name?: string;
    _numLeafs: number;
    _root: TreeCacheNode<T> | null;

    _onHit: (node: TreeCacheLeaf<T>) => void;
    _onSet: (node: TreeCacheLeaf<T>) => void;
    _mapNodeValue: (value: unknown) => unknown;

    constructor(options?: Options<T>) {
        this._name = options?.name;
        this._numLeafs = 0;
        this._root = null;
        this._onHit = options?.onHit ?? (() => { });
        this._onSet = options?.onSet ?? (() => { });
        this._mapNodeValue = options?.mapNodeValue ?? (val => val);
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

    getLeafNode(
        getNodeValue: NodeValueGet,
        handlers?: GetHandlers<T>,
    ): TreeCacheLeaf<T> | undefined {
        if (this._root == null) {
            return undefined;
        }

        let node: TreeCacheNode<T> | undefined | null = this._root;
        while (node) {
            handlers?.onNodeVisit(node);
            if (node.type === 'leaf') {
                this._onHit(node);
                return node;
            }
            const nodeValue = this._mapNodeValue(getNodeValue(node.nodeKey));
            node = node.branches.get(nodeValue);
        }
        return undefined;
    }

    set(route: NodeCacheRoute, value: T, handlers?: SetHandlers<T>): void {
        const addLeaf = () => {
            let node: TreeCacheBranch<T> | null = this._root as TreeCacheBranch<T> | null;
            let branchKey: unknown;
            for (const [nodeKey, nodeValue] of route) {
                const root = this._root;
                if (root?.type === 'leaf') {
                    throw this.invalidCacheError();
                }

                const parent: TreeCacheBranch<T> | null = node;
                let current: TreeCacheNode<T> | null = parent ? parent.branches.get(branchKey) ?? null : root;
                if (!current) {
                    current = {
                        type: 'branch',
                        nodeKey,
                        parent,
                        branches: new Map(),
                        branchKey,
                    };
                    if (parent) {
                        parent.branches.set(branchKey, current as TreeCacheBranch<T>);
                    } else {
                        this._root = current;
                    }
                }

                if (current.type !== 'branch' || current.nodeKey !== nodeKey) {
                    throw this.invalidCacheError();
                }

                handlers?.onNodeVisit?.(current);
                node = current;
                branchKey = this._mapNodeValue(nodeValue);
            }

            const oldLeaf: TreeCacheNode<T> | null = node
                ? node.branches.get(branchKey) ?? null
                : this._root;
            if (
                oldLeaf != null &&
                (oldLeaf.type !== 'leaf' || oldLeaf.branchKey !== branchKey)
            ) {
                throw this.invalidCacheError();
            }

            const leafNode: TreeCacheLeaf<T> = {
                type: 'leaf',
                value,
                parent: node,
                branchKey,
            };

            if (node) {
                node.branches.set(branchKey, leafNode);
            } else {
                this._root = leafNode;
            }
            this._numLeafs++;
            this._onSet(leafNode);
            handlers?.onNodeVisit?.(leafNode);
        };

        try {
            addLeaf();
        } catch (error) {
            if (error instanceof ChangedPathError) {
                this.clear();
                addLeaf();
            } else {
                throw error;
            }
        }
    }

    delete(leaf: TreeCacheLeaf<T>): boolean {
        const root = this.root();
        if (!root) {
            return false;
        }

        if (leaf === root) {
            this._root = null;
            this._numLeafs = 0;
            return true;
        }

        let node: TreeCacheBranch<T> | undefined | null = leaf.parent;
        let branchKey: unknown = leaf.branchKey;
        while (node) {
            node.branches.delete(branchKey);
            if (node === root) {
                if (node.branches.size === 0) {
                    this._root = null;
                    this._numLeafs = 0;
                } else {
                    this._numLeafs--;
                }
                return true;
            }

            if (node.branches.size > 0) {
                break;
            }

            branchKey = node?.branchKey;
            node = node.parent;
        }

        for (; node !== root; node = node?.parent) {
            if (node == null) {
                return false;
            }
        }

        this._numLeafs--;
        return true;
    }

    clear(): void {
        this._numLeafs = 0;
        this._root = null;
    }

    invalidCacheError(): ChangedPathError {
        const CHANGED_PATH_ERROR_MESSAGE = isFastRefreshEnabled()
            ? 'Possible Fast Refresh module reload detected.  ' +
            'This may also be caused by an selector returning inconsistent values. ' +
            'Resetting cache.'
            : 'Invalid cache values.  This happens when selectors do not return ' +
            'consistent values for the same input dependency values.  That may also ' +
            'be caused when using Fast Refresh to change a selector implementation.  ' +
            'Resetting cache.';
        recoverableViolation(
            CHANGED_PATH_ERROR_MESSAGE +
            (this._name != null ? ` - ${this._name}` : ''),
            'recoil',
        );
        throw new ChangedPathError();
    }
} 