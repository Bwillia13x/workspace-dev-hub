/**
 * Enterprise API Tests - Phase 6 Enterprise & Scale
 */

import { describe, it, expect } from 'vitest';

import {
    ApiService,
    createApiKey,
    getApiKey,
    listApiKeys,
    validateApiKey,
    revokeApiKey,
    createWebhook,
    getWebhook,
    listWebhooks,
    createIntegration,
    getIntegration,
    listIntegrations,
    checkRateLimit,
    RATE_LIMITS,
    ALL_WEBHOOK_EVENTS,
    INTEGRATION_CONFIGS,
} from '../../enterprise';

// ============================================================================
// API & INTEGRATIONS TESTS
// ============================================================================

describe('Enterprise: API & Integrations', () => {
    describe('API Key Management', () => {
        it('should create an API key', async () => {
            const result = await createApiKey({
                tenantId: 'api-tenant',
                userId: 'user-123',
                name: 'Production Key',
                type: 'live',
                permissions: ['designs:read', 'designs:write'],
            });

            expect(result.error).toBeNull();
            expect(result.apiKey).toBeDefined();
            expect(result.apiKey?.name).toBe('Production Key');
            expect(result.secretKey).toBeDefined();
            expect(result.secretKey?.startsWith('nf_')).toBe(true);
        });

        it('should get API key by ID', async () => {
            const createResult = await createApiKey({
                tenantId: 'api-lookup',
                userId: 'user-456',
                name: 'Lookup Key',
                type: 'test',
                permissions: ['designs:read'],
            });

            const apiKey = await getApiKey(createResult.apiKey!.id);
            expect(apiKey).toBeDefined();
            expect(apiKey?.name).toBe('Lookup Key');
        });

        it('should list API keys for tenant', async () => {
            const tenantId = `api-list-${Date.now()}`;

            await createApiKey({
                tenantId,
                userId: 'user-list',
                name: 'Key 1',
                type: 'test',
            });

            const keys = await listApiKeys(tenantId);
            expect(keys.length).toBeGreaterThanOrEqual(1);
        });

        it('should validate API key', async () => {
            const createResult = await createApiKey({
                tenantId: 'api-validate',
                userId: 'user-validate',
                name: 'Validate Key',
                type: 'live',
            });

            const result = await validateApiKey(createResult.secretKey!);
            expect(result.valid).toBe(true);
            expect(result.apiKey).toBeDefined();
        });

        it('should reject invalid API key', async () => {
            const result = await validateApiKey('invalid-key');
            expect(result.valid).toBe(false);
        });

        it('should revoke API key', async () => {
            const createResult = await createApiKey({
                tenantId: 'api-revoke',
                userId: 'user-revoke',
                name: 'Revoke Key',
                type: 'test',
            });

            const result = await revokeApiKey(createResult.apiKey!.id);
            expect(result.success).toBe(true);

            const revoked = await getApiKey(createResult.apiKey!.id);
            expect(revoked?.isActive).toBe(false);
        });
    });

    describe('Rate Limiting', () => {
        it('should check rate limit', async () => {
            const createResult = await createApiKey({
                tenantId: 'rate-limit-tenant',
                userId: 'user-rate',
                name: 'Rate Limit Key',
                type: 'live',
            });

            const result = checkRateLimit(createResult.apiKey!);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeGreaterThan(0);
        });

        it('should have predefined rate limits', () => {
            expect(RATE_LIMITS.test).toBeDefined();
            expect(RATE_LIMITS.live).toBeDefined();
            expect(typeof RATE_LIMITS.test).toBe('number');
        });
    });

    describe('Webhooks', () => {
        it('should create a webhook', async () => {
            const result = await createWebhook({
                tenantId: 'webhook-tenant',
                name: 'Design Updates Webhook',
                url: 'https://api.example.com/webhooks',
                events: ['design.created', 'design.updated'],
            });

            expect(result.error).toBeNull();
            expect(result.webhook).toBeDefined();
            expect(result.webhook?.name).toBe('Design Updates Webhook');
            expect(result.webhook?.secret).toBeDefined();
        });

        it('should get webhook by ID', async () => {
            const createResult = await createWebhook({
                tenantId: 'webhook-lookup',
                name: 'Lookup Webhook',
                url: 'https://api.example.com/hook',
                events: ['design.created'],
            });

            const webhook = await getWebhook(createResult.webhook!.id);
            expect(webhook).toBeDefined();
            expect(webhook?.name).toBe('Lookup Webhook');
        });

        it('should list webhooks for tenant', async () => {
            const tenantId = `webhook-list-${Date.now()}`;

            await createWebhook({
                tenantId,
                name: 'Webhook 1',
                url: 'https://api.example.com/hook1',
                events: ['design.created'],
            });

            const webhooks = await listWebhooks(tenantId);
            expect(webhooks.length).toBeGreaterThanOrEqual(1);
        });

        it('should have all webhook events defined', () => {
            expect(ALL_WEBHOOK_EVENTS.length).toBeGreaterThan(0);
            expect(ALL_WEBHOOK_EVENTS).toContain('design.created');
            expect(ALL_WEBHOOK_EVENTS).toContain('design.updated');
        });
    });

    describe('Integrations', () => {
        it('should create an integration', async () => {
            const result = await createIntegration({
                tenantId: 'integration-tenant',
                type: 'shopify',
                name: 'My Shopify Store',
                config: { storeUrl: 'https://mystore.myshopify.com' },
                credentials: { shopDomain: 'mystore.myshopify.com', accessToken: 'token123' },
            });

            expect(result.error).toBeNull();
            expect(result.integration).toBeDefined();
            expect(result.integration?.name).toBe('My Shopify Store');
            expect(result.integration?.type).toBe('shopify');
        });

        it('should get integration by ID', async () => {
            const createResult = await createIntegration({
                tenantId: 'integration-lookup',
                type: 'figma',
                name: 'Figma Integration',
                config: {},
                credentials: { accessToken: 'figma-token' },
            });

            const integration = await getIntegration(createResult.integration!.id);
            expect(integration).toBeDefined();
            expect(integration?.name).toBe('Figma Integration');
        });

        it('should list integrations for tenant', async () => {
            const tenantId = `integration-list-${Date.now()}`;

            await createIntegration({
                tenantId,
                type: 'woocommerce',
                name: 'WooCommerce Store',
                config: {},
                credentials: { siteUrl: 'https://example.com', consumerKey: 'key', consumerSecret: 'secret' },
            });

            const integrations = await listIntegrations(tenantId);
            expect(integrations.length).toBeGreaterThanOrEqual(1);
        });

        it('should have integration configs defined', () => {
            expect(INTEGRATION_CONFIGS.shopify).toBeDefined();
            expect(INTEGRATION_CONFIGS.figma).toBeDefined();
            expect(INTEGRATION_CONFIGS.shopify.name).toBe('Shopify');
        });
    });

    describe('ApiService namespace', () => {
        it('should export all functions', () => {
            expect(ApiService.createApiKey).toBeDefined();
            expect(ApiService.validateApiKey).toBeDefined();
            expect(ApiService.createWebhook).toBeDefined();
            expect(ApiService.triggerWebhook).toBeDefined();
            expect(ApiService.createIntegration).toBeDefined();
            expect(ApiService.checkRateLimit).toBeDefined();
        });
    });
});
