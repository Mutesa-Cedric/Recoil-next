/**
 * Replicates Recoil's err utility: creates an Error object while ensuring the stack is captured
 * immediately so that it does not keep closures alive longer than necessary.
 */

function err(message: string): Error {
    const error = new Error(message);

    // In V8, Error objects keep the closure scope chain alive until the
    // `stack` property is accessed. If it is undefined, trigger it by throwing
    // and catching immediately (similar to original implementation).
    if (error.stack === undefined) {
        try {
            throw error;
            // eslint-disable-next-line no-empty
        } catch (_) {
            /* ignored */
        }
    }

    return error;
}

export default err; 