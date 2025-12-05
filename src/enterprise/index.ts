/**
 * Enterprise Module - Phase 6 Enterprise & Scale
 *
 * Comprehensive enterprise features for multi-tenant white-label platform,
 * workflow management, API integrations, security compliance, and enterprise AI.
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

// White-Label Platform Services
export {
    WhiteLabelService,
    // Tenant Management
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
    // SSO
    configureSso,
    getSsoConfig,
    updateSsoConfig,
    disableSso,
    validateSamlMetadata,
    generateSpMetadata,
    // Custom Domains
    addCustomDomain,
    verifyDomain,
    removeCustomDomain,
    setPrimaryDomain,
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
} from './white-label';

// Workflow Management Services
export {
    WorkflowService,
    // Workflow Templates
    createWorkflowTemplate,
    getWorkflowTemplate,
    listWorkflowTemplates,
    getDefaultTemplate,
    updateWorkflowTemplate,
    deleteWorkflowTemplate,
    // Workflow Instances
    startWorkflow,
    getWorkflowInstance,
    getWorkflowForTarget,
    submitApproval,
    addWorkflowComment,
    cancelWorkflow,
    listActiveWorkflows,
    evaluateConditions,
    // Projects (Kanban)
    createProject,
    getProject,
    listProjects,
    updateProject,
    addProjectMember,
    removeProjectMember,
    updateKanbanColumn,
    deleteKanbanColumn,
    // Tasks
    createTask,
    getTask,
    updateTask,
    moveTask,
    deleteTask,
    addChecklistItem,
    toggleChecklistItem,
    addTimeEntry,
    addTaskComment,
    // Organization Hierarchy
    createOrgUnit,
    getOrgUnit,
    getOrgHierarchy,
    getOrgUnitChildren,
    addOrgUnitMember,
    removeOrgUnitMember,
    // Constants
    DEFAULT_DESIGN_APPROVAL_STAGES,
    DEFAULT_KANBAN_COLUMNS,
} from './workflow';

// API & Integrations Services
export {
    ApiService,
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
} from './api';

// Security & Compliance Services
export {
    SecurityService,
    // Audit Logging
    logAuditEvent,
    queryAuditLogs,
    getAuditLog,
    exportAuditLogs,
    cleanupExpiredAuditLogs,
    // Data Subject Requests
    createDataSubjectRequest,
    getDataSubjectRequest,
    listDataSubjectRequests,
    updateDataSubjectRequest,
    processAccessRequest,
    processErasureRequest,
    getOverdueRequests,
    // DPAs
    createDpa,
    getTenantDpas,
    hasValidDpa,
    // Security Policies
    getSecurityPolicy,
    updateSecurityPolicy,
    validatePassword,
    isPasswordReused,
    isSessionValid,
    checkIpPolicy,
    // Compliance
    generateComplianceReport,
    // Encryption
    encryptData,
    decryptData,
    hashData,
    generateSecureToken,
    // Constants
    DEFAULT_PASSWORD_POLICY,
    DEFAULT_SESSION_POLICY,
    DEFAULT_MFA_POLICY,
    ENTERPRISE_MFA_POLICY,
    AUDIT_RETENTION_DAYS,
    DSR_DEADLINES,
} from './security';

// Enterprise AI Services
export {
    EnterpriseAIService,
    // Brand DNA
    analyzeBrandDna,
    getBrandDna,
    listBrandDnaProfiles,
    updateBrandDna,
    generateBrandDnaPrompt,
    deleteBrandDna,
    // Custom AI Models
    createCustomModel,
    getCustomModel,
    listCustomModels,
    deleteCustomModel,
    useCustomModel,
    // Demand Forecasting
    generateForecast,
    getForecast,
    listForecasts,
    calculateForecastAccuracy,
    // Market Intelligence
    generateMarketIntelligence,
    getMarketIntelligence,
    listMarketIntelligence,
    deleteMarketIntelligence,
    // Constants
    MIN_TRAINING_IMAGES,
    RECOMMENDED_TRAINING_IMAGES,
    MODEL_TRAINING_COST,
    DEFAULT_FORECAST_HORIZON,
    BRAND_DNA_CATEGORIES,
} from './enterprise-ai';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/**
 * Enterprise module default export for convenience
 */
const Enterprise = {
    // Services will be imported via named exports
    version: '1.0.0',
    features: [
        'white-label',
        'workflow',
        'api',
        'security',
        'enterprise-ai',
    ],
};

export default Enterprise;
