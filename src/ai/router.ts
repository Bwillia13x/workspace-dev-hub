/**
 * AI Model Router
 * 
 * Intelligent routing layer that selects the best AI provider
 * based on task type, availability, cost, and quality requirements.
 * Implements automatic failover when providers are unavailable.
 */

import {
    AIProvider,
    IAIProvider,
    TaskType,
    RouterConfig,
    RoutingDecision,
    GenerationOptions,
    EditOptions,
    CADOptions,
    GenerationResult,
    CADResult,
    ProviderHealth,
    TrendResult,
} from './types';
import { GeminiProvider, GeminiProviderConfig } from './providers/gemini';
import { ErrorCategory } from '../core/errors';
import { getRateLimiter, RateLimitError, type RateLimitOperation } from '../core/rate-limiter';

/**
 * Provider registration entry
 */
interface ProviderEntry {
    provider: IAIProvider;
    priority: number;
    enabled: boolean;
    health: ProviderHealth | null;
}

/**
 * Default router configuration
 */
const DEFAULT_ROUTER_CONFIG: RouterConfig = {
    defaultProvider: AIProvider.GEMINI,
    fallbackProviders: [],
    maxRetries: 2,
    timeout: 60000,
    enableFailover: true,
    costOptimization: false,
};

/**
 * Model Router for multi-provider AI operations
 */
export class ModelRouter {
    private readonly providers: Map<AIProvider, ProviderEntry> = new Map();
    private readonly config: RouterConfig;
    private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: Partial<RouterConfig> = {}) {
        this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    }

    /**
     * Register a provider with the router
     */
    registerProvider(
        provider: IAIProvider,
        options: { priority?: number; enabled?: boolean } = {}
    ): void {
        this.providers.set(provider.provider, {
            provider,
            priority: options.priority ?? 100,
            enabled: options.enabled ?? true,
            health: null,
        });
    }

    /**
     * Initialize the router with Gemini provider
     */
    static createWithGemini(
        geminiConfig: GeminiProviderConfig,
        routerConfig?: Partial<RouterConfig>
    ): ModelRouter {
        const router = new ModelRouter(routerConfig);
        const gemini = new GeminiProvider(geminiConfig);
        router.registerProvider(gemini, { priority: 100 });
        return router;
    }

    /**
     * Get a specific provider
     */
    getProvider(providerId: AIProvider): IAIProvider | undefined {
        return this.providers.get(providerId)?.provider;
    }

    /**
     * Get all registered providers
     */
    getProviders(): AIProvider[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Enable or disable a provider
     */
    setProviderEnabled(providerId: AIProvider, enabled: boolean): void {
        const entry = this.providers.get(providerId);
        if (entry) {
            entry.enabled = enabled;
        }
    }

    /**
     * Check health of all providers
     */
    async checkAllHealth(): Promise<Map<AIProvider, ProviderHealth>> {
        const results = new Map<AIProvider, ProviderHealth>();

        const healthChecks = Array.from(this.providers.entries()).map(
            async ([id, entry]) => {
                try {
                    const health = await entry.provider.checkHealth();
                    entry.health = health;
                    results.set(id, health);
                } catch (error) {
                    const health: ProviderHealth = {
                        provider: id,
                        available: false,
                        lastError: error instanceof Error ? error.message : 'Unknown error',
                        lastChecked: Date.now(),
                    };
                    entry.health = health;
                    results.set(id, health);
                }
            }
        );

        await Promise.all(healthChecks);
        return results;
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks(intervalMs: number = 60000): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // Initial check
        this.checkAllHealth();

        // Periodic checks
        this.healthCheckInterval = setInterval(() => {
            this.checkAllHealth();
        }, intervalMs);
    }

    /**
     * Stop periodic health checks
     */
    stopHealthChecks(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Select the best provider for a task
     */
    selectProvider(
        task: TaskType,
        options?: { preferredProvider?: AIProvider; costSensitive?: boolean }
    ): RoutingDecision {
        const candidates: Array<{ entry: ProviderEntry; score: number }> = [];

        for (const [, entry] of this.providers) {
            if (!entry.enabled) continue;
            if (!entry.provider.supportsTask(task)) continue;

            // Check health if available
            if (entry.health && !entry.health.available) continue;

            let score = entry.priority;

            // Boost preferred provider
            if (options?.preferredProvider === entry.provider.provider) {
                score += 50;
            }

            // Adjust for cost if cost-sensitive
            if (options?.costSensitive || this.config.costOptimization) {
                const cost = entry.provider.getEstimatedCost(task);
                score -= cost * 100; // Penalize higher cost
            }

            // Boost based on latency if we have health data
            if (entry.health?.latency) {
                score -= entry.health.latency / 100; // Penalize higher latency
            }

            candidates.push({ entry, score });
        }

        // Sort by score (descending)
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length === 0) {
            throw new Error(`No provider available for task: ${task}`);
        }

        const selected = candidates[0];
        const fallbacks = candidates.slice(1).map(c => c.entry.provider.provider);

        return {
            provider: selected.entry.provider.provider,
            reason: this.getSelectionReason(selected.entry, options),
            estimatedCost: selected.entry.provider.getEstimatedCost(task),
            fallbacks: this.config.enableFailover ? fallbacks : [],
        };
    }

    /**
     * Generate concept with automatic provider selection
     */
    async generateConcept(
        prompt: string,
        options?: GenerationOptions & { preferredProvider?: AIProvider }
    ): Promise<GenerationResult> {
        // Apply rate limiting
        this.checkRateLimit('conceptGeneration');

        const decision = this.selectProvider(TaskType.CONCEPT_GENERATION, {
            preferredProvider: options?.preferredProvider,
        });

        return this.executeWithFailover(
            decision,
            async (provider) => provider.generateConcept(prompt, options)
        );
    }

    /**
     * Edit concept with automatic provider selection
     */
    async editConcept(
        imageBase64: string,
        instruction: string,
        options?: EditOptions & { preferredProvider?: AIProvider }
    ): Promise<GenerationResult> {
        // Apply rate limiting
        this.checkRateLimit('imageEdit');

        const decision = this.selectProvider(TaskType.IMAGE_EDITING, {
            preferredProvider: options?.preferredProvider,
        });

        return this.executeWithFailover(
            decision,
            async (provider) => provider.editConcept(imageBase64, instruction, options)
        );
    }

    /**
     * Generate CAD with automatic provider selection
     */
    async generateCAD(
        imageBase64: string,
        options?: CADOptions & { preferredProvider?: AIProvider }
    ): Promise<CADResult> {
        // Apply rate limiting
        this.checkRateLimit('cadGeneration');

        const decision = this.selectProvider(TaskType.CAD_GENERATION, {
            preferredProvider: options?.preferredProvider,
        });

        return this.executeWithFailover(
            decision,
            async (provider) => provider.generateCAD(imageBase64, options)
        );
    }

    /**
     * Get fashion trends (Gemini-specific due to Search grounding)
     */
    async getFashionTrends(topic: string): Promise<TrendResult> {
        // Apply rate limiting
        this.checkRateLimit('trendSearch');

        const gemini = this.getProvider(AIProvider.GEMINI) as GeminiProvider | undefined;

        if (!gemini) {
            throw new Error('Fashion trends require Gemini provider');
        }

        return gemini.getFashionTrends(topic);
    }

    /**
     * Check rate limit for an operation, throws if limit exceeded
     */
    private checkRateLimit(operation: RateLimitOperation): void {
        const limiter = getRateLimiter(operation);
        if (!limiter.tryConsume()) {
            const retryAfter = limiter.getTimeUntilNextToken();
            throw new RateLimitError(operation, retryAfter);
        }
    }

    /**
     * Execute operation with automatic failover
     */
    private async executeWithFailover<T>(
        decision: RoutingDecision,
        operation: (provider: IAIProvider) => Promise<T>
    ): Promise<T> {
        const providersToTry = [decision.provider, ...decision.fallbacks];
        let lastError: Error | null = null;

        for (const providerId of providersToTry) {
            const entry = this.providers.get(providerId);
            if (!entry?.enabled) continue;

            try {
                const result = await Promise.race([
                    operation(entry.provider),
                    this.createTimeoutPromise<T>(),
                ]);

                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`[ModelRouter] Provider ${providerId} failed:`, lastError.message);

                // Mark provider as potentially unhealthy
                if (entry.health) {
                    entry.health.available = false;
                    entry.health.lastError = lastError.message;
                }

                // Continue to next provider if failover is enabled
                if (!this.config.enableFailover) {
                    break;
                }
            }
        }

        throw lastError || new Error('All providers failed');
    }

    /**
     * Create a timeout promise
     */
    private createTimeoutPromise<T>(): Promise<T> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
            }, this.config.timeout);
        });
    }

    /**
     * Generate reason for provider selection
     */
    private getSelectionReason(
        entry: ProviderEntry,
        options?: { preferredProvider?: AIProvider; costSensitive?: boolean }
    ): string {
        const reasons: string[] = [];

        if (options?.preferredProvider === entry.provider.provider) {
            reasons.push('user preference');
        }

        if (entry.priority >= 100) {
            reasons.push('high priority');
        }

        if (entry.health?.latency && entry.health.latency < 100) {
            reasons.push('low latency');
        }

        if (options?.costSensitive || this.config.costOptimization) {
            reasons.push('cost optimized');
        }

        return reasons.length > 0
            ? `Selected for: ${reasons.join(', ')}`
            : 'Default selection';
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopHealthChecks();
        this.providers.clear();
    }
}

/**
 * Default singleton instance factory
 */
let defaultRouter: ModelRouter | null = null;

export function getDefaultRouter(apiKey?: string): ModelRouter {
    if (!defaultRouter && apiKey) {
        defaultRouter = ModelRouter.createWithGemini({ apiKey });
    }

    if (!defaultRouter) {
        throw new Error('Router not initialized. Call with API key first.');
    }

    return defaultRouter;
}

export function resetDefaultRouter(): void {
    if (defaultRouter) {
        defaultRouter.destroy();
        defaultRouter = null;
    }
}
