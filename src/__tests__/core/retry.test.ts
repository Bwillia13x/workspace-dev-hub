import { describe, it, expect, vi } from 'vitest';
import {
    withRetry,
    RetryError,
    DEFAULT_RETRY_CONFIG,
    calculateDelay,
    isRetryableError,
    withConditionalRetry,
} from '../../core/retry';

describe('Retry Utilities', () => {
    describe('calculateDelay', () => {
        it('should calculate linear delay', () => {
            const config = { ...DEFAULT_RETRY_CONFIG, backoff: 'linear' as const, delay: 1000, jitter: 0 };

            expect(calculateDelay(1, config)).toBe(1000);
            expect(calculateDelay(2, config)).toBe(1000);
            expect(calculateDelay(3, config)).toBe(1000);
        });

        it('should calculate exponential delay', () => {
            const config = { ...DEFAULT_RETRY_CONFIG, backoff: 'exponential' as const, delay: 1000, jitter: 0 };

            expect(calculateDelay(1, config)).toBe(1000);  // 1000 * 2^0
            expect(calculateDelay(2, config)).toBe(2000);  // 1000 * 2^1
            expect(calculateDelay(3, config)).toBe(4000);  // 1000 * 2^2
        });

        it('should cap delay at maxDelay', () => {
            const config = { ...DEFAULT_RETRY_CONFIG, backoff: 'exponential' as const, delay: 10000, maxDelay: 15000, jitter: 0 };

            expect(calculateDelay(1, config)).toBe(10000);
            expect(calculateDelay(2, config)).toBe(15000); // Capped at maxDelay
            expect(calculateDelay(3, config)).toBe(15000); // Still capped
        });

        it('should apply jitter within expected range', () => {
            const config = { ...DEFAULT_RETRY_CONFIG, backoff: 'linear' as const, delay: 1000, jitter: 0.1 };

            // Run multiple times to test jitter variation
            const delays = Array.from({ length: 100 }, () => calculateDelay(1, config));

            // All delays should be within 10% jitter range
            delays.forEach(delay => {
                expect(delay).toBeGreaterThanOrEqual(900);
                expect(delay).toBeLessThanOrEqual(1100);
            });
        });
    });

    describe('withRetry', () => {
        it('should succeed on first attempt', async () => {
            const mockFn = vi.fn().mockResolvedValue('success');

            const result = await withRetry(mockFn, { maxAttempts: 3, delay: 10, jitter: 0 });

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should retry and eventually succeed', async () => {
            const mockFn = vi.fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockResolvedValueOnce('success');

            const result = await withRetry(mockFn, { maxAttempts: 3, delay: 10, jitter: 0 });

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        it('should throw RetryError after max attempts', async () => {
            const mockFn = vi.fn().mockRejectedValue(new Error('always fails'));

            await expect(
                withRetry(mockFn, { maxAttempts: 3, delay: 10, jitter: 0 })
            ).rejects.toThrow(RetryError);

            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        it('should call onError callback for each failure', async () => {
            const mockFn = vi.fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockResolvedValueOnce('success');
            const onError = vi.fn();

            await withRetry(mockFn, { maxAttempts: 3, delay: 10, jitter: 0 }, onError);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(expect.any(Error), 1);
        });

        it('should include attempt count in RetryError', async () => {
            const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

            try {
                await withRetry(mockFn, { maxAttempts: 5, delay: 10, jitter: 0 });
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(RetryError);
                expect((error as RetryError).attempts).toBe(5);
            }
        });
    });

    describe('isRetryableError', () => {
        it('should return true for network errors', () => {
            expect(isRetryableError(new Error('Network error'))).toBe(true);
            expect(isRetryableError(new Error('Request timeout'))).toBe(true);
            expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
        });

        it('should return true for rate limit errors', () => {
            expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
            expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
            expect(isRetryableError(new Error('Quota exceeded'))).toBe(true);
        });

        it('should return true for server errors', () => {
            expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true);
            expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
            expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
            expect(isRetryableError(new Error('504 Gateway Timeout'))).toBe(true);
        });

        it('should return true for temporary errors', () => {
            expect(isRetryableError(new Error('Service temporarily unavailable'))).toBe(true);
            expect(isRetryableError(new Error('Please try again later'))).toBe(true);
        });

        it('should return false for non-retryable errors', () => {
            expect(isRetryableError(new Error('Invalid input'))).toBe(false);
            expect(isRetryableError(new Error('File not found'))).toBe(false);
            expect(isRetryableError(new Error('Permission denied'))).toBe(false);
        });
    });

    describe('withConditionalRetry', () => {
        it('should not retry non-retryable errors', async () => {
            const validationError = new Error('Validation failed');
            const mockFn = vi.fn().mockRejectedValue(validationError);

            // Custom shouldRetry that rejects validation errors
            const shouldRetry = (error: Error) => !error.message.includes('Validation');

            await expect(
                withConditionalRetry(mockFn, shouldRetry, { maxAttempts: 3, delay: 10, jitter: 0 })
            ).rejects.toThrow('Validation failed');

            expect(mockFn).toHaveBeenCalledTimes(1); // No retry
        });

        it('should retry retryable errors', async () => {
            const networkError = new Error('Network timeout');
            const mockFn = vi.fn()
                .mockRejectedValueOnce(networkError)
                .mockResolvedValueOnce('success');

            const result = await withConditionalRetry(mockFn, isRetryableError, { maxAttempts: 3, delay: 10, jitter: 0 });

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(2);
        });
    });

    describe('RetryError', () => {
        it('should contain original error', () => {
            const originalError = new Error('Original');
            const retryError = new RetryError('Failed after retries', 3, originalError);

            expect(retryError.name).toBe('RetryError');
            expect(retryError.attempts).toBe(3);
            expect(retryError.lastError).toBe(originalError);
        });
    });
});
