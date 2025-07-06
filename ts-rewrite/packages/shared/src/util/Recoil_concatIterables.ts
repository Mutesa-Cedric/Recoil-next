/**
 * Combine multiple iterables into one iterable, preserving order.
 */

function* concatIterables<T>(...iterables: Iterable<T>[]): Iterable<T> {
    for (const iterable of iterables) {
        for (const val of iterable) {
            yield val;
        }
    }
}

export default concatIterables; 