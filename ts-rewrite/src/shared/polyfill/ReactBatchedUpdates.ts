/**
 * Export `unstable_batchedUpdates` from react-dom for environments where we can.
 */

import * as ReactDOM from 'react-dom';

// ReactDOM may not provide the method in non-DOM environments
export const unstable_batchedUpdates: typeof ReactDOM.unstable_batchedUpdates =
    // @ts-ignore
    ReactDOM.unstable_batchedUpdates ?? ((fn: (...args: any[]) => any, ...args: any[]) => fn(...args)); 