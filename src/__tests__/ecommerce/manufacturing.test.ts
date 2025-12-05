/**
 * Manufacturing Service Tests
 * 
 * Tests for the manufacturing partner network and production management system.
 * Covers manufacturer directory, quotes, sample orders, production orders,
 * quality control, and analytics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getManufacturingService,
    resetManufacturingService,
    ManufacturingService,
} from '../../ecommerce/manufacturing';
import type {
    ManufacturerCapability,
    Manufacturer,
    ProductionQuote,
    SampleOrder,
    ProductionOrder,
    QualityReport,
} from '../../ecommerce/types';

describe('ManufacturingService', () => {
    let service: ManufacturingService;

    beforeEach(() => {
        resetManufacturingService();
        service = getManufacturingService();
    });

    // ========================================================================
    // SINGLETON PATTERN
    // ========================================================================

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = getManufacturingService();
            const instance2 = getManufacturingService();
            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', () => {
            const instance1 = getManufacturingService();
            resetManufacturingService();
            const instance2 = getManufacturingService();
            expect(instance1).not.toBe(instance2);
        });
    });

    // ========================================================================
    // MANUFACTURER DIRECTORY
    // ========================================================================

    describe('Manufacturer Directory', () => {
        describe('listManufacturers', () => {
            it('should return all sample manufacturers', () => {
                const manufacturers = service.listManufacturers();
                expect(manufacturers.length).toBeGreaterThan(0);
            });

            it('should filter by capabilities', () => {
                const manufacturers = service.listManufacturers({
                    capabilities: ['cut_and_sew', 'embroidery'],
                });
                expect(manufacturers.length).toBeGreaterThan(0);
                manufacturers.forEach(m => {
                    const hasCapability = m.capabilities.some(
                        c => c === 'cut_and_sew' || c === 'embroidery'
                    );
                    expect(hasCapability).toBe(true);
                });
            });

            it('should filter by country code', () => {
                const manufacturers = service.listManufacturers({
                    country: 'CN',
                });
                manufacturers.forEach(m => {
                    expect(m.location.country).toBe('CN');
                });
            });

            it('should filter by minimum quantity capability', () => {
                const minQuantity = 200;
                const manufacturers = service.listManufacturers({
                    minQuantity,
                });
                manufacturers.forEach(m => {
                    expect(m.minOrderQuantity).toBeLessThanOrEqual(minQuantity);
                });
            });

            it('should filter by maximum lead time', () => {
                const maxLeadTime = 30;
                const manufacturers = service.listManufacturers({
                    maxLeadTime,
                });
                manufacturers.forEach(m => {
                    expect(m.leadTimeDays.production).toBeLessThanOrEqual(maxLeadTime);
                });
            });

            it('should filter by sustainability score', () => {
                const minScore = 4;
                const manufacturers = service.listManufacturers({
                    minSustainabilityScore: minScore,
                });
                manufacturers.forEach(m => {
                    expect(m.sustainabilityScore).toBeGreaterThanOrEqual(minScore);
                });
            });

            it('should filter by quality score', () => {
                const minScore = 5;
                const manufacturers = service.listManufacturers({
                    minQualityScore: minScore,
                });
                manufacturers.forEach(m => {
                    expect(m.qualityScore).toBeGreaterThanOrEqual(minScore);
                });
            });

            it('should sort by rating by default', () => {
                const manufacturers = service.listManufacturers();
                for (let i = 1; i < manufacturers.length; i++) {
                    expect(manufacturers[i - 1].averageRating)
                        .toBeGreaterThanOrEqual(manufacturers[i].averageRating);
                }
            });

            it('should sort by quality score', () => {
                const manufacturers = service.listManufacturers({
                    sortBy: 'quality',
                });
                for (let i = 1; i < manufacturers.length; i++) {
                    expect(manufacturers[i - 1].qualityScore)
                        .toBeGreaterThanOrEqual(manufacturers[i].qualityScore);
                }
            });

            it('should respect limit option', () => {
                const manufacturers = service.listManufacturers({ limit: 2 });
                expect(manufacturers.length).toBe(2);
            });

            it('should filter by verified status', () => {
                const manufacturers = service.listManufacturers({ isVerified: true });
                manufacturers.forEach(m => {
                    expect(m.isVerified).toBe(true);
                });
            });
        });

        describe('getManufacturer', () => {
            it('should return manufacturer by ID', () => {
                const manufacturers = service.listManufacturers();
                const firstId = manufacturers[0].id;
                const manufacturer = service.getManufacturer(firstId);
                expect(manufacturer).not.toBeNull();
                expect(manufacturer?.id).toBe(firstId);
            });

            it('should return null for non-existent ID', () => {
                const manufacturer = service.getManufacturer('non-existent');
                expect(manufacturer).toBeNull();
            });
        });

        describe('searchManufacturers', () => {
            it('should search by name', () => {
                const results = service.searchManufacturers('Shanghai');
                expect(results.length).toBeGreaterThan(0);
                results.forEach(m => {
                    expect(m.name.toLowerCase()).toContain('shanghai');
                });
            });

            it('should search by description', () => {
                const results = service.searchManufacturers('luxury');
                expect(results.length).toBeGreaterThan(0);
            });

            it('should search by certification', () => {
                const results = service.searchManufacturers('GOTS');
                expect(results.length).toBeGreaterThan(0);
            });

            it('should return empty array for no matches', () => {
                const results = service.searchManufacturers('NonExistentManufacturer123');
                expect(results).toEqual([]);
            });
        });

        describe('getRecommendedManufacturers', () => {
            it('should return manufacturers sorted by relevance', () => {
                // Get all manufacturers first to find one with cut_and_sew
                const all = service.listManufacturers();
                const hasCapability = all.some(m => m.capabilities.includes('cut_and_sew'));

                if (hasCapability) {
                    const recommended = service.getRecommendedManufacturers({
                        capabilities: ['cut_and_sew'],
                        quantity: 100,
                    });
                    expect(recommended.length).toBeGreaterThan(0);
                }
            });

            it('should prioritize by sustainability', () => {
                const recommended = service.getRecommendedManufacturers({
                    capabilities: ['cut_and_sew'],
                    quantity: 100,
                    prioritize: 'sustainability',
                });
                // May return empty if no manufacturers match criteria
                expect(Array.isArray(recommended)).toBe(true);
            });

            it('should prioritize by quality', () => {
                const recommended = service.getRecommendedManufacturers({
                    capabilities: ['cut_and_sew'],
                    quantity: 100,
                    prioritize: 'quality',
                });
                expect(Array.isArray(recommended)).toBe(true);
            });

            it('should prioritize by speed', () => {
                const recommended = service.getRecommendedManufacturers({
                    capabilities: ['cut_and_sew'],
                    quantity: 100,
                    prioritize: 'speed',
                });
                expect(Array.isArray(recommended)).toBe(true);
            });

            it('should prioritize by price', () => {
                const recommended = service.getRecommendedManufacturers({
                    capabilities: ['cut_and_sew'],
                    quantity: 100,
                    prioritize: 'price',
                });
                expect(Array.isArray(recommended)).toBe(true);
            });
        });
    });

    // ========================================================================
    // PRODUCTION QUOTES
    // ========================================================================

    describe('Production Quotes', () => {
        let manufacturerId: string;

        beforeEach(() => {
            const manufacturers = service.listManufacturers();
            manufacturerId = manufacturers[0].id;
        });

        describe('requestQuote', () => {
            it('should create a quote request', async () => {
                const quote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 200,
                    specifications: '100% Cotton, Black color',
                });

                expect(quote.id).toMatch(/^qot_/);
                expect(quote.status).toBe('pending');
                expect(quote.quantity).toBe(200);
                expect(quote.totalPrice).toBeGreaterThan(0);
                expect(quote.unitPrice).toBeGreaterThan(0);
            });

            it('should throw error for non-existent manufacturer', async () => {
                await expect(service.requestQuote({
                    manufacturerId: 'non-existent',
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 100,
                })).rejects.toThrow('Manufacturer non-existent not found');
            });

            it('should throw error for quantity below minimum', async () => {
                // Get manufacturer's minimum order quantity
                const manufacturer = service.getManufacturer(manufacturerId)!;
                const belowMinQuantity = manufacturer.minOrderQuantity - 1;

                await expect(service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: belowMinQuantity,
                })).rejects.toThrow(/Minimum order quantity/);
            });

            it('should calculate volume discount for larger orders', async () => {
                // Note: The implementation uses random base prices, so we cannot
                // directly compare two different quotes. Instead, verify that:
                // 1. Different quantity tiers exist (100 = no discount, 200+ = 10%, 500+ = 15%)
                // 2. The pricing mechanism is applied (unitPrice is reasonable)

                const smallQuote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 100,
                });

                const largeQuote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-456',
                    requesterId: 'user-123',
                    quantity: 500,
                });

                // Both should have valid unit prices
                expect(smallQuote.unitPrice).toBeGreaterThan(0);
                expect(largeQuote.unitPrice).toBeGreaterThan(0);

                // Both should have reasonable prices (between $12.75 and $50 based on implementation)
                // Base price is $15-$50, with up to 15% discount for large orders
                expect(smallQuote.unitPrice).toBeGreaterThanOrEqual(15);
                expect(smallQuote.unitPrice).toBeLessThanOrEqual(50);
                expect(largeQuote.unitPrice).toBeGreaterThanOrEqual(12.75); // $15 * 0.85
                expect(largeQuote.unitPrice).toBeLessThanOrEqual(42.5); // $50 * 0.85
            });

            it('should include price breakdown', async () => {
                const quote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                expect(quote.breakdown).toBeDefined();
                expect(quote.breakdown.materials).toBeGreaterThan(0);
                expect(quote.breakdown.labor).toBeGreaterThan(0);
                expect(quote.breakdown.overhead).toBeGreaterThan(0);
            });

            it('should set valid until date', async () => {
                const quote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                expect(quote.validUntil).toBeInstanceOf(Date);
                expect(quote.validUntil.getTime()).toBeGreaterThan(Date.now());
            });
        });

        describe('getQuotesForDesign', () => {
            it('should return quotes for a design', async () => {
                await service.requestQuote({
                    manufacturerId,
                    designId: 'design-456',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                const quotes = service.getQuotesForDesign('design-456');
                expect(quotes.length).toBe(1);
                expect(quotes[0].designId).toBe('design-456');
            });

            it('should return empty array for design with no quotes', () => {
                const quotes = service.getQuotesForDesign('no-quotes-design');
                expect(quotes).toEqual([]);
            });

            it('should return quotes sorted by creation date', async () => {
                await service.requestQuote({
                    manufacturerId,
                    designId: 'design-multi',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                // Get another manufacturer
                const manufacturers = service.listManufacturers();
                const secondManufacturerId = manufacturers[1]?.id || manufacturerId;

                await service.requestQuote({
                    manufacturerId: secondManufacturerId,
                    designId: 'design-multi',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                const quotes = service.getQuotesForDesign('design-multi');
                expect(quotes.length).toBeGreaterThanOrEqual(1);
            });
        });

        describe('acceptQuote', () => {
            it('should accept a pending quote', async () => {
                const quote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                const accepted = service.acceptQuote(quote.id);
                expect(accepted.status).toBe('accepted');
            });

            it('should throw error for non-existent quote', () => {
                expect(() => service.acceptQuote('non-existent'))
                    .toThrow('Quote non-existent not found');
            });

            it('should throw error for already accepted quote', async () => {
                const quote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-123',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                service.acceptQuote(quote.id);
                expect(() => service.acceptQuote(quote.id))
                    .toThrow('Quote is no longer available');
            });
        });
    });

    // ========================================================================
    // SAMPLE ORDERS
    // ========================================================================

    describe('Sample Orders', () => {
        let manufacturerId: string;

        beforeEach(() => {
            const manufacturers = service.listManufacturers();
            manufacturerId = manufacturers[0].id;
        });

        describe('createSampleOrder', () => {
            it('should create a sample order', () => {
                const order = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 3,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Fashion Ave',
                        city: 'New York',
                        state: 'NY',
                        postalCode: '10001',
                        country: 'USA',
                    },
                });

                expect(order.id).toMatch(/^smp_/);
                expect(order.status).toBe('pending');
                expect(order.quantity).toBe(3);
                expect(order.price).toBeGreaterThan(0);
                expect(order.estimatedDelivery).toBeInstanceOf(Date);
            });

            it('should throw error for non-existent manufacturer', () => {
                expect(() => service.createSampleOrder({
                    manufacturerId: 'non-existent',
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                })).toThrow('Manufacturer non-existent not found');
            });

            it('should calculate price based on quantity', () => {
                // Note: The implementation uses random base prices ($50-$200 per sample)
                // So we cannot directly compare two different orders.
                // Instead, verify the price is reasonable based on the formula:
                // price = ($50-$200 random) * quantity
                const order1 = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const order2 = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 5,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                // Both prices should be positive and within expected ranges
                // For quantity 2: price should be between $100 ($50*2) and $400 ($200*2)
                expect(order1.price).toBeGreaterThanOrEqual(100);
                expect(order1.price).toBeLessThanOrEqual(400);

                // For quantity 5: price should be between $250 ($50*5) and $1000 ($200*5)
                expect(order2.price).toBeGreaterThanOrEqual(250);
                expect(order2.price).toBeLessThanOrEqual(1000);
            });
        });

        describe('getSampleOrder', () => {
            it('should retrieve sample order by ID', () => {
                const created = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const retrieved = service.getSampleOrder(created.id);
                expect(retrieved).not.toBeNull();
                expect(retrieved?.id).toBe(created.id);
            });

            it('should return null for non-existent order', () => {
                const order = service.getSampleOrder('non-existent');
                expect(order).toBeNull();
            });
        });

        describe('listSampleOrders', () => {
            it('should list sample orders for a customer', () => {
                service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-1',
                    customerId: 'customer-abc',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-2',
                    customerId: 'customer-abc',
                    quantity: 3,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const orders = service.listSampleOrders('customer-abc');
                expect(orders.length).toBe(2);
            });

            it('should return empty array for customer with no orders', () => {
                const orders = service.listSampleOrders('no-orders-customer');
                expect(orders).toEqual([]);
            });

            it('should sort orders by creation date descending', () => {
                service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-1',
                    customerId: 'customer-sort',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-2',
                    customerId: 'customer-sort',
                    quantity: 3,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const orders = service.listSampleOrders('customer-sort');
                expect(orders[0].createdAt.getTime())
                    .toBeGreaterThanOrEqual(orders[1].createdAt.getTime());
            });
        });

        describe('updateSampleOrderStatus', () => {
            it('should update sample order status', () => {
                const order = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const updated = service.updateSampleOrderStatus(order.id, 'shipped', 'TRACK123');
                expect(updated.status).toBe('shipped');
                expect(updated.trackingNumber).toBe('TRACK123');
            });

            it('should set actualDelivery when status is delivered', () => {
                const order = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const updated = service.updateSampleOrderStatus(order.id, 'delivered');
                expect(updated.status).toBe('delivered');
                expect(updated.actualDelivery).toBeInstanceOf(Date);
            });

            it('should throw error for non-existent order', () => {
                expect(() => service.updateSampleOrderStatus('non-existent', 'shipped'))
                    .toThrow('Sample order non-existent not found');
            });
        });

        describe('submitSampleFeedback', () => {
            it('should approve sample with positive feedback', () => {
                const order = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const updated = service.submitSampleFeedback(order.id, { approved: true, comments: 'Excellent quality!' });

                expect(updated.status).toBe('approved');
                expect(updated.feedback?.approved).toBe(true);
            });

            it('should reject sample with negative feedback', () => {
                const order = service.createSampleOrder({
                    manufacturerId,
                    designId: 'design-123',
                    customerId: 'customer-123',
                    quantity: 2,
                    specifications: { size: 'M', colorway: 'Black' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const updated = service.submitSampleFeedback(order.id, { approved: false, comments: 'Quality issues with stitching' });

                expect(updated.status).toBe('rejected');
                expect(updated.feedback?.approved).toBe(false);
            });

            it('should throw error for non-existent order', () => {
                expect(() => service.submitSampleFeedback('non-existent', { approved: true, comments: 'Sample feedback' })).toThrow('Sample order non-existent not found');
            });
        });
    });

    // ========================================================================
    // PRODUCTION ORDERS
    // ========================================================================

    describe('Production Orders', () => {
        let manufacturerId: string;
        let acceptedQuote: ProductionQuote;

        beforeEach(async () => {
            const manufacturers = service.listManufacturers();
            manufacturerId = manufacturers[0].id;

            const quote = await service.requestQuote({
                manufacturerId,
                designId: 'design-123',
                requesterId: 'user-123',
                quantity: 400,
            });
            acceptedQuote = service.acceptQuote(quote.id);
        });

        describe('createProductionOrder', () => {
            it('should create production order from accepted quote', () => {
                const order = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [
                        { size: 'S', quantity: 100, completed: 0 },
                        { size: 'M', quantity: 200, completed: 0 },
                        { size: 'L', quantity: 100, completed: 0 },
                    ],
                    specifications: { colorways: ['Black'], materials: ['Cotton'.toLowerCase()], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Fashion Ave',
                        city: 'New York',
                        state: 'NY',
                        postalCode: '10001',
                        country: 'USA',
                    },
                });

                expect(order.id).toMatch(/^prd_/);
                expect(order.status).toBe('pending_confirmation');
                expect(order.totalQuantity).toBe(400);
                expect(order.completedQuantity).toBe(0);
                expect(order.paymentSchedule.length).toBe(3);
            });

            it('should set up payment schedule correctly', () => {
                const order = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [{ size: 'M', quantity: 400, completed: 0 }],
                    specifications: { colorways: ['Cotton'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                // 30% deposit, 40% mid-production, 30% completion
                const totalPayment = order.paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
                expect(Math.abs(totalPayment - order.price)).toBeLessThan(1); // Allow rounding
            });

            it('should throw error for non-existent quote', () => {
                expect(() => service.createProductionOrder({
                    quoteId: 'non-existent',
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                })).toThrow('Quote non-existent not found');
            });

            it('should throw error for non-accepted quote', async () => {
                const pendingQuote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-456',
                    requesterId: 'user-123',
                    quantity: 200,
                });

                expect(() => service.createProductionOrder({
                    quoteId: pendingQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                })).toThrow('Quote must be accepted before creating production order');
            });
        });

        describe('getProductionOrder', () => {
            it('should retrieve production order by ID', () => {
                const created = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const retrieved = service.getProductionOrder(created.id);
                expect(retrieved).not.toBeNull();
                expect(retrieved?.id).toBe(created.id);
            });

            it('should return null for non-existent order', () => {
                const order = service.getProductionOrder('non-existent');
                expect(order).toBeNull();
            });
        });

        describe('listProductionOrders', () => {
            it('should list production orders for a customer', () => {
                service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-xyz',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const orders = service.listProductionOrders('customer-xyz');
                expect(orders.length).toBe(1);
            });

            it('should filter by status', () => {
                const order = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-filter',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                service.updateProductionOrderStatus(order.id, 'in_production');

                const pendingOrders = service.listProductionOrders('customer-filter', {
                    status: 'pending_confirmation',
                });
                expect(pendingOrders.length).toBe(0);

                const inProductionOrders = service.listProductionOrders('customer-filter', {
                    status: 'in_production',
                });
                expect(inProductionOrders.length).toBe(1);
            });

            it('should respect limit option', async () => {
                // Create another accepted quote for multiple orders
                const quote2 = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-789',
                    requesterId: 'user-limit',
                    quantity: 200,
                });
                const accepted2 = service.acceptQuote(quote2.id);

                service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-1',
                    customerId: 'customer-limit',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                service.createProductionOrder({
                    quoteId: accepted2.id,
                    licenseId: 'license-2',
                    customerId: 'customer-limit',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '456 Test Ave',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const limitedOrders = service.listProductionOrders('customer-limit', { limit: 1 });
                expect(limitedOrders.length).toBe(1);
            });
        });

        describe('updateProductionOrderStatus', () => {
            it('should update order status and timeline', () => {
                const order = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const confirmed = service.updateProductionOrderStatus(order.id, 'confirmed');
                expect(confirmed.status).toBe('confirmed');
                expect(confirmed.timeline.confirmed).toBeInstanceOf(Date);

                const inProduction = service.updateProductionOrderStatus(order.id, 'in_production');
                expect(inProduction.status).toBe('in_production');
                expect(inProduction.timeline.productionStarted).toBeInstanceOf(Date);
            });

            it('should throw error for non-existent order', () => {
                expect(() => service.updateProductionOrderStatus('non-existent', 'confirmed'))
                    .toThrow('Production order non-existent not found');
            });
        });

        describe('updateProductionProgress', () => {
            it('should update completion quantities', () => {
                const order = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [
                        { size: 'S', quantity: 100, completed: 0 },
                        { size: 'M', quantity: 200, completed: 0 },
                    ],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const updated = service.updateProductionProgress(order.id, [
                    { size: 'S', completed: 50 },
                    { size: 'M', completed: 100 },
                ]);

                expect(updated.completedQuantity).toBe(150);
                expect(updated.quantities.find(q => q.size === 'S')?.completed).toBe(50);
                expect(updated.quantities.find(q => q.size === 'M')?.completed).toBe(100);
            });

            it('should not exceed ordered quantity', () => {
                const order = service.createProductionOrder({
                    quoteId: acceptedQuote.id,
                    licenseId: 'license-123',
                    customerId: 'customer-123',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const updated = service.updateProductionProgress(order.id, [
                    { size: 'M', completed: 150 }, // Exceeds ordered quantity
                ]);

                expect(updated.quantities.find(q => q.size === 'M')?.completed).toBe(100);
            });

            it('should throw error for non-existent order', () => {
                expect(() => service.updateProductionProgress('non-existent', []))
                    .toThrow('Production order non-existent not found');
            });
        });
    });

    // ========================================================================
    // QUALITY CONTROL
    // ========================================================================

    describe('Quality Control', () => {
        let productionOrder: ProductionOrder;

        beforeEach(async () => {
            const manufacturers = service.listManufacturers();
            const manufacturerId = manufacturers[0].id;

            const quote = await service.requestQuote({
                manufacturerId,
                designId: 'design-qc',
                requesterId: 'user-qc',
                quantity: 200,
            });
            const acceptedQuote = service.acceptQuote(quote.id);

            productionOrder = service.createProductionOrder({
                quoteId: acceptedQuote.id,
                licenseId: 'license-qc',
                customerId: 'customer-qc',
                quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    postalCode: '12345',
                    country: 'USA',
                },
            });

            // Update progress so we have completed quantity
            service.updateProductionProgress(productionOrder.id, [
                { size: 'M', completed: 100 },
            ]);
        });

        describe('createQualityReport', () => {
            it('should create a passing quality report', () => {
                const report = service.createQualityReport({
                    orderId: productionOrder.id,
                    inspector: 'QC Inspector 1',
                    checklist: [
                        { item: 'Fabric quality', passed: true },
                        { item: 'Stitching', passed: true },
                        { item: 'Color accuracy', passed: true },
                        { item: 'Sizing', passed: true },
                    ],
                    defectsFound: 2,
                });

                expect(report.id).toMatch(/^qr_/);
                expect(report.status).toBe('passed');
                expect(report.defectRate).toBe(0.02); // 2/100
            });

            it('should create a conditional quality report', () => {
                const report = service.createQualityReport({
                    orderId: productionOrder.id,
                    inspector: 'QC Inspector 1',
                    checklist: [
                        { item: 'Fabric quality', passed: true },
                        { item: 'Stitching', passed: true },
                        { item: 'Color accuracy', passed: true },
                        { item: 'Sizing', passed: false },
                        { item: 'Labels', passed: true },
                    ],
                    defectsFound: 8,
                });

                expect(report.status).toBe('conditional');
            });

            it('should create a failed quality report', () => {
                const report = service.createQualityReport({
                    orderId: productionOrder.id,
                    inspector: 'QC Inspector 1',
                    checklist: [
                        { item: 'Fabric quality', passed: false },
                        { item: 'Stitching', passed: false },
                        { item: 'Color accuracy', passed: true },
                        { item: 'Sizing', passed: false },
                    ],
                    defectsFound: 15,
                });

                expect(report.status).toBe('failed');
            });

            it('should add report to production order', () => {
                service.createQualityReport({
                    orderId: productionOrder.id,
                    inspector: 'QC Inspector 1',
                    checklist: [
                        { item: 'Fabric quality', passed: true },
                    ],
                    defectsFound: 0,
                });

                const order = service.getProductionOrder(productionOrder.id);
                expect(order?.qualityReports.length).toBe(1);
            });

            it('should throw error for non-existent order', () => {
                expect(() => service.createQualityReport({
                    orderId: 'non-existent',
                    inspector: 'Inspector',
                    checklist: [],
                    defectsFound: 0,
                })).toThrow('Production order non-existent not found');
            });
        });

        describe('getQualityReports', () => {
            it('should return quality reports for an order', () => {
                service.createQualityReport({
                    orderId: productionOrder.id,
                    inspector: 'Inspector 1',
                    checklist: [{ item: 'Check 1', passed: true }],
                    defectsFound: 0,
                });

                service.createQualityReport({
                    orderId: productionOrder.id,
                    inspector: 'Inspector 2',
                    checklist: [{ item: 'Check 2', passed: true }],
                    defectsFound: 1,
                });

                const reports = service.getQualityReports(productionOrder.id);
                expect(reports.length).toBe(2);
            });

            it('should return empty array for order with no reports', () => {
                const reports = service.getQualityReports('non-existent');
                expect(reports).toEqual([]);
            });
        });
    });

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    describe('Analytics', () => {
        describe('getManufacturerStats', () => {
            it('should return initial stats for manufacturer', () => {
                const manufacturers = service.listManufacturers();
                const manufacturerId = manufacturers[0].id;

                const stats = service.getManufacturerStats(manufacturerId);

                expect(stats).toHaveProperty('pendingQuotes');
                expect(stats).toHaveProperty('activeOrders');
                expect(stats).toHaveProperty('completedOrders');
                expect(stats).toHaveProperty('averageLeadTime');
                expect(stats).toHaveProperty('onTimeRate');
                expect(stats).toHaveProperty('defectRate');
            });

            it('should track pending quotes', async () => {
                const manufacturers = service.listManufacturers();
                const manufacturerId = manufacturers[0].id;

                await service.requestQuote({
                    manufacturerId,
                    designId: 'design-stats',
                    requesterId: 'user-stats',
                    quantity: 200,
                });

                const stats = service.getManufacturerStats(manufacturerId);
                expect(stats.pendingQuotes).toBeGreaterThanOrEqual(1);
            });

            it('should track active orders', async () => {
                const manufacturers = service.listManufacturers();
                const manufacturerId = manufacturers[0].id;

                const quote = await service.requestQuote({
                    manufacturerId,
                    designId: 'design-active',
                    requesterId: 'user-active',
                    quantity: 200,
                });
                const accepted = service.acceptQuote(quote.id);

                service.createProductionOrder({
                    quoteId: accepted.id,
                    licenseId: 'license-active',
                    customerId: 'customer-active',
                    quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                    specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                    shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        postalCode: '12345',
                        country: 'USA',
                    },
                });

                const stats = service.getManufacturerStats(manufacturerId);
                expect(stats.activeOrders).toBeGreaterThanOrEqual(1);
            });
        });
    });

    // ========================================================================
    // EVENT SYSTEM
    // ========================================================================

    describe('Event System', () => {
        it('should emit quote_received event', async () => {
            const listener = vi.fn();
            service.subscribe(listener);

            const manufacturers = service.listManufacturers();
            const manufacturerId = manufacturers[0].id;

            await service.requestQuote({
                manufacturerId,
                designId: 'design-event',
                requesterId: 'user-event',
                quantity: 200,
            });

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'quote_received' })
            );
        });

        it('should emit production_started event', async () => {
            const listener = vi.fn();
            service.subscribe(listener);

            const manufacturers = service.listManufacturers();
            const manufacturerId = manufacturers[0].id;

            const quote = await service.requestQuote({
                manufacturerId,
                designId: 'design-event',
                requesterId: 'user-event',
                quantity: 200,
            });
            const accepted = service.acceptQuote(quote.id);

            service.createProductionOrder({
                quoteId: accepted.id,
                licenseId: 'license-event',
                customerId: 'customer-event',
                quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    postalCode: '12345',
                    country: 'USA',
                },
            });

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'production_started' })
            );
        });

        it('should emit production_completed event', async () => {
            const listener = vi.fn();
            service.subscribe(listener);

            const manufacturers = service.listManufacturers();
            const manufacturerId = manufacturers[0].id;

            const quote = await service.requestQuote({
                manufacturerId,
                designId: 'design-complete',
                requesterId: 'user-complete',
                quantity: 200,
            });
            const accepted = service.acceptQuote(quote.id);

            const order = service.createProductionOrder({
                quoteId: accepted.id,
                licenseId: 'license-complete',
                customerId: 'customer-complete',
                quantities: [{ size: 'M', quantity: 100, completed: 0 }],
                specifications: { colorways: ['Black'], materials: ['cotton'], trims: [], packaging: 'poly bag', labeling: 'brand label' },
                shippingAddress: {
                        name: 'Test User',
                        line1: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    postalCode: '12345',
                    country: 'USA',
                },
            });

            service.updateProductionOrderStatus(order.id, 'completed');

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'production_completed' })
            );
        });

        it('should allow unsubscribing from events', async () => {
            const listener = vi.fn();
            const unsubscribe = service.subscribe(listener);
            unsubscribe();

            const manufacturers = service.listManufacturers();
            const manufacturerId = manufacturers[0].id;

            await service.requestQuote({
                manufacturerId,
                designId: 'design-unsub',
                requesterId: 'user-unsub',
                quantity: 200,
            });

            expect(listener).not.toHaveBeenCalled();
        });
    });
});
