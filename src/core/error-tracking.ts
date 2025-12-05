/**
 * Error Tracking Service
 * 
 * Centralized error reporting with support for multiple providers.
 * Currently supports console logging with optional Sentry integration.
 */

export interface ErrorTrackingConfig {
    /** Sentry DSN (Data Source Name) */
    sentryDsn?: string;
    /** Environment (development, staging, production) */
    environment: string;
    /** Release version */
    release?: string;
    /** Enable console logging */
    enableConsole: boolean;
    /** Sample rate for performance monitoring (0-1) */
    sampleRate?: number;
}

interface ErrorContext {
    /** Component or module where error occurred */
    component?: string;
    /** User action that triggered the error */
    action?: string;
    /** Additional metadata */
    extra?: Record<string, unknown>;
    /** User information (anonymized) */
    user?: {
        id?: string;
        email?: string;
    };
    /** Tags for filtering */
    tags?: Record<string, string>;
}

interface BreadcrumbData {
    /** Category of the breadcrumb */
    category: string;
    /** Message describing the action */
    message: string;
    /** Additional data */
    data?: Record<string, unknown>;
    /** Severity level */
    level?: 'debug' | 'info' | 'warning' | 'error';
}

// In-memory breadcrumb storage
const breadcrumbs: BreadcrumbData[] = [];
const MAX_BREADCRUMBS = 50;

let config: ErrorTrackingConfig = {
    environment: import.meta.env?.MODE || 'development',
    enableConsole: true,
};

/**
 * Initialize error tracking
 */
export function initErrorTracking(options: Partial<ErrorTrackingConfig> = {}): void {
    config = { ...config, ...options };

    // Check for Sentry DSN in environment
    const sentryDsn = options.sentryDsn || import.meta.env?.VITE_SENTRY_DSN;

    if (sentryDsn && config.environment === 'production') {
        // Sentry would be initialized here
        // Example: Sentry.init({ dsn: sentryDsn, environment: config.environment })
        console.info('[ErrorTracking] Sentry integration ready (DSN configured)');
    }

    // Global error handler
    window.addEventListener('error', (event) => {
        captureException(event.error || new Error(event.message), {
            component: 'window',
            action: 'unhandledError',
            extra: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            },
        });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));

        captureException(error, {
            component: 'window',
            action: 'unhandledRejection',
        });
    });

    console.info('[ErrorTracking] Initialized for environment:', config.environment);
}

/**
 * Capture and report an exception
 */
export function captureException(error: Error, context?: ErrorContext): void {
    // Log to console in development
    if (config.enableConsole) {
        console.error('[ErrorTracking] Exception:', error);
        if (context) {
            console.error('[ErrorTracking] Context:', context);
        }
        if (breadcrumbs.length > 0) {
            console.debug('[ErrorTracking] Breadcrumbs:', breadcrumbs);
        }
    }

    // In production, send to Sentry
    // Sentry.captureException(error, { extra: context?.extra, tags: context?.tags });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
): void {
    if (config.enableConsole) {
        const logFn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.info;
        logFn(`[ErrorTracking] ${level.toUpperCase()}:`, message, context);
    }

    // Sentry.captureMessage(message, level);
}

/**
 * Add a breadcrumb for debugging context
 */
export function addBreadcrumb(data: BreadcrumbData): void {
    breadcrumbs.push({
        ...data,
        level: data.level || 'info',
    });

    // Keep breadcrumbs under limit
    if (breadcrumbs.length > MAX_BREADCRUMBS) {
        breadcrumbs.shift();
    }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id?: string; email?: string } | null): void {
    if (user) {
        addBreadcrumb({
            category: 'auth',
            message: 'User context updated',
            data: { userId: user.id },
        });
    }
    // Sentry.setUser(user);
}

/**
 * Add tags for filtering errors
 */
export function setTags(tags: Record<string, string>): void {
    // Sentry.setTags(tags);
}

/**
 * Create a performance transaction
 */
export function startTransaction(name: string, op: string): { finish: () => void } {
    const start = performance.now();

    addBreadcrumb({
        category: 'performance',
        message: `Transaction started: ${name}`,
        data: { op },
    });

    return {
        finish: () => {
            const duration = performance.now() - start;
            addBreadcrumb({
                category: 'performance',
                message: `Transaction finished: ${name}`,
                data: { op, duration: `${duration.toFixed(2)}ms` },
            });
        },
    };
}

/**
 * Track a user action
 */
export function trackAction(action: string, data?: Record<string, unknown>): void {
    addBreadcrumb({
        category: 'user',
        message: action,
        data,
        level: 'info',
    });
}

/**
 * Get all breadcrumbs (for debugging)
 */
export function getBreadcrumbs(): BreadcrumbData[] {
    return [...breadcrumbs];
}

/**
 * Clear breadcrumbs
 */
export function clearBreadcrumbs(): void {
    breadcrumbs.length = 0;
}

// Export a default instance check
export const isErrorTrackingEnabled = (): boolean => {
    return !!config.sentryDsn || config.enableConsole;
};
