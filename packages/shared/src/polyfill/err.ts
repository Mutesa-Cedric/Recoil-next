/**
 * TypeScript port of err.js
 */

'use strict';

export default function err(message: string): Error {
  const error = new Error(message);

  if (error.stack === undefined) {
    try {
      throw error;
    } catch (_) {
      /* T-ignore */
    }
  }

  return error;
}
