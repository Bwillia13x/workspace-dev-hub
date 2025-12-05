/**
 * Error categorization and handling utilities
 * Provides structured error classification for better UX and debugging
 */

/**
 * Categories of errors that can occur in the application
 */
export enum ErrorCategory {
    /** Network connectivity issues, timeouts */
    NETWORK = 'NETWORK',
    /** API rate limits exceeded */
    RATE_LIMIT = 'RATE_LIMIT',
    /** Input validation failures */
    VALIDATION = 'VALIDATION',
    /** AI model generation failures */
    AI_GENERATION = 'AI_GENERATION',
    /** Authentication/authorization issues */
    AUTHENTICATION = 'AUTHENTICATION',
    /** Storage (localStorage, etc.) issues */
    STORAGE = 'STORAGE',
    /** Unknown/unexpected errors */
    UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error information
 */
export interface CategorizedError {
    /** Error category for handling decisions */
    category: ErrorCategory;
    /** Original error object */
    originalError: Error;
    /** User-friendly error message */
    message: string;
    /** Whether this error is safe to retry */
    retryable: boolean;
    /** Suggested user action */
    userAction?: string;
    /** HTTP status code if available */
    statusCode?: number;
}

/**
 * User-friendly messages for each error category
 */
const USER_MESSAGES: Record<ErrorCategory, { message: string; action: string }> = {
    [ErrorCategory.NETWORK]: {
        message: 'Unable to connect to the server',
        action: 'Please check your internet connection and try again.',
    },
    [ErrorCategory.RATE_LIMIT]: {
        message: 'Too many requests',
        action: 'Please wait a moment before trying again.',
    },
    [ErrorCategory.VALIDATION]: {
        message: 'Invalid input',
        action: 'Please check your input and try again.',
    },
    [ErrorCategory.AI_GENERATION]: {
        message: 'AI generation failed',
        action: 'Try a different prompt or simplify your request.',
    },
    [ErrorCategory.AUTHENTICATION]: {
        message: 'Authentication required',
        action: 'Please sign in to continue.',
    },
    [ErrorCategory.STORAGE]: {
        message: 'Storage error',
        action: 'Try clearing some browser storage or using a different browser.',
    },
    [ErrorCategory.UNKNOWN]: {
        message: 'An unexpected error occurred',
        action: 'Please try again. If the problem persists, contact support.',
    },
};

/**
 * Categorize an error based on its message and type
 */
export const categorizeError = (error: Error): CategorizedError => {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Storage errors (check first - more specific)
    if (
        message.includes('localstorage') ||
        message.includes('sessionstorage') ||
        name === 'quotaexceedederror' ||
        (message.includes('storage') && message.includes('quota'))
    ) {
        return createCategorizedError(error, ErrorCategory.STORAGE, false);
    }

    // Rate limiting (API rate limits)
    if (message.includes('429') || message.includes('rate limit') || (message.includes('api') && message.includes('quota'))) {
        return createCategorizedError(error, ErrorCategory.RATE_LIMIT, true, 429);
    }

    // Network errors
    if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('failed to fetch') ||
        name === 'typeerror' && message.includes('fetch')
    ) {
        return createCategorizedError(error, ErrorCategory.NETWORK, true);
    }

    // Authentication errors
    if (
        message.includes('unauthorized') ||
        message.includes('authentication') ||
        message.includes('401') ||
        message.includes('api key')
    ) {
        return createCategorizedError(error, ErrorCategory.AUTHENTICATION, false, 401);
    }

    // Validation errors
    if (name === 'validationerror' || message.includes('validation') || message.includes('invalid')) {
        return createCategorizedError(error, ErrorCategory.VALIDATION, false, 400);
    }

    // AI generation errors (default for API errors)
    if (
        message.includes('no image') ||
        message.includes('generation') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503')
    ) {
        return createCategorizedError(error, ErrorCategory.AI_GENERATION, true, 500);
    }

    // Default to unknown
    return createCategorizedError(error, ErrorCategory.UNKNOWN, true);
};

/**
 * Helper to create a categorized error object
 */
const createCategorizedError = (
    error: Error,
    category: ErrorCategory,
    retryable: boolean,
    statusCode?: number
): CategorizedError => {
    const userInfo = USER_MESSAGES[category];

    return {
        category,
        originalError: error,
        message: userInfo.message,
        retryable,
        userAction: userInfo.action,
        statusCode,
    };
};

/**
 * Get a user-friendly error message
 */
export const getUserFriendlyMessage = (error: Error | CategorizedError): string => {
    if ('category' in error) {
        return `${error.message}. ${error.userAction || ''}`;
    }

    const categorized = categorizeError(error);
    return `${categorized.message}. ${categorized.userAction || ''}`;
};

/**
 * Check if an error is retryable
 */
export const isErrorRetryable = (error: Error | CategorizedError): boolean => {
    if ('retryable' in error) {
        return error.retryable;
    }

    return categorizeError(error).retryable;
};

/**
 * Application-specific error class with category
 */
export class AppError extends Error {
    public readonly category: ErrorCategory;
    public readonly retryable: boolean;
    public readonly statusCode?: number;
    public readonly userAction?: string;

    constructor(
        message: string,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        options: {
            retryable?: boolean;
            statusCode?: number;
            userAction?: string;
            cause?: Error;
        } = {}
    ) {
        super(message, { cause: options.cause });
        this.name = 'AppError';
        this.category = category;
        this.retryable = options.retryable ?? true;
        this.statusCode = options.statusCode;
        this.userAction = options.userAction ?? USER_MESSAGES[category].action;
    }
}
