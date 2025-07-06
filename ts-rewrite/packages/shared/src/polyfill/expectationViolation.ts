/**
 * expectationViolation – logs a formatted error message in DEV mode.
 */

import sprintf from './sprintf';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function expectationViolation(format: string, ...args: unknown[]): null {
    // @ts-ignore __DEV__ provided by bundler env typically
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const message = sprintf(format, ...args);
        const error = new Error(message);
        error.name = 'Expectation Violation';
        // eslint-disable-next-line no-console
        console.error(error);
    }
    return null;
} 