/**
 * Security & Compliance Service - Phase 6 Enterprise & Scale
 *
 * Manages audit logging, data subject requests (GDPR),
 * security policies, and compliance frameworks.
 */

import type {
    AuditLogEntry,
    AuditAction,
    DataProcessingAgreement,
    DataSubjectRequest,
    SecurityPolicy,
    ComplianceFramework,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default password policy
 */
export const DEFAULT_PASSWORD_POLICY: SecurityPolicy['passwordPolicy'] = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // days
    preventReuse: 5,
};

/**
 * Default session policy
 */
export const DEFAULT_SESSION_POLICY: SecurityPolicy['sessionPolicy'] = {
    maxDuration: 24, // hours
    idleTimeout: 30, // minutes
    maxConcurrentSessions: 3,
    requireReauthForSensitive: true,
};

/**
 * Default MFA policy
 */
export const DEFAULT_MFA_POLICY: SecurityPolicy['mfaPolicy'] = {
    required: false,
    methods: ['totp', 'email'],
    gracePeriodDays: 7,
};

/**
 * Enterprise MFA policy (stricter)
 */
export const ENTERPRISE_MFA_POLICY: SecurityPolicy['mfaPolicy'] = {
    required: true,
    methods: ['totp', 'hardware_key'],
    gracePeriodDays: 0,
};

/**
 * Audit log retention periods (days) by compliance framework
 */
export const AUDIT_RETENTION_DAYS: Record<ComplianceFramework | 'default', number> = {
    default: 365 * 2, // 2 years
    soc2: 365 * 7, // 7 years
    gdpr: 365 * 3, // 3 years
    ccpa: 365 * 3, // 3 years
    hipaa: 365 * 6, // 6 years
    iso27001: 365 * 3, // 3 years
};

/**
 * DSR response deadlines (days)
 */
export const DSR_DEADLINES: Record<DataSubjectRequest['type'], number> = {
    access: 30,
    rectification: 30,
    erasure: 30,
    portability: 30,
    restriction: 30,
    objection: 30,
};

// ============================================================================
// STORES (Mock for development)
// ============================================================================

const auditLogStore = new Map<string, AuditLogEntry[]>();
const dsrStore = new Map<string, DataSubjectRequest>();
const dpaStore = new Map<string, DataProcessingAgreement>();
const securityPolicyStore = new Map<string, SecurityPolicy>();

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// AUDIT LOGGING SERVICE
// ============================================================================

/**
 * Create audit log entry
 */
export async function logAuditEvent(params: {
    tenantId: string;
    userId: string;
    userName: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    resourceName?: string;
    changes?: AuditLogEntry['changes'];
    metadata: {
        ip: string;
        userAgent: string;
        location?: string;
        sessionId?: string;
    };
    retentionDays?: number;
}): Promise<{ entry: AuditLogEntry; error: string | null }> {
    const now = new Date();
    const retentionDays = params.retentionDays || AUDIT_RETENTION_DAYS.default;

    const entry: AuditLogEntry = {
        id: generateId(),
        tenantId: params.tenantId,
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        resourceName: params.resourceName,
        changes: params.changes,
        metadata: params.metadata,
        timestamp: now,
        expiresAt: new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000),
    };

    const tenantLogs = auditLogStore.get(params.tenantId) || [];
    tenantLogs.push(entry);
    auditLogStore.set(params.tenantId, tenantLogs);

    return { entry, error: null };
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(params: {
    tenantId: string;
    filters?: {
        userId?: string;
        action?: AuditAction;
        resourceType?: string;
        resourceId?: string;
        startDate?: Date;
        endDate?: Date;
        ip?: string;
    };
    page?: number;
    pageSize?: number;
}): Promise<{
    entries: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
}> {
    let entries = auditLogStore.get(params.tenantId) || [];

    // Apply filters
    if (params.filters) {
        const f = params.filters;
        if (f.userId) {
            entries = entries.filter(e => e.userId === f.userId);
        }
        if (f.action) {
            entries = entries.filter(e => e.action === f.action);
        }
        if (f.resourceType) {
            entries = entries.filter(e => e.resourceType === f.resourceType);
        }
        if (f.resourceId) {
            entries = entries.filter(e => e.resourceId === f.resourceId);
        }
        if (f.startDate) {
            entries = entries.filter(e => e.timestamp >= f.startDate!);
        }
        if (f.endDate) {
            entries = entries.filter(e => e.timestamp <= f.endDate!);
        }
        if (f.ip) {
            entries = entries.filter(e => e.metadata.ip === f.ip);
        }
    }

    // Sort by timestamp descending
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = entries.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const start = (page - 1) * pageSize;

    return {
        entries: entries.slice(start, start + pageSize),
        total,
        page,
        pageSize,
    };
}

/**
 * Get audit log by ID
 */
export async function getAuditLog(
    tenantId: string,
    logId: string
): Promise<AuditLogEntry | null> {
    const entries = auditLogStore.get(tenantId) || [];
    return entries.find(e => e.id === logId) || null;
}

/**
 * Export audit logs (for compliance)
 */
export async function exportAuditLogs(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    format: 'json' | 'csv';
}): Promise<{ data: string; filename: string }> {
    const { entries } = await queryAuditLogs({
        tenantId: params.tenantId,
        filters: {
            startDate: params.startDate,
            endDate: params.endDate,
        },
        pageSize: 100000, // Export all
    });

    const filename = `audit_logs_${params.tenantId}_${params.startDate.toISOString().split('T')[0]}_${params.endDate.toISOString().split('T')[0]}.${params.format}`;

    if (params.format === 'csv') {
        const headers = [
            'id',
            'timestamp',
            'userId',
            'userName',
            'action',
            'resourceType',
            'resourceId',
            'resourceName',
            'ip',
            'userAgent',
        ];
        const rows = entries.map(e => [
            e.id,
            e.timestamp.toISOString(),
            e.userId,
            e.userName,
            e.action,
            e.resourceType,
            e.resourceId,
            e.resourceName || '',
            e.metadata.ip,
            e.metadata.userAgent,
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        return { data: csv, filename };
    } else {
        return { data: JSON.stringify(entries, null, 2), filename };
    }
}

/**
 * Delete expired audit logs
 */
export async function cleanupExpiredAuditLogs(tenantId: string): Promise<number> {
    const entries = auditLogStore.get(tenantId) || [];
    const now = new Date();
    const validEntries = entries.filter(e => e.expiresAt > now);
    const deletedCount = entries.length - validEntries.length;

    auditLogStore.set(tenantId, validEntries);
    console.log(`[Security] Cleaned up ${deletedCount} expired audit logs for tenant ${tenantId}`);

    return deletedCount;
}

// ============================================================================
// DATA SUBJECT REQUEST SERVICE (GDPR)
// ============================================================================

/**
 * Create data subject request
 */
export async function createDataSubjectRequest(params: {
    tenantId: string;
    type: DataSubjectRequest['type'];
    subjectEmail: string;
    subjectId?: string;
    notes?: string;
}): Promise<{ request: DataSubjectRequest; error: string | null }> {
    const now = new Date();
    const deadlineDays = DSR_DEADLINES[params.type];

    const request: DataSubjectRequest = {
        id: generateId(),
        tenantId: params.tenantId,
        type: params.type,
        subjectEmail: params.subjectEmail,
        subjectId: params.subjectId,
        status: 'pending',
        requestedAt: now,
        dueDate: new Date(now.getTime() + deadlineDays * 24 * 60 * 60 * 1000),
        notes: params.notes,
    };

    dsrStore.set(request.id, request);
    console.log(`[Security] Created DSR: ${request.type} for ${request.subjectEmail} (${request.id})`);

    return { request, error: null };
}

/**
 * Get data subject request
 */
export async function getDataSubjectRequest(requestId: string): Promise<DataSubjectRequest | null> {
    return dsrStore.get(requestId) || null;
}

/**
 * List data subject requests for tenant
 */
export async function listDataSubjectRequests(
    tenantId: string,
    status?: DataSubjectRequest['status']
): Promise<DataSubjectRequest[]> {
    let requests = Array.from(dsrStore.values()).filter(r => r.tenantId === tenantId);

    if (status) {
        requests = requests.filter(r => r.status === status);
    }

    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
}

/**
 * Update DSR status
 */
export async function updateDataSubjectRequest(
    requestId: string,
    updates: Partial<Pick<DataSubjectRequest, 'status' | 'responseUrl' | 'notes' | 'handledBy'>>
): Promise<{ request: DataSubjectRequest | null; error: string | null }> {
    const request = dsrStore.get(requestId);
    if (!request) {
        return { request: null, error: 'Request not found' };
    }

    const updated: DataSubjectRequest = {
        ...request,
        ...updates,
    };

    if (updates.status === 'completed' && !request.completedAt) {
        updated.completedAt = new Date();
    }

    dsrStore.set(requestId, updated);
    return { request: updated, error: null };
}

/**
 * Process access request (generate data export)
 */
export async function processAccessRequest(requestId: string): Promise<{
    success: boolean;
    exportUrl: string | null;
    error: string | null;
}> {
    const request = dsrStore.get(requestId);
    if (!request) {
        return { success: false, exportUrl: null, error: 'Request not found' };
    }

    if (request.type !== 'access') {
        return { success: false, exportUrl: null, error: 'Not an access request' };
    }

    // Mock data export URL
    const exportUrl = `https://exports.nanofashion.io/dsr/${requestId}/data.json`;

    request.status = 'completed';
    request.completedAt = new Date();
    request.responseUrl = exportUrl;
    dsrStore.set(requestId, request);

    console.log(`[Security] Processed access request: ${requestId}`);
    return { success: true, exportUrl, error: null };
}

/**
 * Process erasure request
 */
export async function processErasureRequest(requestId: string): Promise<{
    success: boolean;
    deletedItems: number;
    error: string | null;
}> {
    const request = dsrStore.get(requestId);
    if (!request) {
        return { success: false, deletedItems: 0, error: 'Request not found' };
    }

    if (request.type !== 'erasure') {
        return { success: false, deletedItems: 0, error: 'Not an erasure request' };
    }

    // Mock deletion - in production would delete actual user data
    const deletedItems = Math.floor(Math.random() * 50) + 10;

    request.status = 'completed';
    request.completedAt = new Date();
    request.notes = `${deletedItems} data items deleted`;
    dsrStore.set(requestId, request);

    console.log(`[Security] Processed erasure request: ${requestId}, deleted ${deletedItems} items`);
    return { success: true, deletedItems, error: null };
}

/**
 * Get overdue DSRs
 */
export async function getOverdueRequests(tenantId: string): Promise<DataSubjectRequest[]> {
    const now = new Date();
    return Array.from(dsrStore.values()).filter(
        r => r.tenantId === tenantId && r.status === 'pending' && r.dueDate < now
    );
}

// ============================================================================
// DATA PROCESSING AGREEMENT SERVICE
// ============================================================================

/**
 * Create DPA
 */
export async function createDpa(params: {
    tenantId: string;
    framework: ComplianceFramework;
    version: string;
    signedBy: string;
    documentUrl: string;
    expiresAt?: Date;
}): Promise<{ dpa: DataProcessingAgreement; error: string | null }> {
    const dpa: DataProcessingAgreement = {
        id: generateId(),
        tenantId: params.tenantId,
        framework: params.framework,
        version: params.version,
        signedBy: params.signedBy,
        signedAt: new Date(),
        documentUrl: params.documentUrl,
        expiresAt: params.expiresAt,
    };

    dpaStore.set(dpa.id, dpa);
    console.log(`[Security] Created DPA: ${dpa.framework} for tenant ${dpa.tenantId}`);

    return { dpa, error: null };
}

/**
 * Get DPAs for tenant
 */
export async function getTenantDpas(tenantId: string): Promise<DataProcessingAgreement[]> {
    return Array.from(dpaStore.values())
        .filter(d => d.tenantId === tenantId)
        .sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime());
}

/**
 * Check if tenant has valid DPA for framework
 */
export async function hasValidDpa(
    tenantId: string,
    framework: ComplianceFramework
): Promise<boolean> {
    const now = new Date();
    const dpas = await getTenantDpas(tenantId);

    return dpas.some(
        d => d.framework === framework && (!d.expiresAt || d.expiresAt > now)
    );
}

// ============================================================================
// SECURITY POLICY SERVICE
// ============================================================================

/**
 * Get or create security policy for tenant
 */
export async function getSecurityPolicy(tenantId: string): Promise<SecurityPolicy> {
    const existing = securityPolicyStore.get(tenantId);
    if (existing) {
        return existing;
    }

    // Create default policy
    const policy: SecurityPolicy = {
        id: generateId(),
        tenantId,
        passwordPolicy: { ...DEFAULT_PASSWORD_POLICY },
        sessionPolicy: { ...DEFAULT_SESSION_POLICY },
        mfaPolicy: { ...DEFAULT_MFA_POLICY },
        ipPolicy: {
            enabled: false,
            allowlist: [],
            blocklist: [],
        },
        updatedAt: new Date(),
        updatedBy: 'system',
    };

    securityPolicyStore.set(tenantId, policy);
    return policy;
}

/**
 * Update security policy
 */
export async function updateSecurityPolicy(
    tenantId: string,
    updates: Partial<Pick<SecurityPolicy, 'passwordPolicy' | 'sessionPolicy' | 'mfaPolicy' | 'ipPolicy'>>,
    updatedBy: string
): Promise<{ policy: SecurityPolicy; error: string | null }> {
    const current = await getSecurityPolicy(tenantId);

    const updated: SecurityPolicy = {
        ...current,
        ...updates,
        updatedAt: new Date(),
        updatedBy,
    };

    securityPolicyStore.set(tenantId, updated);
    console.log(`[Security] Updated security policy for tenant ${tenantId}`);

    return { policy: updated, error: null };
}

/**
 * Validate password against policy
 */
export function validatePassword(
    password: string,
    policy: SecurityPolicy['passwordPolicy']
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < policy.minLength) {
        errors.push(`Password must be at least ${policy.minLength} characters`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Check if password was recently used
 */
export async function isPasswordReused(
    _userId: string,
    _passwordHash: string,
    _preventReuse: number
): Promise<boolean> {
    // Mock implementation - in production would check password history
    return false;
}

/**
 * Check if session is valid
 */
export function isSessionValid(
    sessionStart: Date,
    lastActivity: Date,
    policy: SecurityPolicy['sessionPolicy']
): { valid: boolean; reason?: string } {
    const now = new Date();
    const sessionAge = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60); // hours
    const idleTime = (now.getTime() - lastActivity.getTime()) / (1000 * 60); // minutes

    if (sessionAge > policy.maxDuration) {
        return { valid: false, reason: 'Session expired (max duration reached)' };
    }

    if (idleTime > policy.idleTimeout) {
        return { valid: false, reason: 'Session expired (idle timeout)' };
    }

    return { valid: true };
}

/**
 * Check IP against policy
 */
export function checkIpPolicy(
    ip: string,
    policy: SecurityPolicy['ipPolicy']
): { allowed: boolean; reason?: string } {
    if (!policy.enabled) {
        return { allowed: true };
    }

    if (policy.blocklist.includes(ip)) {
        return { allowed: false, reason: 'IP address is blocked' };
    }

    if (policy.allowlist.length > 0 && !policy.allowlist.includes(ip)) {
        return { allowed: false, reason: 'IP address not in allowlist' };
    }

    return { allowed: true };
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
    tenantId: string,
    framework: ComplianceFramework
): Promise<{
    framework: ComplianceFramework;
    generatedAt: Date;
    summary: {
        passed: number;
        failed: number;
        notApplicable: number;
    };
    controls: Array<{
        id: string;
        name: string;
        status: 'passed' | 'failed' | 'not_applicable';
        evidence?: string;
    }>;
}> {
    // Mock compliance report with various control statuses
    const controls: Array<{
        id: string;
        name: string;
        status: 'passed' | 'failed' | 'not_applicable';
    }> = [
            { id: 'AC-1', name: 'Access Control Policy', status: 'passed' },
            { id: 'AC-2', name: 'Account Management', status: 'passed' },
            { id: 'AC-3', name: 'Access Enforcement', status: 'passed' },
            { id: 'AU-1', name: 'Audit Policy', status: 'passed' },
            { id: 'AU-2', name: 'Audit Events', status: 'passed' },
            { id: 'AU-3', name: 'Content of Audit Records', status: 'passed' },
            { id: 'IA-1', name: 'Identification and Authentication Policy', status: 'passed' },
            { id: 'IA-2', name: 'Identification and Authentication (Users)', status: 'passed' },
            { id: 'SC-1', name: 'System and Communications Protection Policy', status: 'passed' },
            { id: 'SC-7', name: 'Boundary Protection', status: 'passed' },
        ];

    const passed = controls.filter(c => c.status === 'passed').length;
    const failed = controls.filter(c => c.status === 'failed').length;
    const notApplicable = controls.filter(c => c.status === 'not_applicable').length;

    return {
        framework,
        generatedAt: new Date(),
        summary: { passed, failed, notApplicable },
        controls,
    };
}

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

/**
 * Encrypt sensitive data (mock implementation)
 */
export function encryptData(data: string, _keyId?: string): string {
    // In production, use AES-256-GCM with proper key management
    return btoa(data);
}

/**
 * Decrypt sensitive data (mock implementation)
 */
export function decryptData(encryptedData: string, _keyId?: string): string {
    // In production, use AES-256-GCM with proper key management
    return atob(encryptedData);
}

/**
 * Hash sensitive data (mock implementation)
 */
export function hashData(data: string): string {
    // In production, use bcrypt or argon2
    return btoa(data);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SecurityService = {
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
};

export default SecurityService;
