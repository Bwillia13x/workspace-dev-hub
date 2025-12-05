/**
 * Tests for useDebounce hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    useDebounce,
    useDebouncedCallback,
    useDebouncedState,
    useThrottledCallback
} from '../../hooks/useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 300));
        expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: 'initial' } }
        );

        expect(result.current).toBe('initial');

        // Change the value
        rerender({ value: 'updated' });

        // Should still be initial immediately
        expect(result.current).toBe('initial');

        // Fast forward time
        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Now should be updated
        expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: 'a' } }
        );

        rerender({ value: 'b' });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'c' });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        rerender({ value: 'd' });

        // Only 200ms have passed since 'd', should still be 'a'
        expect(result.current).toBe('a');

        // Fast forward past the full delay
        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Now should be 'd' (the last value)
        expect(result.current).toBe('d');
    });

    it('should work with different delay values', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        rerender({ value: 'updated' });

        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current).toBe('updated');
    });
});

describe('useDebouncedCallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should debounce callback execution', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 300));

        act(() => {
            result.current.debouncedFn('arg1');
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(callback).toHaveBeenCalledWith('arg1');
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should only call callback once for rapid calls', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 300));

        act(() => {
            result.current.debouncedFn('a');
            result.current.debouncedFn('b');
            result.current.debouncedFn('c');
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('c');
    });

    it('should cancel pending callback', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 300));

        act(() => {
            result.current.debouncedFn('test');
        });

        act(() => {
            result.current.cancel();
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(callback).not.toHaveBeenCalled();
    });

    it('should flush pending callback immediately', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 300));

        act(() => {
            result.current.debouncedFn('test');
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            result.current.flush();
        });

        expect(callback).toHaveBeenCalledWith('test');
    });

    it('should report pending state correctly', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 300));

        expect(result.current.isPending()).toBe(false);

        act(() => {
            result.current.debouncedFn('test');
        });

        expect(result.current.isPending()).toBe(true);

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current.isPending()).toBe(false);
    });
});

describe('useDebouncedState', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return immediate and debounced values', () => {
        const { result } = renderHook(() => useDebouncedState('initial', 300));

        const [immediate, debounced, setValue] = result.current;

        expect(immediate).toBe('initial');
        expect(debounced).toBe('initial');
        expect(typeof setValue).toBe('function');
    });

    it('should update immediate value immediately', () => {
        const { result } = renderHook(() => useDebouncedState('initial', 300));

        act(() => {
            result.current[2]('updated');
        });

        expect(result.current[0]).toBe('updated'); // immediate
        expect(result.current[1]).toBe('initial'); // debounced still initial
    });

    it('should update debounced value after delay', () => {
        const { result } = renderHook(() => useDebouncedState('initial', 300));

        act(() => {
            result.current[2]('updated');
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current[0]).toBe('updated'); // immediate
        expect(result.current[1]).toBe('updated'); // debounced now updated
    });
});

describe('useThrottledCallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should call callback immediately on first call', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottledCallback(callback, 300));

        act(() => {
            result.current.throttledFn('test');
        });

        expect(callback).toHaveBeenCalledWith('test');
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottledCallback(callback, 300));

        act(() => {
            result.current.throttledFn('a');
        });

        // Only first call should have executed immediately
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('a');

        // Rapid subsequent calls should be throttled
        act(() => {
            result.current.throttledFn('b');
            result.current.throttledFn('c');
        });

        // Still only one call (the 'b' call scheduled a trailing call)
        expect(callback).toHaveBeenCalledTimes(1);

        // Fast forward past throttle interval
        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Now the trailing call should execute with 'c' (last args used)
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should allow calls after interval has passed', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottledCallback(callback, 300));

        act(() => {
            result.current.throttledFn('a');
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        act(() => {
            result.current.throttledFn('b');
        });

        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenLastCalledWith('b');
    });

    it('should cancel pending throttled callback', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottledCallback(callback, 300));

        act(() => {
            result.current.throttledFn('a');
            result.current.throttledFn('b'); // This schedules a trailing call
        });

        act(() => {
            result.current.cancel();
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Only the first immediate call should have executed
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('a');
    });
});
