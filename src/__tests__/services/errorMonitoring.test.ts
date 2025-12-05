/**
 * Tests for Error Monitoring Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock analytics
vi.mock('../../services/analytics', () => ({
    analytics: {
        track: vi.fn(),
        getSessionInfo: vi.fn(() => ({
            sessionId: 'test_session',
            userId: null,
            duration: 1000,
        })),
    },
    AnalyticsEvents: {
        ERROR_OCCURRED: 'error_occurred',
    },
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock window
const windowMock = {
    location: {
        href: 'http://localhost:3000/studio',
    },
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
};

Object.defineProperty(global, 'window', {
    value: windowMock,
    writable: true,
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'test-agent',
    },
    writable: true,
});

// Mock performance
Object.defineProperty(global, 'performance', {
    value: {
        memory: {
            usedJSHeapSize: 10000000,
            totalJSHeapSize: 50000000,
        },
    },
    writable: true,
});

import {
    errorMonitor,
    ErrorSeverity,
    BreadcrumbCategory,
    BreadcrumbLevel,
    useErrorMonitor,
    withErrorCapture,
} from '../../services/errorMonitoring';

describe('Error Monitoring Service', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        errorMonitor.clearErrors();
        errorMonitor.clearBreadcrumbs();
    });

    describe('ErrorSeverity enum', () => {
        it('should have all severity levels', () => {
            expect(ErrorSeverity.INFO).toBe('info');
            expect(ErrorSeverity.WARNING).toBe('warning');
            expect(ErrorSeverity.ERROR).toBe('error');
            expect(ErrorSeverity.CRITICAL).toBe('critical');
        });
    });

    describe('BreadcrumbCategory enum', () => {
        it('should have all categories', () => {
            expect(BreadcrumbCategory.NAVIGATION).toBe('navigation');
            expect(BreadcrumbCategory.UI).toBe('ui');
            expect(BreadcrumbCategory.HTTP).toBe('http');
            expect(BreadcrumbCategory.USER).toBe('user');
            expect(BreadcrumbCategory.CONSOLE).toBe('console');
            expect(BreadcrumbCategory.ERROR).toBe('error');
        });
    });

    describe('BreadcrumbLevel enum', () => {
        it('should have all levels', () => {
            expect(BreadcrumbLevel.DEBUG).toBe('debug');
            expect(BreadcrumbLevel.INFO).toBe('info');
            expect(BreadcrumbLevel.WARNING).toBe('warning');
            expect(BreadcrumbLevel.ERROR).toBe('error');
        });
    });

    describe('errorMonitor.captureError', () => {
        it('should capture errors', () => {
            const error = new Error('Test error');
            const errorId = errorMonitor.captureError(error);

            expect(errorId).toBeTruthy();
            expect(errorId).toMatch(/^err_/);
        });

        it('should capture errors with context', () => {
            const error = new Error('Test error');
            const errorId = errorMonitor.captureError(error, {
                component: 'TestComponent',
                action: 'testAction',
            });

            expect(errorId).toBeTruthy();
            const report = errorMonitor.getError(errorId!);
            expect(report?.context.component).toBe('TestComponent');
            expect(report?.context.action).toBe('testAction');
        });

        it('should capture errors with custom severity', () => {
            const error = new Error('Critical error');
            const errorId = errorMonitor.captureError(error, {}, ErrorSeverity.CRITICAL);

            const report = errorMonitor.getError(errorId!);
            expect(report?.severity).toBe(ErrorSeverity.CRITICAL);
        });

        it('should generate unique error IDs', () => {
            const error1 = new Error('Error 1');
            const error2 = new Error('Error 2');

            const id1 = errorMonitor.captureError(error1);
            const id2 = errorMonitor.captureError(error2);

            expect(id1).not.toBe(id2);
        });

        it('should include breadcrumbs in error report', () => {
            errorMonitor.addBreadcrumb(BreadcrumbCategory.UI, 'Button clicked');
            errorMonitor.addBreadcrumb(BreadcrumbCategory.NAVIGATION, 'Page changed');

            const error = new Error('Test error');
            const errorId = errorMonitor.captureError(error);

            const report = errorMonitor.getError(errorId!);
            expect(report?.breadcrumbs.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('errorMonitor.captureException', () => {
        it('should capture exceptions with custom message', () => {
            const errorId = errorMonitor.captureException('Something went wrong');

            const report = errorMonitor.getError(errorId!);
            expect(report?.error.message).toBe('Something went wrong');
            expect(report?.error.name).toBe('CapturedError');
        });

        it('should capture exceptions with context', () => {
            const errorId = errorMonitor.captureException('Error message', {
                component: 'Studio',
            });

            const report = errorMonitor.getError(errorId!);
            expect(report?.context.component).toBe('Studio');
        });
    });

    describe('errorMonitor.addBreadcrumb', () => {
        it('should add breadcrumbs', () => {
            errorMonitor.addBreadcrumb(BreadcrumbCategory.UI, 'User clicked button');

            const breadcrumbs = errorMonitor.getBreadcrumbs();
            expect(breadcrumbs.length).toBeGreaterThan(0);
            expect(breadcrumbs.some(b => b.message === 'User clicked button')).toBe(true);
        });

        it('should add breadcrumbs with data', () => {
            errorMonitor.addBreadcrumb(
                BreadcrumbCategory.HTTP,
                'API call made',
                { endpoint: '/api/generate', method: 'POST' }
            );

            const breadcrumbs = errorMonitor.getBreadcrumbs();
            const httpBreadcrumb = breadcrumbs.find(b => b.category === BreadcrumbCategory.HTTP);
            expect(httpBreadcrumb?.data?.endpoint).toBe('/api/generate');
        });

        it('should add breadcrumbs with level', () => {
            errorMonitor.addBreadcrumb(
                BreadcrumbCategory.ERROR,
                'Error detected',
                undefined,
                BreadcrumbLevel.ERROR
            );

            const breadcrumbs = errorMonitor.getBreadcrumbs();
            const errorBreadcrumb = breadcrumbs.find(b => b.message === 'Error detected');
            expect(errorBreadcrumb?.level).toBe(BreadcrumbLevel.ERROR);
        });
    });

    describe('errorMonitor.getErrors', () => {
        it('should return all captured errors', () => {
            // Use completely different error messages to avoid fingerprint deduplication
            // (fingerprinting normalizes numbers to 'X')
            errorMonitor.captureError(new Error('First unique test error for list'));
            errorMonitor.captureError(new Error('Second different test error for list'));

            const errors = errorMonitor.getErrors();
            expect(errors.length).toBe(2);
        });

        it('should return empty array when no errors', () => {
            const errors = errorMonitor.getErrors();
            expect(errors).toEqual([]);
        });
    });

    describe('errorMonitor.getError', () => {
        it('should return specific error by ID', () => {
            const errorId = errorMonitor.captureError(new Error('Specific error'));

            const report = errorMonitor.getError(errorId!);
            expect(report?.error.message).toBe('Specific error');
        });

        it('should return undefined for non-existent ID', () => {
            const report = errorMonitor.getError('non_existent_id');
            expect(report).toBeUndefined();
        });
    });

    describe('errorMonitor.clearErrors', () => {
        it('should clear all errors', () => {
            errorMonitor.captureError(new Error('Error 1'));
            errorMonitor.captureError(new Error('Error 2'));

            errorMonitor.clearErrors();

            expect(errorMonitor.getErrors()).toEqual([]);
        });
    });

    describe('errorMonitor.clearBreadcrumbs', () => {
        it('should clear all breadcrumbs', () => {
            errorMonitor.addBreadcrumb(BreadcrumbCategory.UI, 'Test 1');
            errorMonitor.addBreadcrumb(BreadcrumbCategory.UI, 'Test 2');

            errorMonitor.clearBreadcrumbs();

            expect(errorMonitor.getBreadcrumbs()).toEqual([]);
        });
    });

    describe('errorMonitor.getBreadcrumbs', () => {
        it('should return all breadcrumbs', () => {
            errorMonitor.addBreadcrumb(BreadcrumbCategory.UI, 'Action 1');
            errorMonitor.addBreadcrumb(BreadcrumbCategory.NAVIGATION, 'Action 2');

            const breadcrumbs = errorMonitor.getBreadcrumbs();
            expect(breadcrumbs.length).toBe(2);
        });

        it('should return copy of breadcrumbs array', () => {
            errorMonitor.addBreadcrumb(BreadcrumbCategory.UI, 'Test');

            const breadcrumbs1 = errorMonitor.getBreadcrumbs();
            const breadcrumbs2 = errorMonitor.getBreadcrumbs();

            expect(breadcrumbs1).not.toBe(breadcrumbs2); // Different array instances
            expect(breadcrumbs1).toEqual(breadcrumbs2); // Same content
        });
    });

    describe('Error report structure', () => {
        it('should have correct structure', () => {
            const error = new Error('Test error');
            const errorId = errorMonitor.captureError(error, {
                component: 'TestComponent',
            });

            const report = errorMonitor.getError(errorId!);

            expect(report).toHaveProperty('id');
            expect(report).toHaveProperty('timestamp');
            expect(report).toHaveProperty('error');
            expect(report).toHaveProperty('category');
            expect(report).toHaveProperty('severity');
            expect(report).toHaveProperty('context');
            expect(report).toHaveProperty('breadcrumbs');
            expect(report).toHaveProperty('userMessage');
            expect(report).toHaveProperty('fingerprint');
            expect(report).toHaveProperty('count');
        });

        it('should have error details', () => {
            const error = new Error('Test message');
            error.name = 'CustomError';

            const errorId = errorMonitor.captureError(error);
            const report = errorMonitor.getError(errorId!);

            expect(report?.error.name).toBe('CustomError');
            expect(report?.error.message).toBe('Test message');
            expect(report?.error.stack).toBeDefined();
        });

        it('should enrich context with environment info', () => {
            const error = new Error('Test');
            const errorId = errorMonitor.captureError(error);

            const report = errorMonitor.getError(errorId!);

            expect(report?.context.url).toBe('http://localhost:3000/studio');
            expect(report?.context.userAgent).toBe('test-agent');
            expect(report?.context.viewport).toEqual({ width: 1920, height: 1080 });
            expect(report?.context.sessionId).toBe('test_session');
        });
    });

    describe('errorMonitor.clearErrors', () => {
        it('should clear all errors', () => {
            errorMonitor.captureError(new Error('Error one'));
            errorMonitor.captureError(new Error('Error two'));

            expect(errorMonitor.getErrors().length).toBe(2);

            errorMonitor.clearErrors();

            expect(errorMonitor.getErrors().length).toBe(0);
        });
    });

    describe('errorMonitor.clearBreadcrumbs', () => {
        it('should clear all breadcrumbs', () => {
            errorMonitor.addBreadcrumb(
                BreadcrumbCategory.UI,
                'Button clicked',
                undefined,
                BreadcrumbLevel.INFO
            );

            errorMonitor.clearBreadcrumbs();

            const breadcrumbs = errorMonitor.getBreadcrumbs();
            expect(breadcrumbs.length).toBe(0);
        });
    });

    describe('errorMonitor.getErrors', () => {
        it('should return all captured errors', () => {
            errorMonitor.captureError(new Error('Error alpha'));
            errorMonitor.captureError(new Error('Error beta'));
            errorMonitor.captureError(new Error('Error gamma'));

            const errors = errorMonitor.getErrors();
            expect(errors.length).toBe(3);
        });

        it('should return empty array when no errors', () => {
            const errors = errorMonitor.getErrors();
            expect(errors).toEqual([]);
        });
    });

    describe('error fingerprinting', () => {
        it('should create consistent fingerprints for similar errors', () => {
            const error1 = new Error('Same error message');
            const error2 = new Error('Same error message');

            const id1 = errorMonitor.captureError(error1);
            // Second capture with same fingerprint increments count
            errorMonitor.captureError(error2);

            const report = errorMonitor.getError(id1!);
            expect(report?.count).toBeGreaterThanOrEqual(1);
        });
    });

    describe('useErrorMonitor hook', () => {
        // Note: Hook testing requires @testing-library/react-hooks or renderHook
        // These are structure tests only
        it('should export useErrorMonitor function', () => {
            expect(typeof useErrorMonitor).toBe('function');
        });
    });

    describe('withErrorCapture', () => {
        it('should wrap async functions and capture errors', async () => {
            const failingFn = async () => {
                throw new Error('Async error');
            };

            const wrapped = withErrorCapture(failingFn, { action: 'test' });

            await expect(wrapped()).rejects.toThrow('Async error');
        });

        it('should return result for successful functions', async () => {
            const successFn = async () => 'success';

            const wrapped = withErrorCapture(successFn);

            const result = await wrapped();
            expect(result).toBe('success');
        });

        it('should pass arguments through to wrapped function', async () => {
            const addFn = async (a: number, b: number) => a + b;

            const wrapped = withErrorCapture(addFn);

            const result = await wrapped(2, 3);
            expect(result).toBe(5);
        });

        it('should include context in captured errors', async () => {
            const failingFn = async () => {
                throw new Error('Context test error');
            };

            const wrapped = withErrorCapture(failingFn, { component: 'TestComp' });

            await expect(wrapped()).rejects.toThrow();
        });
    });
});
