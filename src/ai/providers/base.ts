/**
 * Base AI Provider
 * 
 * Abstract base class providing common functionality for AI providers.
 * Individual providers extend this class and implement provider-specific logic.
 */

import type {
    IAIProvider,
    AIProvider,
    TaskType,
    GenerationOptions,
    EditOptions,
    CADOptions,
    GenerationResult,
    CADResult,
    ProviderHealth,
} from '../types';
import { ErrorCategory } from '../../core/errors';
import { withRetry } from '../../core/retry';

/**
 * Configuration for base provider
 */
export interface BaseProviderConfig {
    /** API key for the provider */
    apiKey: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Enable request caching */
    enableCache?: boolean;
}

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider implements IAIProvider {
    abstract readonly provider: AIProvider;
    abstract readonly name: string;

    protected readonly apiKey: string;
    protected readonly timeout: number;
    protected readonly maxRetries: number;
    protected readonly enableCache: boolean;

    /** Supported tasks for this provider */
    protected abstract supportedTasks: Set<TaskType>;

    constructor(config: BaseProviderConfig) {
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 60000;
        this.maxRetries = config.maxRetries ?? 3;
        this.enableCache = config.enableCache ?? false;
    }

    /**
     * Check if provider is available
     */
    abstract checkHealth(): Promise<ProviderHealth>;

    /**
     * Generate concept from text prompt - must be implemented by providers
     */
    abstract generateConcept(
        prompt: string,
        options?: GenerationOptions
    ): Promise<GenerationResult>;

    /**
     * Edit existing image - must be implemented by providers
     */
    abstract editConcept(
        imageBase64: string,
        instruction: string,
        options?: EditOptions
    ): Promise<GenerationResult>;

    /**
     * Generate CAD/technical drawing - must be implemented by providers
     */
    abstract generateCAD(
        imageBase64: string,
        options?: CADOptions
    ): Promise<CADResult>;

    /**
     * Check if provider supports a specific task
     */
    supportsTask(task: TaskType): boolean {
        return this.supportedTasks.has(task);
    }

    /**
     * Get estimated cost per generation
     * Override in providers with actual pricing
     */
    getEstimatedCost(_task: TaskType, _options?: GenerationOptions): number {
        return 0;
    }

    /**
     * Execute a function with retry logic
     */
    protected async executeWithRetry<T>(
        fn: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        return withRetry(fn, {
            maxAttempts: this.maxRetries,
            delay: 1000,
            backoff: 'exponential',
            maxDelay: 10000,
        }, (error, attempt) => {
            console.warn(
                `[${this.name}] ${operationName} failed (attempt ${attempt}):`,
                error.message
            );
        });
    }

    /**
     * Create a standardized error for this provider
     */
    protected createError(
        message: string,
        category: ErrorCategory,
        originalError?: unknown
    ): Error {
        const error = new Error(message);
        error.name = `${this.name}Error`;

        // Attach metadata for categorization
        (error as Error & { category: ErrorCategory; provider: string; originalError?: string }).category = category;
        (error as Error & { provider: string }).provider = this.provider;

        if (originalError instanceof Error) {
            (error as Error & { originalError: string }).originalError = originalError.message;
        }

        return error;
    }

    /**
     * Validate that an image is valid base64
     */
    protected validateBase64Image(imageBase64: string, fieldName: string): void {
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            throw this.createError(
                `${fieldName} is required`,
                ErrorCategory.VALIDATION
            );
        }

        // Check for valid base64 pattern
        const base64Regex = /^[A-Za-z0-9+/]+=*$/;
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        if (!base64Regex.test(cleanBase64)) {
            throw this.createError(
                `${fieldName} is not valid base64`,
                ErrorCategory.VALIDATION
            );
        }
    }

    /**
     * Extract base64 data from data URL if present
     */
    protected extractBase64(dataUrlOrBase64: string): string {
        if (dataUrlOrBase64.startsWith('data:')) {
            return dataUrlOrBase64.split(',')[1] || dataUrlOrBase64;
        }
        return dataUrlOrBase64;
    }

    /**
     * Measure execution time
     */
    protected async withTiming<T>(
        fn: () => Promise<T>
    ): Promise<{ result: T; duration: number }> {
        const start = performance.now();
        const result = await fn();
        const duration = Math.round(performance.now() - start);
        return { result, duration };
    }
}
