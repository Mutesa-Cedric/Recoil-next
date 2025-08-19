/**
 * TypeScript port of Recoil_CopyOnWrite.js
 */

'use strict';

export function setByAddingToSet<V>(set: ReadonlySet<V>, v: V): Set<V> {
  const next = new Set(set);
  next.add(v);
  return next;
}

export function setByDeletingFromSet<V>(set: ReadonlySet<V>, v: V): Set<V> {
  const next = new Set(set);
  next.delete(v);
  return next;
}

export function mapBySettingInMap<K, V>(
  map: ReadonlyMap<K, V>,
  k: K,
  v: V,
): Map<K, V> {
  const next = new Map(map);
  next.set(k, v);
  return next;
}

export function mapByUpdatingInMap<K, V>(
  map: ReadonlyMap<K, V>,
  k: K,
  updater: (v: V | undefined) => V,
): Map<K, V> {
  const next = new Map(map);
  next.set(k, updater(next.get(k)));
  return next;
}

export function mapByDeletingFromMap<K, V>(
  map: ReadonlyMap<K, V>,
  k: K,
): Map<K, V> {
  const next = new Map(map);
  next.delete(k);
  return next;
}

export function mapByDeletingMultipleFromMap<K, V>(
  map: ReadonlyMap<K, V>,
  ks: Set<K>,
): Map<K, V> {
  const next = new Map(map);
  ks.forEach(k => next.delete(k));
  return next;
}
