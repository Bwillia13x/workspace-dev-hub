/**
 * Analytics Service - Track user interactions and application events
 * 
 * Provides a unified interface for analytics tracking with:
 * - Event tracking with custom properties
 * - User identification and traits
 * - Page view tracking
 * - Performance metrics
 * - Error tracking
 * - Privacy-compliant data collection
 */

// Types for analytics events
export interface AnalyticsEvent {
    name: string;
    properties?: Record<string, unknown>;
    timestamp?: number;
}

export interface UserTraits {
    id?: string;
    email?: string;
    name?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    createdAt?: string;
    [key: string]: unknown;
}

export interface PageViewData {
    path: string;
    title?: string;
    referrer?: string;
    search?: string;
    [key: string]: unknown;
}

export interface PerformanceData {
    name: string;
    duration: number;
    metadata?: Record<string, unknown>;
}

// Event categories for organization
export enum EventCategory {
    DESIGN = 'design',
    AI = 'ai',
    MARKETPLACE = 'marketplace',
    USER = 'user',
    NAVIGATION = 'navigation',
    ERROR = 'error',
    PERFORMANCE = 'performance',
}

// Standard event names for consistency
export const AnalyticsEvents = {
    // Design events
    DESIGN_CREATED: 'design_created',
    DESIGN_EDITED: 'design_edited',
    DESIGN_SAVED: 'design_saved',
    DESIGN_DELETED: 'design_deleted',
    DESIGN_PUBLISHED: 'design_published',
    DESIGN_SHARED: 'design_shared',

    // AI events
    AI_GENERATION_STARTED: 'ai_generation_started',
    AI_GENERATION_COMPLETED: 'ai_generation_completed',
    AI_GENERATION_FAILED: 'ai_generation_failed',
    AI_EDIT_STARTED: 'ai_edit_started',
    AI_EDIT_COMPLETED: 'ai_edit_completed',
    AI_CAD_GENERATED: 'ai_cad_generated',
    AI_TRENDS_SEARCHED: 'ai_trends_searched',

    // Marketplace events
    PRODUCT_VIEWED: 'product_viewed',
    PRODUCT_LIKED: 'product_liked',
    PRODUCT_PURCHASED: 'product_purchased',
    MARKETPLACE_SEARCHED: 'marketplace_searched',
    MARKETPLACE_FILTERED: 'marketplace_filtered',

    // User events
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',
    USER_PROFILE_UPDATED: 'user_profile_updated',

    // Navigation events
    PAGE_VIEWED: 'page_viewed',
    TAB_CHANGED: 'tab_changed',
    MODAL_OPENED: 'modal_opened',
    MODAL_CLOSED: 'modal_closed',

    // Error events
    ERROR_OCCURRED: 'error_occurred',
    ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',
    VALIDATION_ERROR: 'validation_error',

    // Performance events
    PERFORMANCE_METRIC: 'performance_metric',
    WEB_VITAL: 'web_vital',
    API_LATENCY: 'api_latency',
} as const;

// Analytics provider interface for abstraction
interface AnalyticsProvider {
    track(event: AnalyticsEvent): void;
    identify(userId: string, traits?: UserTraits): void;
    page(data: PageViewData): void;
    reset(): void;
}

// Console provider for development
class ConsoleProvider implements AnalyticsProvider {
    private enabled: boolean;

    constructor(enabled = true) {
        this.enabled = enabled;
    }

    track(event: AnalyticsEvent): void {
        if (!this.enabled) return;
        console.log('[Analytics] Track:', event.name, event.properties);
    }

    identify(userId: string, traits?: UserTraits): void {
        if (!this.enabled) return;
        console.log('[Analytics] Identify:', userId, traits);
    }

    page(data: PageViewData): void {
        if (!this.enabled) return;
        console.log('[Analytics] Page:', data.path, data.title);
    }

    reset(): void {
        if (!this.enabled) return;
        console.log('[Analytics] Reset');
    }
}

// Local storage provider for offline analytics
class LocalStorageProvider implements AnalyticsProvider {
    private readonly STORAGE_KEY = 'nanofashion_analytics_queue';
    private readonly MAX_QUEUE_SIZE = 100;

    private getQueue(): AnalyticsEvent[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    private saveQueue(queue: AnalyticsEvent[]): void {
        try {
            // Keep only the most recent events
            const trimmedQueue = queue.slice(-this.MAX_QUEUE_SIZE);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedQueue));
        } catch {
            // Storage full, clear old events
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    track(event: AnalyticsEvent): void {
        const queue = this.getQueue();
        queue.push({
            ...event,
            timestamp: event.timestamp || Date.now(),
        });
        this.saveQueue(queue);
    }

    identify(userId: string, traits?: UserTraits): void {
        this.track({
            name: 'identify',
            properties: { userId, ...traits },
        });
    }

    page(data: PageViewData): void {
        this.track({
            name: 'page_view',
            properties: data,
        });
    }

    reset(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    // Get queued events for syncing
    getQueuedEvents(): AnalyticsEvent[] {
        return this.getQueue();
    }

    // Clear queue after successful sync
    clearQueue(): void {
        this.reset();
    }
}

// Analytics configuration
export interface AnalyticsConfig {
    enabled: boolean;
    debug: boolean;
    sampleRate: number; // 0-1, percentage of events to track
    respectDoNotTrack: boolean;
    providers: ('console' | 'localStorage' | 'amplitude')[];
}

const defaultConfig: AnalyticsConfig = {
    enabled: true,
    debug: process.env.NODE_ENV !== 'production',
    sampleRate: 1.0,
    respectDoNotTrack: true,
    providers: process.env.NODE_ENV === 'production'
        ? ['localStorage']
        : ['console', 'localStorage'],
};

// Main Analytics class
class Analytics {
    private config: AnalyticsConfig;
    private providers: AnalyticsProvider[] = [];
    private userId: string | null = null;
    private sessionId: string;
    private sessionStartTime: number;

    constructor(config: Partial<AnalyticsConfig> = {}) {
        this.config = { ...defaultConfig, ...config };
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();
        this.initializeProviders();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private initializeProviders(): void {
        if (!this.config.enabled) return;

        for (const provider of this.config.providers) {
            switch (provider) {
                case 'console':
                    this.providers.push(new ConsoleProvider(this.config.debug));
                    break;
                case 'localStorage':
                    this.providers.push(new LocalStorageProvider());
                    break;
                // Additional providers can be added here
            }
        }
    }

    private shouldTrack(): boolean {
        if (!this.config.enabled) return false;

        // Respect Do Not Track
        if (this.config.respectDoNotTrack && typeof navigator !== 'undefined') {
            if (navigator.doNotTrack === '1' || (navigator as any).globalPrivacyControl === '1') {
                return false;
            }
        }

        // Sample rate
        if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) {
            return false;
        }

        return true;
    }

    private enrichEvent(event: AnalyticsEvent): AnalyticsEvent {
        return {
            ...event,
            timestamp: event.timestamp || Date.now(),
            properties: {
                ...event.properties,
                sessionId: this.sessionId,
                sessionDuration: Date.now() - this.sessionStartTime,
                userId: this.userId,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                url: typeof window !== 'undefined' ? window.location.href : undefined,
                referrer: typeof document !== 'undefined' ? document.referrer : undefined,
            },
        };
    }

    /**
     * Track a custom event
     */
    track(eventName: string, properties?: Record<string, unknown>): void {
        if (!this.shouldTrack()) return;

        const event = this.enrichEvent({
            name: eventName,
            properties,
        });

        for (const provider of this.providers) {
            try {
                provider.track(event);
            } catch (error) {
                if (this.config.debug) {
                    console.error('[Analytics] Provider error:', error);
                }
            }
        }
    }

    /**
     * Identify a user
     */
    identify(userId: string, traits?: UserTraits): void {
        if (!this.config.enabled) return;

        this.userId = userId;

        for (const provider of this.providers) {
            try {
                provider.identify(userId, traits);
            } catch (error) {
                if (this.config.debug) {
                    console.error('[Analytics] Identify error:', error);
                }
            }
        }
    }

    /**
     * Track a page view
     */
    page(path?: string, title?: string): void {
        if (!this.shouldTrack()) return;

        const data: PageViewData = {
            path: path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
            title: title || (typeof document !== 'undefined' ? document.title : undefined),
            referrer: typeof document !== 'undefined' ? document.referrer : undefined,
            search: typeof window !== 'undefined' ? window.location.search : undefined,
        };

        for (const provider of this.providers) {
            try {
                provider.page(data);
            } catch (error) {
                if (this.config.debug) {
                    console.error('[Analytics] Page error:', error);
                }
            }
        }

        // Also track as an event
        this.track(AnalyticsEvents.PAGE_VIEWED, data);
    }

    /**
     * Track performance metrics
     */
    trackPerformance(name: string, duration: number, metadata?: Record<string, unknown>): void {
        this.track(AnalyticsEvents.PERFORMANCE_METRIC, {
            metricName: name,
            duration,
            ...metadata,
        });
    }

    /**
     * Track errors
     */
    trackError(error: Error, context?: Record<string, unknown>): void {
        this.track(AnalyticsEvents.ERROR_OCCURRED, {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            ...context,
        });
    }

    /**
     * Track AI generation events
     */
    trackAIGeneration(type: 'concept' | 'edit' | 'cad' | 'trends', success: boolean, duration?: number, metadata?: Record<string, unknown>): void {
        const eventMap = {
            concept: success ? AnalyticsEvents.AI_GENERATION_COMPLETED : AnalyticsEvents.AI_GENERATION_FAILED,
            edit: success ? AnalyticsEvents.AI_EDIT_COMPLETED : AnalyticsEvents.AI_GENERATION_FAILED,
            cad: AnalyticsEvents.AI_CAD_GENERATED,
            trends: AnalyticsEvents.AI_TRENDS_SEARCHED,
        };

        this.track(eventMap[type], {
            aiType: type,
            success,
            duration,
            ...metadata,
        });
    }

    /**
     * Track design actions
     */
    trackDesign(action: 'created' | 'edited' | 'saved' | 'deleted' | 'published' | 'shared', metadata?: Record<string, unknown>): void {
        const eventMap = {
            created: AnalyticsEvents.DESIGN_CREATED,
            edited: AnalyticsEvents.DESIGN_EDITED,
            saved: AnalyticsEvents.DESIGN_SAVED,
            deleted: AnalyticsEvents.DESIGN_DELETED,
            published: AnalyticsEvents.DESIGN_PUBLISHED,
            shared: AnalyticsEvents.DESIGN_SHARED,
        };

        this.track(eventMap[action], metadata);
    }

    /**
     * Reset analytics (e.g., on logout)
     */
    reset(): void {
        this.userId = null;
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();

        for (const provider of this.providers) {
            try {
                provider.reset();
            } catch (error) {
                if (this.config.debug) {
                    console.error('[Analytics] Reset error:', error);
                }
            }
        }
    }

    /**
     * Get current session info
     */
    getSessionInfo(): { sessionId: string; duration: number; userId: string | null } {
        return {
            sessionId: this.sessionId,
            duration: Date.now() - this.sessionStartTime,
            userId: this.userId,
        };
    }

    /**
     * Update configuration
     */
    configure(config: Partial<AnalyticsConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Check if analytics is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }
}

// Singleton instance
export const analytics = new Analytics();

// React hook for analytics
import { useCallback, useEffect, useRef } from 'react';

export function useAnalytics() {
    return {
        track: analytics.track.bind(analytics),
        identify: analytics.identify.bind(analytics),
        page: analytics.page.bind(analytics),
        trackError: analytics.trackError.bind(analytics),
        trackPerformance: analytics.trackPerformance.bind(analytics),
        trackAIGeneration: analytics.trackAIGeneration.bind(analytics),
        trackDesign: analytics.trackDesign.bind(analytics),
        reset: analytics.reset.bind(analytics),
        getSessionInfo: analytics.getSessionInfo.bind(analytics),
    };
}

// Hook to track page views automatically
export function usePageTracking(pageName?: string) {
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            analytics.page(undefined, pageName);
            isInitialMount.current = false;
        }
    }, [pageName]);
}

// Hook to track component mount/unmount timing
export function useComponentTiming(componentName: string) {
    const mountTime = useRef(Date.now());

    useEffect(() => {
        const startTime = mountTime.current;

        return () => {
            const duration = Date.now() - startTime;
            analytics.trackPerformance(`${componentName}_lifetime`, duration, {
                component: componentName,
            });
        };
    }, [componentName]);
}

// Hook to track user interactions
export function useInteractionTracking() {
    const trackClick = useCallback((elementName: string, metadata?: Record<string, unknown>) => {
        analytics.track('element_clicked', {
            element: elementName,
            ...metadata,
        });
    }, []);

    const trackHover = useCallback((elementName: string, duration: number) => {
        analytics.track('element_hovered', {
            element: elementName,
            duration,
        });
    }, []);

    const trackScroll = useCallback((percentage: number, context?: string) => {
        analytics.track('scroll_depth', {
            percentage,
            context,
        });
    }, []);

    return { trackClick, trackHover, trackScroll };
}

// Export types and utilities
export type { AnalyticsProvider };
export { ConsoleProvider, LocalStorageProvider };
