import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the initial value immediately without waiting', () => {
        const { result } = renderHook(() => useDebounce('hello', 400));
        expect(result.current).toBe('hello');
    });

    it('does not update before the delay elapses', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 400),
            { initialProps: { value: 'a' } },
        );

        rerender({ value: 'b' });
        act(() => { vi.advanceTimersByTime(200); });

        expect(result.current).toBe('a');
    });

    it('updates the value after the delay elapses', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 400),
            { initialProps: { value: 'a' } },
        );

        rerender({ value: 'b' });
        act(() => { vi.advanceTimersByTime(400); });

        expect(result.current).toBe('b');
    });

    it('resets the timer when the value changes before the delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 400),
            { initialProps: { value: 'a' } },
        );

        rerender({ value: 'b' });
        act(() => { vi.advanceTimersByTime(200); });
        rerender({ value: 'c' });
        act(() => { vi.advanceTimersByTime(200); });

        // Only 200ms after the last change — still debouncing
        expect(result.current).toBe('a');

        act(() => { vi.advanceTimersByTime(200); });
        expect(result.current).toBe('c');
    });

    it('uses the custom delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 1000),
            { initialProps: { value: 'x' } },
        );

        rerender({ value: 'y' });
        act(() => { vi.advanceTimersByTime(999); });
        expect(result.current).toBe('x');

        act(() => { vi.advanceTimersByTime(1); });
        expect(result.current).toBe('y');
    });
});
