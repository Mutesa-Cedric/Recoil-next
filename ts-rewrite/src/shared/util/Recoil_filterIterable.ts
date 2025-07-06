/**
 * Returns an iterable that yields only the items which satisfy `predicate`.
 */

function* filterIterable<T>(iterable: Iterable<T>, predicate: (v: T, index: number) => boolean): Iterable<T> {
    let index = 0;
    for (const value of iterable) {
        if (predicate(value, index++)) {
            yield value;
        }
    }
}

export default filterIterable; 