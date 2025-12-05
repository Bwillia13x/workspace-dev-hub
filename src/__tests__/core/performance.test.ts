/**
 * Tests for Performance Monitoring Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    recordMetric,
    onMetric,
    markStart,
    markEnd,
    measureAsync,
    measureSync,
    getPerformanceReport,
    clearMetrics,
    rateMetric,
    formatBytes,
} from '../../core/performance';

// Import image compression utilities
import {
    extractBase64Data,
    getMimeType,
    calculateBase64Size,
} from '../../core/image-compression';

describe('Performance Monitoring', () => {
    beforeEach(() => {
        clearMetrics();
    });

    describe('recordMetric', () => {
        it('should record a metric', () => {
            recordMetric('test-metric', 100, 'ms');

            const report = getPerformanceReport();
            expect(report.metrics).toHaveLength(1);
            expect(report.metrics[0].name).toBe('test-metric');
            expect(report.metrics[0].value).toBe(100);
            expect(report.metrics[0].unit).toBe('ms');
        });

        it('should record metric with metadata', () => {
            recordMetric('test-metric', 50, 'ms', { context: 'test' });

            const report = getPerformanceReport();
            expect(report.metrics[0].metadata).toEqual({ context: 'test' });
        });

        it('should use ms as default unit', () => {
            recordMetric('test-metric', 100);

            const report = getPerformanceReport();
            expect(report.metrics[0].unit).toBe('ms');
        });
    });

    describe('onMetric', () => {
        it('should notify callback when metric is recorded', () => {
            const callback = vi.fn();
            const unsubscribe = onMetric(callback);

            recordMetric('test', 100, 'ms');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'test',
                    value: 100,
                    unit: 'ms',
                })
            );

            unsubscribe();
        });

        it('should not notify after unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = onMetric(callback);

            unsubscribe();
            recordMetric('test', 100, 'ms');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should support multiple callbacks', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            const unsub1 = onMetric(callback1);
            const unsub2 = onMetric(callback2);

            recordMetric('test', 100, 'ms');

            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);

            unsub1();
            unsub2();
        });
    });

    describe('markStart and markEnd', () => {
        it('should measure duration between marks', () => {
            markStart('test-operation');

            // Simulate some time passing
            const startTime = performance.now();
            while (performance.now() - startTime < 5) {
                // Small busy wait
            }

            const duration = markEnd('test-operation');

            expect(duration).toBeGreaterThanOrEqual(0);

            const report = getPerformanceReport();
            expect(report.metrics.some(m => m.name === 'test-operation')).toBe(true);
        });

        it('should return -1 if start mark not found', () => {
            const duration = markEnd('nonexistent-mark');
            expect(duration).toBe(-1);
        });
    });

    describe('measureAsync', () => {
        it('should measure async operation duration', async () => {
            const result = await measureAsync(
                'async-operation',
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'done';
                }
            );

            expect(result).toBe('done');

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'async-operation');
            expect(metric).toBeDefined();
            // Use lenient threshold due to timer resolution variance
            expect(metric!.value).toBeGreaterThanOrEqual(8);
            expect(metric!.metadata?.success).toBe(true);
        });

        it('should record failure on error', async () => {
            await expect(
                measureAsync('failing-operation', async () => {
                    throw new Error('Test error');
                })
            ).rejects.toThrow('Test error');

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'failing-operation');
            expect(metric).toBeDefined();
            expect(metric!.metadata?.success).toBe(false);
            expect(metric!.metadata?.error).toBe('Test error');
        });
    });

    describe('measureSync', () => {
        it('should measure sync operation duration', () => {
            const result = measureSync('sync-operation', () => {
                let sum = 0;
                for (let i = 0; i < 1000; i++) sum += i;
                return sum;
            });

            expect(result).toBe(499500);

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'sync-operation');
            expect(metric).toBeDefined();
            expect(metric!.metadata?.success).toBe(true);
        });

        it('should record failure on error', () => {
            expect(() =>
                measureSync('failing-sync', () => {
                    throw new Error('Sync error');
                })
            ).toThrow('Sync error');

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'failing-sync');
            expect(metric!.metadata?.success).toBe(false);
        });
    });

    describe('getPerformanceReport', () => {
        it('should include session info', () => {
            const report = getPerformanceReport();

            expect(report.sessionId).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(Array.isArray(report.metrics)).toBe(true);
        });
    });

    describe('clearMetrics', () => {
        it('should clear all collected metrics', () => {
            recordMetric('metric1', 100, 'ms');
            recordMetric('metric2', 200, 'ms');

            expect(getPerformanceReport().metrics).toHaveLength(2);

            clearMetrics();

            expect(getPerformanceReport().metrics).toHaveLength(0);
        });
    });

    describe('rateMetric', () => {
        it('should rate FCP correctly', () => {
            expect(rateMetric('FCP', 1000)).toBe('good');
            expect(rateMetric('FCP', 2500)).toBe('needs-improvement');
            expect(rateMetric('FCP', 4000)).toBe('poor');
        });

        it('should rate LCP correctly', () => {
            expect(rateMetric('LCP', 2000)).toBe('good');
            expect(rateMetric('LCP', 3500)).toBe('needs-improvement');
            expect(rateMetric('LCP', 5000)).toBe('poor');
        });

        it('should rate CLS correctly', () => {
            expect(rateMetric('CLS', 0.05)).toBe('good');
            expect(rateMetric('CLS', 0.2)).toBe('needs-improvement');
            expect(rateMetric('CLS', 0.5)).toBe('poor');
        });
    });

    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(500)).toBe('500 B');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1536)).toBe('1.5 KB');
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1073741824)).toBe('1 GB');
        });

        it('should handle decimal values', () => {
            expect(formatBytes(1500)).toBe('1.46 KB');
            expect(formatBytes(2500000)).toBe('2.38 MB');
        });

        it('should handle very large values', () => {
            expect(formatBytes(5368709120)).toBe('5 GB');
        });
    });

    describe('rateMetric edge cases', () => {
        it('should rate FID correctly', () => {
            expect(rateMetric('FID', 50)).toBe('good');
            expect(rateMetric('FID', 200)).toBe('needs-improvement');
            expect(rateMetric('FID', 500)).toBe('poor');
        });

        it('should rate TTFB correctly', () => {
            expect(rateMetric('TTFB', 500)).toBe('good');
            expect(rateMetric('TTFB', 1000)).toBe('needs-improvement');
            expect(rateMetric('TTFB', 2500)).toBe('poor');
        });

        it('should rate INP correctly', () => {
            expect(rateMetric('INP', 100)).toBe('good');
            expect(rateMetric('INP', 400)).toBe('needs-improvement');
            expect(rateMetric('INP', 800)).toBe('poor');
        });

        it('should handle boundary values', () => {
            // Exactly at threshold should be 'good'
            expect(rateMetric('FCP', 1800)).toBe('good');
            expect(rateMetric('LCP', 2500)).toBe('good');
            expect(rateMetric('CLS', 0.1)).toBe('good');
        });
    });

    describe('measureAsync with metadata', () => {
        it('should include custom metadata in success case', async () => {
            await measureAsync(
                'test-with-meta',
                async () => 'result',
                { component: 'Button', action: 'click' }
            );

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'test-with-meta');
            expect(metric?.metadata?.component).toBe('Button');
            expect(metric?.metadata?.action).toBe('click');
            expect(metric?.metadata?.success).toBe(true);
        });

        it('should include custom metadata in error case', async () => {
            await expect(
                measureAsync(
                    'test-error-meta',
                    async () => { throw new Error('fail'); },
                    { component: 'Form' }
                )
            ).rejects.toThrow();

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'test-error-meta');
            expect(metric?.metadata?.component).toBe('Form');
            expect(metric?.metadata?.success).toBe(false);
        });
    });

    describe('measureSync with metadata', () => {
        it('should include custom metadata', () => {
            measureSync(
                'sync-with-meta',
                () => 42,
                { operation: 'calculate' }
            );

            const report = getPerformanceReport();
            const metric = report.metrics.find(m => m.name === 'sync-with-meta');
            expect(metric?.metadata?.operation).toBe('calculate');
        });
    });

    describe('callback error handling', () => {
        it('should continue to other callbacks if one throws', () => {
            const errorCallback = vi.fn(() => { throw new Error('callback error'); });
            const successCallback = vi.fn();

            const unsub1 = onMetric(errorCallback);
            const unsub2 = onMetric(successCallback);

            // Should not throw
            expect(() => recordMetric('test', 100)).not.toThrow();

            expect(errorCallback).toHaveBeenCalled();
            expect(successCallback).toHaveBeenCalled();

            unsub1();
            unsub2();
        });
    });
});

describe('Image Compression Utilities', () => {
    describe('extractBase64Data', () => {
        it('should extract data from data URL', () => {
            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
            expect(extractBase64Data(dataUrl)).toBe('iVBORw0KGgoAAAANSUhEUgAAAAUA');
        });

        it('should return raw base64 unchanged', () => {
            const raw = 'iVBORw0KGgoAAAANSUhEUgAAAAUA';
            expect(extractBase64Data(raw)).toBe(raw);
        });
    });

    describe('getMimeType', () => {
        it('should extract MIME type from data URL', () => {
            expect(getMimeType('data:image/png;base64,abc')).toBe('image/png');
            expect(getMimeType('data:image/jpeg;base64,abc')).toBe('image/jpeg');
            expect(getMimeType('data:application/json;base64,abc')).toBe('application/json');
        });

        it('should return null for raw base64', () => {
            expect(getMimeType('iVBORw0KGgo')).toBeNull();
        });
    });

    describe('calculateBase64Size', () => {
        it('should calculate approximate size', () => {
            // 4 base64 chars = 3 bytes
            const base64 = 'AAAA'; // 4 chars, no padding
            expect(calculateBase64Size(base64)).toBe(3);
        });

        it('should account for padding', () => {
            const withPadding = 'AA=='; // 2 padding chars
            expect(calculateBase64Size(withPadding)).toBe(1);
        });

        it('should handle data URL format', () => {
            const dataUrl = 'data:image/png;base64,AAAA';
            expect(calculateBase64Size(dataUrl)).toBe(3);
        });
    });
});
