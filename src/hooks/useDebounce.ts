/**
 * Debounce Hook
 * 
 * Provides debounced values and functions for optimizing
 * performance in search inputs and other frequently-updating state.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce a value by the specified delay.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // This only runs when debouncedSearch changes
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Create a debounced version of a callback function.
 * 
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Object with debounced function, cancel method, and flush method
 * 
 * @example
 * ```tsx
 * const { debouncedFn, cancel, flush } = useDebouncedCallback(
 *   (value: string) => performSearch(value),
 *   500
 * );
 * 
 * // In an input handler
 * const handleChange = (e) => debouncedFn(e.target.value);
 * 
 * // Cancel pending call on unmount
 * useEffect(() => cancel, [cancel]);
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
    callback: T,
    delay: number = 300
): {
    debouncedFn: (...args: Parameters<T>) => void;
    cancel: () => void;
    flush: () => void;
    isPending: () => boolean;
} {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);
    const pendingArgsRef = useRef<Parameters<T> | null>(null);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        pendingArgsRef.current = null;
    }, []);

    const flush = useCallback(() => {
        if (timeoutRef.current && pendingArgsRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
            callbackRef.current(...pendingArgsRef.current);
            pendingArgsRef.current = null;
        }
    }, []);

    const isPending = useCallback(() => {
        return timeoutRef.current !== null;
    }, []);

    const debouncedFn = useCallback(
        (...args: Parameters<T>) => {
            cancel();
            pendingArgsRef.current = args;
            timeoutRef.current = setTimeout(() => {
                timeoutRef.current = null;
                pendingArgsRef.current = null;
                callbackRef.current(...args);
            }, delay);
        },
        [delay, cancel]
    );

    // Cleanup on unmount
    useEffect(() => {
        return cancel;
    }, [cancel]);

    return { debouncedFn, cancel, flush, isPending };
}

/**
 * Debounce state updates with both immediate and debounced values.
 * Useful for search inputs where you want to show the typed value
 * immediately but only trigger searches after the delay.
 * 
 * @param initialValue - Initial value
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Tuple of [immediateValue, debouncedValue, setValue]
 * 
 * @example
 * ```tsx
 * const [inputValue, debouncedValue, setInputValue] = useDebouncedState('', 500);
 * 
 * // Show inputValue in the input for immediate feedback
 * <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
 * 
 * // Use debouncedValue for API calls
 * useEffect(() => {
 *   if (debouncedValue) searchAPI(debouncedValue);
 * }, [debouncedValue]);
 * ```
 */
export function useDebouncedState<T>(
    initialValue: T,
    delay: number = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(initialValue);
    const debouncedValue = useDebounce(value, delay);

    return [value, debouncedValue, setValue];
}

/**
 * Throttle a callback function - ensures it's called at most once per interval.
 * Unlike debounce, throttle will call the function immediately on first trigger.
 * 
 * @param callback - The function to throttle
 * @param interval - Minimum interval between calls in milliseconds (default: 300)
 * @returns Object with throttled function and cancel method
 * 
 * @example
 * ```tsx
 * const { throttledFn, cancel } = useThrottledCallback(
 *   () => handleScroll(),
 *   100
 * );
 * 
 * window.addEventListener('scroll', throttledFn);
 * ```
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
    callback: T,
    interval: number = 300
): {
    throttledFn: (...args: Parameters<T>) => void;
    cancel: () => void;
} {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCallRef = useRef<number>(0);
    const callbackRef = useRef(callback);
    const pendingArgsRef = useRef<Parameters<T> | null>(null);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        pendingArgsRef.current = null;
    }, []);

    const throttledFn = useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCallRef.current;

            if (timeSinceLastCall >= interval) {
                // Enough time has passed, call immediately
                lastCallRef.current = now;
                callbackRef.current(...args);
            } else {
                // Store the latest args
                pendingArgsRef.current = args;

                if (!timeoutRef.current) {
                    // Schedule a call for when the interval has passed
                    timeoutRef.current = setTimeout(() => {
                        timeoutRef.current = null;
                        lastCallRef.current = Date.now();
                        if (pendingArgsRef.current) {
                            callbackRef.current(...pendingArgsRef.current);
                            pendingArgsRef.current = null;
                        }
                    }, interval - timeSinceLastCall);
                }
            }
        },
        [interval]
    );

    // Cleanup on unmount
    useEffect(() => {
        return cancel;
    }, [cancel]);

    return { throttledFn, cancel };
}

export default useDebounce;
