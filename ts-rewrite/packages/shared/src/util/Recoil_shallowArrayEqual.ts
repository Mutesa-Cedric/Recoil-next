/**
 * Perform a shallow equality comparison of two arrays.
 */

function shallowArrayEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export default shallowArrayEqual; 