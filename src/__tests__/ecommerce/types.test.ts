/**
 * E-commerce Types Tests
 *
 * Tests for type definitions and type guards in the e-commerce module.
 */

import { describe, it, expect } from 'vitest';
import type {
    Currency,
    PaymentStatus,
    PaymentMethod,
    PaymentIntent,
    PaymentSplit,
    Transaction,
    TrustScore,
    LicenseType,
    LicenseStatus,
    License,
    LicenseTemplate,
    DesignerProfile,
    DesignerEarnings,
    MarketplaceListing,
    ListingStatus,
    Manufacturer,
    ProductionQuote,
    ProductionOrder,
    SampleOrder,
    DisputeReason,
    DisputeStatus,
    Dispute,
    CopyrightClaim,
    ShippingAddress,
} from '../../ecommerce/types';

describe('E-commerce Types', () => {
    describe('Payment Types', () => {
        it('should define Currency type correctly', () => {
            const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
            expect(currencies).toHaveLength(6);
            currencies.forEach((c) => expect(typeof c).toBe('string'));
        });

        it('should define PaymentStatus type correctly', () => {
            const statuses: PaymentStatus[] = [
                'pending',
                'processing',
                'succeeded',
                'failed',
                'refunded',
                'partially_refunded',
                'disputed',
                'canceled',
            ];
            expect(statuses).toHaveLength(8);
        });

        it('should define PaymentMethod type correctly', () => {
            const methods: PaymentMethod[] = [
                'card',
                'bank_transfer',
                'paypal',
                'apple_pay',
                'google_pay',
                'crypto',
            ];
            expect(methods).toHaveLength(6);
        });

        it('should create valid PaymentIntent object', () => {
            const paymentIntent: PaymentIntent = {
                id: 'pi_123',
                amount: 9999,
                currency: 'USD',
                status: 'pending',
                customerId: 'cust_123',
                sellerId: 'seller_123',
                designId: 'design_123',
                metadata: { source: 'marketplace' },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(paymentIntent.id).toBe('pi_123');
            expect(paymentIntent.amount).toBe(9999);
            expect(paymentIntent.currency).toBe('USD');
        });

        it('should create valid PaymentSplit object', () => {
            const split: PaymentSplit = {
                designerId: 'designer_123',
                designerAmount: 70,
                platformAmount: 20,
                manufacturerAmount: 10,
                processingFee: 2.9,
            };

            expect(split.designerAmount + split.platformAmount + split.manufacturerAmount).toBe(100);
        });

        it('should create valid Transaction object', () => {
            const transaction: Transaction = {
                id: 'txn_123',
                type: 'payment',
                amount: 100,
                currency: 'USD',
                status: 'succeeded',
                fromUserId: 'user_1',
                toUserId: 'user_2',
                description: 'Design purchase',
                metadata: {},
                createdAt: new Date(),
            };

            expect(transaction.type).toBe('payment');
        });
    });

    describe('Trust Types', () => {
        it('should create valid TrustScore object', () => {
            const trustScore: TrustScore = {
                userId: 'user_123',
                score: 85,
                level: 'good',
                factors: {
                    accountAge: 365,
                    completedOrders: 50,
                    disputeRate: 0.02,
                    averageRating: 4.8,
                    responseTime: 2,
                    verificationLevel: 'identity',
                },
                lastUpdated: new Date(),
            };

            expect(trustScore.score).toBe(85);
            expect(trustScore.level).toBe('good');
            expect(trustScore.factors.verificationLevel).toBe('identity');
        });

        it('should validate trust levels', () => {
            const levels: TrustScore['level'][] = ['excellent', 'good', 'average', 'low', 'poor'];
            expect(levels).toHaveLength(5);
        });
    });

    describe('Licensing Types', () => {
        it('should define LicenseType correctly', () => {
            const types: LicenseType[] = [
                'exclusive',
                'limited',
                'unlimited',
                'subscription',
                'royalty',
                'custom',
            ];
            expect(types).toHaveLength(6);
        });

        it('should define LicenseStatus correctly', () => {
            const statuses: LicenseStatus[] = [
                'draft',
                'active',
                'expired',
                'revoked',
                'transferred',
                'disputed',
            ];
            expect(statuses).toHaveLength(6);
        });

        it('should create valid License object', () => {
            const license: License = {
                id: 'lic_123',
                designId: 'design_123',
                sellerId: 'seller_123',
                buyerId: 'buyer_123',
                terms: {
                    type: 'limited',
                    duration: { value: 1, unit: 'years' },
                    productionLimit: 100,
                    exclusivity: false,
                    transferable: false,
                    sublicensable: false,
                },
                price: 500,
                currency: 'USD',
                status: 'active',
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(license.terms.type).toBe('limited');
            expect(license.terms.productionLimit).toBe(100);
        });

        it('should create valid LicenseTemplate object', () => {
            const template: LicenseTemplate = {
                id: 'template_123',
                name: 'Standard Commercial',
                description: 'Full commercial rights',
                type: 'unlimited',
                defaultTerms: {
                    type: 'unlimited',
                    duration: { value: 0, unit: 'perpetual' },
                    exclusivity: false,
                    transferable: true,
                    sublicensable: false,
                },
                basePrice: 500,
                priceMultiplier: 1.5,
                isActive: true,
                createdAt: new Date(),
            };

            expect(template.type).toBe('unlimited');
            expect(template.basePrice).toBe(500);
        });
    });

    describe('Designer Types', () => {
        it('should create valid DesignerProfile object', () => {
            const profile: DesignerProfile = {
                id: 'designer_123',
                userId: 'user_123',
                displayName: 'Jane Designer',
                bio: 'Fashion designer specializing in sustainable fashion',
                avatar: 'https://example.com/avatar.jpg',
                socialLinks: {
                    instagram: '@janedesigner',
                    website: 'https://janedesigner.com',
                },
                specialties: ['sustainable', 'streetwear'],
                verified: true,
                verificationLevel: 'identity',
                totalSales: 150,
                totalRevenue: 25000,
                rating: 4.9,
                reviewCount: 45,
                followerCount: 1200,
                followingCount: 50,
                joinedAt: new Date('2024-01-01'),
                lastActiveAt: new Date(),
            };

            expect(profile.displayName).toBe('Jane Designer');
            expect(profile.verified).toBe(true);
            expect(profile.totalSales).toBe(150);
        });

        it('should create valid DesignerEarnings object', () => {
            const earnings: DesignerEarnings = {
                userId: 'user_123',
                designerId: 'designer_123',
                totalEarnings: 25000,
                pendingEarnings: 500,
                availableBalance: 1500,
                lifetimeEarnings: 30000,
                payoutSchedule: 'monthly',
                minimumPayout: 50,
                currency: 'USD',
                earningsByMonth: [
                    { month: '2025-01', amount: 5000 },
                    { month: '2025-02', amount: 4500 },
                ],
                earningsByCategory: {
                    dresses: 10000,
                    tops: 8000,
                    accessories: 7000,
                },
            };

            expect(earnings.totalEarnings).toBe(25000);
            expect(earnings.earningsByMonth).toHaveLength(2);
        });
    });

    describe('Marketplace Types', () => {
        it('should define ListingStatus correctly', () => {
            const statuses: ListingStatus[] = [
                'draft',
                'pending_review',
                'active',
                'sold',
                'suspended',
                'expired',
                'archived',
            ];
            expect(statuses).toHaveLength(7);
        });

        it('should create valid MarketplaceListing object', () => {
            const listing: MarketplaceListing = {
                id: 'listing_123',
                designId: 'design_123',
                sellerId: 'seller_123',
                title: 'Modern Summer Dress',
                description: 'A beautiful summer dress design',
                status: 'active',
                pricing: {
                    designId: 'design_123',
                    basePrice: 500,
                    currency: 'USD',
                    licensePrices: {
                        exclusive: 5000,
                        limited: 500,
                        unlimited: 2000,
                        subscription: 100,
                        royalty: 200,
                        custom: 0,
                    },
                    bulkDiscounts: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                availableLicenses: ['limited', 'unlimited'],
                tags: ['summer', 'casual', 'modern'],
                category: 'dresses',
                subcategory: 'casual',
                colors: ['white', 'blue'],
                images: [
                    { url: 'https://example.com/image1.jpg', type: 'main', order: 0 },
                ],
                viewCount: 1500,
                likeCount: 120,
                salesCount: 45,
                rating: 4.8,
                reviewCount: 10,
                isFeatured: false,
                isPromoted: false,
                publishedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(listing.title).toBe('Modern Summer Dress');
            expect(listing.status).toBe('active');
            expect(listing.availableLicenses).toHaveLength(2);
        });
    });

    describe('Manufacturing Types', () => {
        it('should create valid Manufacturer object', () => {
            const manufacturer: Manufacturer = {
                id: 'mfr_123',
                name: 'Quality Garments Co.',
                description: 'Premium garment manufacturer',
                status: 'approved',
                contactEmail: 'contact@qualitygarments.com',
                location: {
                    country: 'PT',
                    city: 'Porto',
                    timezone: 'Europe/Lisbon',
                },
                capabilities: ['cut_and_sew', 'embroidery', 'printing'],
                certifications: ['GOTS', 'OEKO-TEX'],
                minOrderQuantity: 50,
                leadTimeDays: {
                    sample: 14,
                    production: 30,
                },
                sustainabilityScore: 4,
                qualityScore: 5,
                reliabilityScore: 4,
                totalOrders: 500,
                completedOrders: 485,
                onTimeDeliveryRate: 0.94,
                defectRate: 0.02,
                averageRating: 4.8,
                reviewCount: 120,
                isVerified: true,
                joinedAt: new Date(),
                lastActiveAt: new Date(),
            };

            expect(manufacturer.name).toBe('Quality Garments Co.');
            expect(manufacturer.sustainabilityScore).toBe(4);
        });

        it('should create valid ProductionQuote object', () => {
            const quote: ProductionQuote = {
                id: 'quote_123',
                manufacturerId: 'mfr_123',
                designId: 'design_123',
                requesterId: 'user_123',
                quantity: 100,
                unitPrice: 25,
                totalPrice: 2500,
                currency: 'USD',
                breakdown: {
                    materials: 1000,
                    labor: 1000,
                    overhead: 500,
                },
                leadTimeDays: 21,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
                createdAt: new Date(),
            };

            expect(quote.quantity).toBe(100);
            expect(quote.unitPrice).toBe(25);
        });

        it('should create valid SampleOrder object', () => {
            const shippingAddress: ShippingAddress = {
                name: 'John Doe',
                company: 'Fashion Co.',
                line1: '123 Main St',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
                country: 'USA',
            };

            const order: SampleOrder = {
                id: 'smp_123',
                manufacturerId: 'mfr_123',
                designId: 'design_123',
                customerId: 'user_123',
                quantity: 3,
                specifications: {
                    size: 'M',
                    colorway: 'Black',
                    materials: ['cotton'],
                },
                status: 'pending',
                price: 300,
                currency: 'USD',
                shippingAddress,
                estimatedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(order.quantity).toBe(3);
            expect(order.specifications.size).toBe('M');
        });

        it('should create valid ProductionOrder object', () => {
            const shippingAddress: ShippingAddress = {
                name: 'John Doe',
                company: 'Fashion Co.',
                line1: '123 Main St',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
                country: 'USA',
            };

            const order: ProductionOrder = {
                id: 'prd_123',
                manufacturerId: 'mfr_123',
                designId: 'design_123',
                customerId: 'user_123',
                licenseId: 'lic_123',
                quoteId: 'quote_123',
                status: 'confirmed',
                quantities: [
                    { size: 'S', quantity: 25, completed: 0 },
                    { size: 'M', quantity: 50, completed: 0 },
                    { size: 'L', quantity: 25, completed: 0 },
                ],
                totalQuantity: 100,
                completedQuantity: 0,
                specifications: {
                    colorways: ['black', 'white'],
                    materials: ['cotton'],
                    trims: ['zipper'],
                    packaging: 'poly bag',
                    labeling: 'brand label',
                },
                timeline: {
                    ordered: new Date(),
                },
                shippingAddress,
                price: 2500,
                currency: 'USD',
                paymentStatus: 'pending',
                paymentSchedule: [
                    { milestone: 'deposit', amount: 750, dueDate: new Date() },
                    { milestone: 'mid-production', amount: 1000, dueDate: new Date() },
                    { milestone: 'completion', amount: 750, dueDate: new Date() },
                ],
                qualityReports: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(order.status).toBe('confirmed');
            expect(order.totalQuantity).toBe(100);
        });
    });

    describe('Dispute Types', () => {
        it('should define DisputeReason correctly', () => {
            const reasons: DisputeReason[] = [
                'not_as_described',
                'quality_issues',
                'license_violation',
                'copyright_infringement',
                'non_delivery',
                'payment_issue',
                'other',
            ];
            expect(reasons).toHaveLength(7);
        });

        it('should define DisputeStatus correctly', () => {
            const statuses: DisputeStatus[] = [
                'open',
                'under_review',
                'awaiting_response',
                'resolved',
                'escalated',
                'closed',
            ];
            expect(statuses).toHaveLength(6);
        });

        it('should create valid Dispute object', () => {
            const dispute: Dispute = {
                id: 'dispute_123',
                transactionId: 'txn_123',
                initiatorId: 'user_1',
                respondentId: 'user_2',
                reason: 'not_as_described',
                description: 'The design was different from the preview',
                evidence: [
                    { type: 'image', url: 'https://example.com/evidence1.jpg', description: 'Screenshot' },
                ],
                status: 'open',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(dispute.reason).toBe('not_as_described');
            expect(dispute.status).toBe('open');
        });
    });

    describe('Copyright Types', () => {
        it('should create valid CopyrightClaim object', () => {
            const claim: CopyrightClaim = {
                id: 'claim_123',
                claimantId: 'user_123',
                designId: 'design_456',
                originalWorkUrl: 'https://example.com/original',
                originalCreationDate: new Date('2024-01-01'),
                description: 'This design copies my original work',
                evidence: ['https://example.com/proof1.jpg'],
                status: 'pending',
                createdAt: new Date(),
            };

            expect(claim.status).toBe('pending');
            expect(claim.evidence).toHaveLength(1);
        });
    });
});
