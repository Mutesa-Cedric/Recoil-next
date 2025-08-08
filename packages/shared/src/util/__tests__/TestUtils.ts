/**
 * TypeScript port of Recoil_TestingUtils.js
 */

import { act } from 'react-test-renderer';

declare const jest: any;

export function flushPromisesAndTimers(): Promise<void> {
    // Wrap flush with act() to avoid warning that only shows up in OSS environment
    return act(
        () =>
            new Promise(resolve => {
                window.setTimeout(resolve, 100);
                (jest as any).runAllTimers();
            }),
    );
} 
