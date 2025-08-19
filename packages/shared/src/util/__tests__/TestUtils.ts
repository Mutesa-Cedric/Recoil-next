/**
 * TypeScript port of Recoil_TestingUtils.js
 */

import {act} from 'react-test-renderer';

declare const jest: any;
declare const vi: any;

export function flushPromisesAndTimers(): Promise<void> {
  // Wrap flush with act() to avoid warning that only shows up in OSS environment
  return act(
    () =>
      new Promise(resolve => {
        window.setTimeout(resolve, 100);
        // Use vi instead of jest for Vitest compatibility
        if (typeof vi !== 'undefined') {
          try {
            vi.runAllTimers();
          } catch {
            // If timers are not mocked, just continue - the setTimeout will handle timing
          }
        } else if (typeof jest !== 'undefined') {
          try {
            (jest as any).runAllTimers();
          } catch {
            // If timers are not mocked, just continue
          }
        }
      }),
  );
}
