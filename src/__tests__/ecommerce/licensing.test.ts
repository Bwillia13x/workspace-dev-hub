/**
 * Licensing Service Tests
 *
 * Tests for design licensing management, templates, and royalty tracking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    LicensingService,
    getLicensingService,
    resetLicensingService,
    LICENSE_TEMPLATES,
} from '../../ecommerce/licensing';
import type { LicenseTerms } from '../../ecommerce/types';

describe('Licensing Service', () => {
    let licensingService: LicensingService;

    beforeEach(() => {
        resetLicensingService();
        licensingService = getLicensingService();
    });

    describe('License Templates', () => {
        it('should have predefined license templates', () => {
            expect(LICENSE_TEMPLATES.length).toBeGreaterThan(0);
        });

        it('should get all available templates', () => {
            const templates = licensingService.getTemplates();
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.some(t => t.type === 'exclusive')).toBe(true);
            expect(templates.some(t => t.type === 'limited')).toBe(true);
            expect(templates.some(t => t.type === 'unlimited')).toBe(true);
        });

        it('should get template by ID', () => {
            const template = licensingService.getTemplate('exclusive-perpetual');
            expect(template).toBeDefined();
            expect(template?.type).toBe('exclusive');
        });

        it('should return null for non-existent template', () => {
            const template = licensingService.getTemplate('non-existent');
            expect(template).toBeNull();
        });

        it('should get templates by type', () => {
            const exclusiveTemplates = licensingService.getTemplatesByType('exclusive');
            expect(exclusiveTemplates.every(t => t.type === 'exclusive')).toBe(true);

            const limitedTemplates = licensingService.getTemplatesByType('limited');
            expect(limitedTemplates.every(t => t.type === 'limited')).toBe(true);
        });

        it('should create custom template', () => {
            const customTemplate = licensingService.createCustomTemplate({
                name: 'Custom License',
                description: 'A custom license for testing',
                type: 'custom',
                defaultTerms: {
                    type: 'custom',
                    duration: { value: 6, unit: 'months' },
                    exclusivity: false,
                    transferable: false,
                    sublicensable: false,
                },
                basePrice: 100,
                priceMultiplier: 2,
                isActive: true,
            });

            expect(customTemplate).toBeDefined();
            expect(customTemplate.id).toMatch(/^tmpl_/);
            expect(customTemplate.type).toBe('custom');

            // Should be in templates list
            const templates = licensingService.getTemplates();
            expect(templates.some(t => t.id === customTemplate.id)).toBe(true);
        });
    });

    describe('License Creation', () => {
        const defaultTerms: LicenseTerms = {
            type: 'limited',
            duration: { value: 1, unit: 'years' },
            productionLimit: 50,
            exclusivity: false,
            transferable: false,
            sublicensable: false,
        };

        it('should create a license with custom terms', () => {
            const license = licensingService.createLicense({
                designId: 'design_123',
                sellerId: 'seller_123',
                buyerId: 'buyer_123',
                terms: defaultTerms,
                price: 200,
                currency: 'USD',
            });

            expect(license).toBeDefined();
            expect(license.id).toMatch(/^lic_/);
            expect(license.status).toBe('draft');
            expect(license.terms.type).toBe('limited');
        });

        it('should create a license using template', () => {
            const license = licensingService.createLicense({
                designId: 'design_456',
                sellerId: 'seller_456',
                buyerId: 'buyer_456',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });

            expect(license).toBeDefined();
            expect(license.terms.type).toBe('limited');
            expect(license.terms.productionLimit).toBe(10);
        });

        it('should create a royalty license with rate', () => {
            const license = licensingService.createLicense({
                designId: 'design_789',
                sellerId: 'seller_789',
                buyerId: 'buyer_789',
                templateId: 'royalty-standard',
                price: 0,
                currency: 'USD',
                royaltyRate: 0.08,
            });

            expect(license).toBeDefined();
            expect(license.terms.type).toBe('royalty');
            expect(license.royaltyRate).toBe(0.08);
        });

        it('should throw error without terms or template', () => {
            expect(() => {
                licensingService.createLicense({
                    designId: 'design_error',
                    sellerId: 'seller_error',
                    buyerId: 'buyer_error',
                    price: 100,
                    currency: 'USD',
                });
            }).toThrow('License terms or template ID required');
        });
    });

    describe('License Activation', () => {
        it('should activate a draft license', () => {
            const license = licensingService.createLicense({
                designId: 'design_act',
                sellerId: 'seller_act',
                buyerId: 'buyer_act',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });

            const activated = licensingService.activateLicense(license.id);
            expect(activated.status).toBe('active');
            expect(activated.activatedAt).toBeInstanceOf(Date);
        });

        it('should set expiration for time-limited license', () => {
            const license = licensingService.createLicense({
                designId: 'design_exp',
                sellerId: 'seller_exp',
                buyerId: 'buyer_exp',
                templateId: 'limited-medium',
                price: 200,
                currency: 'USD',
            });

            const activated = licensingService.activateLicense(license.id);
            expect(activated.expiresAt).toBeInstanceOf(Date);
        });

        it('should not set expiration for perpetual license', () => {
            const license = licensingService.createLicense({
                designId: 'design_perp',
                sellerId: 'seller_perp',
                buyerId: 'buyer_perp',
                templateId: 'exclusive-perpetual',
                price: 5000,
                currency: 'USD',
            });

            const activated = licensingService.activateLicense(license.id);
            expect(activated.expiresAt).toBeUndefined();
        });

        it('should initialize production count for limited license', () => {
            const license = licensingService.createLicense({
                designId: 'design_prod',
                sellerId: 'seller_prod',
                buyerId: 'buyer_prod',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });

            const activated = licensingService.activateLicense(license.id);
            expect(activated.productionCount).toBe(0);
        });

        it('should throw error for non-existent license', () => {
            expect(() => {
                licensingService.activateLicense('non_existent');
            }).toThrow('not found');
        });
    });

    describe('License Queries', () => {
        beforeEach(() => {
            // Create multiple licenses
            for (let i = 0; i < 5; i++) {
                const license = licensingService.createLicense({
                    designId: `design_${i}`,
                    sellerId: 'seller_query',
                    buyerId: 'buyer_query',
                    templateId: i % 2 === 0 ? 'limited-small' : 'unlimited-standard',
                    price: 100,
                    currency: 'USD',
                });
                if (i < 3) {
                    licensingService.activateLicense(license.id);
                }
            }
        });

        it('should get license by ID', () => {
            const created = licensingService.createLicense({
                designId: 'design_get',
                sellerId: 'seller_get',
                buyerId: 'buyer_get',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });

            const license = licensingService.getLicense(created.id);
            expect(license).toBeDefined();
            expect(license?.id).toBe(created.id);
        });

        it('should list licenses as buyer', () => {
            const licenses = licensingService.listLicenses('buyer_query', 'buyer');
            expect(licenses.length).toBe(5);
        });

        it('should list licenses as seller', () => {
            const licenses = licensingService.listLicenses('seller_query', 'seller');
            expect(licenses.length).toBe(5);
        });

        it('should filter licenses by status', () => {
            const activeLicenses = licensingService.listLicenses('buyer_query', 'buyer', {
                status: 'active',
            });
            expect(activeLicenses.every(l => l.status === 'active')).toBe(true);
        });

        it('should filter licenses by type', () => {
            const limitedLicenses = licensingService.listLicenses('buyer_query', 'buyer', {
                type: 'limited',
            });
            expect(limitedLicenses.every(l => l.terms.type === 'limited')).toBe(true);
        });

        it('should limit results', () => {
            const licenses = licensingService.listLicenses('buyer_query', 'buyer', {
                limit: 2,
            });
            expect(licenses.length).toBe(2);
        });
    });

    describe('Exclusive License Checks', () => {
        it('should detect exclusive license on design', () => {
            const license = licensingService.createLicense({
                designId: 'design_excl',
                sellerId: 'seller_excl',
                buyerId: 'buyer_excl',
                templateId: 'exclusive-perpetual',
                price: 5000,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            expect(licensingService.hasExclusiveLicense('design_excl')).toBe(true);
        });

        it('should return false for non-exclusive design', () => {
            const license = licensingService.createLicense({
                designId: 'design_non_excl',
                sellerId: 'seller_non_excl',
                buyerId: 'buyer_non_excl',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            expect(licensingService.hasExclusiveLicense('design_non_excl')).toBe(false);
        });

        it('should prevent purchase when exclusive license exists', () => {
            const license = licensingService.createLicense({
                designId: 'design_block',
                sellerId: 'seller_block',
                buyerId: 'buyer_block',
                templateId: 'exclusive-perpetual',
                price: 5000,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            const check = licensingService.canPurchaseLicense('design_block', 'limited');
            expect(check.canPurchase).toBe(false);
            expect(check.reason).toContain('exclusive');
        });

        it('should allow purchase when no exclusive license', () => {
            const check = licensingService.canPurchaseLicense('design_free', 'limited');
            expect(check.canPurchase).toBe(true);
        });
    });

    describe('Production Tracking', () => {
        let licenseId: string;

        beforeEach(() => {
            const license = licensingService.createLicense({
                designId: 'design_prod_track',
                sellerId: 'seller_prod_track',
                buyerId: 'buyer_prod_track',
                templateId: 'limited-small', // 10 unit limit
                price: 50,
                currency: 'USD',
            });
            licenseId = license.id;
            licensingService.activateLicense(licenseId);
        });

        it('should record production', () => {
            const updated = licensingService.recordProduction(licenseId, 3);
            expect(updated.productionCount).toBe(3);
        });

        it('should accumulate production', () => {
            licensingService.recordProduction(licenseId, 3);
            const updated = licensingService.recordProduction(licenseId, 2);
            expect(updated.productionCount).toBe(5);
        });

        it('should throw error when exceeding limit', () => {
            expect(() => {
                licensingService.recordProduction(licenseId, 15);
            }).toThrow('exceed limit');
        });

        it('should get remaining production', () => {
            licensingService.recordProduction(licenseId, 4);
            const remaining = licensingService.getRemainingProduction(licenseId);
            expect(remaining).toBe(6);
        });

        it('should return null for non-limited license', () => {
            const unlimitedLicense = licensingService.createLicense({
                designId: 'design_unlimited',
                sellerId: 'seller_unlimited',
                buyerId: 'buyer_unlimited',
                templateId: 'unlimited-standard',
                price: 1000,
                currency: 'USD',
            });
            licensingService.activateLicense(unlimitedLicense.id);

            const remaining = licensingService.getRemainingProduction(unlimitedLicense.id);
            expect(remaining).toBeNull();
        });
    });

    describe('Royalty Tracking', () => {
        let royaltyLicenseId: string;

        beforeEach(() => {
            const license = licensingService.createLicense({
                designId: 'design_royalty',
                sellerId: 'seller_royalty',
                buyerId: 'buyer_royalty',
                templateId: 'royalty-standard',
                price: 0,
                currency: 'USD',
                royaltyRate: 0.10,
            });
            royaltyLicenseId = license.id;
            licensingService.activateLicense(royaltyLicenseId);
        });

        it('should record royalty payment', () => {
            const updated = licensingService.recordRoyalty(royaltyLicenseId, 50);
            expect(updated.royaltyEarned).toBe(50);
        });

        it('should accumulate royalties', () => {
            licensingService.recordRoyalty(royaltyLicenseId, 50);
            const updated = licensingService.recordRoyalty(royaltyLicenseId, 30);
            expect(updated.royaltyEarned).toBe(80);
        });

        it('should calculate royalty for sale amount', () => {
            const royalty = licensingService.calculateRoyalty(royaltyLicenseId, 100);
            expect(royalty).toBe(10); // 10% of 100
        });

        it('should use default rate if not specified', () => {
            const license = licensingService.createLicense({
                designId: 'design_royalty_default',
                sellerId: 'seller_royalty_default',
                buyerId: 'buyer_royalty_default',
                templateId: 'royalty-standard',
                price: 0,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            const royalty = licensingService.calculateRoyalty(license.id, 100);
            expect(royalty).toBe(5); // Default 5% of 100
        });
    });

    describe('License Lifecycle', () => {
        it('should revoke a license', () => {
            const license = licensingService.createLicense({
                designId: 'design_revoke',
                sellerId: 'seller_revoke',
                buyerId: 'buyer_revoke',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            const revoked = licensingService.revokeLicense(license.id, 'Violation of terms');
            expect(revoked.status).toBe('revoked');
        });

        it('should transfer a transferable license', () => {
            const license = licensingService.createLicense({
                designId: 'design_transfer',
                sellerId: 'seller_transfer',
                buyerId: 'buyer_transfer',
                templateId: 'exclusive-perpetual', // transferable
                price: 5000,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            const newLicense = licensingService.transferLicense(license.id, 'new_buyer');
            expect(newLicense.buyerId).toBe('new_buyer');
            expect(newLicense.status).toBe('active');
        });

        it('should throw error transferring non-transferable license', () => {
            const license = licensingService.createLicense({
                designId: 'design_no_transfer',
                sellerId: 'seller_no_transfer',
                buyerId: 'buyer_no_transfer',
                templateId: 'limited-small', // not transferable
                price: 50,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            expect(() => {
                licensingService.transferLicense(license.id, 'new_buyer');
            }).toThrow('not transferable');
        });
    });

    describe('License Agreements', () => {
        let licenseId: string;

        beforeEach(() => {
            const license = licensingService.createLicense({
                designId: 'design_agreement',
                sellerId: 'seller_agreement',
                buyerId: 'buyer_agreement',
                templateId: 'limited-medium',
                price: 200,
                currency: 'USD',
            });
            licenseId = license.id;
        });

        it('should generate agreement document', () => {
            const agreement = licensingService.generateAgreement(licenseId);
            expect(agreement).toBeDefined();
            expect(agreement.id).toMatch(/^agr_/);
            expect(agreement.content).toContain('LICENSE AGREEMENT');
            expect(agreement.signerIds).toContain('seller_agreement');
            expect(agreement.signerIds).toContain('buyer_agreement');
        });

        it('should sign agreement', () => {
            const agreement = licensingService.generateAgreement(licenseId);
            const signed = licensingService.signAgreement(agreement.id, 'seller_agreement');
            expect(signed.signedAt['seller_agreement']).toBeInstanceOf(Date);
        });

        it('should activate license when all parties sign', () => {
            const agreement = licensingService.generateAgreement(licenseId);
            licensingService.signAgreement(agreement.id, 'seller_agreement');
            licensingService.signAgreement(agreement.id, 'buyer_agreement');

            const license = licensingService.getLicense(licenseId);
            expect(license?.status).toBe('active');
        });

        it('should get agreement for license', () => {
            licensingService.generateAgreement(licenseId);
            const agreement = licensingService.getAgreement(licenseId);
            expect(agreement).toBeDefined();
            expect(agreement?.licenseId).toBe(licenseId);
        });

        it('should throw error for non-party signer', () => {
            const agreement = licensingService.generateAgreement(licenseId);
            expect(() => {
                licensingService.signAgreement(agreement.id, 'unauthorized_user');
            }).toThrow('not a party');
        });
    });

    describe('Pricing', () => {
        it('should calculate license price', () => {
            const result = licensingService.calculatePrice('limited-small', 100);
            expect(result.price).toBeGreaterThan(0);
            expect(result.breakdown).toBeDefined();
        });

        it('should apply custom multiplier', () => {
            const result = licensingService.calculatePrice('limited-small', 100, {
                customMultiplier: 2,
            });
            expect(result.breakdown.multiplier).toBe(2);
        });

        it('should apply discount', () => {
            const noDiscount = licensingService.calculatePrice('limited-small', 100);
            const withDiscount = licensingService.calculatePrice('limited-small', 100, {
                discountPercent: 20,
            });
            expect(withDiscount.price).toBeLessThan(noDiscount.price);
        });

        it('should get available license options for design', () => {
            const options = licensingService.getAvailableLicenseOptions('new_design');
            expect(options.length).toBeGreaterThan(0);
            expect(options.every(o => typeof o.available === 'boolean')).toBe(true);
        });
    });

    describe('Event Subscription', () => {
        it('should subscribe to events', () => {
            const events: unknown[] = [];
            const unsubscribe = licensingService.subscribe((event) => {
                events.push(event);
            });

            expect(typeof unsubscribe).toBe('function');
            unsubscribe();
        });

        it('should emit events on activation', () => {
            const events: unknown[] = [];
            licensingService.subscribe((event) => {
                events.push(event);
            });

            const license = licensingService.createLicense({
                designId: 'design_event',
                sellerId: 'seller_event',
                buyerId: 'buyer_event',
                templateId: 'limited-small',
                price: 50,
                currency: 'USD',
            });
            licensingService.activateLicense(license.id);

            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance from getLicensingService', () => {
            const instance1 = getLicensingService();
            const instance2 = getLicensingService();
            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', () => {
            const instance1 = getLicensingService();
            resetLicensingService();
            const instance2 = getLicensingService();
            expect(instance1).not.toBe(instance2);
        });
    });
});
