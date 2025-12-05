/**
 * Tests for Analytics Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'test-agent',
        doNotTrack: null,
    },
    writable: true,
});

// Mock window
Object.defineProperty(global, 'window', {
    value: {
        location: {
            href: 'http://localhost:3000/studio',
            pathname: '/studio',
            search: '?test=1',
        },
    },
    writable: true,
});

// Mock document
Object.defineProperty(global, 'document', {
    value: {
        title: 'NanoFashion Studio',
        referrer: 'http://localhost:3000',
    },
    writable: true,
});

// Import after mocks are set up
import {
    analytics,
    AnalyticsEvents,
    EventCategory,
    useAnalytics,
    usePageTracking,
    useComponentTiming,
    useInteractionTracking,
    ConsoleProvider,
    LocalStorageProvider,
} from '../../services/analytics';

describe('Analytics Service', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        // Reset console spy
        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('AnalyticsEvents', () => {
        it('should have all design events', () => {
            expect(AnalyticsEvents.DESIGN_CREATED).toBe('design_created');
            expect(AnalyticsEvents.DESIGN_EDITED).toBe('design_edited');
            expect(AnalyticsEvents.DESIGN_SAVED).toBe('design_saved');
            expect(AnalyticsEvents.DESIGN_DELETED).toBe('design_deleted');
            expect(AnalyticsEvents.DESIGN_PUBLISHED).toBe('design_published');
            expect(AnalyticsEvents.DESIGN_SHARED).toBe('design_shared');
        });

        it('should have all AI events', () => {
            expect(AnalyticsEvents.AI_GENERATION_STARTED).toBe('ai_generation_started');
            expect(AnalyticsEvents.AI_GENERATION_COMPLETED).toBe('ai_generation_completed');
            expect(AnalyticsEvents.AI_GENERATION_FAILED).toBe('ai_generation_failed');
            expect(AnalyticsEvents.AI_EDIT_STARTED).toBe('ai_edit_started');
            expect(AnalyticsEvents.AI_EDIT_COMPLETED).toBe('ai_edit_completed');
            expect(AnalyticsEvents.AI_CAD_GENERATED).toBe('ai_cad_generated');
        });

        it('should have all marketplace events', () => {
            expect(AnalyticsEvents.PRODUCT_VIEWED).toBe('product_viewed');
            expect(AnalyticsEvents.PRODUCT_LIKED).toBe('product_liked');
            expect(AnalyticsEvents.PRODUCT_PURCHASED).toBe('product_purchased');
            expect(AnalyticsEvents.MARKETPLACE_SEARCHED).toBe('marketplace_searched');
        });

        it('should have all error events', () => {
            expect(AnalyticsEvents.ERROR_OCCURRED).toBe('error_occurred');
            expect(AnalyticsEvents.ERROR_BOUNDARY_TRIGGERED).toBe('error_boundary_triggered');
            expect(AnalyticsEvents.VALIDATION_ERROR).toBe('validation_error');
        });
    });

    describe('EventCategory', () => {
        it('should have all categories', () => {
            expect(EventCategory.DESIGN).toBe('design');
            expect(EventCategory.AI).toBe('ai');
            expect(EventCategory.MARKETPLACE).toBe('marketplace');
            expect(EventCategory.USER).toBe('user');
            expect(EventCategory.NAVIGATION).toBe('navigation');
            expect(EventCategory.ERROR).toBe('error');
            expect(EventCategory.PERFORMANCE).toBe('performance');
        });
    });

    describe('analytics.track', () => {
        it('should track events with properties', () => {
            analytics.track('test_event', { foo: 'bar' });

            // Should be logged in debug mode
            expect(console.log).toHaveBeenCalled();
        });

        it('should track events without properties', () => {
            analytics.track('simple_event');
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.identify', () => {
        it('should identify users with traits', () => {
            analytics.identify('user_123', {
                email: 'test@example.com',
                plan: 'pro',
            });

            expect(console.log).toHaveBeenCalled();
        });

        it('should identify users without traits', () => {
            analytics.identify('user_456');
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.page', () => {
        it('should track page views', () => {
            analytics.page('/marketplace', 'Marketplace');
            expect(console.log).toHaveBeenCalled();
        });

        it('should track page views with current URL if not provided', () => {
            analytics.page();
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.trackPerformance', () => {
        it('should track performance metrics', () => {
            analytics.trackPerformance('api_call', 150, { endpoint: '/api/generate' });
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.trackError', () => {
        it('should track errors', () => {
            const error = new Error('Test error');
            analytics.trackError(error, { component: 'Studio' });
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.trackAIGeneration', () => {
        it('should track successful AI generation', () => {
            analytics.trackAIGeneration('concept', true, 5000, { prompt: 'test' });
            expect(console.log).toHaveBeenCalled();
        });

        it('should track failed AI generation', () => {
            analytics.trackAIGeneration('edit', false, undefined, { error: 'rate limit' });
            expect(console.log).toHaveBeenCalled();
        });

        it('should track CAD generation', () => {
            analytics.trackAIGeneration('cad', true, 3000);
            expect(console.log).toHaveBeenCalled();
        });

        it('should track trends search', () => {
            analytics.trackAIGeneration('trends', true, 1000, { topic: 'summer fashion' });
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.trackDesign', () => {
        it('should track design creation', () => {
            analytics.trackDesign('created', { name: 'New Design' });
            expect(console.log).toHaveBeenCalled();
        });

        it('should track design edits', () => {
            analytics.trackDesign('edited', { changes: ['color', 'style'] });
            expect(console.log).toHaveBeenCalled();
        });

        it('should track design save', () => {
            analytics.trackDesign('saved');
            expect(console.log).toHaveBeenCalled();
        });

        it('should track design publish', () => {
            analytics.trackDesign('published', { price: 99.99 });
            expect(console.log).toHaveBeenCalled();
        });

        it('should track design share', () => {
            analytics.trackDesign('shared', { method: 'link' });
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('analytics.getSessionInfo', () => {
        it('should return session info', () => {
            const info = analytics.getSessionInfo();

            expect(info).toHaveProperty('sessionId');
            expect(info).toHaveProperty('duration');
            expect(info.sessionId).toMatch(/^session_/);
            expect(typeof info.duration).toBe('number');
        });
    });

    describe('analytics.reset', () => {
        it('should reset analytics state', () => {
            analytics.identify('user_123');
            const beforeInfo = analytics.getSessionInfo();

            analytics.reset();

            const afterInfo = analytics.getSessionInfo();
            expect(afterInfo.userId).toBeNull();
            expect(afterInfo.sessionId).not.toBe(beforeInfo.sessionId);
        });
    });

    describe('analytics.configure', () => {
        it('should update configuration', () => {
            analytics.configure({ debug: false });
            // Configuration is internal, but we can verify by checking if logging stops
        });
    });

    describe('analytics.isEnabled', () => {
        it('should return enabled status', () => {
            expect(typeof analytics.isEnabled()).toBe('boolean');
        });
    });
});

describe('ConsoleProvider', () => {
    it('should log track events when enabled', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const provider = new ConsoleProvider(true);

        provider.track({ name: 'test', properties: { foo: 'bar' } });

        expect(consoleSpy).toHaveBeenCalledWith('[Analytics] Track:', 'test', { foo: 'bar' });
    });

    it('should not log when disabled', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const provider = new ConsoleProvider(false);

        provider.track({ name: 'test' });

        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log identify calls', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const provider = new ConsoleProvider(true);

        provider.identify('user_123', { email: 'test@test.com' });

        expect(consoleSpy).toHaveBeenCalledWith('[Analytics] Identify:', 'user_123', { email: 'test@test.com' });
    });

    it('should log page calls', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const provider = new ConsoleProvider(true);

        provider.page({ path: '/test', title: 'Test Page' });

        expect(consoleSpy).toHaveBeenCalledWith('[Analytics] Page:', '/test', 'Test Page');
    });

    it('should log reset calls', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const provider = new ConsoleProvider(true);

        provider.reset();

        expect(consoleSpy).toHaveBeenCalledWith('[Analytics] Reset');
    });
});

describe('LocalStorageProvider', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should store events in localStorage', () => {
        const provider = new LocalStorageProvider();

        provider.track({ name: 'test_event', properties: { foo: 'bar' } });

        expect(localStorageMock.setItem).toHaveBeenCalled();
        const storedData = localStorageMock.getItem('nanofashion_analytics_queue');
        const parsed = JSON.parse(storedData || '[]');
        expect(parsed.length).toBe(1);
        expect(parsed[0].name).toBe('test_event');
    });

    it('should store identify as an event', () => {
        const provider = new LocalStorageProvider();

        provider.identify('user_123', { email: 'test@test.com' });

        const storedData = localStorageMock.getItem('nanofashion_analytics_queue');
        const parsed = JSON.parse(storedData || '[]');
        expect(parsed.length).toBe(1);
        expect(parsed[0].name).toBe('identify');
        expect(parsed[0].properties.userId).toBe('user_123');
    });

    it('should store page views', () => {
        const provider = new LocalStorageProvider();

        provider.page({ path: '/test', title: 'Test Page' });

        const storedData = localStorageMock.getItem('nanofashion_analytics_queue');
        const parsed = JSON.parse(storedData || '[]');
        expect(parsed.length).toBe(1);
        expect(parsed[0].name).toBe('page_view');
        expect(parsed[0].properties.path).toBe('/test');
    });

    it('should reset queue', () => {
        const provider = new LocalStorageProvider();

        provider.track({ name: 'test' });
        provider.reset();

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('nanofashion_analytics_queue');
    });

    it('should get queued events', () => {
        const provider = new LocalStorageProvider();

        provider.track({ name: 'event1' });
        provider.track({ name: 'event2' });

        const events = provider.getQueuedEvents();
        expect(events.length).toBe(2);
    });

    it('should clear queue', () => {
        const provider = new LocalStorageProvider();

        provider.track({ name: 'test' });
        provider.clearQueue();

        const events = provider.getQueuedEvents();
        expect(events.length).toBe(0);
    });

    it('should add timestamp to events', () => {
        const provider = new LocalStorageProvider();
        const before = Date.now();

        provider.track({ name: 'test' });

        const after = Date.now();
        const events = provider.getQueuedEvents();
        expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });
});

describe('Analytics React Hooks', () => {
    // Note: These are basic structure tests. Full hook testing would require @testing-library/react-hooks
    describe('useAnalytics', () => {
        it('should return analytics methods', () => {
            const result = useAnalytics();

            expect(typeof result.track).toBe('function');
            expect(typeof result.identify).toBe('function');
            expect(typeof result.page).toBe('function');
            expect(typeof result.trackError).toBe('function');
            expect(typeof result.trackPerformance).toBe('function');
            expect(typeof result.trackAIGeneration).toBe('function');
            expect(typeof result.trackDesign).toBe('function');
            expect(typeof result.reset).toBe('function');
            expect(typeof result.getSessionInfo).toBe('function');
        });
    });
});
