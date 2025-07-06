/**
 * Like useRef, but if the initial value is a function it will lazily compute value once.
 */

import { useRef } from 'react';

export default function useRefInitOnce<T>(initialValue: (() => T) | T): { current: T } {
    const ref = useRef<T>(initialValue as T);
    if (ref.current === initialValue && typeof initialValue === 'function') {
        // @ts-ignore safe cast after check
        ref.current = (initialValue as () => T)();
    }
    return ref as { current: T };
} 