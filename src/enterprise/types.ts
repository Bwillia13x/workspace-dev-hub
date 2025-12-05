/**
 * Enterprise Types - Phase 6 Enterprise & Scale
 *
 * Comprehensive type definitions for white-label platform,
 * team workflows, API management, security compliance,
 * and enterprise AI features.
 */

// ============================================================================
// WHITE-LABEL & TENANT TYPES
// ============================================================================

/**
 * Enterprise subscription tier with feature limits
 */
export type EnterpriseTier = 'starter' | 'professional' | 'enterprise' | 'custom';

/**
 * Tenant status in multi-tenant system
 */
export type TenantStatus = 'active' | 'suspended' | 'pending' | 'trial' | 'canceled';

/**
 * SSO provider types
 */
export type SSOProvider = 'saml' | 'oidc' | 'oauth2' | 'ldap' | 'azure_ad' | 'okta' | 'onelogin';

/**
 * Data residency regions for compliance
 */
export type DataRegion = 'us-east' | 'us-west' | 'eu-west' | 'eu-central' | 'asia-pacific' | 'australia';

/**
 * Branding configuration for white-label
 */
export interface BrandingConfig {
    /** Primary brand color (hex) */
    primaryColor: string;
    /** Secondary brand color (hex) */
    secondaryColor: string;
    /** Accent color (hex) */
    accentColor: string;
    /** Background color (hex) */
    backgroundColor: string;
    /** Text color (hex) */
    textColor: string;
    /** Logo URL (light version) */
    logoUrl: string;
    /** Logo URL (dark version) */
    logoDarkUrl: string;
    /** Favicon URL */
    faviconUrl: string;
    /** Custom font family */
    fontFamily: string;
    /** Custom font URL (Google Fonts or self-hosted) */
    fontUrl?: string;
    /** Custom CSS overrides */
    customCss?: string;
    /** Email template branding */
    emailLogo?: string;
    /** Email footer text */
    emailFooter?: string;
}

/**
 * Custom domain configuration
 */
export interface CustomDomain {
    id: string;
    tenantId: string;
    domain: string;
    subdomain?: string;
    sslCertificateId?: string;
    sslStatus: 'pending' | 'active' | 'failed' | 'expired';
    dnsVerified: boolean;
    dnsRecords: DNSRecord[];
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * DNS record for domain verification
 */
export interface DNSRecord {
    type: 'CNAME' | 'A' | 'TXT' | 'MX';
    name: string;
    value: string;
    ttl: number;
    verified: boolean;
}

/**
 * SSO configuration
 */
export interface SSOConfig {
    id: string;
    tenantId: string;
    provider: SSOProvider;
    enabled: boolean;
    /** Identity Provider metadata URL (for SAML) */
    metadataUrl?: string;
    /** Identity Provider Entity ID */
    entityId?: string;
    /** SSO URL */
    ssoUrl?: string;
    /** Single Logout URL */
    sloUrl?: string;
    /** X.509 Certificate */
    certificate?: string;
    /** OIDC Client ID */
    clientId?: string;
    /** OIDC Client Secret (encrypted) */
    clientSecret?: string;
    /** OIDC Issuer URL */
    issuerUrl?: string;
    /** OIDC Scopes */
    scopes?: string[];
    /** Attribute mapping */
    attributeMapping: AttributeMapping;
    /** Auto-provision users on first login */
    autoProvision: boolean;
    /** Default role for auto-provisioned users */
    defaultRole: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Attribute mapping for SSO
 */
export interface AttributeMapping {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    department?: string;
    title?: string;
    groups?: string;
}

/**
 * Enterprise tenant configuration
 */
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    tier: EnterpriseTier;
    /** Primary contact user ID */
    ownerId: string;
    /** Billing contact email */
    billingEmail: string;
    /** Company information */
    company: CompanyInfo;
    /** Branding configuration */
    branding: BrandingConfig;
    /** Custom domains */
    domains: CustomDomain[];
    /** SSO configuration */
    ssoConfig?: SSOConfig;
    /** Feature flags */
    features: TenantFeatures;
    /** Resource limits */
    limits: TenantLimits;
    /** Data residency region */
    dataRegion: DataRegion;
    /** Contract details */
    contract?: ContractDetails;
    /** Metadata */
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Company information
 */
export interface CompanyInfo {
    legalName: string;
    displayName: string;
    taxId?: string;
    industry: string;
    size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    phone?: string;
    website?: string;
}

/**
 * Tenant feature flags
 */
export interface TenantFeatures {
    /** White-label branding */
    customBranding: boolean;
    /** Custom domain support */
    customDomain: boolean;
    /** SSO integration */
    ssoEnabled: boolean;
    /** Private marketplace */
    privateMarketplace: boolean;
    /** Custom AI model training */
    customAiTraining: boolean;
    /** Advanced analytics */
    advancedAnalytics: boolean;
    /** API access */
    apiAccess: boolean;
    /** Real-time collaboration */
    realtimeCollaboration: boolean;
    /** Priority support */
    prioritySupport: boolean;
    /** Dedicated infrastructure */
    dedicatedInfrastructure: boolean;
    /** Audit logging */
    auditLogging: boolean;
    /** Data export */
    dataExport: boolean;
    /** Custom integrations */
    customIntegrations: boolean;
}

/**
 * Tenant resource limits
 */
export interface TenantLimits {
    /** Maximum number of users */
    maxUsers: number;
    /** Maximum number of teams */
    maxTeams: number;
    /** Maximum AI generations per month */
    maxGenerationsPerMonth: number;
    /** Maximum storage in GB */
    maxStorageGb: number;
    /** Maximum API calls per hour */
    maxApiCallsPerHour: number;
    /** Maximum designs */
    maxDesigns: number;
    /** Maximum custom domains */
    maxCustomDomains: number;
}

/**
 * Contract details for enterprise customers
 */
export interface ContractDetails {
    startDate: Date;
    endDate: Date;
    value: number;
    currency: string;
    billingCycle: 'monthly' | 'quarterly' | 'annual';
    autoRenew: boolean;
    paymentTerms: string;
    slaLevel: 'standard' | 'premium' | 'enterprise';
    uptimeGuarantee: number; // e.g., 99.99
    penaltyRate?: number;
    signedBy: string;
    signedAt: Date;
}

// ============================================================================
// WORKFLOW & APPROVAL TYPES
// ============================================================================

/**
 * Workflow stage status
 */
export type WorkflowStageStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';

/**
 * Workflow types
 */
export type WorkflowType =
    | 'design_approval'
    | 'publication'
    | 'manufacturing'
    | 'licensing'
    | 'content_moderation'
    | 'custom';

/**
 * Workflow stage definition
 */
export interface WorkflowStage {
    id: string;
    name: string;
    description: string;
    order: number;
    /** Required approvers (user IDs or role names) */
    approvers: string[];
    /** Minimum approvals required to pass */
    minApprovals: number;
    /** Auto-approve conditions */
    autoApproveConditions?: WorkflowCondition[];
    /** Auto-reject conditions */
    autoRejectConditions?: WorkflowCondition[];
    /** Timeout in hours (0 = no timeout) */
    timeoutHours: number;
    /** Action on timeout */
    timeoutAction: 'approve' | 'reject' | 'escalate' | 'notify';
    /** Escalation target (user ID or role) */
    escalationTarget?: string;
    /** Required fields/checklist */
    requiredFields?: string[];
    /** Notification settings */
    notifications: StageNotifications;
}

/**
 * Workflow condition for automation
 */
export interface WorkflowCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: unknown;
}

/**
 * Stage notification settings
 */
export interface StageNotifications {
    onEnter: boolean;
    onApprove: boolean;
    onReject: boolean;
    onTimeout: boolean;
    channels: ('email' | 'slack' | 'teams' | 'in_app')[];
}

/**
 * Workflow template
 */
export interface WorkflowTemplate {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    type: WorkflowType;
    stages: WorkflowStage[];
    isDefault: boolean;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Workflow instance (active workflow for an item)
 */
export interface WorkflowInstance {
    id: string;
    templateId: string;
    tenantId: string;
    /** The item being processed (design, listing, etc.) */
    targetType: 'design' | 'listing' | 'order' | 'license' | 'content';
    targetId: string;
    currentStageId: string;
    currentStageIndex: number;
    status: 'active' | 'completed' | 'canceled' | 'failed';
    stageHistory: StageHistoryEntry[];
    startedBy: string;
    startedAt: Date;
    completedAt?: Date;
    metadata: Record<string, unknown>;
}

/**
 * Stage history entry
 */
export interface StageHistoryEntry {
    stageId: string;
    stageName: string;
    status: WorkflowStageStatus;
    enteredAt: Date;
    completedAt?: Date;
    approvals: ApprovalRecord[];
    comments: WorkflowComment[];
}

/**
 * Approval record
 */
export interface ApprovalRecord {
    userId: string;
    userName: string;
    action: 'approved' | 'rejected' | 'delegated';
    comment?: string;
    timestamp: Date;
    delegatedTo?: string;
}

/**
 * Workflow comment
 */
export interface WorkflowComment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    attachments?: string[];
    timestamp: Date;
}

// ============================================================================
// PROJECT & KANBAN TYPES
// ============================================================================

/**
 * Project status
 */
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'canceled';

/**
 * Task priority
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Task status
 */
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

/**
 * Project definition
 */
export interface Project {
    id: string;
    tenantId: string;
    teamId: string;
    name: string;
    description: string;
    status: ProjectStatus;
    /** Project type/category */
    type: 'collection' | 'campaign' | 'client_project' | 'internal' | 'custom';
    /** Target dates */
    startDate: Date;
    targetDate: Date;
    completedDate?: Date;
    /** Budget information */
    budget?: ProjectBudget;
    /** Associated designs */
    designIds: string[];
    /** Board columns for Kanban */
    columns: KanbanColumn[];
    /** Project members */
    members: ProjectMember[];
    /** Tags for filtering */
    tags: string[];
    /** Custom fields */
    customFields: Record<string, unknown>;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Project budget tracking
 */
export interface ProjectBudget {
    total: number;
    spent: number;
    currency: string;
    categories: BudgetCategory[];
}

/**
 * Budget category
 */
export interface BudgetCategory {
    name: string;
    allocated: number;
    spent: number;
}

/**
 * Kanban column
 */
export interface KanbanColumn {
    id: string;
    name: string;
    order: number;
    color: string;
    wipLimit?: number; // Work in progress limit
    taskIds: string[];
}

/**
 * Project member
 */
export interface ProjectMember {
    userId: string;
    role: 'lead' | 'member' | 'viewer';
    joinedAt: Date;
}

/**
 * Task/card in Kanban
 */
export interface Task {
    id: string;
    projectId: string;
    columnId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    /** Assigned users */
    assigneeIds: string[];
    /** Related design */
    designId?: string;
    /** Due date */
    dueDate?: Date;
    /** Time tracking */
    timeTracking?: TimeTracking;
    /** Checklist items */
    checklist: ChecklistItem[];
    /** Attachments */
    attachments: TaskAttachment[];
    /** Labels/tags */
    labels: string[];
    /** Order within column */
    order: number;
    /** Dependencies */
    dependencies: string[];
    /** Comments */
    comments: TaskComment[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Time tracking for tasks
 */
export interface TimeTracking {
    estimated: number; // minutes
    logged: number; // minutes
    entries: TimeEntry[];
}

/**
 * Time entry
 */
export interface TimeEntry {
    id: string;
    userId: string;
    duration: number; // minutes
    description?: string;
    billable: boolean;
    date: Date;
}

/**
 * Checklist item
 */
export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    completedBy?: string;
    completedAt?: Date;
}

/**
 * Task attachment
 */
export interface TaskAttachment {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedBy: string;
    uploadedAt: Date;
}

/**
 * Task comment
 */
export interface TaskComment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    mentions: string[];
    timestamp: Date;
    editedAt?: Date;
}

// ============================================================================
// ORGANIZATION HIERARCHY TYPES
// ============================================================================

/**
 * Organization unit type
 */
export type OrgUnitType = 'company' | 'division' | 'department' | 'team' | 'group';

/**
 * Organization unit (hierarchical structure)
 */
export interface OrganizationUnit {
    id: string;
    tenantId: string;
    parentId: string | null;
    type: OrgUnitType;
    name: string;
    description?: string;
    code?: string; // Short code like "ENG", "DESIGN"
    managerId?: string;
    memberIds: string[];
    settings: OrgUnitSettings;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Organization unit settings
 */
export interface OrgUnitSettings {
    /** Can members create sub-units */
    allowSubUnits: boolean;
    /** Inherit permissions from parent */
    inheritPermissions: boolean;
    /** Custom permissions */
    permissions: string[];
    /** Budget allocation */
    budget?: number;
    /** Resource limits */
    limits?: Partial<TenantLimits>;
}

// ============================================================================
// API & INTEGRATION TYPES
// ============================================================================

/**
 * API key type
 */
export type ApiKeyType = 'test' | 'live' | 'restricted';

/**
 * API key permissions
 */
export type ApiPermission =
    | 'designs:read'
    | 'designs:write'
    | 'designs:delete'
    | 'users:read'
    | 'users:write'
    | 'teams:read'
    | 'teams:write'
    | 'analytics:read'
    | 'webhooks:manage'
    | 'billing:read'
    | 'billing:write'
    | 'admin:full';

/**
 * API key
 */
export interface ApiKey {
    id: string;
    tenantId: string;
    userId: string;
    name: string;
    type: ApiKeyType;
    /** Key prefix (shown to user, e.g., "nf_live_") */
    prefix: string;
    /** Hashed key (for verification) */
    keyHash: string;
    /** Last 4 characters (for display) */
    last4: string;
    /** Permissions granted */
    permissions: ApiPermission[];
    /** IP whitelist (empty = all allowed) */
    ipWhitelist: string[];
    /** Rate limit override */
    rateLimit?: number;
    /** Expiration date */
    expiresAt?: Date;
    /** Last used timestamp */
    lastUsedAt?: Date;
    /** Usage count */
    usageCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * API usage record
 */
export interface ApiUsageRecord {
    id: string;
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
    timestamp: Date;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
    id: string;
    tenantId: string;
    name: string;
    url: string;
    /** Secret for signature verification */
    secret: string;
    /** Events to subscribe to */
    events: WebhookEvent[];
    /** Custom headers */
    headers: Record<string, string>;
    /** Retry configuration */
    retryConfig: {
        maxRetries: number;
        retryDelayMs: number;
        exponentialBackoff: boolean;
    };
    isActive: boolean;
    /** Last delivery status */
    lastDelivery?: {
        timestamp: Date;
        success: boolean;
        statusCode?: number;
        error?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Webhook event types
 */
export type WebhookEvent =
    | 'design.created'
    | 'design.updated'
    | 'design.deleted'
    | 'design.published'
    | 'order.created'
    | 'order.updated'
    | 'order.completed'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'license.created'
    | 'license.expired'
    | 'user.created'
    | 'user.updated'
    | 'team.created'
    | 'workflow.completed'
    | 'workflow.rejected';

/**
 * Webhook delivery record
 */
export interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: Record<string, unknown>;
    response?: {
        statusCode: number;
        body: string;
        headers: Record<string, string>;
    };
    attempts: number;
    status: 'pending' | 'success' | 'failed';
    nextRetryAt?: Date;
    createdAt: Date;
    completedAt?: Date;
}

/**
 * Integration configuration
 */
export interface Integration {
    id: string;
    tenantId: string;
    type: IntegrationType;
    name: string;
    config: Record<string, unknown>;
    credentials: Record<string, string>; // Encrypted
    status: 'connected' | 'disconnected' | 'error';
    lastSyncAt?: Date;
    syncErrors?: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Integration types
 */
export type IntegrationType =
    | 'adobe_creative_cloud'
    | 'figma'
    | 'sketch'
    | 'clo3d'
    | 'browzwear'
    | 'shopify'
    | 'magento'
    | 'woocommerce'
    | 'sap'
    | 'netsuite'
    | 'centric_plm'
    | 'infor_plm'
    | 'lectra'
    | 'slack'
    | 'microsoft_teams'
    | 'jira'
    | 'asana'
    | 'google_drive'
    | 'dropbox'
    | 'aws_s3';

// ============================================================================
// SECURITY & COMPLIANCE TYPES
// ============================================================================

/**
 * Audit log action types
 */
export type AuditAction =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'export'
    | 'import'
    | 'share'
    | 'approve'
    | 'reject'
    | 'invite'
    | 'revoke'
    | 'settings_change'
    | 'permission_change';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
    id: string;
    tenantId: string;
    userId: string;
    userName: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    resourceName?: string;
    changes?: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
    metadata: {
        ip: string;
        userAgent: string;
        location?: string;
        sessionId?: string;
    };
    timestamp: Date;
    /** Retention date (for GDPR compliance) */
    expiresAt: Date;
}

/**
 * Compliance framework
 */
export type ComplianceFramework = 'soc2' | 'gdpr' | 'ccpa' | 'hipaa' | 'iso27001';

/**
 * Data processing agreement
 */
export interface DataProcessingAgreement {
    id: string;
    tenantId: string;
    framework: ComplianceFramework;
    version: string;
    signedBy: string;
    signedAt: Date;
    documentUrl: string;
    expiresAt?: Date;
}

/**
 * Data subject request (GDPR)
 */
export interface DataSubjectRequest {
    id: string;
    tenantId: string;
    type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
    subjectEmail: string;
    subjectId?: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    requestedAt: Date;
    dueDate: Date;
    completedAt?: Date;
    responseUrl?: string;
    notes?: string;
    handledBy?: string;
}

/**
 * Security policy
 */
export interface SecurityPolicy {
    id: string;
    tenantId: string;
    /** Password requirements */
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        maxAge: number; // days, 0 = never expires
        preventReuse: number; // number of previous passwords to check
    };
    /** Session settings */
    sessionPolicy: {
        maxDuration: number; // hours
        idleTimeout: number; // minutes
        maxConcurrentSessions: number;
        requireReauthForSensitive: boolean;
    };
    /** MFA settings */
    mfaPolicy: {
        required: boolean;
        methods: ('totp' | 'sms' | 'email' | 'hardware_key')[];
        gracePeriodDays: number;
    };
    /** IP restrictions */
    ipPolicy: {
        enabled: boolean;
        allowlist: string[];
        blocklist: string[];
        geoRestrictions?: string[]; // country codes
    };
    updatedAt: Date;
    updatedBy: string;
}

// ============================================================================
// ENTERPRISE AI TYPES
// ============================================================================

/**
 * Brand DNA profile
 */
export interface BrandDNA {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    /** Core brand attributes */
    attributes: {
        aesthetic: string[];
        values: string[];
        personality: string[];
        targetAudience: string[];
    };
    /** Visual identity */
    visualIdentity: {
        primaryColors: string[];
        secondaryColors: string[];
        typography: string[];
        patterns: string[];
        imagery: string[];
    };
    /** Style signatures */
    styleSignatures: {
        silhouettes: string[];
        materials: string[];
        details: string[];
        techniques: string[];
    };
    /** Historical designs analyzed */
    trainingDesigns: string[];
    /** Model version */
    modelVersion: string;
    /** Confidence scores */
    confidence: {
        overall: number;
        aesthetic: number;
        visual: number;
        style: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Custom AI model
 */
export interface CustomAIModel {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    type: 'fine_tuned' | 'lora' | 'embedding';
    baseModel: string;
    status: 'training' | 'ready' | 'failed' | 'archived';
    /** Training configuration */
    trainingConfig: {
        epochs: number;
        batchSize: number;
        learningRate: number;
        trainingImages: number;
        validationSplit: number;
    };
    /** Training metrics */
    metrics?: {
        loss: number;
        accuracy: number;
        trainingTime: number;
        gpuHours: number;
    };
    /** Cost tracking */
    cost: number;
    /** Usage statistics */
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Demand forecast
 */
export interface DemandForecast {
    id: string;
    tenantId: string;
    designId?: string;
    category?: string;
    /** Forecast period */
    period: {
        start: Date;
        end: Date;
    };
    /** Predictions */
    predictions: ForecastPrediction[];
    /** Confidence interval */
    confidence: number;
    /** Contributing factors */
    factors: {
        name: string;
        impact: number;
        direction: 'positive' | 'negative';
    }[];
    /** Model used */
    modelVersion: string;
    createdAt: Date;
}

/**
 * Forecast prediction point
 */
export interface ForecastPrediction {
    date: Date;
    predictedDemand: number;
    lowerBound: number;
    upperBound: number;
    seasonalFactor: number;
    trendFactor: number;
}

/**
 * Market intelligence report
 */
export interface MarketIntelligence {
    id: string;
    tenantId: string;
    type: 'competitor_analysis' | 'trend_report' | 'pricing_analysis' | 'market_overview';
    title: string;
    summary: string;
    /** Report sections */
    sections: ReportSection[];
    /** Data sources */
    sources: string[];
    /** Generated insights */
    insights: MarketInsight[];
    /** Recommendations */
    recommendations: string[];
    generatedAt: Date;
    expiresAt: Date;
}

/**
 * Report section
 */
export interface ReportSection {
    title: string;
    content: string;
    charts?: ChartData[];
    tables?: TableData[];
}

/**
 * Chart data for reports
 */
export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    title: string;
    data: Record<string, unknown>[];
    xAxis: string;
    yAxis: string;
}

/**
 * Table data for reports
 */
export interface TableData {
    title: string;
    headers: string[];
    rows: unknown[][];
}

/**
 * Market insight
 */
export interface MarketInsight {
    category: string;
    insight: string;
    confidence: number;
    actionable: boolean;
    priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Analytics dashboard configuration
 */
export interface AnalyticsDashboard {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    layout: WidgetLayout[];
    isDefault: boolean;
    sharedWith: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    metric: string;
    /** Data query configuration */
    query: {
        source: string;
        filters: Record<string, unknown>;
        groupBy?: string;
        timeRange?: string;
        aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    };
    /** Visualization options */
    options: Record<string, unknown>;
}

/**
 * Widget types
 */
export type WidgetType =
    | 'metric'
    | 'chart_line'
    | 'chart_bar'
    | 'chart_pie'
    | 'chart_area'
    | 'table'
    | 'list'
    | 'map'
    | 'funnel'
    | 'heatmap';

/**
 * Widget layout position
 */
export interface WidgetLayout {
    widgetId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Analytics metric definition
 */
export interface AnalyticsMetric {
    id: string;
    name: string;
    description: string;
    category: 'engagement' | 'revenue' | 'performance' | 'usage' | 'growth';
    unit: string;
    calculation: string;
    isRealtime: boolean;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
    // Re-export for convenience
    EnterpriseTier as Tier,
    TenantStatus as Status,
};
