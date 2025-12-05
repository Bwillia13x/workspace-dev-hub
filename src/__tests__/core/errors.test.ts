import { describe, it, expect } from 'vitest';
import {
    ErrorCategory,
    categorizeError,
    getUserFriendlyMessage,
    isErrorRetryable,
    AppError,
} from '../../core/errors';
import { ValidationError } from '../../core/validation';

describe('Error Utilities', () => {
    describe('ErrorCategory', () => {
        it('should have all expected categories', () => {
            expect(ErrorCategory.NETWORK).toBe('NETWORK');
            expect(ErrorCategory.RATE_LIMIT).toBe('RATE_LIMIT');
            expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
            expect(ErrorCategory.AI_GENERATION).toBe('AI_GENERATION');
            expect(ErrorCategory.AUTHENTICATION).toBe('AUTHENTICATION');
            expect(ErrorCategory.STORAGE).toBe('STORAGE');
            expect(ErrorCategory.UNKNOWN).toBe('UNKNOWN');
        });
    });

    describe('categorizeError', () => {
        it('should categorize network errors', () => {
            const networkError = new Error('Network timeout');
            const result = categorizeError(networkError);

            expect(result.category).toBe(ErrorCategory.NETWORK);
            expect(result.retryable).toBe(true);
        });

        it('should categorize fetch errors', () => {
            const fetchError = new TypeError('Failed to fetch');
            const result = categorizeError(fetchError);

            expect(result.category).toBe(ErrorCategory.NETWORK);
            expect(result.retryable).toBe(true);
        });

        it('should categorize rate limit errors', () => {
            const rateLimitError = new Error('429 Too Many Requests');
            const result = categorizeError(rateLimitError);

            expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
            expect(result.retryable).toBe(true);
            expect(result.statusCode).toBe(429);
        });

        it('should categorize quota exceeded as rate limit', () => {
            const quotaError = new Error('API quota exceeded');
            const result = categorizeError(quotaError);

            expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
        });

        it('should categorize authentication errors', () => {
            const authError = new Error('Unauthorized: Invalid API key');
            const result = categorizeError(authError);

            expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
            expect(result.retryable).toBe(false);
            expect(result.statusCode).toBe(401);
        });

        it('should categorize validation errors', () => {
            const validationError = new ValidationError('Invalid input');
            const result = categorizeError(validationError);

            expect(result.category).toBe(ErrorCategory.VALIDATION);
            expect(result.retryable).toBe(false);
            expect(result.statusCode).toBe(400);
        });

        it('should categorize storage errors', () => {
            const storageError = new Error('LocalStorage quota exceeded');
            const result = categorizeError(storageError);

            expect(result.category).toBe(ErrorCategory.STORAGE);
            expect(result.retryable).toBe(false);
        });

        it('should categorize AI generation errors', () => {
            const aiError = new Error('No image generated');
            const result = categorizeError(aiError);

            expect(result.category).toBe(ErrorCategory.AI_GENERATION);
            expect(result.retryable).toBe(true);
        });

        it('should categorize server errors as AI generation', () => {
            const serverError = new Error('500 Internal Server Error');
            const result = categorizeError(serverError);

            expect(result.category).toBe(ErrorCategory.AI_GENERATION);
            expect(result.statusCode).toBe(500);
        });

        it('should categorize unknown errors', () => {
            const unknownError = new Error('Something unexpected happened');
            const result = categorizeError(unknownError);

            expect(result.category).toBe(ErrorCategory.UNKNOWN);
            expect(result.retryable).toBe(true);
        });

        it('should preserve original error', () => {
            const originalError = new Error('Original message');
            const result = categorizeError(originalError);

            expect(result.originalError).toBe(originalError);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return friendly message for categorized error', () => {
            const error = categorizeError(new Error('Network timeout'));
            const message = getUserFriendlyMessage(error);

            expect(message).toContain('Unable to connect');
            expect(message).toContain('check your internet');
        });

        it('should return friendly message for raw error', () => {
            const error = new Error('429 Rate Limit');
            const message = getUserFriendlyMessage(error);

            expect(message).toContain('Too many requests');
            expect(message).toContain('wait');
        });

        it('should include user action', () => {
            const error = new Error('Validation failed');
            const message = getUserFriendlyMessage(error);

            expect(message).toContain('check your input');
        });
    });

    describe('isErrorRetryable', () => {
        it('should return true for retryable categorized error', () => {
            const error = categorizeError(new Error('Network timeout'));
            expect(isErrorRetryable(error)).toBe(true);
        });

        it('should return false for non-retryable categorized error', () => {
            const error = categorizeError(new Error('Unauthorized'));
            expect(isErrorRetryable(error)).toBe(false);
        });

        it('should categorize and check raw error', () => {
            const networkError = new Error('Network timeout');
            const authError = new Error('Unauthorized');

            expect(isErrorRetryable(networkError)).toBe(true);
            expect(isErrorRetryable(authError)).toBe(false);
        });
    });

    describe('AppError', () => {
        it('should create error with category', () => {
            const error = new AppError('Test error', ErrorCategory.NETWORK);

            expect(error.name).toBe('AppError');
            expect(error.message).toBe('Test error');
            expect(error.category).toBe(ErrorCategory.NETWORK);
            expect(error.retryable).toBe(true);
        });

        it('should create error with custom options', () => {
            const cause = new Error('Cause');
            const error = new AppError('Test', ErrorCategory.VALIDATION, {
                retryable: false,
                statusCode: 400,
                userAction: 'Fix your input',
                cause,
            });

            expect(error.retryable).toBe(false);
            expect(error.statusCode).toBe(400);
            expect(error.userAction).toBe('Fix your input');
            expect(error.cause).toBe(cause);
        });

        it('should default userAction from category', () => {
            const error = new AppError('Test', ErrorCategory.AI_GENERATION);

            expect(error.userAction).toContain('prompt');
        });
    });
});
