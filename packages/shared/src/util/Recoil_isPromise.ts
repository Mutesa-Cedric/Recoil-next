/**
 * TypeScript port of Recoil_isPromise.js
 */

'use strict';

export default function isPromise(p: unknown): p is Promise<unknown> {
  return !!p && typeof (p as any).then === 'function';
}
