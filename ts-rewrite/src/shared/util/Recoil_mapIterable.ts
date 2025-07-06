/**
 * Returns an iterable mapping each value via callback while preserving laziness.
 */

function mapIterable<T, K>(iterable: Iterable<T>, callback: (v: T, index: number) => K): Iterable<K> {
    return (function* () {
        let index = 0;
        for (const value of iterable) {
            yield callback(value, index++);
        }
    })();
}

export default mapIterable; 