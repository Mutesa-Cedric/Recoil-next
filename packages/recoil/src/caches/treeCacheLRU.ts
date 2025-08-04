/**
 * TypeScript port of Recoil_treeCacheLRU.js
 */

'use strict';

import { TreeCacheImplementation, TreeCacheLeaf } from './TreeCacheImplementationType';
import { LRUCache } from './LRUCache';
import TreeCache from './TreeCache';

export default function treeCacheLRU<T>({
  name,
  maxSize,
  mapNodeValue = (v: unknown) => v,
}: {
  name?: string;
  maxSize: number;
  mapNodeValue?: (v: unknown) => unknown;
}): TreeCacheImplementation<T> {
  const lruCache = new LRUCache<TreeCacheLeaf<T>, boolean>({ maxSize });

  const cache: TreeCache<T> = new TreeCache({
    name,
    mapNodeValue,
    onHit: (node: TreeCacheLeaf<T>) => {
      lruCache.set(node, true);
    },
    onSet: (node: TreeCacheLeaf<T>) => {
      const lruNode = lruCache.tail();

      lruCache.set(node, true);

      if (lruNode && cache.size() > maxSize) {
        cache.delete(lruNode.key);
      }
    },
  });

  return cache;
} 