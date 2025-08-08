/**
 * TypeScript port of recoverableViolation.js
 */

'use strict';
const __DEV__ = process.env.NODE_ENV !== 'production';

export default function recoverableViolation(
    message: string,
    _projectName: 'recoil',
    { error }: { error?: Error } = {},
): null {
    if (__DEV__) {
        console.error(message, error);
    }
    return null;
} 