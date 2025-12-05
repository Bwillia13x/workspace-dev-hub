/**
 * Retry utility for handling transient failures
 * Implements exponential backoff with configurable options
 */

export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts: number;
    /** Initial delay in milliseconds (default: 1000) */
    delay: number;
    /** Backoff strategy: exponential doubles delay each retry, linear keeps it constant */
    backoff: 'exponential' | 'linear';
    /** Maximum delay cap in milliseconds for exponential backoff (default: 30000) */
    maxDelay?: number;
    /** Jitter factor to add randomness (0-1, default: 0.1) */
    jitter?: number;
}

/**
 * Custom error thrown when all retry attempts are exhausted
 */
export class RetryError extends Error {
    constructor(
        message: string,
        public attempts: number,
        public lastError: Error
    ) {
        super(message);
        this.name = 'RetryError';
    }
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    maxDelay: 30000,
    jitter: 0.1,
};

/**
 * Sleep for a specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay for a given attempt with optional jitter
 */
export const calculateDelay = (
    attempt: number,
    config: RetryConfig
): number => {
    const { delay, backoff, maxDelay = 30000, jitter = 0.1 } = config;

    let calculatedDelay = backoff === 'exponential'
        ? delay * Math.pow(2, attempt - 1)
        : delay;

    // Apply max delay cap
    calculatedDelay = Math.min(calculatedDelay, maxDelay);

    // Apply jitter (random variation)
    if (jitter > 0) {
        const jitterAmount = calculatedDelay * jitter;
        calculatedDelay += Math.random() * jitterAmount * 2 - jitterAmount;
    }

    return Math.round(calculatedDelay);
};

/**
 * Execute a function with retry logic
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @param onError - Optional callback for each error (useful for logging)
 * @returns Promise resolving to the function result
 * @throws RetryError if all attempts fail
 */
export const withRetry = async <T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onError?: (error: Error, attempt: number) => void | Promise<void>
): Promise<T> => {
    const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const { maxAttempts } = fullConfig;

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            lastError = error as Error;

            // Call error callback if provided
            if (onError) {
                await onError(lastError, attempt);
            }

            // If this was the last attempt, break and throw
            if (attempt === maxAttempts) {
                break;
            }

            // Calculate and apply delay before next attempt
            const delayMs = calculateDelay(attempt, fullConfig);
            console.warn(
                `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`,
                lastError.message
            );

            await sleep(delayMs);
        }
    }

    throw new RetryError(
        `Failed after ${maxAttempts} attempts: ${lastError.message}`,
        maxAttempts,
        lastError
    );
};

/**
 * Decorator-style retry wrapper for class methods
 * Usage: const result = await retry(() => this.apiCall(), { maxAttempts: 3 })
 */
export const retry = withRetry;

/**
 * Check if an error should be retried
 * Returns true for transient errors that may succeed on retry
 */
export const isRetryableError = (error: Error): boolean => {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
        return true;
    }

    // Rate limiting
    if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
        return true;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
        return true;
    }

    // Temporary unavailability
    if (message.includes('unavailable') || message.includes('try again')) {
        return true;
    }

    return false;
};

/**
 * Conditional retry wrapper that only retries for specific errors
 */
export const withConditionalRetry = async <T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error) => boolean = isRetryableError,
    config: Partial<RetryConfig> = {}
): Promise<T> => {
    const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const { maxAttempts } = fullConfig;

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry this error
            if (!shouldRetry(lastError)) {
                throw lastError; // Don't retry non-retryable errors
            }

            if (attempt === maxAttempts) {
                break;
            }

            const delayMs = calculateDelay(attempt, fullConfig);
            await sleep(delayMs);
        }
    }

    throw new RetryError(
        `Failed after ${maxAttempts} attempts: ${lastError.message}`,
        maxAttempts,
        lastError
    );
};
