/**
 * Tests for Model Router
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    ModelRouter,
    getDefaultRouter,
    resetDefaultRouter,
} from '../../ai/router';
import {
    AIProvider,
    TaskType,
    type IAIProvider,
    type GenerationResult,
    type CADResult,
    type ProviderHealth,
} from '../../ai/types';

// Mock provider for testing
class MockProvider implements IAIProvider {
    readonly provider: AIProvider;
    readonly name: string;

    shouldFail = false;
    latency = 50;
    callCount = 0;

    constructor(providerId: AIProvider, name: string) {
        this.provider = providerId;
        this.name = name;
    }

    async checkHealth(): Promise<ProviderHealth> {
        return {
            provider: this.provider,
            available: !this.shouldFail,
            latency: this.latency,
            lastChecked: Date.now(),
        };
    }

    async generateConcept(): Promise<GenerationResult> {
        this.callCount++;
        if (this.shouldFail) {
            throw new Error(`${this.name} failed`);
        }
        return {
            images: ['mock-base64-image'],
            duration: this.latency,
            provider: this.provider,
            model: 'mock-model',
        };
    }

    async editConcept(): Promise<GenerationResult> {
        this.callCount++;
        if (this.shouldFail) {
            throw new Error(`${this.name} failed`);
        }
        return {
            images: ['mock-edited-image'],
            duration: this.latency,
            provider: this.provider,
            model: 'mock-model',
        };
    }

    async generateCAD(): Promise<CADResult> {
        this.callCount++;
        if (this.shouldFail) {
            throw new Error(`${this.name} failed`);
        }
        return {
            cadImage: 'mock-cad-image',
            materials: '## Bill of Materials\n- Fabric: Cotton',
            provider: this.provider,
            duration: this.latency,
        };
    }

    supportsTask(task: TaskType): boolean {
        return [
            TaskType.CONCEPT_GENERATION,
            TaskType.IMAGE_EDITING,
            TaskType.CAD_GENERATION,
        ].includes(task);
    }

    getEstimatedCost(): number {
        return 0.002;
    }
}

describe('ModelRouter', () => {
    let router: ModelRouter;
    let mockGemini: MockProvider;
    let mockFlux: MockProvider;

    beforeEach(() => {
        router = new ModelRouter();
        mockGemini = new MockProvider(AIProvider.GEMINI, 'Mock Gemini');
        mockFlux = new MockProvider(AIProvider.FLUX, 'Mock Flux');

        router.registerProvider(mockGemini, { priority: 100 });
        router.registerProvider(mockFlux, { priority: 50 });
    });

    afterEach(() => {
        router.destroy();
        resetDefaultRouter();
    });

    describe('registerProvider', () => {
        it('should register providers', () => {
            const providers = router.getProviders();

            expect(providers).toContain(AIProvider.GEMINI);
            expect(providers).toContain(AIProvider.FLUX);
        });

        it('should retrieve registered provider', () => {
            const provider = router.getProvider(AIProvider.GEMINI);

            expect(provider).toBe(mockGemini);
        });
    });

    describe('setProviderEnabled', () => {
        it('should enable/disable providers', () => {
            router.setProviderEnabled(AIProvider.GEMINI, false);

            const decision = router.selectProvider(TaskType.CONCEPT_GENERATION);

            expect(decision.provider).toBe(AIProvider.FLUX);
        });
    });

    describe('checkAllHealth', () => {
        it('should check health of all providers', async () => {
            const health = await router.checkAllHealth();

            expect(health.size).toBe(2);
            expect(health.get(AIProvider.GEMINI)?.available).toBe(true);
            expect(health.get(AIProvider.FLUX)?.available).toBe(true);
        });

        it('should handle provider errors', async () => {
            mockGemini.shouldFail = true;

            const health = await router.checkAllHealth();

            expect(health.get(AIProvider.GEMINI)?.available).toBe(false);
        });
    });

    describe('selectProvider', () => {
        it('should select highest priority provider', () => {
            const decision = router.selectProvider(TaskType.CONCEPT_GENERATION);

            expect(decision.provider).toBe(AIProvider.GEMINI);
        });

        it('should respect preferred provider when priorities are close', () => {
            // Create a router with providers of equal priority
            const equalRouter = new ModelRouter();
            const provider1 = new MockProvider(AIProvider.GEMINI, 'Gemini');
            const provider2 = new MockProvider(AIProvider.FLUX, 'Flux');

            equalRouter.registerProvider(provider1, { priority: 100 });
            equalRouter.registerProvider(provider2, { priority: 100 }); // Same priority

            const decision = equalRouter.selectProvider(TaskType.CONCEPT_GENERATION, {
                preferredProvider: AIProvider.FLUX,
            });

            expect(decision.provider).toBe(AIProvider.FLUX);

            equalRouter.destroy();
        });

        it('should include fallbacks', () => {
            const decision = router.selectProvider(TaskType.CONCEPT_GENERATION);

            expect(decision.fallbacks).toContain(AIProvider.FLUX);
        });

        it('should throw when no provider supports task', () => {
            // Create a provider that doesn't support the task
            const limitedProvider = new MockProvider(AIProvider.STABLE_DIFFUSION, 'Limited');
            limitedProvider.supportsTask = () => false;

            const limitedRouter = new ModelRouter();
            limitedRouter.registerProvider(limitedProvider);

            expect(() => {
                limitedRouter.selectProvider(TaskType.CONCEPT_GENERATION);
            }).toThrow();

            limitedRouter.destroy();
        });
    });

    describe('generateConcept', () => {
        it('should generate concept using selected provider', async () => {
            const result = await router.generateConcept('A red dress');

            expect(result.images).toHaveLength(1);
            expect(result.provider).toBe(AIProvider.GEMINI);
            expect(mockGemini.callCount).toBe(1);
        });

        it('should use preferred provider when priorities are equal', async () => {
            // Create a router with equal priority providers
            const equalRouter = new ModelRouter();
            const geminiMock = new MockProvider(AIProvider.GEMINI, 'Gemini');
            const fluxMock = new MockProvider(AIProvider.FLUX, 'Flux');

            equalRouter.registerProvider(geminiMock, { priority: 100 });
            equalRouter.registerProvider(fluxMock, { priority: 100 });

            const result = await equalRouter.generateConcept('A blue jacket', {
                preferredProvider: AIProvider.FLUX,
            });

            expect(result.provider).toBe(AIProvider.FLUX);
            expect(fluxMock.callCount).toBe(1);

            equalRouter.destroy();
        });
    });

    describe('editConcept', () => {
        it('should edit concept using selected provider', async () => {
            const result = await router.editConcept('base64-image', 'Make it blue');

            expect(result.images).toHaveLength(1);
            expect(result.provider).toBe(AIProvider.GEMINI);
        });
    });

    describe('generateCAD', () => {
        it('should generate CAD using selected provider', async () => {
            const result = await router.generateCAD('base64-image');

            expect(result.cadImage).toBeTruthy();
            expect(result.materials).toContain('Bill of Materials');
        });
    });

    describe('failover', () => {
        it('should failover to next provider on error', async () => {
            mockGemini.shouldFail = true;

            const result = await router.generateConcept('A dress');

            expect(result.provider).toBe(AIProvider.FLUX);
            expect(mockGemini.callCount).toBe(1);
            expect(mockFlux.callCount).toBe(1);
        });

        it('should throw if all providers fail', async () => {
            mockGemini.shouldFail = true;
            mockFlux.shouldFail = true;

            await expect(router.generateConcept('A dress')).rejects.toThrow();
        });

        it('should not failover when disabled', async () => {
            const noFailoverRouter = new ModelRouter({ enableFailover: false });
            const failingProvider = new MockProvider(AIProvider.GEMINI, 'Failing');
            failingProvider.shouldFail = true;
            noFailoverRouter.registerProvider(failingProvider);
            noFailoverRouter.registerProvider(mockFlux);

            await expect(noFailoverRouter.generateConcept('A dress')).rejects.toThrow();

            noFailoverRouter.destroy();
        });
    });

    describe('health checks', () => {
        it('should start and stop periodic health checks', async () => {
            vi.useFakeTimers();

            router.startHealthChecks(1000);

            // Initial check
            expect(mockGemini.latency).toBe(50);

            // Advance time
            await vi.advanceTimersByTimeAsync(2000);

            router.stopHealthChecks();

            vi.useRealTimers();
        });
    });

    describe('destroy', () => {
        it('should cleanup resources', () => {
            router.startHealthChecks(1000);
            router.destroy();

            expect(router.getProviders()).toHaveLength(0);
        });
    });
});

describe('getDefaultRouter', () => {
    afterEach(() => {
        resetDefaultRouter();
    });

    it('should create router with API key', () => {
        const router = getDefaultRouter('test-api-key');

        expect(router).toBeInstanceOf(ModelRouter);
    });

    it('should return same instance on subsequent calls', () => {
        const router1 = getDefaultRouter('test-api-key');
        const router2 = getDefaultRouter();

        expect(router1).toBe(router2);
    });

    it('should throw if not initialized without key', () => {
        expect(() => getDefaultRouter()).toThrow('Router not initialized');
    });
});

describe('resetDefaultRouter', () => {
    it('should reset the default router', () => {
        const router1 = getDefaultRouter('test-key');
        resetDefaultRouter();

        expect(() => getDefaultRouter()).toThrow();
    });
});
