/**
 * Wrapper used in Recoil to mark values that should bypass certain processing.
 */

export class WrappedValue<T> {
    constructor(public readonly value: T) { }
} 