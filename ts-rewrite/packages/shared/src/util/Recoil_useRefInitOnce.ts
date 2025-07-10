/**
 * TypeScript port of Recoil_useRefInitOnce.js
 */

'use strict';

import { useRef } from 'react';

export default function useRefInitOnce<T>(initialValue: (() => T) | T): { current: T } {
    const ref = useRef<T>(initialValue as T);
    if (ref.current === initialValue && typeof initialValue === 'function') {
        ref.current = (initialValue as () => T)();
    }
    return ref;
} 