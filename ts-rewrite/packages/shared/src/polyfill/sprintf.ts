/**
 * TypeScript port of sprintf.js
 */

'use strict';

export default function sprintf(format: string, ...args: Array<unknown>): string {
    let index = 0;
    return format.replace(/%s/g, () => String(args[index++]));
} 