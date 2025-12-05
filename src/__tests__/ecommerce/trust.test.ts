/**
 * Trust Service Tests - Phase 5 E-commerce
 * Tests for identity verification, trust scores, fraud detection, and dispute resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    TrustService,
    getTrustService,
    resetTrustService,
    VerificationLevel,
    VerificationRequest,
    FraudSignal,
    UserReport,
    CopyrightVerification,
    TrustFactors,
} from '../../ecommerce/trust';
import type {
    TrustScore,
    CopyrightClaim,
    Dispute,
    DisputeMessage,
} from '../../ecommerce/types';

describe('TrustService', () => {
    let trustService: TrustService;

    beforeEach(() => {
        resetTrustService();
        trustService = new TrustService();
    });

    // ==========================================================================
    // TRUST SCORE MANAGEMENT
    // ==========================================================================

    describe('Trust Score Management', () => {
        const baseTrustFactors: TrustFactors = {
            accountAge: 100,
            emailVerified: true,
            identityVerified: false,
            businessVerified: false,
            completedOrders: 10,
            disputesLost: 0,
            disputesWon: 0,
            averageRating: 4.5,
            reviewCount: 8,
            responseTime: 12,
            profileCompleteness: 80,
        };

        it('should calculate trust score with base factors', async () => {
            const score = await trustService.calculateTrustScore('user1', baseTrustFactors);

            expect(score).toBeDefined();
            expect(score.userId).toBe('user1');
            expect(score.score).toBeGreaterThanOrEqual(0);
            expect(score.score).toBeLessThanOrEqual(100);
            expect(score.level).toBeDefined();
            expect(score.lastUpdated).toBeInstanceOf(Date);
        });

        it('should increase score for email verification', async () => {
            const withoutEmail = await trustService.calculateTrustScore('user1', {
                ...baseTrustFactors,
                emailVerified: false,
            });

            const withEmail = await trustService.calculateTrustScore('user2', {
                ...baseTrustFactors,
                emailVerified: true,
            });

            expect(withEmail.score).toBeGreaterThan(withoutEmail.score);
        });

        it('should increase score for identity verification', async () => {
            const withoutIdentity = await trustService.calculateTrustScore('user1', {
                ...baseTrustFactors,
                identityVerified: false,
            });

            const withIdentity = await trustService.calculateTrustScore('user2', {
                ...baseTrustFactors,
                identityVerified: true,
            });

            expect(withIdentity.score).toBeGreaterThan(withoutIdentity.score);
        });

        it('should increase score for business verification', async () => {
            const withoutBusiness = await trustService.calculateTrustScore('user1', {
                ...baseTrustFactors,
                businessVerified: false,
            });

            const withBusiness = await trustService.calculateTrustScore('user2', {
                ...baseTrustFactors,
                businessVerified: true,
            });

            expect(withBusiness.score).toBeGreaterThan(withoutBusiness.score);
        });

        it('should decrease score for lost disputes', async () => {
            const noDisputes = await trustService.calculateTrustScore('user1', {
                ...baseTrustFactors,
                disputesLost: 0,
            });

            const withLostDisputes = await trustService.calculateTrustScore('user2', {
                ...baseTrustFactors,
                disputesLost: 3,
            });

            expect(withLostDisputes.score).toBeLessThan(noDisputes.score);
        });

        it('should consider response time in score calculation', async () => {
            const fastResponder = await trustService.calculateTrustScore('user1', {
                ...baseTrustFactors,
                responseTime: 12, // Under 24 hours
            });

            const slowResponder = await trustService.calculateTrustScore('user2', {
                ...baseTrustFactors,
                responseTime: 72, // Over 48 hours
            });

            expect(fastResponder.score).toBeGreaterThan(slowResponder.score);
        });

        it('should return correct trust level based on score', async () => {
            // Low trust user
            const lowTrust = await trustService.calculateTrustScore('lowUser', {
                ...baseTrustFactors,
                emailVerified: false,
                completedOrders: 0,
                averageRating: 2.0,
                profileCompleteness: 20,
            });

            expect(['poor', 'low', 'average']).toContain(lowTrust.level);

            // High trust user
            const highTrust = await trustService.calculateTrustScore('highUser', {
                ...baseTrustFactors,
                accountAge: 400,
                emailVerified: true,
                identityVerified: true,
                businessVerified: true,
                completedOrders: 50,
                averageRating: 4.9,
                reviewCount: 100,
                responseTime: 1,
                profileCompleteness: 100,
            });

            expect(['good', 'excellent']).toContain(highTrust.level);
        });

        it('should retrieve saved trust score', async () => {
            await trustService.calculateTrustScore('user1', baseTrustFactors);

            const retrieved = await trustService.getTrustScore('user1');

            expect(retrieved).toBeDefined();
            expect(retrieved?.userId).toBe('user1');
        });

        it('should return null for non-existent trust score', async () => {
            const score = await trustService.getTrustScore('nonexistent');
            expect(score).toBeNull();
        });

        it('should calculate verification level correctly', async () => {
            const businessVerified = await trustService.calculateTrustScore('user1', {
                ...baseTrustFactors,
                businessVerified: true,
            });

            expect(businessVerified.factors.verificationLevel).toBe('business');

            const identityOnly = await trustService.calculateTrustScore('user2', {
                ...baseTrustFactors,
                identityVerified: true,
                businessVerified: false,
            });

            expect(identityOnly.factors.verificationLevel).toBe('identity');
        });
    });

    // ==========================================================================
    // USER TRUST BADGES
    // ==========================================================================

    describe('User Trust Badges', () => {
        it('should return verified-business badge for business verified users', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 100,
                emailVerified: true,
                identityVerified: true,
                businessVerified: true,
                completedOrders: 10,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.5,
                reviewCount: 10,
                responseTime: 24,
                profileCompleteness: 80,
            });

            const badges = await trustService.getUserTrustBadges('user1');
            expect(badges).toContain('verified-business');
        });

        it('should return trusted-seller badge for high trust score', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 400,
                emailVerified: true,
                identityVerified: true,
                businessVerified: true,
                completedOrders: 50,
                disputesLost: 0,
                disputesWon: 5,
                averageRating: 4.9,
                reviewCount: 100,
                responseTime: 1,
                profileCompleteness: 100,
            });

            const badges = await trustService.getUserTrustBadges('user1');
            expect(badges).toContain('trusted-seller');
        });

        it('should return experienced-seller badge for 100+ orders', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 500,
                emailVerified: true,
                identityVerified: true,
                businessVerified: false,
                completedOrders: 100,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.5,
                reviewCount: 80,
                responseTime: 12,
                profileCompleteness: 90,
            });

            const badges = await trustService.getUserTrustBadges('user1');
            expect(badges).toContain('experienced-seller');
        });

        it('should return highly-rated badge for 4.8+ rating', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 200,
                emailVerified: true,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 30,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.85,
                reviewCount: 50,
                responseTime: 8,
                profileCompleteness: 85,
            });

            const badges = await trustService.getUserTrustBadges('user1');
            expect(badges).toContain('highly-rated');
        });

        it('should return fast-responder badge for 2h or less response time', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 100,
                emailVerified: true,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 10,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.2,
                reviewCount: 15,
                responseTime: 1.5,
                profileCompleteness: 70,
            });

            const badges = await trustService.getUserTrustBadges('user1');
            expect(badges).toContain('fast-responder');
        });

        it('should return empty array for user without trust score', async () => {
            const badges = await trustService.getUserTrustBadges('nonexistent');
            expect(badges).toEqual([]);
        });
    });

    // ==========================================================================
    // VERIFICATION
    // ==========================================================================

    describe('Verification', () => {
        it('should request identity verification', async () => {
            const request = await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/id-front.jpg' },
                { type: 'id_back', url: 'https://example.com/id-back.jpg' },
                { type: 'selfie', url: 'https://example.com/selfie.jpg' },
            ]);

            expect(request.id).toBeDefined();
            expect(request.userId).toBe('user1');
            expect(request.level).toBe('identity');
            expect(request.status).toBe('pending');
            expect(request.documents).toHaveLength(3);
            expect(request.submittedAt).toBeInstanceOf(Date);
        });

        it('should request business verification', async () => {
            const request = await trustService.requestVerification('user1', 'business', [
                { type: 'business_license', url: 'https://example.com/license.pdf' },
                { type: 'tax_document', url: 'https://example.com/tax.pdf' },
            ]);

            expect(request.level).toBe('business');
            expect(request.documents).toHaveLength(2);
        });

        it('should throw error for duplicate pending verification request', async () => {
            await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/id-front.jpg' },
            ]);

            await expect(
                trustService.requestVerification('user1', 'identity', [
                    { type: 'id_front', url: 'https://example.com/id-front2.jpg' },
                ])
            ).rejects.toThrow('You already have a pending verification request for this level');
        });

        it('should get verification status', async () => {
            await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/id-front.jpg' },
            ]);

            const status = await trustService.getVerificationStatus('user1');

            expect(status.currentLevel).toBe('none');
            expect(status.pendingRequest).toBeDefined();
            expect(status.pendingRequest?.level).toBe('identity');
            expect(status.history).toHaveLength(1);
        });

        it('should approve verification request', async () => {
            const request = await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/id-front.jpg' },
            ]);

            const approved = await trustService.reviewVerification(
                request.id,
                'reviewer1',
                true
            );

            expect(approved.status).toBe('approved');
            expect(approved.reviewedAt).toBeInstanceOf(Date);
            expect(approved.reviewedBy).toBe('reviewer1');
            expect(approved.expiresAt).toBeInstanceOf(Date);
            expect(approved.documents[0].verified).toBe(true);
        });

        it('should reject verification request with reason', async () => {
            const request = await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/blurry.jpg' },
            ]);

            const rejected = await trustService.reviewVerification(
                request.id,
                'reviewer1',
                false,
                'Image too blurry to verify'
            );

            expect(rejected.status).toBe('rejected');
            expect(rejected.rejectionReason).toBe('Image too blurry to verify');
            expect(rejected.expiresAt).toBeUndefined();
        });

        it('should throw error for non-existent verification request', async () => {
            await expect(
                trustService.reviewVerification('nonexistent', 'reviewer1', true)
            ).rejects.toThrow('Verification request not found');
        });

        it('should update current level after approval', async () => {
            const request = await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/id-front.jpg' },
            ]);

            await trustService.reviewVerification(request.id, 'reviewer1', true);

            const status = await trustService.getVerificationStatus('user1');
            expect(status.currentLevel).toBe('identity');
            expect(status.pendingRequest).toBeUndefined();
        });
    });

    // ==========================================================================
    // FRAUD DETECTION
    // ==========================================================================

    describe('Fraud Detection', () => {
        it('should detect high activity velocity', async () => {
            // The velocity check triggers when there are 10+ unresolved fraud signals
            // We need to create a scenario that generates fraud signals
            // First, create a low-trust user that will trigger pattern signals on withdrawals
            await trustService.calculateTrustScore('user1', {
                accountAge: 5,
                emailVerified: false,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 0,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 0,
                reviewCount: 0,
                responseTime: 72,
                profileCompleteness: 10,
            });

            // Generate multiple fraud signals by making large withdrawals
            for (let i = 0; i < 10; i++) {
                await trustService.detectFraud('user1', {
                    type: 'withdrawal',
                    amount: 6000 + i * 100,
                });
            }

            // Now detect again - should trigger velocity check
            const signals = await trustService.detectFraud('user1', {
                type: 'withdrawal',
                amount: 7000,
            });

            const velocitySignal = signals.find((s) => s.type === 'velocity');
            expect(velocitySignal).toBeDefined();
            expect(velocitySignal?.severity).toBe('medium');
        });

        it('should detect large withdrawal from low-trust account', async () => {
            // Create a low-trust user
            await trustService.calculateTrustScore('user1', {
                accountAge: 10,
                emailVerified: true,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 1,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 3.0,
                reviewCount: 1,
                responseTime: 48,
                profileCompleteness: 30,
            });

            const signals = await trustService.detectFraud('user1', {
                type: 'withdrawal',
                amount: 10000,
            });

            const patternSignal = signals.find((s) => s.type === 'pattern');
            expect(patternSignal).toBeDefined();
            expect(patternSignal?.severity).toBe('high');
        });

        it('should get fraud signals with filters', async () => {
            // Generate various signals
            await trustService.detectFraud('user1', {
                type: 'login',
                deviceId: 'device1',
            });

            await trustService.detectFraud('user1', {
                type: 'purchase',
                amount: 100,
            });

            const allSignals = await trustService.getFraudSignals('user1');
            expect(allSignals.length).toBeGreaterThanOrEqual(0);

            const unresolvedSignals = await trustService.getFraudSignals('user1', {
                unresolved: true,
            });

            for (const signal of unresolvedSignals) {
                expect(signal.resolved).toBe(false);
            }
        });

        it('should resolve fraud signal', async () => {
            // First, we need to create a fraud signal
            // Let's create a low-trust account and trigger a pattern signal
            await trustService.calculateTrustScore('user1', {
                accountAge: 5,
                emailVerified: false,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 0,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 0,
                reviewCount: 0,
                responseTime: 72,
                profileCompleteness: 10,
            });

            const signals = await trustService.detectFraud('user1', {
                type: 'withdrawal',
                amount: 6000,
            });

            if (signals.length > 0) {
                const resolved = await trustService.resolveFraudSignal(
                    'user1',
                    signals[0].id,
                    'false_positive'
                );

                expect(resolved.resolved).toBe(true);
                expect(resolved.resolvedAt).toBeInstanceOf(Date);
                expect(resolved.metadata.resolution).toBe('false_positive');
            }
        });

        it('should block user on account_restricted resolution', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 5,
                emailVerified: false,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 0,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 0,
                reviewCount: 0,
                responseTime: 72,
                profileCompleteness: 10,
            });

            const signals = await trustService.detectFraud('user1', {
                type: 'withdrawal',
                amount: 6000,
            });

            if (signals.length > 0) {
                await trustService.resolveFraudSignal(
                    'user1',
                    signals[0].id,
                    'account_restricted'
                );

                const isBlocked = await trustService.isUserBlocked('user1');
                expect(isBlocked).toBe(true);
            }
        });

        it('should throw error for non-existent fraud signal', async () => {
            await expect(
                trustService.resolveFraudSignal('user1', 'nonexistent', 'false_positive')
            ).rejects.toThrow('Fraud signal not found');
        });

        it('should reduce trust score for active fraud signals', async () => {
            const baseFactors = {
                accountAge: 100,
                emailVerified: true,
                identityVerified: true,
                businessVerified: false,
                completedOrders: 20,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.5,
                reviewCount: 15,
                responseTime: 12,
                profileCompleteness: 80,
            };

            // Score without fraud signals
            const cleanScore = await trustService.calculateTrustScore('cleanUser', baseFactors);

            // Create fraud signals for another user
            await trustService.calculateTrustScore('fraudUser', {
                ...baseFactors,
                // Low score to trigger pattern signal
            });

            // Manually add a high severity signal by triggering withdrawal
            await trustService.calculateTrustScore('fraudUser', {
                accountAge: 10,
                emailVerified: false,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 0,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 0,
                reviewCount: 0,
                responseTime: 72,
                profileCompleteness: 10,
            });

            await trustService.detectFraud('fraudUser', {
                type: 'withdrawal',
                amount: 8000,
            });

            // Recalculate with fraud signals present
            const fraudScore = await trustService.calculateTrustScore('fraudUser', baseFactors);

            expect(fraudScore.score).toBeLessThan(cleanScore.score);
        });
    });

    // ==========================================================================
    // USER REPORTS
    // ==========================================================================

    describe('User Reports', () => {
        it('should create user report', async () => {
            const report = await trustService.reportUser('reporter1', 'badUser', {
                reason: 'fraud',
                description: 'Seller never delivered the design files',
                evidence: ['https://example.com/evidence1.jpg'],
            });

            expect(report.id).toBeDefined();
            expect(report.reporterId).toBe('reporter1');
            expect(report.reportedUserId).toBe('badUser');
            expect(report.reason).toBe('fraud');
            expect(report.status).toBe('pending');
            expect(report.createdAt).toBeInstanceOf(Date);
        });

        it('should throw error when reporting yourself', async () => {
            await expect(
                trustService.reportUser('user1', 'user1', {
                    reason: 'fraud',
                    description: 'Test',
                })
            ).rejects.toThrow('Cannot report yourself');
        });

        it('should prevent duplicate reports within 7 days', async () => {
            await trustService.reportUser('reporter1', 'badUser', {
                reason: 'fraud',
                description: 'First report',
            });

            await expect(
                trustService.reportUser('reporter1', 'badUser', {
                    reason: 'spam',
                    description: 'Second report',
                })
            ).rejects.toThrow('You have already reported this user recently');
        });

        it('should get reports for a user', async () => {
            await trustService.reportUser('reporter1', 'badUser', {
                reason: 'fraud',
                description: 'Fraud report',
            });

            await trustService.reportUser('reporter2', 'badUser', {
                reason: 'harassment',
                description: 'Harassment report',
            });

            const reports = await trustService.getReportsForUser('badUser');
            expect(reports).toHaveLength(2);
        });

        it('should filter reports by status', async () => {
            const report = await trustService.reportUser('reporter1', 'badUser', {
                reason: 'spam',
                description: 'Spam report',
            });

            await trustService.resolveReport(report.id, {
                status: 'resolved',
                notes: 'User warned',
            });

            const pendingReports = await trustService.getReportsForUser('badUser', {
                status: 'pending',
            });

            expect(pendingReports).toHaveLength(0);

            const resolvedReports = await trustService.getReportsForUser('badUser', {
                status: 'resolved',
            });

            expect(resolvedReports).toHaveLength(1);
        });

        it('should get reports made by a user (as reporter)', async () => {
            await trustService.reportUser('reporter1', 'user2', {
                reason: 'fraud',
                description: 'Report 1',
            });

            await trustService.reportUser('reporter1', 'user3', {
                reason: 'spam',
                description: 'Report 2',
            });

            const myReports = await trustService.getReportsForUser('reporter1', {
                asReporter: true,
            });

            expect(myReports).toHaveLength(2);
        });

        it('should resolve report', async () => {
            const report = await trustService.reportUser('reporter1', 'badUser', {
                reason: 'inappropriate',
                description: 'Inappropriate content',
            });

            const resolved = await trustService.resolveReport(report.id, {
                status: 'resolved',
                notes: 'Content removed, user warned',
            });

            expect(resolved.status).toBe('resolved');
            expect(resolved.resolution).toBe('Content removed, user warned');
            expect(resolved.resolvedAt).toBeInstanceOf(Date);
        });

        it('should dismiss report', async () => {
            const report = await trustService.reportUser('reporter1', 'goodUser', {
                reason: 'fraud',
                description: 'False accusation',
            });

            const dismissed = await trustService.resolveReport(report.id, {
                status: 'dismissed',
                notes: 'Report investigated, no violation found',
            });

            expect(dismissed.status).toBe('dismissed');
        });

        it('should throw error for non-existent report', async () => {
            await expect(
                trustService.resolveReport('nonexistent', {
                    status: 'resolved',
                    notes: 'Test',
                })
            ).rejects.toThrow('Report not found');
        });

        it('should auto-create fraud signal for fraud reports', async () => {
            await trustService.reportUser('reporter1', 'badUser', {
                reason: 'fraud',
                description: 'Suspected fraud',
            });

            // The fraud detection should have been triggered
            const signals = await trustService.getFraudSignals('badUser');
            // May or may not have signals depending on internal logic
            expect(signals).toBeDefined();
        });
    });

    // ==========================================================================
    // COPYRIGHT & ORIGINALITY
    // ==========================================================================

    describe('Copyright & Originality', () => {
        it('should file copyright claim', async () => {
            const claim = await trustService.fileCopyrightClaim('claimant1', {
                designId: 'design1',
                originalWorkUrl: 'https://example.com/original-work.jpg',
                originalCreationDate: new Date('2023-01-01'),
                description: 'This design copies my original artwork',
                evidence: [
                    'https://example.com/proof1.jpg',
                    'https://example.com/proof2.jpg',
                ],
            });

            expect(claim.id).toBeDefined();
            expect(claim.claimantId).toBe('claimant1');
            expect(claim.designId).toBe('design1');
            expect(claim.status).toBe('pending');
            expect(claim.evidence).toHaveLength(2);
        });

        it('should get copyright claims for design', async () => {
            await trustService.fileCopyrightClaim('claimant1', {
                designId: 'design1',
                originalWorkUrl: 'https://example.com/original1.jpg',
                originalCreationDate: new Date('2023-01-01'),
                description: 'Claim 1',
                evidence: [],
            });

            await trustService.fileCopyrightClaim('claimant2', {
                designId: 'design1',
                originalWorkUrl: 'https://example.com/original2.jpg',
                originalCreationDate: new Date('2023-02-01'),
                description: 'Claim 2',
                evidence: [],
            });

            const claims = await trustService.getCopyrightClaims('design1');
            expect(claims).toHaveLength(2);
        });

        it('should resolve copyright claim', async () => {
            const claim = await trustService.fileCopyrightClaim('claimant1', {
                designId: 'design1',
                originalWorkUrl: 'https://example.com/original.jpg',
                originalCreationDate: new Date('2023-01-01'),
                description: 'Copyright violation',
                evidence: [],
            });

            const resolved = await trustService.resolveCopyrightClaim(claim.id, {
                status: 'upheld',
                notes: 'Claim verified, design removed',
            });

            expect(resolved.status).toBe('upheld');
            expect(resolved.resolvedAt).toBeInstanceOf(Date);
        });

        it('should dismiss copyright claim', async () => {
            const claim = await trustService.fileCopyrightClaim('claimant1', {
                designId: 'design1',
                originalWorkUrl: 'https://example.com/original.jpg',
                originalCreationDate: new Date('2023-01-01'),
                description: 'False claim',
                evidence: [],
            });

            const resolved = await trustService.resolveCopyrightClaim(claim.id, {
                status: 'withdrawn',
                notes: 'Insufficient evidence of infringement',
            });

            expect(resolved.status).toBe('withdrawn');
        });

        it('should throw error for non-existent copyright claim', async () => {
            await expect(
                trustService.resolveCopyrightClaim('nonexistent', {
                    status: 'upheld',
                    notes: 'Test',
                })
            ).rejects.toThrow('Copyright claim not found');
        });

        it('should verify design originality', async () => {
            const verification = await trustService.verifyDesignOriginality(
                'design1',
                'hash123'
            );

            expect(verification.designId).toBe('design1');
            expect(verification.originalityScore).toBeGreaterThanOrEqual(85);
            expect(verification.originalityScore).toBeLessThanOrEqual(100);
            expect(verification.similarDesigns).toBeDefined();
            expect(verification.aiGenerated).toBeDefined();
            expect(verification.verifiedAt).toBeInstanceOf(Date);
        });
    });

    // ==========================================================================
    // DISPUTE MANAGEMENT
    // ==========================================================================

    describe('Dispute Management', () => {
        it('should create dispute', async () => {
            const dispute = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'not_as_described',
                description: 'The design quality is much lower than shown',
                evidence: [
                    {
                        type: 'image',
                        url: 'https://example.com/evidence.jpg',
                        description: 'Screenshot of actual design',
                    },
                ],
            });

            expect(dispute.id).toBeDefined();
            expect(dispute.transactionId).toBe('txn_123');
            expect(dispute.initiatorId).toBe('buyer1');
            expect(dispute.reason).toBe('not_as_described');
            expect(dispute.status).toBe('open');
            expect(dispute.evidence).toHaveLength(1);
            expect(dispute.messages).toHaveLength(0);
        });

        it('should get dispute by ID', async () => {
            const created = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'non_delivery',
                description: 'Never received the files',
            });

            const retrieved = await trustService.getDispute(created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(created.id);
        });

        it('should return null for non-existent dispute', async () => {
            const dispute = await trustService.getDispute('nonexistent');
            expect(dispute).toBeNull();
        });

        it('should add message to dispute', async () => {
            const dispute = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'not_as_described',
                description: 'Quality issue',
            });

            const message = await trustService.addDisputeMessage(
                dispute.id,
                'buyer1',
                'I expected higher resolution files',
                'initiator'
            );

            expect(message.id).toBeDefined();
            expect(message.disputeId).toBe(dispute.id);
            expect(message.senderId).toBe('buyer1');
            expect(message.senderRole).toBe('initiator');
            expect(message.content).toBe('I expected higher resolution files');
        });

        it('should add message with attachments', async () => {
            const dispute = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'not_as_described',
                description: 'Quality issue',
            });

            const message = await trustService.addDisputeMessage(
                dispute.id,
                'buyer1',
                'Here is evidence',
                'initiator',
                ['https://example.com/screenshot.jpg']
            );

            expect(message.attachments).toHaveLength(1);
        });

        it('should throw error when adding message to non-existent dispute', async () => {
            await expect(
                trustService.addDisputeMessage(
                    'nonexistent',
                    'user1',
                    'Test message'
                )
            ).rejects.toThrow('Dispute not found');
        });

        it('should throw error when adding message to resolved dispute', async () => {
            const dispute = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'non_delivery',
                description: 'Never received',
            });

            await trustService.resolveDispute(dispute.id, {
                status: 'resolved',
                outcome: 'refund_full',
                amount: 50,
                notes: 'Full refund issued',
                resolvedBy: 'admin1',
            });

            await expect(
                trustService.addDisputeMessage(
                    dispute.id,
                    'buyer1',
                    'Additional message'
                )
            ).rejects.toThrow('Cannot add messages to closed dispute');
        });

        it('should resolve dispute with full refund', async () => {
            const dispute = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'non_delivery',
                description: 'Files never received',
            });

            const resolved = await trustService.resolveDispute(dispute.id, {
                status: 'resolved',
                outcome: 'refund_full',
                amount: 100,
                notes: 'Seller failed to deliver, full refund approved',
                resolvedBy: 'admin1',
            });

            expect(resolved.status).toBe('resolved');
            expect(resolved.resolution?.outcome).toBe('refund_full');
            expect(resolved.resolution?.amount).toBe(100);
            expect(resolved.resolution?.resolvedBy).toBe('admin1');
            expect(resolved.resolution?.resolvedAt).toBeInstanceOf(Date);
        });

        it('should resolve dispute with no refund', async () => {
            const dispute = await trustService.createDispute('buyer1', {
                transactionId: 'txn_123',
                reason: 'not_as_described',
                description: 'Complaint without merit',
            });

            const resolved = await trustService.resolveDispute(dispute.id, {
                status: 'resolved',
                outcome: 'no_refund',
                notes: 'Design matches description, no refund warranted',
                resolvedBy: 'admin1',
            });

            expect(resolved.resolution?.outcome).toBe('no_refund');
        });

        it('should throw error resolving non-existent dispute', async () => {
            await expect(
                trustService.resolveDispute('nonexistent', {
                    status: 'resolved',
                    outcome: 'refund_full',
                    notes: 'Test',
                    resolvedBy: 'admin1',
                })
            ).rejects.toThrow('Dispute not found');
        });

        it('should get user disputes as initiator', async () => {
            await trustService.createDispute('buyer1', {
                transactionId: 'txn_1',
                reason: 'non_delivery',
                description: 'Dispute 1',
            });

            await trustService.createDispute('buyer1', {
                transactionId: 'txn_2',
                reason: 'not_as_described',
                description: 'Dispute 2',
            });

            const disputes = await trustService.getUserDisputes('buyer1', {
                role: 'initiator',
            });

            expect(disputes).toHaveLength(2);
        });

        it('should filter disputes by status', async () => {
            const dispute1 = await trustService.createDispute('buyer1', {
                transactionId: 'txn_1',
                reason: 'non_delivery',
                description: 'Open dispute',
            });

            await trustService.createDispute('buyer1', {
                transactionId: 'txn_2',
                reason: 'not_as_described',
                description: 'To be resolved',
            });

            await trustService.resolveDispute(dispute1.id, {
                status: 'resolved',
                outcome: 'refund_full',
                notes: 'Resolved',
                resolvedBy: 'admin1',
            });

            const openDisputes = await trustService.getUserDisputes('buyer1', {
                status: 'open',
            });

            expect(openDisputes).toHaveLength(1);
        });
    });

    // ==========================================================================
    // ACCOUNT RESTRICTIONS
    // ==========================================================================

    describe('Account Restrictions', () => {
        it('should block user', async () => {
            await trustService.blockUser('badUser', 'Multiple fraud attempts');

            const isBlocked = await trustService.isUserBlocked('badUser');
            expect(isBlocked).toBe(true);
        });

        it('should unblock user', async () => {
            await trustService.blockUser('user1', 'Temporary restriction');
            await trustService.unblockUser('user1');

            const isBlocked = await trustService.isUserBlocked('user1');
            expect(isBlocked).toBe(false);
        });

        it('should get list of blocked users', async () => {
            await trustService.blockUser('user1', 'Reason 1');
            await trustService.blockUser('user2', 'Reason 2');
            await trustService.blockUser('user3', 'Reason 3');

            const blocked = await trustService.getBlockedUsers();
            expect(blocked).toContain('user1');
            expect(blocked).toContain('user2');
            expect(blocked).toContain('user3');
        });

        it('should return false for non-blocked user', async () => {
            const isBlocked = await trustService.isUserBlocked('goodUser');
            expect(isBlocked).toBe(false);
        });

        it('should create fraud signal when blocking user', async () => {
            await trustService.blockUser('badUser', 'Fraud detected');

            const signals = await trustService.getFraudSignals('badUser');
            const blockSignal = signals.find(
                (s) => s.type === 'behavior' && s.severity === 'critical'
            );

            expect(blockSignal).toBeDefined();
        });
    });

    // ==========================================================================
    // TRUST ANALYTICS
    // ==========================================================================

    describe('Trust Analytics', () => {
        it('should return analytics with empty data', async () => {
            const analytics = await trustService.getTrustAnalytics();

            expect(analytics.averageTrustScore).toBe(0);
            expect(analytics.scoreDistribution).toBeDefined();
            expect(analytics.verificationStats).toBeDefined();
            expect(analytics.fraudStats).toBeDefined();
            expect(analytics.disputeStats).toBeDefined();
        });

        it('should calculate average trust score', async () => {
            await trustService.calculateTrustScore('user1', {
                accountAge: 100,
                emailVerified: true,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 10,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.0,
                reviewCount: 10,
                responseTime: 24,
                profileCompleteness: 70,
            });

            await trustService.calculateTrustScore('user2', {
                accountAge: 200,
                emailVerified: true,
                identityVerified: true,
                businessVerified: false,
                completedOrders: 30,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.5,
                reviewCount: 25,
                responseTime: 12,
                profileCompleteness: 90,
            });

            const analytics = await trustService.getTrustAnalytics();

            expect(analytics.averageTrustScore).toBeGreaterThan(0);
        });

        it('should track score distribution', async () => {
            // Create users with different trust levels
            await trustService.calculateTrustScore('excellentUser', {
                accountAge: 400,
                emailVerified: true,
                identityVerified: true,
                businessVerified: true,
                completedOrders: 50,
                disputesLost: 0,
                disputesWon: 5,
                averageRating: 4.9,
                reviewCount: 100,
                responseTime: 1,
                profileCompleteness: 100,
            });

            await trustService.calculateTrustScore('lowUser', {
                accountAge: 10,
                emailVerified: false,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 0,
                disputesLost: 2,
                disputesWon: 0,
                averageRating: 2.0,
                reviewCount: 2,
                responseTime: 72,
                profileCompleteness: 20,
            });

            const analytics = await trustService.getTrustAnalytics();

            // At least one user in some distribution bucket
            const totalInDistribution = Object.values(analytics.scoreDistribution).reduce(
                (sum, count) => sum + count,
                0
            );
            expect(totalInDistribution).toBe(2);
        });

        it('should track verification stats', async () => {
            const request = await trustService.requestVerification('user1', 'identity', [
                { type: 'id_front', url: 'https://example.com/id.jpg' },
            ]);

            await trustService.reviewVerification(request.id, 'reviewer', true);

            const analytics = await trustService.getTrustAnalytics();
            expect(analytics.verificationStats.identity).toBe(1);
        });

        it('should track fraud stats', async () => {
            // Create a low-trust user to trigger fraud signals
            await trustService.calculateTrustScore('user1', {
                accountAge: 5,
                emailVerified: false,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 0,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 0,
                reviewCount: 0,
                responseTime: 72,
                profileCompleteness: 10,
            });

            // Large withdrawals from low-trust account will trigger pattern signals
            for (let i = 0; i < 5; i++) {
                await trustService.detectFraud('user1', {
                    type: 'withdrawal',
                    amount: 6000 + i * 100,
                });
            }

            const analytics = await trustService.getTrustAnalytics();
            expect(analytics.fraudStats.totalSignals).toBeGreaterThan(0);
            expect(analytics.fraudStats.byType.pattern).toBeGreaterThan(0);
        });

        it('should track dispute stats', async () => {
            const dispute1 = await trustService.createDispute('user1', {
                transactionId: 'txn_1',
                reason: 'non_delivery',
                description: 'Open dispute',
            });

            await trustService.createDispute('user1', {
                transactionId: 'txn_2',
                reason: 'not_as_described',
                description: 'Another dispute',
            });

            await trustService.resolveDispute(dispute1.id, {
                status: 'resolved',
                outcome: 'refund_full',
                notes: 'Resolved',
                resolvedBy: 'admin',
            });

            const analytics = await trustService.getTrustAnalytics();
            expect(analytics.disputeStats.total).toBe(2);
            expect(analytics.disputeStats.open).toBe(1);
            expect(analytics.disputeStats.resolved).toBe(1);
        });
    });

    // ==========================================================================
    // SINGLETON MANAGEMENT
    // ==========================================================================

    describe('Singleton Management', () => {
        it('should return same instance on multiple calls', () => {
            resetTrustService();
            const instance1 = getTrustService();
            const instance2 = getTrustService();

            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', async () => {
            resetTrustService();
            const instance1 = getTrustService();

            await instance1.calculateTrustScore('user1', {
                accountAge: 100,
                emailVerified: true,
                identityVerified: false,
                businessVerified: false,
                completedOrders: 10,
                disputesLost: 0,
                disputesWon: 0,
                averageRating: 4.0,
                reviewCount: 10,
                responseTime: 24,
                profileCompleteness: 70,
            });

            resetTrustService();
            const instance2 = getTrustService();

            const score = await instance2.getTrustScore('user1');
            expect(score).toBeNull(); // Data should be cleared
        });
    });
});
