/**
 * Enterprise AI Tests - Phase 6 Enterprise & Scale
 */

import { describe, it, expect } from 'vitest';

import {
    EnterpriseAIService,
    analyzeBrandDna,
    getBrandDna,
    listBrandDnaProfiles,
    updateBrandDna,
    generateBrandDnaPrompt,
    deleteBrandDna,
    createCustomModel,
    getCustomModel,
    listCustomModels,
    deleteCustomModel,
    useCustomModel,
    generateForecast,
    getForecast,
    listForecasts,
    calculateForecastAccuracy,
    generateMarketIntelligence,
    getMarketIntelligence,
    listMarketIntelligence,
    MIN_TRAINING_IMAGES,
    RECOMMENDED_TRAINING_IMAGES,
    MODEL_TRAINING_COST,
    DEFAULT_FORECAST_HORIZON,
    BRAND_DNA_CATEGORIES,
} from '../../enterprise';

// ============================================================================
// ENTERPRISE AI TESTS
// ============================================================================

describe('Enterprise: AI Services', () => {
    describe('Brand DNA Analysis', () => {
        it('should analyze brand DNA from designs', async () => {
            const result = await analyzeBrandDna({
                tenantId: 'brand-tenant',
                name: 'Test Brand DNA',
                description: 'Brand identity analysis',
                designIds: Array.from({ length: 15 }, (_, i) => `design-${i}`),
            });

            expect(result.error).toBeNull();
            expect(result.brandDna).toBeDefined();
            expect(result.brandDna?.name).toBe('Test Brand DNA');
        });

        it('should require minimum designs for analysis', async () => {
            const result = await analyzeBrandDna({
                tenantId: 'brand-min',
                name: 'Min Brand',
                description: 'Too few designs',
                designIds: ['design-1', 'design-2', 'design-3'],
            });

            expect(result.error).not.toBeNull();
            expect(result.brandDna).toBeNull();
        });

        it('should get brand DNA by ID', async () => {
            const createResult = await analyzeBrandDna({
                tenantId: 'brand-lookup',
                name: 'Lookup Brand',
                description: 'For lookup test',
                designIds: Array.from({ length: 10 }, (_, i) => `lookup-${i}`),
            });

            const brandDna = await getBrandDna(createResult.brandDna!.id);
            expect(brandDna).toBeDefined();
            expect(brandDna?.name).toBe('Lookup Brand');
        });

        it('should list brand DNA profiles for tenant', async () => {
            const tenantId = `brand-list-${Date.now()}`;

            await analyzeBrandDna({
                tenantId,
                name: 'List Brand',
                description: 'For list test',
                designIds: Array.from({ length: 12 }, (_, i) => `list-${i}`),
            });

            const profiles = await listBrandDnaProfiles(tenantId);
            expect(profiles.length).toBeGreaterThanOrEqual(1);
        });

        it('should update brand DNA with additional designs', async () => {
            const createResult = await analyzeBrandDna({
                tenantId: 'brand-update',
                name: 'Update Brand',
                description: 'Original description',
                designIds: Array.from({ length: 10 }, (_, i) => `update-${i}`),
            });

            const result = await updateBrandDna(createResult.brandDna!.id, [
                'additional-1', 'additional-2', 'additional-3',
            ]);

            expect(result.error).toBeNull();
            expect(result.brandDna?.trainingDesigns.length).toBeGreaterThan(10);
        });

        it('should generate brand DNA prompt', async () => {
            const createResult = await analyzeBrandDna({
                tenantId: 'brand-prompt',
                name: 'Prompt Brand',
                description: 'For prompt generation',
                designIds: Array.from({ length: 10 }, (_, i) => `prompt-${i}`),
            });

            const prompt = generateBrandDnaPrompt(createResult.brandDna!, 'dress');
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        it('should delete brand DNA', async () => {
            const createResult = await analyzeBrandDna({
                tenantId: 'brand-delete',
                name: 'Delete Brand',
                description: 'To be deleted',
                designIds: Array.from({ length: 10 }, (_, i) => `delete-${i}`),
            });

            const result = await deleteBrandDna(createResult.brandDna!.id);
            expect(result.success).toBe(true);

            const deleted = await getBrandDna(createResult.brandDna!.id);
            expect(deleted).toBeNull();
        });

        it('should have brand DNA categories', () => {
            expect(BRAND_DNA_CATEGORIES).toBeDefined();
            expect(Object.keys(BRAND_DNA_CATEGORIES).length).toBeGreaterThan(0);
        });
    });

    describe('Custom Model Management', () => {
        it('should create a custom AI model', async () => {
            const result = await createCustomModel({
                tenantId: 'model-tenant',
                name: 'Brand Style Model',
                description: 'Custom model for brand styles',
                baseModel: 'gemini-flash',
                type: 'fine_tuned',
                trainingImages: 150,
            });

            expect(result.error).toBeNull();
            expect(result.model).toBeDefined();
            expect(result.model?.name).toBe('Brand Style Model');
            expect(result.model?.status).toBe('training');
        });

        it('should require minimum training images', async () => {
            const result = await createCustomModel({
                tenantId: 'model-min',
                name: 'Min Model',
                description: 'Too few images',
                baseModel: 'gemini-flash',
                type: 'lora',
                trainingImages: 10,
            });

            expect(result.error).not.toBeNull();
            expect(result.model).toBeNull();
        });

        it('should get custom model by ID', async () => {
            const createResult = await createCustomModel({
                tenantId: 'model-lookup',
                name: 'Lookup Model',
                description: 'For lookup test',
                baseModel: 'gemini-flash',
                type: 'embedding',
                trainingImages: 100,
            });

            const model = await getCustomModel(createResult.model!.id);
            expect(model).toBeDefined();
            expect(model?.name).toBe('Lookup Model');
        });

        it('should list custom models for tenant', async () => {
            const tenantId = `model-list-${Date.now()}`;

            await createCustomModel({
                tenantId,
                name: 'List Model',
                description: 'For list test',
                baseModel: 'gemini-flash',
                type: 'fine_tuned',
                trainingImages: 100,
            });

            const models = await listCustomModels(tenantId);
            expect(models.length).toBeGreaterThanOrEqual(1);
        });

        it('should delete custom model', async () => {
            const createResult = await createCustomModel({
                tenantId: 'model-delete',
                name: 'Delete Model',
                description: 'To be deleted',
                baseModel: 'gemini-flash',
                type: 'lora',
                trainingImages: 100,
            });

            const result = await deleteCustomModel(createResult.model!.id);
            expect(result.success).toBe(true);
        });

        it('should attempt to use custom model', async () => {
            const createResult = await createCustomModel({
                tenantId: 'model-use',
                name: 'Use Model',
                description: 'For generation',
                baseModel: 'gemini-flash',
                type: 'fine_tuned',
                trainingImages: 100,
            });

            // Model is created in 'training' status, so useCustomModel returns error
            const result = await useCustomModel(createResult.model!.id);
            // Model is not ready yet (still training), so this should fail
            expect(result.error).toBe('Model is not ready');
        });

        it('should have training limits configured', () => {
            expect(MIN_TRAINING_IMAGES).toBeDefined();
            expect(typeof MIN_TRAINING_IMAGES).toBe('number');
            expect(RECOMMENDED_TRAINING_IMAGES).toBeDefined();
            expect(typeof RECOMMENDED_TRAINING_IMAGES).toBe('number');
            expect(MODEL_TRAINING_COST).toBeDefined();
        });
    });

    describe('Demand Forecasting', () => {
        it('should generate demand forecast', async () => {
            const result = await generateForecast({
                tenantId: 'forecast-tenant',
                designId: 'design-123',
                category: 'dresses',
                horizonMonths: 6,
            });

            expect(result.error).toBeNull();
            expect(result.forecast).toBeDefined();
            expect(result.forecast?.predictions.length).toBe(6);
        });

        it('should use default horizon when not specified', async () => {
            const result = await generateForecast({
                tenantId: 'forecast-default',
            });

            expect(result.error).toBeNull();
            expect(result.forecast?.predictions.length).toBe(DEFAULT_FORECAST_HORIZON);
        });

        it('should get forecast by ID', async () => {
            const createResult = await generateForecast({
                tenantId: 'forecast-lookup',
                category: 'accessories',
                horizonMonths: 3,
            });

            const forecast = await getForecast(createResult.forecast!.id);
            expect(forecast).toBeDefined();
            expect(forecast?.predictions.length).toBe(3);
        });

        it('should list forecasts for tenant', async () => {
            const tenantId = `forecast-list-${Date.now()}`;

            await generateForecast({
                tenantId,
                category: 'outerwear',
                horizonMonths: 12,
            });

            const forecasts = await listForecasts(tenantId);
            expect(forecasts.length).toBeGreaterThanOrEqual(1);
        });

        it('should calculate forecast accuracy', () => {
            const result = calculateForecastAccuracy(100, 110);

            expect(typeof result.accuracy).toBe('number');
            expect(result.accuracy).toBeGreaterThanOrEqual(0);
            expect(result.accuracy).toBeLessThanOrEqual(100);
            expect(typeof result.error).toBe('number');
            expect(typeof result.percentError).toBe('number');
        });

        it('should have default forecast horizon', () => {
            expect(DEFAULT_FORECAST_HORIZON).toBeDefined();
            expect(typeof DEFAULT_FORECAST_HORIZON).toBe('number');
        });
    });

    describe('Market Intelligence', () => {
        it('should generate competitor analysis', async () => {
            const result = await generateMarketIntelligence({
                tenantId: 'intel-tenant',
                type: 'competitor_analysis',
                title: 'Q1 Competitor Report',
            });

            expect(result.error).toBeNull();
            expect(result.report).toBeDefined();
            expect(result.report?.title).toBe('Q1 Competitor Report');
            expect(result.report?.type).toBe('competitor_analysis');
        });

        it('should generate trend report', async () => {
            const result = await generateMarketIntelligence({
                tenantId: 'intel-trend',
                type: 'trend_report',
            });

            expect(result.error).toBeNull();
            expect(result.report).toBeDefined();
            expect(result.report?.type).toBe('trend_report');
        });

        it('should generate pricing analysis', async () => {
            const result = await generateMarketIntelligence({
                tenantId: 'intel-pricing',
                type: 'pricing_analysis',
            });

            expect(result.error).toBeNull();
            expect(result.report).toBeDefined();
            expect(result.report?.type).toBe('pricing_analysis');
        });

        it('should get market intelligence by ID', async () => {
            const createResult = await generateMarketIntelligence({
                tenantId: 'intel-lookup',
                type: 'competitor_analysis',
            });

            const intel = await getMarketIntelligence(createResult.report!.id);
            expect(intel).toBeDefined();
            expect(intel?.type).toBe('competitor_analysis');
        });

        it('should list market intelligence for tenant', async () => {
            const tenantId = `intel-list-${Date.now()}`;

            await generateMarketIntelligence({
                tenantId,
                type: 'trend_report',
            });

            const intels = await listMarketIntelligence(tenantId);
            expect(intels.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('EnterpriseAIService namespace', () => {
        it('should export all Brand DNA functions', () => {
            expect(EnterpriseAIService.analyzeBrandDna).toBeDefined();
            expect(EnterpriseAIService.getBrandDna).toBeDefined();
            expect(EnterpriseAIService.listBrandDnaProfiles).toBeDefined();
            expect(EnterpriseAIService.updateBrandDna).toBeDefined();
            expect(EnterpriseAIService.generateBrandDnaPrompt).toBeDefined();
            expect(EnterpriseAIService.deleteBrandDna).toBeDefined();
        });

        it('should export all Custom Model functions', () => {
            expect(EnterpriseAIService.createCustomModel).toBeDefined();
            expect(EnterpriseAIService.getCustomModel).toBeDefined();
            expect(EnterpriseAIService.listCustomModels).toBeDefined();
            expect(EnterpriseAIService.deleteCustomModel).toBeDefined();
            expect(EnterpriseAIService.useCustomModel).toBeDefined();
        });

        it('should export all Forecasting functions', () => {
            expect(EnterpriseAIService.generateForecast).toBeDefined();
            expect(EnterpriseAIService.getForecast).toBeDefined();
            expect(EnterpriseAIService.listForecasts).toBeDefined();
            expect(EnterpriseAIService.calculateForecastAccuracy).toBeDefined();
        });

        it('should export all Market Intelligence functions', () => {
            expect(EnterpriseAIService.generateMarketIntelligence).toBeDefined();
            expect(EnterpriseAIService.getMarketIntelligence).toBeDefined();
            expect(EnterpriseAIService.listMarketIntelligence).toBeDefined();
        });

        it('should export constants', () => {
            expect(EnterpriseAIService.MIN_TRAINING_IMAGES).toBeDefined();
            expect(EnterpriseAIService.RECOMMENDED_TRAINING_IMAGES).toBeDefined();
            expect(EnterpriseAIService.MODEL_TRAINING_COST).toBeDefined();
            expect(EnterpriseAIService.DEFAULT_FORECAST_HORIZON).toBeDefined();
            expect(EnterpriseAIService.BRAND_DNA_CATEGORIES).toBeDefined();
        });
    });
});
