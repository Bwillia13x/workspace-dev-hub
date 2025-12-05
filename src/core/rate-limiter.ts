/**
 * Rate Limiter Service
 * 
 * Client-side rate limiting for AI API calls to prevent abuse
 * and manage costs. Uses token bucket algorithm with localStorage persistence.
 */

export interface RateLimitConfig {
    /** Maximum tokens in the bucket */
    maxTokens: number;
    /** Tokens added per interval */
    refillRate: number;
    /** Refill interval in milliseconds */
    refillInterval: number;
    /** Storage key for persistence */
    storageKey: string;
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

// Default configurations for different operation types
export const RATE_LIMIT_CONFIGS = {
    conceptGeneration: {
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 60000, // 1 token per minute, max 10
        storageKey: 'rateLimit_concept',
    },
    imageEdit: {
        maxTokens: 20,
        refillRate: 2,
        refillInterval: 60000, // 2 tokens per minute, max 20
        storageKey: 'rateLimit_edit',
    },
    cadGeneration: {
        maxTokens: 5,
        refillRate: 1,
        refillInterval: 120000, // 1 token per 2 minutes, max 5
        storageKey: 'rateLimit_cad',
    },
    trendSearch: {
        maxTokens: 30,
        refillRate: 5,
        refillInterval: 60000, // 5 tokens per minute, max 30
        storageKey: 'rateLimit_trend',
    },
} as const;

export type RateLimitOperation = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Rate Limiter Class
 */
export class RateLimiter {
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    /**
     * Get current bucket state from storage
     */
    private getBucket(): TokenBucket {
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            // Ignore parse errors
        }
        return {
            tokens: this.config.maxTokens,
            lastRefill: Date.now(),
        };
    }

    /**
     * Save bucket state to storage
     */
    private saveBucket(bucket: TokenBucket): void {
        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify(bucket));
        } catch {
            // Ignore storage errors (quota exceeded, etc.)
        }
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refillTokens(bucket: TokenBucket): TokenBucket {
        const now = Date.now();
        const elapsed = now - bucket.lastRefill;
        const intervals = Math.floor(elapsed / this.config.refillInterval);

        if (intervals > 0) {
            const newTokens = Math.min(
                this.config.maxTokens,
                bucket.tokens + intervals * this.config.refillRate
            );
            return {
                tokens: newTokens,
                lastRefill: bucket.lastRefill + intervals * this.config.refillInterval,
            };
        }
        return bucket;
    }

    /**
     * Check if an operation is allowed (without consuming a token)
     */
    canProceed(): boolean {
        const bucket = this.refillTokens(this.getBucket());
        return bucket.tokens >= 1;
    }

    /**
     * Attempt to consume a token. Returns true if successful.
     */
    tryConsume(): boolean {
        let bucket = this.getBucket();
        bucket = this.refillTokens(bucket);

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            this.saveBucket(bucket);
            return true;
        }
        return false;
    }

    /**
     * Get remaining tokens
     */
    getRemainingTokens(): number {
        const bucket = this.refillTokens(this.getBucket());
        return bucket.tokens;
    }

    /**
     * Get time until next token is available (in ms)
     */
    getTimeUntilNextToken(): number {
        const bucket = this.getBucket();
        if (bucket.tokens >= 1) return 0;

        const elapsed = Date.now() - bucket.lastRefill;
        const remaining = this.config.refillInterval - elapsed;
        return Math.max(0, remaining);
    }

    /**
     * Reset the rate limiter (for testing or admin purposes)
     */
    reset(): void {
        localStorage.removeItem(this.config.storageKey);
    }
}

// Singleton instances for each operation type
const limiters = new Map<RateLimitOperation, RateLimiter>();

/**
 * Get rate limiter for a specific operation
 */
export function getRateLimiter(operation: RateLimitOperation): RateLimiter {
    if (!limiters.has(operation)) {
        limiters.set(operation, new RateLimiter(RATE_LIMIT_CONFIGS[operation]));
    }
    return limiters.get(operation)!;
}

/**
 * Check rate limit before performing an operation
 * Throws RateLimitError if limit exceeded
 */
export class RateLimitError extends Error {
    readonly operation: RateLimitOperation;
    readonly retryAfter: number;

    constructor(operation: RateLimitOperation, retryAfter: number) {
        super(`Rate limit exceeded for ${operation}. Try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
        this.name = 'RateLimitError';
        this.operation = operation;
        this.retryAfter = retryAfter;
    }
}

/**
 * Higher-order function to wrap async operations with rate limiting
 */
export function withRateLimit<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
    operation: RateLimitOperation,
    fn: T
): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        const limiter = getRateLimiter(operation);

        if (!limiter.tryConsume()) {
            const retryAfter = limiter.getTimeUntilNextToken();
            throw new RateLimitError(operation, retryAfter);
        }

        return fn(...args);
    }) as T;
}

/**
 * React hook for rate limit status
 */
export function useRateLimitStatus(operation: RateLimitOperation) {
    const limiter = getRateLimiter(operation);

    return {
        canProceed: limiter.canProceed(),
        remainingTokens: limiter.getRemainingTokens(),
        timeUntilNextToken: limiter.getTimeUntilNextToken(),
        maxTokens: RATE_LIMIT_CONFIGS[operation].maxTokens,
    };
}
