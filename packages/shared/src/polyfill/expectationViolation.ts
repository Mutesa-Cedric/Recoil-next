/**
 * TypeScript port of expectationViolation.js
 */

'use strict';
const __DEV__ = process.env.NODE_ENV !== 'production';
import sprintf from './sprintf';

export default function expectationViolation(format: string, ...args: ReadonlyArray<unknown>): void {
    if (__DEV__) {
        const message = sprintf(format, ...args);
        const error = new Error(message);
        error.name = 'Expectation Violation';
        console.error(error);
    }
} 