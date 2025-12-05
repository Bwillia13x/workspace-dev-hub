/**
 * Trust & Verification Service - Phase 5 E-commerce
 *
 * Comprehensive trust system including:
 * - Identity verification
 * - Business verification
 * - Portfolio verification
 * - Trust scores
 * - Fraud detection
 * - Dispute resolution support
 */

import type {
    TrustScore,
    DesignerProfile,
    CopyrightClaim,
    DesignAuthenticity,
    DisputeReason,
    DisputeStatus,
    Dispute,
    DisputeMessage,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export type VerificationLevel = 'none' | 'email' | 'identity' | 'business' | 'premium';

export interface VerificationRequest {
    id: string;
    userId: string;
    level: VerificationLevel;
    status: 'pending' | 'reviewing' | 'approved' | 'rejected';
    documents: VerificationDocument[];
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    rejectionReason?: string;
    expiresAt?: Date;
}

export interface VerificationDocument {
    id: string;
    type: 'id_front' | 'id_back' | 'selfie' | 'business_license' | 'tax_document' | 'portfolio_proof';
    url: string;
    uploadedAt: Date;
    verified: boolean;
}

export interface TrustFactors {
    accountAge: number; // days
    emailVerified: boolean;
    identityVerified: boolean;
    businessVerified: boolean;
    completedOrders: number;
    disputesLost: number;
    disputesWon: number;
    averageRating: number;
    reviewCount: number;
    responseTime: number; // hours
    profileCompleteness: number; // 0-100
}

export interface FraudSignal {
    id: string;
    userId: string;
    type: 'velocity' | 'pattern' | 'device' | 'location' | 'behavior' | 'report';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata: Record<string, unknown>;
    detectedAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

export interface UserReport {
    id: string;
    reporterId: string;
    reportedUserId: string;
    reason: 'fraud' | 'spam' | 'harassment' | 'copyright' | 'inappropriate' | 'other';
    description: string;
    evidence?: string[];
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    resolution?: string;
    createdAt: Date;
    resolvedAt?: Date;
}

export interface CopyrightVerification {
    designId: string;
    originalityScore: number; // 0-100
    similarDesigns: Array<{
        designId: string;
        similarity: number;
        createdAt: Date;
    }>;
    aiGenerated: boolean;
    verifiedAt: Date;
}

// ============================================================================
// TRUST SERVICE
// ============================================================================

export class TrustService {
    private trustScores: Map<string, TrustScore> = new Map();
    private verificationRequests: Map<string, VerificationRequest[]> = new Map();
    private fraudSignals: Map<string, FraudSignal[]> = new Map();
    private userReports: Map<string, UserReport[]> = new Map();
    private copyrightClaims: Map<string, CopyrightClaim[]> = new Map();
    private disputes: Map<string, Dispute[]> = new Map();
    private blockedUsers: Set<string> = new Set();

    // ========================================================================
    // TRUST SCORE MANAGEMENT
    // ========================================================================

    async calculateTrustScore(userId: string, factors: TrustFactors): Promise<TrustScore> {
        let score = 50; // Base score

        // Account age (max +10)
        score += Math.min(factors.accountAge / 36.5, 10);

        // Verification bonuses
        if (factors.emailVerified) score += 5;
        if (factors.identityVerified) score += 15;
        if (factors.businessVerified) score += 10;

        // Order history (max +15)
        score += Math.min(factors.completedOrders * 0.5, 15);

        // Dispute history (can be negative)
        score -= factors.disputesLost * 5;
        score += Math.min(factors.disputesWon * 2, 5);

        // Rating contribution (max +10)
        if (factors.reviewCount >= 5) {
            score += ((factors.averageRating - 3) / 2) * 10;
        }

        // Response time bonus (max +5)
        if (factors.responseTime <= 24) {
            score += 5;
        } else if (factors.responseTime <= 48) {
            score += 3;
        }

        // Profile completeness (max +5)
        score += (factors.profileCompleteness / 100) * 5;

        // Check for fraud signals
        const fraudSignals = this.fraudSignals.get(userId) || [];
        const activeSignals = fraudSignals.filter((s) => !s.resolved);

        for (const signal of activeSignals) {
            switch (signal.severity) {
                case 'low':
                    score -= 5;
                    break;
                case 'medium':
                    score -= 15;
                    break;
                case 'high':
                    score -= 30;
                    break;
                case 'critical':
                    score -= 50;
                    break;
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        const trustScore: TrustScore = {
            userId,
            score: Math.round(score),
            level: this.getTrustLevel(score),
            factors: {
                accountAge: factors.accountAge,
                completedOrders: factors.completedOrders,
                disputeRate:
                    factors.completedOrders > 0
                        ? factors.disputesLost / factors.completedOrders
                        : 0,
                averageRating: factors.averageRating,
                responseTime: factors.responseTime,
                verificationLevel: factors.businessVerified
                    ? 'business'
                    : factors.identityVerified
                        ? 'identity'
                        : factors.emailVerified
                            ? 'email'
                            : 'none',
            },
            lastUpdated: new Date(),
        };

        this.trustScores.set(userId, trustScore);
        return trustScore;
    }

    private getTrustLevel(score: number): TrustScore['level'] {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 50) return 'average';
        if (score >= 25) return 'low';
        return 'poor';
    }

    async getTrustScore(userId: string): Promise<TrustScore | null> {
        return this.trustScores.get(userId) || null;
    }

    async getUserTrustBadges(userId: string): Promise<string[]> {
        const trustScore = this.trustScores.get(userId);
        const badges: string[] = [];

        if (!trustScore) return badges;

        if (trustScore.factors.verificationLevel === 'business') {
            badges.push('verified-business');
        } else if (trustScore.factors.verificationLevel === 'identity') {
            badges.push('verified-identity');
        }

        if (trustScore.score >= 90) {
            badges.push('trusted-seller');
        }

        if (trustScore.factors.completedOrders >= 100) {
            badges.push('experienced-seller');
        }

        if (trustScore.factors.averageRating >= 4.8) {
            badges.push('highly-rated');
        }

        if (trustScore.factors.responseTime <= 2) {
            badges.push('fast-responder');
        }

        return badges;
    }

    // ========================================================================
    // VERIFICATION
    // ========================================================================

    async requestVerification(
        userId: string,
        level: VerificationLevel,
        documents: Omit<VerificationDocument, 'id' | 'uploadedAt' | 'verified'>[]
    ): Promise<VerificationRequest> {
        // Check if user has pending request for this level
        const existingRequests = this.verificationRequests.get(userId) || [];
        const pendingRequest = existingRequests.find(
            (r) => r.level === level && r.status === 'pending'
        );

        if (pendingRequest) {
            throw new Error('You already have a pending verification request for this level');
        }

        const request: VerificationRequest = {
            id: `ver_${Date.now()}`,
            userId,
            level,
            status: 'pending',
            documents: documents.map((doc) => ({
                ...doc,
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                uploadedAt: new Date(),
                verified: false,
            })),
            submittedAt: new Date(),
        };

        existingRequests.push(request);
        this.verificationRequests.set(userId, existingRequests);

        return request;
    }

    async getVerificationStatus(userId: string): Promise<{
        currentLevel: VerificationLevel;
        pendingRequest?: VerificationRequest;
        history: VerificationRequest[];
    }> {
        const requests = this.verificationRequests.get(userId) || [];

        // Find highest approved level
        const approvedLevels = requests
            .filter((r) => r.status === 'approved')
            .map((r) => r.level);

        let currentLevel: VerificationLevel = 'none';
        if (approvedLevels.includes('premium')) currentLevel = 'premium';
        else if (approvedLevels.includes('business')) currentLevel = 'business';
        else if (approvedLevels.includes('identity')) currentLevel = 'identity';
        else if (approvedLevels.includes('email')) currentLevel = 'email';

        const pendingRequest = requests.find(
            (r) => r.status === 'pending' || r.status === 'reviewing'
        );

        return {
            currentLevel,
            pendingRequest,
            history: requests.sort(
                (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()
            ),
        };
    }

    async reviewVerification(
        requestId: string,
        reviewerId: string,
        approved: boolean,
        rejectionReason?: string
    ): Promise<VerificationRequest> {
        for (const [userId, requests] of this.verificationRequests.entries()) {
            const request = requests.find((r) => r.id === requestId);
            if (request) {
                request.status = approved ? 'approved' : 'rejected';
                request.reviewedAt = new Date();
                request.reviewedBy = reviewerId;

                if (!approved && rejectionReason) {
                    request.rejectionReason = rejectionReason;
                }

                if (approved) {
                    // Set expiry for certain verification levels
                    if (request.level === 'identity' || request.level === 'business') {
                        request.expiresAt = new Date(
                            Date.now() + 365 * 24 * 60 * 60 * 1000
                        ); // 1 year
                    }

                    // Mark documents as verified
                    request.documents.forEach((doc) => (doc.verified = true));
                }

                this.verificationRequests.set(userId, requests);
                return request;
            }
        }

        throw new Error('Verification request not found');
    }

    // ========================================================================
    // FRAUD DETECTION
    // ========================================================================

    async detectFraud(
        userId: string,
        activity: {
            type: 'login' | 'purchase' | 'listing' | 'message' | 'withdrawal';
            ip?: string;
            deviceId?: string;
            location?: string;
            amount?: number;
            metadata?: Record<string, unknown>;
        }
    ): Promise<FraudSignal[]> {
        const signals: FraudSignal[] = [];
        const existingSignals = this.fraudSignals.get(userId) || [];
        const recentActivities = existingSignals.filter(
            (s) =>
                s.detectedAt.getTime() > Date.now() - 24 * 60 * 60 * 1000 &&
                !s.resolved
        );

        // Velocity check
        if (recentActivities.length >= 10) {
            signals.push(
                this.createFraudSignal(userId, 'velocity', 'medium', 'High activity volume detected', {
                    activityCount: recentActivities.length,
                })
            );
        }

        // Large withdrawal check
        if (activity.type === 'withdrawal' && activity.amount && activity.amount > 5000) {
            const trustScore = this.trustScores.get(userId);
            if (!trustScore || trustScore.score < 70) {
                signals.push(
                    this.createFraudSignal(
                        userId,
                        'pattern',
                        'high',
                        'Large withdrawal from low-trust account',
                        { amount: activity.amount }
                    )
                );
            }
        }

        // New device/location check
        if (activity.deviceId || activity.location) {
            // In production, would check against known devices/locations
            const isNewDevice = Math.random() > 0.9; // Simulated
            if (isNewDevice) {
                signals.push(
                    this.createFraudSignal(
                        userId,
                        'device',
                        'low',
                        'Activity from new device or location',
                        { deviceId: activity.deviceId, location: activity.location }
                    )
                );
            }
        }

        // Store new signals
        if (signals.length > 0) {
            existingSignals.push(...signals);
            this.fraudSignals.set(userId, existingSignals);
        }

        return signals;
    }

    private createFraudSignal(
        userId: string,
        type: FraudSignal['type'],
        severity: FraudSignal['severity'],
        description: string,
        metadata: Record<string, unknown>
    ): FraudSignal {
        return {
            id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type,
            severity,
            description,
            metadata,
            detectedAt: new Date(),
            resolved: false,
        };
    }

    async getFraudSignals(
        userId: string,
        options?: {
            unresolved?: boolean;
            severity?: FraudSignal['severity'];
        }
    ): Promise<FraudSignal[]> {
        let signals = this.fraudSignals.get(userId) || [];

        if (options?.unresolved) {
            signals = signals.filter((s) => !s.resolved);
        }

        if (options?.severity) {
            signals = signals.filter((s) => s.severity === options.severity);
        }

        return signals.sort(
            (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
        );
    }

    async resolveFraudSignal(
        userId: string,
        signalId: string,
        resolution: 'false_positive' | 'warning_issued' | 'account_restricted'
    ): Promise<FraudSignal> {
        const signals = this.fraudSignals.get(userId) || [];
        const signal = signals.find((s) => s.id === signalId);

        if (!signal) {
            throw new Error('Fraud signal not found');
        }

        signal.resolved = true;
        signal.resolvedAt = new Date();
        signal.metadata.resolution = resolution;

        this.fraudSignals.set(userId, signals);

        // Apply consequences
        if (resolution === 'account_restricted') {
            this.blockedUsers.add(userId);
        }

        return signal;
    }

    // ========================================================================
    // USER REPORTS
    // ========================================================================

    async reportUser(
        reporterId: string,
        reportedUserId: string,
        data: {
            reason: UserReport['reason'];
            description: string;
            evidence?: string[];
        }
    ): Promise<UserReport> {
        if (reporterId === reportedUserId) {
            throw new Error('Cannot report yourself');
        }

        // Check for duplicate reports
        const existingReports = this.userReports.get(reportedUserId) || [];
        const recentReport = existingReports.find(
            (r) =>
                r.reporterId === reporterId &&
                r.createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        if (recentReport) {
            throw new Error('You have already reported this user recently');
        }

        const report: UserReport = {
            id: `report_${Date.now()}`,
            reporterId,
            reportedUserId,
            reason: data.reason,
            description: data.description,
            evidence: data.evidence,
            status: 'pending',
            createdAt: new Date(),
        };

        existingReports.push(report);
        this.userReports.set(reportedUserId, existingReports);

        // Auto-create fraud signal for certain report types
        if (data.reason === 'fraud') {
            await this.detectFraud(reportedUserId, {
                type: 'message',
                metadata: { reportId: report.id },
            });
        }

        return report;
    }

    async getReportsForUser(
        userId: string,
        options?: {
            status?: UserReport['status'];
            asReporter?: boolean;
        }
    ): Promise<UserReport[]> {
        if (options?.asReporter) {
            const allReports: UserReport[] = [];
            for (const reports of this.userReports.values()) {
                allReports.push(...reports.filter((r) => r.reporterId === userId));
            }
            return allReports;
        }

        let reports = this.userReports.get(userId) || [];

        if (options?.status) {
            reports = reports.filter((r) => r.status === options.status);
        }

        return reports;
    }

    async resolveReport(
        reportId: string,
        resolution: {
            status: 'resolved' | 'dismissed';
            notes: string;
        }
    ): Promise<UserReport> {
        for (const [userId, reports] of this.userReports.entries()) {
            const report = reports.find((r) => r.id === reportId);
            if (report) {
                report.status = resolution.status;
                report.resolution = resolution.notes;
                report.resolvedAt = new Date();

                this.userReports.set(userId, reports);
                return report;
            }
        }

        throw new Error('Report not found');
    }

    // ========================================================================
    // COPYRIGHT & ORIGINALITY
    // ========================================================================

    async fileCopyrightClaim(
        claimantId: string,
        data: {
            designId: string;
            originalWorkUrl: string;
            originalCreationDate: Date;
            description: string;
            evidence: string[];
        }
    ): Promise<CopyrightClaim> {
        const claim: CopyrightClaim = {
            id: `copyright_${Date.now()}`,
            claimantId,
            designId: data.designId,
            originalWorkUrl: data.originalWorkUrl,
            originalCreationDate: data.originalCreationDate,
            description: data.description,
            evidence: data.evidence,
            status: 'pending',
            createdAt: new Date(),
        };

        const claims = this.copyrightClaims.get(data.designId) || [];
        claims.push(claim);
        this.copyrightClaims.set(data.designId, claims);

        return claim;
    }

    async getCopyrightClaims(
        designId: string
    ): Promise<CopyrightClaim[]> {
        return this.copyrightClaims.get(designId) || [];
    }

    async resolveCopyrightClaim(
        claimId: string,
        resolution: {
            status: CopyrightClaim['status'];
            notes: string;
        }
    ): Promise<CopyrightClaim> {
        for (const [designId, claims] of this.copyrightClaims.entries()) {
            const claim = claims.find((c) => c.id === claimId);
            if (claim) {
                claim.status = resolution.status;
                claim.resolvedAt = new Date();

                this.copyrightClaims.set(designId, claims);
                return claim;
            }
        }

        throw new Error('Copyright claim not found');
    }

    async verifyDesignOriginality(
        designId: string,
        imageHash: string
    ): Promise<CopyrightVerification> {
        // In production, would use image similarity APIs
        // Simulating originality check
        const verification: CopyrightVerification = {
            designId,
            originalityScore: 85 + Math.random() * 15, // 85-100
            similarDesigns: [],
            aiGenerated: true, // Would use AI detection
            verifiedAt: new Date(),
        };

        return verification;
    }

    // ========================================================================
    // DISPUTE MANAGEMENT
    // ========================================================================

    async createDispute(
        userId: string,
        data: {
            transactionId: string;
            reason: DisputeReason;
            description: string;
            evidence?: Array<{
                type: 'image' | 'document' | 'link';
                url: string;
                description?: string;
            }>;
        }
    ): Promise<Dispute> {
        const dispute: Dispute = {
            id: `dispute_${Date.now()}`,
            transactionId: data.transactionId,
            initiatorId: userId,
            respondentId: '', // Would be set from transaction
            reason: data.reason,
            description: data.description,
            evidence: data.evidence || [],
            status: 'open',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const disputes = this.disputes.get(userId) || [];
        disputes.push(dispute);
        this.disputes.set(userId, disputes);

        return dispute;
    }

    async getDispute(disputeId: string): Promise<Dispute | null> {
        for (const disputes of this.disputes.values()) {
            const dispute = disputes.find((d) => d.id === disputeId);
            if (dispute) return dispute;
        }
        return null;
    }

    async addDisputeMessage(
        disputeId: string,
        senderId: string,
        content: string,
        senderRole: 'initiator' | 'respondent' | 'mediator' = 'initiator',
        attachments?: string[]
    ): Promise<DisputeMessage> {
        const dispute = await this.getDispute(disputeId);
        if (!dispute) {
            throw new Error('Dispute not found');
        }

        if (dispute.status === 'resolved' || dispute.status === 'closed') {
            throw new Error('Cannot add messages to closed dispute');
        }

        const disputeMessage: DisputeMessage = {
            id: `msg_${Date.now()}`,
            disputeId,
            senderId,
            senderRole,
            content,
            attachments,
            createdAt: new Date(),
        };

        dispute.messages.push(disputeMessage);
        dispute.updatedAt = new Date();

        return disputeMessage;
    }

    async resolveDispute(
        disputeId: string,
        resolution: {
            status: 'resolved' | 'closed';
            outcome: 'refund_full' | 'refund_partial' | 'no_refund' | 'license_revoked' | 'other';
            amount?: number;
            notes: string;
            resolvedBy: string;
        }
    ): Promise<Dispute> {
        for (const [userId, disputes] of this.disputes.entries()) {
            const dispute = disputes.find((d) => d.id === disputeId);
            if (dispute) {
                dispute.status = resolution.status;
                dispute.resolution = {
                    outcome: resolution.outcome,
                    amount: resolution.amount,
                    notes: resolution.notes,
                    resolvedBy: resolution.resolvedBy,
                    resolvedAt: new Date(),
                };
                dispute.updatedAt = new Date();

                this.disputes.set(userId, disputes);

                // Update trust scores based on outcome
                if (resolution.outcome === 'refund_full' || resolution.outcome === 'license_revoked') {
                    // Respondent at fault - negative impact
                    const respScore = this.trustScores.get(dispute.respondentId);
                    if (respScore) {
                        respScore.score = Math.max(0, respScore.score - 10);
                        this.trustScores.set(dispute.respondentId, respScore);
                    }
                } else if (resolution.outcome === 'no_refund') {
                    // Initiator at fault - slight negative impact
                    const initScore = this.trustScores.get(dispute.initiatorId);
                    if (initScore) {
                        initScore.score = Math.max(0, initScore.score - 5);
                        this.trustScores.set(dispute.initiatorId, initScore);
                    }
                }

                return dispute;
            }
        }

        throw new Error('Dispute not found');
    }

    async getUserDisputes(
        userId: string,
        options?: {
            status?: DisputeStatus;
            role?: 'initiator' | 'respondent';
        }
    ): Promise<Dispute[]> {
        const allDisputes: Dispute[] = [];

        for (const disputes of this.disputes.values()) {
            for (const dispute of disputes) {
                const isInitiator = dispute.initiatorId === userId;
                const isRespondent = dispute.respondentId === userId;

                if (!isInitiator && !isRespondent) continue;

                if (options?.role === 'initiator' && !isInitiator) continue;
                if (options?.role === 'respondent' && !isRespondent) continue;

                if (options?.status && dispute.status !== options.status) continue;

                allDisputes.push(dispute);
            }
        }

        return allDisputes.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );
    }

    // ========================================================================
    // ACCOUNT RESTRICTIONS
    // ========================================================================

    async isUserBlocked(userId: string): Promise<boolean> {
        return this.blockedUsers.has(userId);
    }

    async blockUser(userId: string, reason: string): Promise<void> {
        this.blockedUsers.add(userId);

        // Create fraud signal
        const signals = this.fraudSignals.get(userId) || [];
        signals.push(
            this.createFraudSignal(userId, 'behavior', 'critical', reason, {
                action: 'blocked',
            })
        );
        this.fraudSignals.set(userId, signals);
    }

    async unblockUser(userId: string): Promise<void> {
        this.blockedUsers.delete(userId);
    }

    async getBlockedUsers(): Promise<string[]> {
        return Array.from(this.blockedUsers);
    }

    // ========================================================================
    // TRUST ANALYTICS
    // ========================================================================

    async getTrustAnalytics(): Promise<{
        averageTrustScore: number;
        scoreDistribution: Record<TrustScore['level'], number>;
        verificationStats: Record<VerificationLevel, number>;
        fraudStats: {
            totalSignals: number;
            unresolvedSignals: number;
            byType: Record<FraudSignal['type'], number>;
        };
        disputeStats: {
            total: number;
            open: number;
            resolved: number;
            avgResolutionTime: number;
        };
    }> {
        const scores = Array.from(this.trustScores.values());

        // Score distribution
        const scoreDistribution: Record<TrustScore['level'], number> = {
            excellent: 0,
            good: 0,
            average: 0,
            low: 0,
            poor: 0,
        };

        let totalScore = 0;
        for (const score of scores) {
            totalScore += score.score;
            scoreDistribution[score.level]++;
        }

        // Verification stats
        const verificationStats: Record<VerificationLevel, number> = {
            none: 0,
            email: 0,
            identity: 0,
            business: 0,
            premium: 0,
        };

        for (const requests of this.verificationRequests.values()) {
            for (const req of requests) {
                if (req.status === 'approved') {
                    verificationStats[req.level]++;
                }
            }
        }

        // Fraud stats
        let totalSignals = 0;
        let unresolvedSignals = 0;
        const signalsByType: Record<FraudSignal['type'], number> = {
            velocity: 0,
            pattern: 0,
            device: 0,
            location: 0,
            behavior: 0,
            report: 0,
        };

        for (const signals of this.fraudSignals.values()) {
            for (const signal of signals) {
                totalSignals++;
                if (!signal.resolved) unresolvedSignals++;
                signalsByType[signal.type]++;
            }
        }

        // Dispute stats
        let totalDisputes = 0;
        let openDisputes = 0;
        let resolvedDisputes = 0;
        let totalResolutionTime = 0;

        for (const disputes of this.disputes.values()) {
            for (const dispute of disputes) {
                totalDisputes++;
                if (dispute.status === 'open' || dispute.status === 'under_review') {
                    openDisputes++;
                } else {
                    resolvedDisputes++;
                    if (dispute.resolution?.resolvedAt) {
                        totalResolutionTime +=
                            dispute.resolution.resolvedAt.getTime() -
                            dispute.createdAt.getTime();
                    }
                }
            }
        }

        return {
            averageTrustScore: scores.length > 0 ? totalScore / scores.length : 0,
            scoreDistribution,
            verificationStats,
            fraudStats: {
                totalSignals,
                unresolvedSignals,
                byType: signalsByType,
            },
            disputeStats: {
                total: totalDisputes,
                open: openDisputes,
                resolved: resolvedDisputes,
                avgResolutionTime:
                    resolvedDisputes > 0
                        ? totalResolutionTime / resolvedDisputes / (1000 * 60 * 60 * 24) // days
                        : 0,
            },
        };
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let trustServiceInstance: TrustService | null = null;

export function getTrustService(): TrustService {
    if (!trustServiceInstance) {
        trustServiceInstance = new TrustService();
    }
    return trustServiceInstance;
}

export function resetTrustService(): void {
    trustServiceInstance = null;
}
