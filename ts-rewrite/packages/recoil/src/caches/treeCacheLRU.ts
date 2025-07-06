/**
 * LRU wrapper around TreeCache.
 */

import LRUCache from './LRUCache';
import TreeCache from './TreeCache';
import type { TreeCacheImplementation } from './TreeCacheImplementationType';

export default function treeCacheLRU<T>({ name, maxSize, mapNodeValue = (v: unknown) => v }: { name?: string; maxSize: number; mapNodeValue?: (v: unknown) => unknown }): TreeCacheImplementation<T> {
  const lru = new LRUCache({ maxSize });
  const cache = new TreeCache<T>({ name, mapNodeValue, onHit: node => lru.set(node, true), onSet: node => {
    const lruNode = lru.tail();
    lru.set(node, true);
    if (lruNode && cache.size() > maxSize) {
      cache.delete((lruNode as any).key);
    }
  }});
  return cache;
} 