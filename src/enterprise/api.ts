/**
 * API Service - Phase 6 Enterprise & Scale
 *
 * Manages API keys, rate limiting, webhooks, and
 * third-party integrations.
 */

import type {
    ApiKey,
    ApiKeyType,
    ApiPermission,
    ApiUsageRecord,
    WebhookConfig,
    WebhookEvent,
    WebhookDelivery,
    Integration,
    IntegrationType,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Rate limits by API key type (requests per hour)
 */
export const RATE_LIMITS: Record<ApiKeyType, number> = {
    test: 100,
    live: 1000,
    restricted: 500,
};

/**
 * Default permissions by key type
 */
export const DEFAULT_PERMISSIONS: Record<ApiKeyType, ApiPermission[]> = {
    test: ['designs:read', 'designs:write'],
    live: ['designs:read', 'designs:write', 'designs:delete', 'users:read', 'analytics:read'],
    restricted: ['designs:read'],
};

/**
 * All available permissions
 */
export const ALL_PERMISSIONS: ApiPermission[] = [
    'designs:read',
    'designs:write',
    'designs:delete',
    'users:read',
    'users:write',
    'teams:read',
    'teams:write',
    'analytics:read',
    'webhooks:manage',
    'billing:read',
    'billing:write',
    'admin:full',
];

/**
 * All webhook events
 */
export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
    'design.created',
    'design.updated',
    'design.deleted',
    'design.published',
    'order.created',
    'order.updated',
    'order.completed',
    'payment.succeeded',
    'payment.failed',
    'license.created',
    'license.expired',
    'user.created',
    'user.updated',
    'team.created',
    'workflow.completed',
    'workflow.rejected',
];

/**
 * Integration configurations
 */
export const INTEGRATION_CONFIGS: Record<IntegrationType, {
    name: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
}> = {
    adobe_creative_cloud: {
        name: 'Adobe Creative Cloud',
        description: 'Sync designs with Photoshop and Illustrator',
        requiredFields: ['apiKey', 'clientId', 'clientSecret'],
        optionalFields: ['webhookUrl'],
    },
    figma: {
        name: 'Figma',
        description: 'Import/export designs from Figma',
        requiredFields: ['accessToken'],
        optionalFields: ['teamId', 'projectId'],
    },
    sketch: {
        name: 'Sketch',
        description: 'Sync with Sketch files',
        requiredFields: ['apiToken'],
        optionalFields: ['workspaceId'],
    },
    clo3d: {
        name: 'CLO3D',
        description: 'Export patterns to CLO3D',
        requiredFields: ['apiKey'],
        optionalFields: ['defaultProject'],
    },
    browzwear: {
        name: 'Browzwear',
        description: '3D garment visualization',
        requiredFields: ['apiKey', 'accountId'],
        optionalFields: [],
    },
    shopify: {
        name: 'Shopify',
        description: 'Sync products to Shopify store',
        requiredFields: ['shopDomain', 'accessToken'],
        optionalFields: ['locationId', 'collectionId'],
    },
    magento: {
        name: 'Magento',
        description: 'Sync products to Magento store',
        requiredFields: ['baseUrl', 'accessToken'],
        optionalFields: ['storeCode'],
    },
    woocommerce: {
        name: 'WooCommerce',
        description: 'Sync products to WooCommerce',
        requiredFields: ['siteUrl', 'consumerKey', 'consumerSecret'],
        optionalFields: [],
    },
    sap: {
        name: 'SAP',
        description: 'ERP integration with SAP',
        requiredFields: ['baseUrl', 'clientId', 'clientSecret'],
        optionalFields: ['companyCode'],
    },
    netsuite: {
        name: 'NetSuite',
        description: 'ERP integration with NetSuite',
        requiredFields: ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'],
        optionalFields: [],
    },
    centric_plm: {
        name: 'Centric PLM',
        description: 'Product lifecycle management',
        requiredFields: ['baseUrl', 'username', 'password'],
        optionalFields: ['workspaceId'],
    },
    infor_plm: {
        name: 'Infor PLM',
        description: 'Product lifecycle management',
        requiredFields: ['baseUrl', 'apiKey'],
        optionalFields: [],
    },
    lectra: {
        name: 'Lectra',
        description: 'Pattern and marker making',
        requiredFields: ['apiKey', 'accountId'],
        optionalFields: [],
    },
    slack: {
        name: 'Slack',
        description: 'Notifications and collaboration',
        requiredFields: ['webhookUrl'],
        optionalFields: ['channelId', 'botToken'],
    },
    microsoft_teams: {
        name: 'Microsoft Teams',
        description: 'Notifications and collaboration',
        requiredFields: ['webhookUrl'],
        optionalFields: ['tenantId', 'clientId'],
    },
    jira: {
        name: 'Jira',
        description: 'Issue tracking integration',
        requiredFields: ['baseUrl', 'email', 'apiToken'],
        optionalFields: ['projectKey'],
    },
    asana: {
        name: 'Asana',
        description: 'Project management integration',
        requiredFields: ['accessToken'],
        optionalFields: ['workspaceId', 'projectId'],
    },
    google_drive: {
        name: 'Google Drive',
        description: 'File storage and sync',
        requiredFields: ['accessToken', 'refreshToken'],
        optionalFields: ['folderId'],
    },
    dropbox: {
        name: 'Dropbox',
        description: 'File storage and sync',
        requiredFields: ['accessToken'],
        optionalFields: ['rootPath'],
    },
    aws_s3: {
        name: 'AWS S3',
        description: 'Cloud storage',
        requiredFields: ['accessKeyId', 'secretAccessKey', 'bucket', 'region'],
        optionalFields: ['prefix', 'endpoint'],
    },
};

// ============================================================================
// STORES (Mock for development)
// ============================================================================

const apiKeyStore = new Map<string, ApiKey>();
const apiKeyByHash = new Map<string, ApiKey>();
const usageStore = new Map<string, ApiUsageRecord[]>();
const webhookStore = new Map<string, WebhookConfig>();
const deliveryStore = new Map<string, WebhookDelivery[]>();
const integrationStore = new Map<string, Integration>();

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a secure API key
 */
function generateApiKey(type: ApiKeyType): { key: string; hash: string; prefix: string; last4: string } {
    const prefix = `nf_${type}_`;
    const random = Array.from({ length: 32 }, () =>
        Math.random().toString(36).charAt(2)
    ).join('');
    const key = prefix + random;
    const last4 = random.slice(-4);

    // In production, use proper hashing (bcrypt/argon2)
    const hash = btoa(key);

    return { key, hash, prefix, last4 };
}

/**
 * Generate webhook secret
 */
function generateWebhookSecret(): string {
    return 'whsec_' + Array.from({ length: 32 }, () =>
        Math.random().toString(36).charAt(2)
    ).join('');
}

// ============================================================================
// API KEY SERVICE
// ============================================================================

/**
 * Create API key
 */
export async function createApiKey(params: {
    tenantId: string;
    userId: string;
    name: string;
    type: ApiKeyType;
    permissions?: ApiPermission[];
    ipWhitelist?: string[];
    expiresAt?: Date;
}): Promise<{ apiKey: ApiKey | null; secretKey: string | null; error: string | null }> {
    try {
        const { key, hash, prefix, last4 } = generateApiKey(params.type);
        const now = new Date();

        const apiKey: ApiKey = {
            id: generateId(),
            tenantId: params.tenantId,
            userId: params.userId,
            name: params.name,
            type: params.type,
            prefix,
            keyHash: hash,
            last4,
            permissions: params.permissions || DEFAULT_PERMISSIONS[params.type],
            ipWhitelist: params.ipWhitelist || [],
            rateLimit: RATE_LIMITS[params.type],
            expiresAt: params.expiresAt,
            usageCount: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        apiKeyStore.set(apiKey.id, apiKey);
        apiKeyByHash.set(hash, apiKey);
        usageStore.set(apiKey.id, []);

        console.log(`[API] Created API key: ${apiKey.name} (${apiKey.id})`);

        // Return the full key only once - it cannot be retrieved again
        return { apiKey, secretKey: key, error: null };
    } catch (error) {
        return { apiKey: null, secretKey: null, error: (error as Error).message };
    }
}

/**
 * Validate API key and return associated key object
 */
export async function validateApiKey(key: string): Promise<{
    valid: boolean;
    apiKey: ApiKey | null;
    error: string | null;
}> {
    try {
        const hash = btoa(key);
        const apiKey = apiKeyByHash.get(hash);

        if (!apiKey) {
            return { valid: false, apiKey: null, error: 'Invalid API key' };
        }

        if (!apiKey.isActive) {
            return { valid: false, apiKey: null, error: 'API key is disabled' };
        }

        if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            return { valid: false, apiKey: null, error: 'API key has expired' };
        }

        return { valid: true, apiKey, error: null };
    } catch (error) {
        return { valid: false, apiKey: null, error: (error as Error).message };
    }
}

/**
 * Get API key by ID
 */
export async function getApiKey(keyId: string): Promise<ApiKey | null> {
    return apiKeyStore.get(keyId) || null;
}

/**
 * List API keys for tenant
 */
export async function listApiKeys(
    tenantId: string,
    userId?: string
): Promise<ApiKey[]> {
    let keys = Array.from(apiKeyStore.values()).filter(k => k.tenantId === tenantId);

    if (userId) {
        keys = keys.filter(k => k.userId === userId);
    }

    return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Update API key
 */
export async function updateApiKey(
    keyId: string,
    updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'ipWhitelist' | 'rateLimit' | 'expiresAt'>>
): Promise<{ apiKey: ApiKey | null; error: string | null }> {
    const apiKey = apiKeyStore.get(keyId);
    if (!apiKey) {
        return { apiKey: null, error: 'API key not found' };
    }

    const updated: ApiKey = {
        ...apiKey,
        ...updates,
        updatedAt: new Date(),
    };

    apiKeyStore.set(keyId, updated);
    apiKeyByHash.set(updated.keyHash, updated);

    return { apiKey: updated, error: null };
}

/**
 * Revoke API key
 */
export async function revokeApiKey(keyId: string): Promise<{ success: boolean; error: string | null }> {
    const apiKey = apiKeyStore.get(keyId);
    if (!apiKey) {
        return { success: false, error: 'API key not found' };
    }

    apiKey.isActive = false;
    apiKey.updatedAt = new Date();
    apiKeyStore.set(keyId, apiKey);
    apiKeyByHash.set(apiKey.keyHash, apiKey);

    console.log(`[API] Revoked API key: ${keyId}`);
    return { success: true, error: null };
}

/**
 * Delete API key permanently
 */
export async function deleteApiKey(keyId: string): Promise<{ success: boolean; error: string | null }> {
    const apiKey = apiKeyStore.get(keyId);
    if (!apiKey) {
        return { success: false, error: 'API key not found' };
    }

    apiKeyStore.delete(keyId);
    apiKeyByHash.delete(apiKey.keyHash);
    usageStore.delete(keyId);

    return { success: true, error: null };
}

/**
 * Check API permission
 */
export function hasPermission(apiKey: ApiKey, permission: ApiPermission): boolean {
    if (apiKey.permissions.includes('admin:full')) {
        return true;
    }
    return apiKey.permissions.includes(permission);
}

/**
 * Check IP whitelist
 */
export function isIpAllowed(apiKey: ApiKey, ip: string): boolean {
    if (apiKey.ipWhitelist.length === 0) {
        return true;
    }
    return apiKey.ipWhitelist.includes(ip);
}

// ============================================================================
// RATE LIMITING SERVICE
// ============================================================================

// In-memory rate limit tracking
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit
 */
export function checkRateLimit(apiKey: ApiKey): {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
} {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const bucket = rateLimitBuckets.get(apiKey.id);

    if (!bucket || now > bucket.resetAt) {
        // New bucket
        rateLimitBuckets.set(apiKey.id, {
            count: 1,
            resetAt: now + hourMs,
        });
        return {
            allowed: true,
            remaining: (apiKey.rateLimit || RATE_LIMITS[apiKey.type]) - 1,
            resetAt: new Date(now + hourMs),
        };
    }

    const limit = apiKey.rateLimit || RATE_LIMITS[apiKey.type];
    if (bucket.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(bucket.resetAt),
        };
    }

    bucket.count++;
    return {
        allowed: true,
        remaining: limit - bucket.count,
        resetAt: new Date(bucket.resetAt),
    };
}

/**
 * Record API usage
 */
export async function recordApiUsage(params: {
    apiKeyId: string;
    tenantId: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    statusCode: number;
    responseTime: number;
    requestSize: number;
    responseSize: number;
    ip: string;
    userAgent: string;
}): Promise<void> {
    const record: ApiUsageRecord = {
        id: generateId(),
        ...params,
        timestamp: new Date(),
    };

    const existing = usageStore.get(params.apiKeyId) || [];
    existing.push(record);

    // Keep only last 1000 records per key
    if (existing.length > 1000) {
        existing.shift();
    }

    usageStore.set(params.apiKeyId, existing);

    // Update usage count on API key
    const apiKey = apiKeyStore.get(params.apiKeyId);
    if (apiKey) {
        apiKey.usageCount++;
        apiKey.lastUsedAt = new Date();
        apiKeyStore.set(params.apiKeyId, apiKey);
    }
}

/**
 * Get API usage statistics
 */
export async function getApiUsageStats(
    apiKeyId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByStatus: Record<number, number>;
}> {
    let records = usageStore.get(apiKeyId) || [];

    if (startDate) {
        records = records.filter(r => r.timestamp >= startDate);
    }
    if (endDate) {
        records = records.filter(r => r.timestamp <= endDate);
    }

    const totalRequests = records.length;
    const successfulRequests = records.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime =
        records.length > 0
            ? records.reduce((sum, r) => sum + r.responseTime, 0) / records.length
            : 0;

    const requestsByEndpoint: Record<string, number> = {};
    const requestsByStatus: Record<number, number> = {};

    for (const record of records) {
        requestsByEndpoint[record.endpoint] = (requestsByEndpoint[record.endpoint] || 0) + 1;
        requestsByStatus[record.statusCode] = (requestsByStatus[record.statusCode] || 0) + 1;
    }

    return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        requestsByEndpoint,
        requestsByStatus,
    };
}

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

/**
 * Create webhook
 */
export async function createWebhook(params: {
    tenantId: string;
    name: string;
    url: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
}): Promise<{ webhook: WebhookConfig | null; error: string | null }> {
    try {
        // Validate URL
        new URL(params.url);

        const now = new Date();
        const webhook: WebhookConfig = {
            id: generateId(),
            tenantId: params.tenantId,
            name: params.name,
            url: params.url,
            secret: generateWebhookSecret(),
            events: params.events,
            headers: params.headers || {},
            retryConfig: {
                maxRetries: 3,
                retryDelayMs: 1000,
                exponentialBackoff: true,
            },
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        webhookStore.set(webhook.id, webhook);
        deliveryStore.set(webhook.id, []);

        console.log(`[API] Created webhook: ${webhook.name} (${webhook.id})`);
        return { webhook, error: null };
    } catch (error) {
        return { webhook: null, error: (error as Error).message };
    }
}

/**
 * Get webhook by ID
 */
export async function getWebhook(webhookId: string): Promise<WebhookConfig | null> {
    return webhookStore.get(webhookId) || null;
}

/**
 * List webhooks for tenant
 */
export async function listWebhooks(tenantId: string): Promise<WebhookConfig[]> {
    return Array.from(webhookStore.values())
        .filter(w => w.tenantId === tenantId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Update webhook
 */
export async function updateWebhook(
    webhookId: string,
    updates: Partial<Pick<WebhookConfig, 'name' | 'url' | 'events' | 'headers' | 'retryConfig' | 'isActive'>>
): Promise<{ webhook: WebhookConfig | null; error: string | null }> {
    const webhook = webhookStore.get(webhookId);
    if (!webhook) {
        return { webhook: null, error: 'Webhook not found' };
    }

    if (updates.url) {
        try {
            new URL(updates.url);
        } catch {
            return { webhook: null, error: 'Invalid URL' };
        }
    }

    const updated: WebhookConfig = {
        ...webhook,
        ...updates,
        updatedAt: new Date(),
    };

    webhookStore.set(webhookId, updated);
    return { webhook: updated, error: null };
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId: string): Promise<{ success: boolean; error: string | null }> {
    if (!webhookStore.has(webhookId)) {
        return { success: false, error: 'Webhook not found' };
    }

    webhookStore.delete(webhookId);
    deliveryStore.delete(webhookId);

    return { success: true, error: null };
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
    webhookId: string
): Promise<{ secret: string | null; error: string | null }> {
    const webhook = webhookStore.get(webhookId);
    if (!webhook) {
        return { secret: null, error: 'Webhook not found' };
    }

    webhook.secret = generateWebhookSecret();
    webhook.updatedAt = new Date();
    webhookStore.set(webhookId, webhook);

    return { secret: webhook.secret, error: null };
}

/**
 * Trigger webhook (send event)
 */
export async function triggerWebhook(
    event: WebhookEvent,
    tenantId: string,
    payload: Record<string, unknown>
): Promise<void> {
    const webhooks = Array.from(webhookStore.values()).filter(
        w => w.tenantId === tenantId && w.isActive && w.events.includes(event)
    );

    for (const webhook of webhooks) {
        const delivery: WebhookDelivery = {
            id: generateId(),
            webhookId: webhook.id,
            event,
            payload,
            attempts: 0,
            status: 'pending',
            createdAt: new Date(),
        };

        const deliveries = deliveryStore.get(webhook.id) || [];
        deliveries.push(delivery);
        deliveryStore.set(webhook.id, deliveries);

        // Simulate async delivery
        deliverWebhook(webhook, delivery);
    }
}

/**
 * Deliver webhook (mock implementation)
 */
async function deliverWebhook(webhook: WebhookConfig, delivery: WebhookDelivery): Promise<void> {
    delivery.attempts++;

    // Mock delivery - in production would use fetch
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
        delivery.status = 'success';
        delivery.response = {
            statusCode: 200,
            body: '{"ok": true}',
            headers: {},
        };
        delivery.completedAt = new Date();

        webhook.lastDelivery = {
            timestamp: new Date(),
            success: true,
            statusCode: 200,
        };
    } else {
        if (delivery.attempts >= webhook.retryConfig.maxRetries) {
            delivery.status = 'failed';
            delivery.completedAt = new Date();

            webhook.lastDelivery = {
                timestamp: new Date(),
                success: false,
                error: 'Max retries exceeded',
            };
        } else {
            delivery.nextRetryAt = new Date(
                Date.now() + webhook.retryConfig.retryDelayMs * Math.pow(2, delivery.attempts - 1)
            );
        }
    }

    webhookStore.set(webhook.id, webhook);
}

/**
 * Get webhook deliveries
 */
export async function getWebhookDeliveries(
    webhookId: string,
    limit = 50
): Promise<WebhookDelivery[]> {
    const deliveries = deliveryStore.get(webhookId) || [];
    return deliveries.slice(-limit).reverse();
}

/**
 * Generate webhook signature
 */
export function generateWebhookSignature(secret: string, payload: string): string {
    // In production, use HMAC-SHA256
    return btoa(`${secret}:${payload}`);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
    secret: string,
    payload: string,
    signature: string
): boolean {
    const expected = generateWebhookSignature(secret, payload);
    return signature === expected;
}

// ============================================================================
// INTEGRATION SERVICE
// ============================================================================

/**
 * Create integration
 */
export async function createIntegration(params: {
    tenantId: string;
    type: IntegrationType;
    name: string;
    config: Record<string, unknown>;
    credentials: Record<string, string>;
}): Promise<{ integration: Integration | null; error: string | null }> {
    try {
        const integrationConfig = INTEGRATION_CONFIGS[params.type];
        if (!integrationConfig) {
            return { integration: null, error: 'Unknown integration type' };
        }

        // Validate required fields
        for (const field of integrationConfig.requiredFields) {
            if (!params.credentials[field]) {
                return { integration: null, error: `Missing required field: ${field}` };
            }
        }

        const now = new Date();
        const integration: Integration = {
            id: generateId(),
            tenantId: params.tenantId,
            type: params.type,
            name: params.name,
            config: params.config,
            credentials: params.credentials, // In production, encrypt these
            status: 'connected',
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        integrationStore.set(integration.id, integration);
        console.log(`[API] Created integration: ${integration.name} (${integration.type})`);

        return { integration, error: null };
    } catch (error) {
        return { integration: null, error: (error as Error).message };
    }
}

/**
 * Get integration by ID
 */
export async function getIntegration(integrationId: string): Promise<Integration | null> {
    return integrationStore.get(integrationId) || null;
}

/**
 * List integrations for tenant
 */
export async function listIntegrations(tenantId: string): Promise<Integration[]> {
    return Array.from(integrationStore.values())
        .filter(i => i.tenantId === tenantId)
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update integration
 */
export async function updateIntegration(
    integrationId: string,
    updates: Partial<Pick<Integration, 'name' | 'config' | 'credentials' | 'isActive'>>
): Promise<{ integration: Integration | null; error: string | null }> {
    const integration = integrationStore.get(integrationId);
    if (!integration) {
        return { integration: null, error: 'Integration not found' };
    }

    const updated: Integration = {
        ...integration,
        ...updates,
        updatedAt: new Date(),
    };

    integrationStore.set(integrationId, updated);
    return { integration: updated, error: null };
}

/**
 * Delete integration
 */
export async function deleteIntegration(
    integrationId: string
): Promise<{ success: boolean; error: string | null }> {
    if (!integrationStore.has(integrationId)) {
        return { success: false, error: 'Integration not found' };
    }

    integrationStore.delete(integrationId);
    return { success: true, error: null };
}

/**
 * Test integration connection
 */
export async function testIntegration(
    integrationId: string
): Promise<{ success: boolean; error: string | null }> {
    const integration = integrationStore.get(integrationId);
    if (!integration) {
        return { success: false, error: 'Integration not found' };
    }

    // Mock test - 90% success rate
    const success = Math.random() > 0.1;

    integration.status = success ? 'connected' : 'error';
    if (!success) {
        integration.syncErrors = ['Connection test failed'];
    } else {
        integration.syncErrors = undefined;
    }
    integration.updatedAt = new Date();
    integrationStore.set(integrationId, integration);

    return { success, error: success ? null : 'Connection test failed' };
}

/**
 * Sync integration
 */
export async function syncIntegration(
    integrationId: string
): Promise<{ success: boolean; error: string | null }> {
    const integration = integrationStore.get(integrationId);
    if (!integration) {
        return { success: false, error: 'Integration not found' };
    }

    // Mock sync
    integration.lastSyncAt = new Date();
    integration.updatedAt = new Date();
    integrationStore.set(integrationId, integration);

    console.log(`[API] Synced integration: ${integration.name}`);
    return { success: true, error: null };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ApiService = {
    // API Keys
    createApiKey,
    validateApiKey,
    getApiKey,
    listApiKeys,
    updateApiKey,
    revokeApiKey,
    deleteApiKey,
    hasPermission,
    isIpAllowed,

    // Rate Limiting
    checkRateLimit,
    recordApiUsage,
    getApiUsageStats,

    // Webhooks
    createWebhook,
    getWebhook,
    listWebhooks,
    updateWebhook,
    deleteWebhook,
    regenerateWebhookSecret,
    triggerWebhook,
    getWebhookDeliveries,
    generateWebhookSignature,
    verifyWebhookSignature,

    // Integrations
    createIntegration,
    getIntegration,
    listIntegrations,
    updateIntegration,
    deleteIntegration,
    testIntegration,
    syncIntegration,

    // Constants
    RATE_LIMITS,
    DEFAULT_PERMISSIONS,
    ALL_PERMISSIONS,
    ALL_WEBHOOK_EVENTS,
    INTEGRATION_CONFIGS,
};

export default ApiService;
