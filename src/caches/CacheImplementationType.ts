/**
 * TypeScript port of Recoil_CacheImplementationType.js
 */

'use strict';

export interface CacheImplementation<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
}
