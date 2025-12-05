/**
 * Performance Monitoring Utilities
 * 
 * Provides tools for measuring and reporting application performance
 * including Web Vitals, custom metrics, and performance marks.
 */

/**
 * Performance metric types
 */
export type MetricName =
    | 'FCP'  // First Contentful Paint
    | 'LCP'  // Largest Contentful Paint
    | 'FID'  // First Input Delay
    | 'CLS'  // Cumulative Layout Shift
    | 'TTFB' // Time to First Byte
    | 'INP'  // Interaction to Next Paint
    | 'custom';

export interface PerformanceMetric {
    name: MetricName | string;
    value: number;
    unit: 'ms' | 's' | 'score' | 'count' | 'bytes';
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
    metrics: PerformanceMetric[];
    sessionId: string;
    url: string;
    userAgent: string;
    timestamp: number;
}

/**
 * Performance observer callback
 */
type MetricCallback = (metric: PerformanceMetric) => void;

/**
 * Registered metric callbacks
 */
const metricCallbacks: MetricCallback[] = [];

/**
 * Collected metrics for the current session
 */
const collectedMetrics: PerformanceMetric[] = [];

/**
 * Session ID for correlating metrics
 */
const sessionId = generateSessionId();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Register a callback to receive performance metrics.
 * 
 * @param callback - Function to call when a metric is recorded
 * @returns Unsubscribe function
 */
export function onMetric(callback: MetricCallback): () => void {
    metricCallbacks.push(callback);
    return () => {
        const index = metricCallbacks.indexOf(callback);
        if (index > -1) {
            metricCallbacks.splice(index, 1);
        }
    };
}

/**
 * Record a performance metric.
 * 
 * @param name - Metric name
 * @param value - Metric value
 * @param unit - Unit of measurement
 * @param metadata - Optional additional data
 */
export function recordMetric(
    name: MetricName | string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    metadata?: Record<string, unknown>
): void {
    const metric: PerformanceMetric = {
        name,
        value,
        unit,
        timestamp: Date.now(),
        metadata,
    };

    collectedMetrics.push(metric);

    // Notify all registered callbacks
    metricCallbacks.forEach(callback => {
        try {
            callback(metric);
        } catch (error) {
            console.error('Error in metric callback:', error);
        }
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
        console.debug(`[Performance] ${name}: ${value}${unit}`, metadata || '');
    }
}

/**
 * Mark the start of a performance measurement.
 * 
 * @param markName - Unique name for the mark
 */
export function markStart(markName: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark(`${markName}-start`);
    }
}

/**
 * Mark the end of a performance measurement and record the duration.
 * 
 * @param markName - Name used in markStart
 * @param metadata - Optional additional data
 * @returns Duration in milliseconds, or -1 if start mark not found
 */
export function markEnd(markName: string, metadata?: Record<string, unknown>): number {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
        const startMark = `${markName}-start`;
        const endMark = `${markName}-end`;

        performance.mark(endMark);

        try {
            const measure = performance.measure(markName, startMark, endMark);
            const duration = measure.duration;

            recordMetric(markName, duration, 'ms', metadata);

            // Clean up marks
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
            performance.clearMeasures(markName);

            return duration;
        } catch (error) {
            // Start mark not found
            return -1;
        }
    }
    return -1;
}

/**
 * Measure the duration of an async operation.
 * 
 * @param name - Name for the metric
 * @param operation - Async function to measure
 * @param metadata - Optional additional data
 * @returns Result of the operation
 */
export async function measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
): Promise<T> {
    const startTime = performance.now();

    try {
        const result = await operation();
        const duration = performance.now() - startTime;
        recordMetric(name, duration, 'ms', { ...metadata, success: true });
        return result;
    } catch (error) {
        const duration = performance.now() - startTime;
        recordMetric(name, duration, 'ms', {
            ...metadata,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Measure the duration of a sync operation.
 * 
 * @param name - Name for the metric
 * @param operation - Function to measure
 * @param metadata - Optional additional data
 * @returns Result of the operation
 */
export function measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, unknown>
): T {
    const startTime = performance.now();

    try {
        const result = operation();
        const duration = performance.now() - startTime;
        recordMetric(name, duration, 'ms', { ...metadata, success: true });
        return result;
    } catch (error) {
        const duration = performance.now() - startTime;
        recordMetric(name, duration, 'ms', {
            ...metadata,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Get the current performance report.
 * 
 * @returns Performance report with all collected metrics
 */
export function getPerformanceReport(): PerformanceReport {
    return {
        metrics: [...collectedMetrics],
        sessionId,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: Date.now(),
    };
}

/**
 * Clear all collected metrics.
 */
export function clearMetrics(): void {
    collectedMetrics.length = 0;
}

/**
 * Initialize Web Vitals monitoring.
 * Note: Requires the web-vitals library for full functionality.
 */
export function initWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Use PerformanceObserver for basic metrics
    if ('PerformanceObserver' in window) {
        // First Contentful Paint
        try {
            const paintObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        recordMetric('FCP', entry.startTime, 'ms');
                    }
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
            // Paint observation not supported
        }

        // Largest Contentful Paint
        try {
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                    recordMetric('LCP', lastEntry.startTime, 'ms');
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            // LCP observation not supported
        }

        // First Input Delay
        try {
            const fidObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    // Cast to PerformanceEventTiming which has processingStart
                    const eventEntry = entry as PerformanceEventTiming;
                    if (eventEntry.processingStart) {
                        recordMetric('FID', eventEntry.processingStart - entry.startTime, 'ms');
                    }
                }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
            // FID observation not supported
        }

        // Cumulative Layout Shift
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    // Type assertion for layout-shift entries
                    const layoutShiftEntry = entry as PerformanceEntry & {
                        hadRecentInput?: boolean;
                        value?: number;
                    };
                    if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
                        clsValue += layoutShiftEntry.value;
                        recordMetric('CLS', clsValue, 'score');
                    }
                }
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
            // CLS observation not supported
        }
    }

    // Time to First Byte
    if (typeof window !== 'undefined' && window.performance?.timing) {
        window.addEventListener('load', () => {
            const timing = window.performance.timing;
            const ttfb = timing.responseStart - timing.requestStart;
            if (ttfb > 0) {
                recordMetric('TTFB', ttfb, 'ms');
            }
        });
    }
}

/**
 * Performance thresholds based on Web Vitals recommendations
 */
export const PerformanceThresholds = {
    FCP: { good: 1800, needsImprovement: 3000 }, // ms
    LCP: { good: 2500, needsImprovement: 4000 }, // ms
    FID: { good: 100, needsImprovement: 300 },   // ms
    CLS: { good: 0.1, needsImprovement: 0.25 },  // score
    TTFB: { good: 800, needsImprovement: 1800 }, // ms
    INP: { good: 200, needsImprovement: 500 },   // ms
} as const;

/**
 * Rate a metric value based on Web Vitals thresholds.
 * 
 * @param name - Metric name
 * @param value - Metric value
 * @returns Rating: 'good', 'needs-improvement', or 'poor'
 */
export function rateMetric(
    name: keyof typeof PerformanceThresholds,
    value: number
): 'good' | 'needs-improvement' | 'poor' {
    const threshold = PerformanceThresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
}

/**
 * Get memory usage if available.
 * Note: Only available in Chrome with the --enable-precise-memory-info flag.
 * 
 * @returns Memory info or null if not available
 */
export function getMemoryUsage(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
} | null {
    if (typeof performance !== 'undefined') {
        const perfWithMemory = performance as Performance & {
            memory?: {
                usedJSHeapSize: number;
                totalJSHeapSize: number;
                jsHeapSizeLimit: number;
            };
        };

        if (perfWithMemory.memory) {
            return {
                usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
                totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
                jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
            };
        }
    }
    return null;
}

/**
 * Format bytes into a human-readable string.
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
