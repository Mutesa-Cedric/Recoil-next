/**
 * TypeScript port of Recoil_nullthrows.js
 */

'use strict';

import err from './Recoil_err';

export default function nullthrows<T>(
  x: T | null | undefined,
  message?: string,
): T {
  if (x != null) {
    return x;
  }
  throw err(message ?? 'Got unexpected null or undefined');
}
