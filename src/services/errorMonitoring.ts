/**
 * Error Monitoring Service - Track and report application errors
 * 
 * Provides comprehensive error tracking with:
 * - Automatic error capture
 * - Error deduplication
 * - Breadcrumb trails
 * - Context enrichment
 * - Rate limiting
 */

import { analytics, AnalyticsEvents } from './analytics';
import { categorizeError, getUserFriendlyMessage, ErrorCategory, CategorizedError } from '../core/errors';

// Types
export interface ErrorReport {
    id: string;
    timestamp: number;
    error: {
        name: string;
        message: string;
        stack?: string;
    };
    category: ErrorCategory;
    severity: ErrorSeverity;
    context: ErrorContext;
    breadcrumbs: Breadcrumb[];
    userMessage: string;
    fingerprint: string;
    count: number;
}

export interface ErrorContext {
    url?: string;
    route?: string;
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    viewport?: { width: number; height: number };
    memory?: { used: number; total: number };
    timestamp: number;
    [key: string]: unknown;
}

export interface Breadcrumb {
    timestamp: number;
    category: BreadcrumbCategory;
    message: string;
    data?: Record<string, unknown>;
    level: BreadcrumbLevel;
}

export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

export enum BreadcrumbCategory {
    NAVIGATION = 'navigation',
    UI = 'ui',
    HTTP = 'http',
    USER = 'user',
    CONSOLE = 'console',
    ERROR = 'error',
}

export enum BreadcrumbLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
}

// Configuration
export interface ErrorMonitoringConfig {
    enabled: boolean;
    maxBreadcrumbs: number;
    maxErrors: number;
    deduplicationWindow: number; // ms
    rateLimitPerMinute: number;
    captureUnhandled: boolean;
    captureConsoleErrors: boolean;
    beforeSend?: (report: ErrorReport) => ErrorReport | null;
}

const defaultConfig: ErrorMonitoringConfig = {
    enabled: true,
    maxBreadcrumbs: 50,
    maxErrors: 100,
    deduplicationWindow: 60000, // 1 minute
    rateLimitPerMinute: 30,
    captureUnhandled: true,
    captureConsoleErrors: true,
};

// Error Monitoring class
class ErrorMonitor {
    private config: ErrorMonitoringConfig;
    private breadcrumbs: Breadcrumb[] = [];
    private errors: Map<string, ErrorReport> = new Map();
    private errorCounts: Map<string, { count: number; lastSeen: number }> = new Map();
    private rateLimitWindow: number[] = [];
    private isInitialized = false;

    constructor(config: Partial<ErrorMonitoringConfig> = {}) {
        this.config = { ...defaultConfig, ...config };
    }

    /**
     * Initialize error monitoring
     */
    init(): void {
        if (this.isInitialized || !this.config.enabled) return;

        if (typeof window !== 'undefined') {
            if (this.config.captureUnhandled) {
                window.addEventListener('error', this.handleGlobalError);
                window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
            }

            if (this.config.captureConsoleErrors) {
                this.interceptConsoleError();
            }
        }

        this.isInitialized = true;
        this.addBreadcrumb(BreadcrumbCategory.NAVIGATION, 'Error monitoring initialized');
    }

    /**
     * Clean up listeners
     */
    destroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('error', this.handleGlobalError);
            window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
        }
        this.isInitialized = false;
    }

    /**
     * Handle global errors
     */
    private handleGlobalError = (event: ErrorEvent): void => {
        const error = event.error || new Error(event.message);
        this.captureError(error, {
            source: 'window.onerror',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    };

    /**
     * Handle unhandled promise rejections
     */
    private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
        const error = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        this.captureError(error, {
            source: 'unhandledrejection',
        });
    };

    /**
     * Intercept console.error calls
     */
    private interceptConsoleError(): void {
        const originalError = console.error;
        console.error = (...args: unknown[]) => {
            this.addBreadcrumb(
                BreadcrumbCategory.CONSOLE,
                args.map(arg => String(arg)).join(' '),
                { args },
                BreadcrumbLevel.ERROR
            );
            originalError.apply(console, args);
        };
    }

    /**
     * Generate a fingerprint for error deduplication
     */
    private generateFingerprint(error: Error, context?: Partial<ErrorContext>): string {
        const parts = [
            error.name,
            error.message,
            context?.component,
            context?.action,
        ].filter(Boolean);

        return parts.join(':').replace(/\d+/g, 'X'); // Normalize numbers
    }

    /**
     * Check if we should capture this error (rate limiting & deduplication)
     */
    private shouldCapture(fingerprint: string): boolean {
        const now = Date.now();

        // Rate limiting
        this.rateLimitWindow = this.rateLimitWindow.filter(t => now - t < 60000);
        if (this.rateLimitWindow.length >= this.config.rateLimitPerMinute) {
            return false;
        }

        // Deduplication
        const existing = this.errorCounts.get(fingerprint);
        if (existing && now - existing.lastSeen < this.config.deduplicationWindow) {
            existing.count++;
            existing.lastSeen = now;
            return false;
        }

        this.rateLimitWindow.push(now);
        return true;
    }

    /**
     * Capture an error
     */
    captureError(
        error: Error,
        context?: Partial<ErrorContext>,
        severity?: ErrorSeverity
    ): string | null {
        if (!this.config.enabled) return null;

        const fingerprint = this.generateFingerprint(error, context);

        if (!this.shouldCapture(fingerprint)) {
            return fingerprint; // Return fingerprint even if deduplicated
        }

        const categorized = categorizeError(error);
        const inferredSeverity = severity || this.inferSeverity(categorized.category);
        const enrichedContext = this.enrichContext(context);

        const report: ErrorReport = {
            id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            category: categorized.category,
            severity: inferredSeverity,
            context: enrichedContext,
            breadcrumbs: [...this.breadcrumbs],
            userMessage: getUserFriendlyMessage(error),
            fingerprint,
            count: 1,
        };

        // Apply beforeSend hook
        if (this.config.beforeSend) {
            const processed = this.config.beforeSend(report);
            if (!processed) return null;
        }

        // Store error
        this.errors.set(report.id, report);
        this.errorCounts.set(fingerprint, { count: 1, lastSeen: Date.now() });

        // Trim old errors
        if (this.errors.size > this.config.maxErrors) {
            const oldest = Array.from(this.errors.keys())[0];
            this.errors.delete(oldest);
        }

        // Track in analytics
        analytics.track(AnalyticsEvents.ERROR_OCCURRED, {
            errorId: report.id,
            errorName: error.name,
            errorMessage: error.message,
            category: categorized.category,
            severity: inferredSeverity,
            fingerprint,
            component: context?.component,
            action: context?.action,
        });

        // Add error breadcrumb
        this.addBreadcrumb(
            BreadcrumbCategory.ERROR,
            `${error.name}: ${error.message}`,
            { category: categorized.category, severity: inferredSeverity },
            BreadcrumbLevel.ERROR
        );

        return report.id;
    }

    /**
     * Capture an exception with custom message
     */
    captureException(
        message: string,
        context?: Partial<ErrorContext>,
        severity?: ErrorSeverity
    ): string | null {
        const error = new Error(message);
        error.name = 'CapturedError';
        return this.captureError(error, context, severity);
    }

    /**
     * Add context to all future errors
     */
    setContext(key: string, value: unknown): void {
        // This could be stored globally and merged into all error contexts
    }

    /**
     * Add a breadcrumb
     */
    addBreadcrumb(
        category: BreadcrumbCategory,
        message: string,
        data?: Record<string, unknown>,
        level: BreadcrumbLevel = BreadcrumbLevel.INFO
    ): void {
        if (!this.config.enabled) return;

        const breadcrumb: Breadcrumb = {
            timestamp: Date.now(),
            category,
            message,
            data,
            level,
        };

        this.breadcrumbs.push(breadcrumb);

        // Trim old breadcrumbs
        if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }
    }

    /**
     * Enrich context with additional information
     */
    private enrichContext(context?: Partial<ErrorContext>): ErrorContext {
        const sessionInfo = analytics.getSessionInfo();

        const enriched: ErrorContext = {
            timestamp: Date.now(),
            ...context,
            sessionId: sessionInfo.sessionId,
            userId: sessionInfo.userId || undefined,
        };

        if (typeof window !== 'undefined') {
            enriched.url = window.location.href;
            enriched.userAgent = navigator.userAgent;
            enriched.viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
            };
        }

        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            if (memory) {
                enriched.memory = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                };
            }
        }

        return enriched;
    }

    /**
     * Infer severity from error category
     */
    private inferSeverity(category: ErrorCategory): ErrorSeverity {
        switch (category) {
            case ErrorCategory.NETWORK:
                return ErrorSeverity.WARNING;
            case ErrorCategory.RATE_LIMIT:
                return ErrorSeverity.WARNING;
            case ErrorCategory.VALIDATION:
                return ErrorSeverity.INFO;
            case ErrorCategory.AUTHENTICATION:
                return ErrorSeverity.WARNING;
            case ErrorCategory.AI_GENERATION:
                return ErrorSeverity.ERROR;
            case ErrorCategory.STORAGE:
                return ErrorSeverity.WARNING;
            default:
                return ErrorSeverity.ERROR;
        }
    }

    /**
     * Get all captured errors
     */
    getErrors(): ErrorReport[] {
        return Array.from(this.errors.values());
    }

    /**
     * Get error by ID
     */
    getError(id: string): ErrorReport | undefined {
        return this.errors.get(id);
    }

    /**
     * Clear all errors
     */
    clearErrors(): void {
        this.errors.clear();
        this.errorCounts.clear();
    }

    /**
     * Clear all breadcrumbs
     */
    clearBreadcrumbs(): void {
        this.breadcrumbs = [];
    }

    /**
     * Get breadcrumbs
     */
    getBreadcrumbs(): Breadcrumb[] {
        return [...this.breadcrumbs];
    }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor();

// React hook for error monitoring
import { useCallback, useEffect } from 'react';

export function useErrorMonitor(componentName?: string) {
    useEffect(() => {
        if (componentName) {
            errorMonitor.addBreadcrumb(
                BreadcrumbCategory.UI,
                `Component mounted: ${componentName}`
            );

            return () => {
                errorMonitor.addBreadcrumb(
                    BreadcrumbCategory.UI,
                    `Component unmounted: ${componentName}`
                );
            };
        }
    }, [componentName]);

    const captureError = useCallback((error: Error, action?: string) => {
        return errorMonitor.captureError(error, {
            component: componentName,
            action,
        });
    }, [componentName]);

    const captureException = useCallback((message: string, action?: string) => {
        return errorMonitor.captureException(message, {
            component: componentName,
            action,
        });
    }, [componentName]);

    const addBreadcrumb = useCallback((message: string, data?: Record<string, unknown>) => {
        errorMonitor.addBreadcrumb(
            BreadcrumbCategory.UI,
            message,
            { component: componentName, ...data }
        );
    }, [componentName]);

    return {
        captureError,
        captureException,
        addBreadcrumb,
        getErrors: errorMonitor.getErrors.bind(errorMonitor),
        clearErrors: errorMonitor.clearErrors.bind(errorMonitor),
    };
}

// Hook to initialize error monitoring
export function useErrorMonitorInit(config?: Partial<ErrorMonitoringConfig>) {
    useEffect(() => {
        if (config) {
            Object.assign(errorMonitor, { config: { ...defaultConfig, ...config } });
        }
        errorMonitor.init();

        return () => {
            errorMonitor.destroy();
        };
    }, []);
}

// Utility to wrap async functions with error capture
export function withErrorCapture<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: Partial<ErrorContext>
): T {
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (error) {
            errorMonitor.captureError(error as Error, context);
            throw error;
        }
    }) as T;
}
