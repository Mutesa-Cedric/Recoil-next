/**
 * React hook that returns the previous value of a prop or state.
 */

import { useEffect, useRef } from 'react';

export default function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
} 