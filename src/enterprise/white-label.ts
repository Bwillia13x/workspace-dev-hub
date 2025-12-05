/**
 * White-Label Service - Phase 6 Enterprise & Scale
 *
 * Manages multi-tenant white-label configuration including
 * custom branding, domains, SSO, and tenant isolation.
 */

import type {
    Tenant,
    TenantStatus,
    EnterpriseTier,
    BrandingConfig,
    CustomDomain,
    SSOConfig,
    SSOProvider,
    TenantFeatures,
    TenantLimits,
    CompanyInfo,
    DataRegion,
    ContractDetails,
    DNSRecord,
    AttributeMapping,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default branding configuration
 */
export const DEFAULT_BRANDING: BrandingConfig = {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    logoUrl: '/logo-light.svg',
    logoDarkUrl: '/logo-dark.svg',
    faviconUrl: '/favicon.ico',
    fontFamily: 'Inter',
};

/**
 * Tier-based feature flags
 */
export const TIER_FEATURES: Record<EnterpriseTier, TenantFeatures> = {
    starter: {
        customBranding: true,
        customDomain: false,
        ssoEnabled: false,
        privateMarketplace: false,
        customAiTraining: false,
        advancedAnalytics: false,
        apiAccess: true,
        realtimeCollaboration: true,
        prioritySupport: false,
        dedicatedInfrastructure: false,
        auditLogging: false,
        dataExport: true,
        customIntegrations: false,
    },
    professional: {
        customBranding: true,
        customDomain: true,
        ssoEnabled: true,
        privateMarketplace: true,
        customAiTraining: false,
        advancedAnalytics: true,
        apiAccess: true,
        realtimeCollaboration: true,
        prioritySupport: true,
        dedicatedInfrastructure: false,
        auditLogging: true,
        dataExport: true,
        customIntegrations: true,
    },
    enterprise: {
        customBranding: true,
        customDomain: true,
        ssoEnabled: true,
        privateMarketplace: true,
        customAiTraining: true,
        advancedAnalytics: true,
        apiAccess: true,
        realtimeCollaboration: true,
        prioritySupport: true,
        dedicatedInfrastructure: true,
        auditLogging: true,
        dataExport: true,
        customIntegrations: true,
    },
    custom: {
        customBranding: true,
        customDomain: true,
        ssoEnabled: true,
        privateMarketplace: true,
        customAiTraining: true,
        advancedAnalytics: true,
        apiAccess: true,
        realtimeCollaboration: true,
        prioritySupport: true,
        dedicatedInfrastructure: true,
        auditLogging: true,
        dataExport: true,
        customIntegrations: true,
    },
};

/**
 * Tier-based resource limits
 */
export const TIER_LIMITS: Record<EnterpriseTier, TenantLimits> = {
    starter: {
        maxUsers: 10,
        maxTeams: 3,
        maxGenerationsPerMonth: 1000,
        maxStorageGb: 10,
        maxApiCallsPerHour: 1000,
        maxDesigns: 500,
        maxCustomDomains: 0,
    },
    professional: {
        maxUsers: 50,
        maxTeams: 10,
        maxGenerationsPerMonth: 5000,
        maxStorageGb: 100,
        maxApiCallsPerHour: 5000,
        maxDesigns: 5000,
        maxCustomDomains: 3,
    },
    enterprise: {
        maxUsers: -1, // unlimited
        maxTeams: -1,
        maxGenerationsPerMonth: -1,
        maxStorageGb: 1000,
        maxApiCallsPerHour: 10000,
        maxDesigns: -1,
        maxCustomDomains: 10,
    },
    custom: {
        maxUsers: -1,
        maxTeams: -1,
        maxGenerationsPerMonth: -1,
        maxStorageGb: -1,
        maxApiCallsPerHour: -1,
        maxDesigns: -1,
        maxCustomDomains: -1,
    },
};

/**
 * Tier pricing (monthly)
 */
export const TIER_PRICING: Record<EnterpriseTier, number> = {
    starter: 2000,
    professional: 5000,
    enterprise: 15000,
    custom: 0, // negotiated
};

// ============================================================================
// TENANT SERVICE
// ============================================================================

/**
 * In-memory tenant store (mock for development)
 */
const tenantStore = new Map<string, Tenant>();
const domainStore = new Map<string, CustomDomain>();
const ssoStore = new Map<string, SSOConfig>();

/**
 * Generate unique ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new tenant
 */
export async function createTenant(params: {
    name: string;
    slug: string;
    ownerId: string;
    billingEmail: string;
    company: CompanyInfo;
    tier?: EnterpriseTier;
    dataRegion?: DataRegion;
}): Promise<{ tenant: Tenant | null; error: string | null }> {
    try {
        // Validate slug uniqueness
        for (const tenant of tenantStore.values()) {
            if (tenant.slug === params.slug) {
                return { tenant: null, error: 'Slug already exists' };
            }
        }

        const tier = params.tier || 'starter';
        const now = new Date();

        const tenant: Tenant = {
            id: generateId(),
            name: params.name,
            slug: params.slug,
            status: 'active',
            tier,
            ownerId: params.ownerId,
            billingEmail: params.billingEmail,
            company: params.company,
            branding: { ...DEFAULT_BRANDING },
            domains: [],
            features: { ...TIER_FEATURES[tier] },
            limits: { ...TIER_LIMITS[tier] },
            dataRegion: params.dataRegion || 'us-east',
            metadata: {},
            createdAt: now,
            updatedAt: now,
        };

        tenantStore.set(tenant.id, tenant);
        console.log(`[WhiteLabel] Created tenant: ${tenant.name} (${tenant.id})`);

        return { tenant, error: null };
    } catch (error) {
        return { tenant: null, error: (error as Error).message };
    }
}

/**
 * Get tenant by ID
 */
export async function getTenant(tenantId: string): Promise<Tenant | null> {
    return tenantStore.get(tenantId) || null;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
    for (const tenant of tenantStore.values()) {
        if (tenant.slug === slug) {
            return tenant;
        }
    }
    return null;
}

/**
 * Get tenant by domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
    for (const tenant of tenantStore.values()) {
        for (const d of tenant.domains) {
            if (d.domain === domain || d.subdomain === domain) {
                return tenant;
            }
        }
    }
    return null;
}

/**
 * Update tenant
 */
export async function updateTenant(
    tenantId: string,
    updates: Partial<Pick<Tenant, 'name' | 'billingEmail' | 'company' | 'metadata'>>
): Promise<{ tenant: Tenant | null; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { tenant: null, error: 'Tenant not found' };
    }

    const updated: Tenant = {
        ...tenant,
        ...updates,
        updatedAt: new Date(),
    };

    tenantStore.set(tenantId, updated);
    return { tenant: updated, error: null };
}

/**
 * Update tenant status
 */
export async function updateTenantStatus(
    tenantId: string,
    status: TenantStatus
): Promise<{ success: boolean; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    tenant.status = status;
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);

    console.log(`[WhiteLabel] Tenant ${tenantId} status changed to: ${status}`);
    return { success: true, error: null };
}

/**
 * Upgrade/downgrade tenant tier
 */
export async function changeTenantTier(
    tenantId: string,
    newTier: EnterpriseTier
): Promise<{ tenant: Tenant | null; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { tenant: null, error: 'Tenant not found' };
    }

    const oldTier = tenant.tier;
    tenant.tier = newTier;
    tenant.features = { ...TIER_FEATURES[newTier] };
    tenant.limits = { ...TIER_LIMITS[newTier] };
    tenant.updatedAt = new Date();

    tenantStore.set(tenantId, tenant);
    console.log(`[WhiteLabel] Tenant ${tenantId} tier changed: ${oldTier} -> ${newTier}`);

    return { tenant, error: null };
}

/**
 * Delete tenant
 */
export async function deleteTenant(tenantId: string): Promise<{ success: boolean; error: string | null }> {
    if (!tenantStore.has(tenantId)) {
        return { success: false, error: 'Tenant not found' };
    }

    tenantStore.delete(tenantId);
    console.log(`[WhiteLabel] Deleted tenant: ${tenantId}`);

    return { success: true, error: null };
}

/**
 * List all tenants (admin only)
 */
export async function listTenants(params?: {
    status?: TenantStatus;
    tier?: EnterpriseTier;
    page?: number;
    pageSize?: number;
}): Promise<{ tenants: Tenant[]; total: number }> {
    let tenants = Array.from(tenantStore.values());

    if (params?.status) {
        tenants = tenants.filter(t => t.status === params.status);
    }
    if (params?.tier) {
        tenants = tenants.filter(t => t.tier === params.tier);
    }

    const total = tenants.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
        tenants: tenants.slice(start, start + pageSize),
        total,
    };
}

// ============================================================================
// BRANDING SERVICE
// ============================================================================

/**
 * Update tenant branding
 */
export async function updateBranding(
    tenantId: string,
    branding: Partial<BrandingConfig>
): Promise<{ branding: BrandingConfig | null; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { branding: null, error: 'Tenant not found' };
    }

    if (!tenant.features.customBranding) {
        return { branding: null, error: 'Custom branding not available for this tier' };
    }

    tenant.branding = {
        ...tenant.branding,
        ...branding,
    };
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);

    console.log(`[WhiteLabel] Updated branding for tenant: ${tenantId}`);
    return { branding: tenant.branding, error: null };
}

/**
 * Get tenant branding
 */
export async function getBranding(tenantId: string): Promise<BrandingConfig | null> {
    const tenant = tenantStore.get(tenantId);
    return tenant?.branding || null;
}

/**
 * Reset branding to defaults
 */
export async function resetBranding(tenantId: string): Promise<{ success: boolean; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    tenant.branding = { ...DEFAULT_BRANDING };
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);

    return { success: true, error: null };
}

/**
 * Validate branding colors
 */
export function validateBrandingColors(branding: Partial<BrandingConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    const colorFields: (keyof BrandingConfig)[] = [
        'primaryColor',
        'secondaryColor',
        'accentColor',
        'backgroundColor',
        'textColor',
    ];

    for (const field of colorFields) {
        const value = branding[field];
        if (value && typeof value === 'string' && !hexColorRegex.test(value)) {
            errors.push(`Invalid hex color for ${field}: ${value}`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Generate CSS variables from branding
 */
export function generateBrandingCSS(branding: BrandingConfig): string {
    return `:root {
  --brand-primary: ${branding.primaryColor};
  --brand-secondary: ${branding.secondaryColor};
  --brand-accent: ${branding.accentColor};
  --brand-background: ${branding.backgroundColor};
  --brand-text: ${branding.textColor};
  --brand-font: '${branding.fontFamily}', system-ui, sans-serif;
}

body {
  background-color: var(--brand-background);
  color: var(--brand-text);
  font-family: var(--brand-font);
}

${branding.customCss || ''}`;
}

// ============================================================================
// CUSTOM DOMAIN SERVICE
// ============================================================================

/**
 * Add custom domain
 */
export async function addCustomDomain(
    tenantId: string,
    domain: string,
    subdomain?: string
): Promise<{ domain: CustomDomain | null; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { domain: null, error: 'Tenant not found' };
    }

    if (!tenant.features.customDomain) {
        return { domain: null, error: 'Custom domains not available for this tier' };
    }

    if (tenant.limits.maxCustomDomains > 0 && tenant.domains.length >= tenant.limits.maxCustomDomains) {
        return { domain: null, error: `Maximum ${tenant.limits.maxCustomDomains} custom domains allowed` };
    }

    // Check if domain already exists
    for (const d of domainStore.values()) {
        if (d.domain === domain) {
            return { domain: null, error: 'Domain already in use' };
        }
    }

    const now = new Date();
    const customDomain: CustomDomain = {
        id: generateId(),
        tenantId,
        domain,
        subdomain,
        sslStatus: 'pending',
        dnsVerified: false,
        dnsRecords: generateDNSRecords(domain),
        isPrimary: tenant.domains.length === 0,
        createdAt: now,
        updatedAt: now,
    };

    domainStore.set(customDomain.id, customDomain);
    tenant.domains.push(customDomain);
    tenant.updatedAt = now;
    tenantStore.set(tenantId, tenant);

    console.log(`[WhiteLabel] Added custom domain: ${domain} for tenant: ${tenantId}`);
    return { domain: customDomain, error: null };
}

/**
 * Generate DNS records for verification
 */
function generateDNSRecords(domain: string): DNSRecord[] {
    const verificationToken = `nf-verify-${generateId()}`;

    return [
        {
            type: 'CNAME',
            name: domain,
            value: 'platform.nanofashion.io',
            ttl: 3600,
            verified: false,
        },
        {
            type: 'TXT',
            name: `_nanofashion.${domain}`,
            value: verificationToken,
            ttl: 3600,
            verified: false,
        },
    ];
}

/**
 * Verify custom domain DNS
 */
export async function verifyDomain(domainId: string): Promise<{ verified: boolean; error: string | null }> {
    const domain = domainStore.get(domainId);
    if (!domain) {
        return { verified: false, error: 'Domain not found' };
    }

    // Mock DNS verification (in production, would actually check DNS)
    // Simulate 80% success rate for demo
    const success = Math.random() > 0.2;

    if (success) {
        domain.dnsVerified = true;
        domain.dnsRecords = domain.dnsRecords.map(r => ({ ...r, verified: true }));
        domain.sslStatus = 'active';
        domain.updatedAt = new Date();
        domainStore.set(domainId, domain);

        // Update tenant
        const tenant = tenantStore.get(domain.tenantId);
        if (tenant) {
            const idx = tenant.domains.findIndex(d => d.id === domainId);
            if (idx >= 0) {
                tenant.domains[idx] = domain;
                tenantStore.set(tenant.id, tenant);
            }
        }

        console.log(`[WhiteLabel] Domain verified: ${domain.domain}`);
    }

    return { verified: success, error: success ? null : 'DNS records not found' };
}

/**
 * Remove custom domain
 */
export async function removeCustomDomain(
    tenantId: string,
    domainId: string
): Promise<{ success: boolean; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    const domainIndex = tenant.domains.findIndex(d => d.id === domainId);
    if (domainIndex === -1) {
        return { success: false, error: 'Domain not found' };
    }

    tenant.domains.splice(domainIndex, 1);
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);
    domainStore.delete(domainId);

    console.log(`[WhiteLabel] Removed domain: ${domainId} from tenant: ${tenantId}`);
    return { success: true, error: null };
}

/**
 * Set primary domain
 */
export async function setPrimaryDomain(
    tenantId: string,
    domainId: string
): Promise<{ success: boolean; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    const domain = tenant.domains.find(d => d.id === domainId);
    if (!domain) {
        return { success: false, error: 'Domain not found' };
    }

    if (!domain.dnsVerified) {
        return { success: false, error: 'Domain must be verified before setting as primary' };
    }

    // Update all domains
    tenant.domains = tenant.domains.map(d => ({
        ...d,
        isPrimary: d.id === domainId,
    }));
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);

    return { success: true, error: null };
}

// ============================================================================
// SSO SERVICE
// ============================================================================

/**
 * Configure SSO for tenant
 */
export async function configureSso(
    tenantId: string,
    config: Omit<SSOConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<{ config: SSOConfig | null; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { config: null, error: 'Tenant not found' };
    }

    if (!tenant.features.ssoEnabled) {
        return { config: null, error: 'SSO not available for this tier' };
    }

    const now = new Date();
    const ssoConfig: SSOConfig = {
        ...config,
        id: generateId(),
        tenantId,
        createdAt: now,
        updatedAt: now,
    };

    ssoStore.set(ssoConfig.id, ssoConfig);
    tenant.ssoConfig = ssoConfig;
    tenant.updatedAt = now;
    tenantStore.set(tenantId, tenant);

    console.log(`[WhiteLabel] Configured SSO (${config.provider}) for tenant: ${tenantId}`);
    return { config: ssoConfig, error: null };
}

/**
 * Get SSO configuration
 */
export async function getSsoConfig(tenantId: string): Promise<SSOConfig | null> {
    const tenant = tenantStore.get(tenantId);
    return tenant?.ssoConfig || null;
}

/**
 * Update SSO configuration
 */
export async function updateSsoConfig(
    tenantId: string,
    updates: Partial<Omit<SSOConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
): Promise<{ config: SSOConfig | null; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant || !tenant.ssoConfig) {
        return { config: null, error: 'SSO not configured for tenant' };
    }

    const updated: SSOConfig = {
        ...tenant.ssoConfig,
        ...updates,
        updatedAt: new Date(),
    };

    ssoStore.set(updated.id, updated);
    tenant.ssoConfig = updated;
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);

    return { config: updated, error: null };
}

/**
 * Disable SSO
 */
export async function disableSso(tenantId: string): Promise<{ success: boolean; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    if (tenant.ssoConfig) {
        ssoStore.delete(tenant.ssoConfig.id);
        tenant.ssoConfig = undefined;
        tenant.updatedAt = new Date();
        tenantStore.set(tenantId, tenant);
    }

    return { success: true, error: null };
}

/**
 * Validate SAML metadata
 */
export function validateSamlMetadata(metadataUrl: string): { valid: boolean; error: string | null } {
    // Mock validation - in production would fetch and parse metadata
    try {
        new URL(metadataUrl);
        return { valid: true, error: null };
    } catch {
        return { valid: false, error: 'Invalid metadata URL' };
    }
}

/**
 * Generate SAML SP metadata for tenant
 */
export function generateSpMetadata(tenantId: string, tenant: Tenant): string {
    const baseUrl = tenant.domains[0]?.domain || `${tenant.slug}.nanofashion.io`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="https://${baseUrl}/saml/metadata">
  <SPSSODescriptor
      AuthnRequestsSigned="true"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://${baseUrl}/saml/acs"
        index="1"/>
    <SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="https://${baseUrl}/saml/slo"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

// ============================================================================
// TENANT ISOLATION UTILITIES
// ============================================================================

/**
 * Get tenant context from request (mock for development)
 */
export async function getTenantContext(
    identifier: string,
    type: 'id' | 'slug' | 'domain' = 'id'
): Promise<Tenant | null> {
    switch (type) {
        case 'id':
            return getTenant(identifier);
        case 'slug':
            return getTenantBySlug(identifier);
        case 'domain':
            return getTenantByDomain(identifier);
        default:
            return null;
    }
}

/**
 * Check if user belongs to tenant
 */
export function validateTenantAccess(
    _userId: string,
    _tenantId: string
): boolean {
    // Mock validation - in production would check database
    return true;
}

/**
 * Check feature availability for tenant
 */
export function hasFeature(tenant: Tenant, feature: keyof TenantFeatures): boolean {
    return tenant.features[feature] === true;
}

/**
 * Check resource limit for tenant
 */
export function checkLimit(
    tenant: Tenant,
    resource: keyof TenantLimits,
    currentUsage: number
): { allowed: boolean; remaining: number } {
    const limit = tenant.limits[resource];

    // -1 means unlimited
    if (limit === -1) {
        return { allowed: true, remaining: -1 };
    }

    const remaining = limit - currentUsage;
    return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
    };
}

/**
 * Get tenant usage statistics
 */
export async function getTenantUsage(tenantId: string): Promise<{
    users: number;
    teams: number;
    designs: number;
    storageGb: number;
    generationsThisMonth: number;
    apiCallsThisHour: number;
} | null> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) return null;

    // Mock usage data
    return {
        users: Math.floor(Math.random() * 20) + 1,
        teams: Math.floor(Math.random() * 5) + 1,
        designs: Math.floor(Math.random() * 200) + 10,
        storageGb: Math.random() * 5,
        generationsThisMonth: Math.floor(Math.random() * 500),
        apiCallsThisHour: Math.floor(Math.random() * 200),
    };
}

// ============================================================================
// CONTRACT MANAGEMENT
// ============================================================================

/**
 * Add contract to tenant
 */
export async function addContract(
    tenantId: string,
    contract: ContractDetails
): Promise<{ success: boolean; error: string | null }> {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) {
        return { success: false, error: 'Tenant not found' };
    }

    tenant.contract = contract;
    tenant.updatedAt = new Date();
    tenantStore.set(tenantId, tenant);

    console.log(`[WhiteLabel] Added contract for tenant: ${tenantId}`);
    return { success: true, error: null };
}

/**
 * Check contract status
 */
export function getContractStatus(tenant: Tenant): {
    active: boolean;
    daysRemaining: number;
    autoRenew: boolean;
} {
    if (!tenant.contract) {
        return { active: false, daysRemaining: 0, autoRenew: false };
    }

    const now = new Date();
    const endDate = new Date(tenant.contract.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
        active: daysRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining),
        autoRenew: tenant.contract.autoRenew,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const WhiteLabelService = {
    // Tenant management
    createTenant,
    getTenant,
    getTenantBySlug,
    getTenantByDomain,
    updateTenant,
    updateTenantStatus,
    changeTenantTier,
    deleteTenant,
    listTenants,

    // Branding
    updateBranding,
    getBranding,
    resetBranding,
    validateBrandingColors,
    generateBrandingCSS,

    // Custom domains
    addCustomDomain,
    verifyDomain,
    removeCustomDomain,
    setPrimaryDomain,

    // SSO
    configureSso,
    getSsoConfig,
    updateSsoConfig,
    disableSso,
    validateSamlMetadata,
    generateSpMetadata,

    // Utilities
    getTenantContext,
    validateTenantAccess,
    hasFeature,
    checkLimit,
    getTenantUsage,

    // Contract
    addContract,
    getContractStatus,

    // Constants
    DEFAULT_BRANDING,
    TIER_FEATURES,
    TIER_LIMITS,
    TIER_PRICING,
};

export default WhiteLabelService;
