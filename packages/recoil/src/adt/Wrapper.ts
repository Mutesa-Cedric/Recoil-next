/**
 * TypeScript port of Recoil_Wrapper.js
 */

'use strict';

export class WrappedValue<T> {
    value: T;
    constructor(value: T) {
        this.value = value;
    }
} 