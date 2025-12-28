/**
 * TypeScript port of Recoil_someSet.js
 */

'use strict';

export default function someSet<T>(
  set: ReadonlySet<T>,
  callback: (value: T, key: T, set: ReadonlySet<T>) => boolean,
  context?: unknown,
): boolean {
  const iterator = set.entries();
  let current = iterator.next();
  while (!current.done) {
    const entry = current.value;
    if (callback.call(context, entry[1], entry[0], set)) {
      return true;
    }
    current = iterator.next();
  }
  return false;
}
