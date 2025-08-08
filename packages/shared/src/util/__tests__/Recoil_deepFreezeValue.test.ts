/**
 * Adapted from original Recoil test to validate deepFreezeValue in TypeScript.
 */

import deepFreezeValue from '../Recoil_deepFreezeValue';

describe('deepFreezeValue', () => {
    it('does not freeze Promises', () => {
        const obj = { test: new Promise(() => { }) };
        deepFreezeValue(obj);
        expect(Object.isFrozen(obj)).toBe(true);
        expect(Object.isFrozen(obj.test)).toBe(false);
    });

    it('does not freeze Errors', () => {
        const obj = { test: new Error() };
        deepFreezeValue(obj);
        expect(Object.isFrozen(obj)).toBe(true);
        expect(Object.isFrozen(obj.test)).toBe(false);
    });

    it('handles ArrayBufferView properties without throwing', () => {
        expect(() => deepFreezeValue({ test: new Int8Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Uint8Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Uint8ClampedArray(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Uint16Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Int32Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Uint32Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Float32Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new Float64Array(4) })).not.toThrow();
        expect(() => deepFreezeValue({ test: new DataView(new ArrayBuffer(16), 0) })).not.toThrow();
    });

    it('handles Window property without throwing (browser only)', () => {
        if (typeof window === 'undefined') {
            return;
        }
        expect(() => deepFreezeValue({ test: window })).not.toThrow();
    });
}); 