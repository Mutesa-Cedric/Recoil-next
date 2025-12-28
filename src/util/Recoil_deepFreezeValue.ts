/**
 * TypeScript port of Recoil_deepFreezeValue.js
 */

'use strict';

import {isReactNative, isWindow} from './Recoil_Environment';
import isNode from './Recoil_isNode';
import isPromise from './Recoil_isPromise';

function shouldNotBeFrozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return true;
  }

  if ((value as any).$$typeof) {
    return true;
  }

  if (
    (value as any)['@@__IMMUTABLE_ITERABLE__@@'] != null ||
    (value as any)['@@__IMMUTABLE_KEYED__@@'] != null ||
    (value as any)['@@__IMMUTABLE_INDEXED__@@'] != null ||
    (value as any)['@@__IMMUTABLE_ORDERED__@@'] != null ||
    (value as any)['@@__IMMUTABLE_RECORD__@@'] != null
  ) {
    return true;
  }

  if (isNode(value)) {
    return true;
  }

  if (isPromise(value)) {
    return true;
  }

  if (value instanceof Error) {
    return true;
  }

  if (ArrayBuffer.isView(value)) {
    return true;
  }

  if (!isReactNative && isWindow(value)) {
    return true;
  }

  return false;
}

export default function deepFreezeValue(value: unknown): void {
  if (typeof value !== 'object' || shouldNotBeFrozen(value)) {
    return;
  }

  Object.freeze(value);
  for (const key in value as object) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const prop = (value as any)[key];
      if (typeof prop === 'object' && prop != null && !Object.isFrozen(prop)) {
        deepFreezeValue(prop);
      }
    }
  }
  Object.seal(value as object);
}
