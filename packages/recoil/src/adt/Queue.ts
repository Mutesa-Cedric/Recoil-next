/**
 * TypeScript port of Recoil_Queue.js
 */

'use strict';

export function enqueueExecution(s: string, f: () => unknown): void {
    f();
} 