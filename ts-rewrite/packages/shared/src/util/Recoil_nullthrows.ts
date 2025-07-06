/**
 * Throws if value is null or undefined, otherwise returns the value.
 * Mirrors the behavior of the original Flow implementation.
 */

import err from './Recoil_err';

function nullthrows<T>(x: T | null | undefined, message?: string): T {
    if (x != null) {
        return x;
    }
    throw err(message ?? 'Got unexpected null or undefined');
}

export default nullthrows;

