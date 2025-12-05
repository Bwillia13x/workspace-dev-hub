/**
 * Manufacturing Service - Phase 5 E-commerce & Monetization
 *
 * Manufacturing partner network with factory directory,
 * quotes, samples, and production tracking.
 */

import type {
    Manufacturer,
    ManufacturerStatus,
    ManufacturerCapability,
    ProductionQuote,
    SampleOrder,
    ProductionOrder,
    ProductionStatus,
    QualityReport,
    ShippingAddress,
    Currency,
    EcommerceEvent,
    EcommerceEventHandler,
} from './types';

// ============================================================================
// SAMPLE MANUFACTURERS
// ============================================================================

const SAMPLE_MANUFACTURERS: Omit<Manufacturer, 'id'>[] = [
    {
        name: 'Shanghai Textile Co.',
        description: 'Premium manufacturing facility specializing in high-quality cut and sew operations.',
        status: 'approved',
        contactEmail: 'sales@shanghailtextile.com',
        website: 'https://shanghailtextile.com',
        location: {
            country: 'CN',
            city: 'Shanghai',
            timezone: 'Asia/Shanghai',
        },
        capabilities: ['cut_and_sew', 'printing', 'embroidery', 'dyeing'],
        certifications: ['ISO 9001', 'BSCI', 'OEKO-TEX Standard 100'],
        minOrderQuantity: 100,
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
        averageRating: 4.7,
        reviewCount: 120,
        isVerified: true,
        joinedAt: new Date('2020-01-15'),
        lastActiveAt: new Date(),
    },
    {
        name: 'Italian Luxury Garments',
        description: 'Boutique Italian manufacturer for luxury fashion brands.',
        status: 'approved',
        contactEmail: 'info@italianluxurygarments.it',
        website: 'https://italianluxurygarments.it',
        location: {
            country: 'IT',
            city: 'Milan',
            timezone: 'Europe/Rome',
        },
        capabilities: ['cut_and_sew', 'leather', 'outerwear', 'accessories'],
        certifications: ['ISO 9001', 'Made in Italy', 'REACH Compliant'],
        minOrderQuantity: 50,
        leadTimeDays: {
            sample: 21,
            production: 45,
        },
        sustainabilityScore: 5,
        qualityScore: 5,
        reliabilityScore: 5,
        totalOrders: 200,
        completedOrders: 198,
        onTimeDeliveryRate: 0.98,
        defectRate: 0.01,
        averageRating: 4.9,
        reviewCount: 80,
        isVerified: true,
        joinedAt: new Date('2019-06-01'),
        lastActiveAt: new Date(),
    },
    {
        name: 'Bangladesh Eco Textiles',
        description: 'Sustainable manufacturing with focus on eco-friendly practices.',
        status: 'approved',
        contactEmail: 'contact@bdecotextiles.com',
        location: {
            country: 'BD',
            city: 'Dhaka',
            timezone: 'Asia/Dhaka',
        },
        capabilities: ['cut_and_sew', 'knitwear', 'activewear', 'printing'],
        certifications: ['GOTS', 'Fair Trade', 'WRAP', 'OEKO-TEX'],
        minOrderQuantity: 200,
        leadTimeDays: {
            sample: 10,
            production: 25,
        },
        sustainabilityScore: 5,
        qualityScore: 4,
        reliabilityScore: 4,
        totalOrders: 800,
        completedOrders: 750,
        onTimeDeliveryRate: 0.91,
        defectRate: 0.03,
        averageRating: 4.5,
        reviewCount: 200,
        isVerified: true,
        joinedAt: new Date('2018-03-10'),
        lastActiveAt: new Date(),
    },
    {
        name: 'LA Denim Works',
        description: 'Premium American denim manufacturer specializing in sustainable production.',
        status: 'approved',
        contactEmail: 'orders@ladenimworks.com',
        website: 'https://ladenimworks.com',
        location: {
            country: 'US',
            city: 'Los Angeles',
            address: '1234 Fashion District',
            timezone: 'America/Los_Angeles',
        },
        capabilities: ['denim', 'cut_and_sew', 'dyeing'],
        certifications: ['Made in USA', 'B Corp', 'GOTS'],
        minOrderQuantity: 25,
        leadTimeDays: {
            sample: 7,
            production: 21,
        },
        sustainabilityScore: 5,
        qualityScore: 5,
        reliabilityScore: 5,
        totalOrders: 150,
        completedOrders: 148,
        onTimeDeliveryRate: 0.97,
        defectRate: 0.01,
        averageRating: 4.8,
        reviewCount: 60,
        isVerified: true,
        joinedAt: new Date('2021-02-20'),
        lastActiveAt: new Date(),
    },
    {
        name: 'Turkey Knitwear Factory',
        description: 'Expert knitwear production with modern machinery.',
        status: 'approved',
        contactEmail: 'sales@turkeyknitwear.com',
        location: {
            country: 'TR',
            city: 'Istanbul',
            timezone: 'Europe/Istanbul',
        },
        capabilities: ['knitwear', 'cut_and_sew', 'dyeing'],
        certifications: ['ISO 9001', 'OEKO-TEX', 'BSCI'],
        minOrderQuantity: 100,
        leadTimeDays: {
            sample: 12,
            production: 28,
        },
        sustainabilityScore: 4,
        qualityScore: 4,
        reliabilityScore: 4,
        totalOrders: 350,
        completedOrders: 330,
        onTimeDeliveryRate: 0.92,
        defectRate: 0.025,
        averageRating: 4.4,
        reviewCount: 90,
        isVerified: true,
        joinedAt: new Date('2019-11-05'),
        lastActiveAt: new Date(),
    },
];

// ============================================================================
// MOCK DATA STORE
// ============================================================================

const manufacturers = new Map<string, Manufacturer>();
const quotes = new Map<string, ProductionQuote>();
const sampleOrders = new Map<string, SampleOrder>();
const productionOrders = new Map<string, ProductionOrder>();
const qualityReports = new Map<string, QualityReport>();

// Initialize with sample manufacturers
let initialized = false;
function initializeManufacturers(): void {
    if (initialized) return;
    initialized = true;

    for (const mfr of SAMPLE_MANUFACTURERS) {
        const id = generateId('mfr');
        manufacturers.set(id, { ...mfr, id });
    }
}

function generateId(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}_${result}`;
}

// ============================================================================
// MANUFACTURING SERVICE CLASS
// ============================================================================

export class ManufacturingService {
    private eventHandlers: Set<EcommerceEventHandler> = new Set();

    constructor() {
        initializeManufacturers();
    }

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    subscribe(handler: EcommerceEventHandler): () => void {
        this.eventHandlers.add(handler);
        return () => this.eventHandlers.delete(handler);
    }

    private emit(event: EcommerceEvent): void {
        this.eventHandlers.forEach(handler => handler(event));
    }

    // ========================================================================
    // MANUFACTURER DIRECTORY
    // ========================================================================

    /**
     * List manufacturers with filtering
     */
    listManufacturers(options?: {
        capabilities?: ManufacturerCapability[];
        country?: string;
        minQuantity?: number;
        maxLeadTime?: number;
        minSustainabilityScore?: number;
        minQualityScore?: number;
        isVerified?: boolean;
        sortBy?: 'rating' | 'quality' | 'sustainability' | 'leadTime' | 'minOrder';
        limit?: number;
    }): Manufacturer[] {
        let results = Array.from(manufacturers.values())
            .filter(m => m.status === 'approved');

        if (options?.capabilities && options.capabilities.length > 0) {
            results = results.filter(m =>
                options.capabilities!.some(cap => m.capabilities.includes(cap))
            );
        }

        if (options?.country) {
            results = results.filter(m => m.location.country === options.country);
        }

        if (options?.minQuantity !== undefined) {
            results = results.filter(m => m.minOrderQuantity <= options.minQuantity!);
        }

        if (options?.maxLeadTime !== undefined) {
            results = results.filter(m => m.leadTimeDays.production <= options.maxLeadTime!);
        }

        if (options?.minSustainabilityScore !== undefined) {
            results = results.filter(m => m.sustainabilityScore >= options.minSustainabilityScore!);
        }

        if (options?.minQualityScore !== undefined) {
            results = results.filter(m => m.qualityScore >= options.minQualityScore!);
        }

        if (options?.isVerified !== undefined) {
            results = results.filter(m => m.isVerified === options.isVerified);
        }

        // Sort
        switch (options?.sortBy) {
            case 'quality':
                results.sort((a, b) => b.qualityScore - a.qualityScore);
                break;
            case 'sustainability':
                results.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
                break;
            case 'leadTime':
                results.sort((a, b) => a.leadTimeDays.production - b.leadTimeDays.production);
                break;
            case 'minOrder':
                results.sort((a, b) => a.minOrderQuantity - b.minOrderQuantity);
                break;
            case 'rating':
            default:
                results.sort((a, b) => b.averageRating - a.averageRating);
        }

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Get manufacturer by ID
     */
    getManufacturer(manufacturerId: string): Manufacturer | null {
        return manufacturers.get(manufacturerId) || null;
    }

    /**
     * Search manufacturers by name or description
     */
    searchManufacturers(query: string): Manufacturer[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(manufacturers.values())
            .filter(m =>
                m.status === 'approved' &&
                (m.name.toLowerCase().includes(lowerQuery) ||
                    m.description.toLowerCase().includes(lowerQuery) ||
                    m.certifications.some(c => c.toLowerCase().includes(lowerQuery)))
            );
    }

    /**
     * Get recommended manufacturers for a design
     */
    getRecommendedManufacturers(options: {
        capabilities: ManufacturerCapability[];
        quantity: number;
        maxLeadTime?: number;
        prioritize?: 'quality' | 'price' | 'sustainability' | 'speed';
    }): Manufacturer[] {
        let results = this.listManufacturers({
            capabilities: options.capabilities,
            minQuantity: options.quantity,
            maxLeadTime: options.maxLeadTime,
        });

        // Score and sort by priority
        results = results.map(m => ({
            manufacturer: m,
            score: this.calculateManufacturerScore(m, options.prioritize || 'quality'),
        }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.manufacturer);

        return results.slice(0, 5);
    }

    private calculateManufacturerScore(
        manufacturer: Manufacturer,
        priority: 'quality' | 'price' | 'sustainability' | 'speed'
    ): number {
        const weights = {
            quality: { quality: 0.4, reliability: 0.3, sustainability: 0.2, speed: 0.1 },
            price: { quality: 0.2, reliability: 0.3, sustainability: 0.1, speed: 0.4 },
            sustainability: { quality: 0.2, reliability: 0.2, sustainability: 0.5, speed: 0.1 },
            speed: { quality: 0.2, reliability: 0.3, sustainability: 0.1, speed: 0.4 },
        };

        const w = weights[priority];
        const speedScore = 5 - (manufacturer.leadTimeDays.production / 10); // Lower is better

        return (
            manufacturer.qualityScore * w.quality +
            manufacturer.reliabilityScore * w.reliability +
            manufacturer.sustainabilityScore * w.sustainability +
            Math.max(0, speedScore) * w.speed
        );
    }

    // ========================================================================
    // QUOTE MANAGEMENT
    // ========================================================================

    /**
     * Request a production quote
     */
    async requestQuote(options: {
        manufacturerId: string;
        designId: string;
        requesterId: string;
        quantity: number;
        specifications?: string;
    }): Promise<ProductionQuote> {
        const manufacturer = manufacturers.get(options.manufacturerId);
        if (!manufacturer) {
            throw new Error(`Manufacturer ${options.manufacturerId} not found`);
        }

        if (options.quantity < manufacturer.minOrderQuantity) {
            throw new Error(`Minimum order quantity is ${manufacturer.minOrderQuantity}`);
        }

        // Generate mock pricing
        const baseUnitPrice = 15 + Math.random() * 35; // $15-$50 per unit
        const volumeDiscount = options.quantity >= 500 ? 0.15 : options.quantity >= 200 ? 0.1 : 0;
        const unitPrice = Math.round(baseUnitPrice * (1 - volumeDiscount) * 100) / 100;

        const materialsCost = unitPrice * 0.4;
        const laborCost = unitPrice * 0.35;
        const overhead = unitPrice * 0.25;

        const quote: ProductionQuote = {
            id: generateId('qot'),
            manufacturerId: options.manufacturerId,
            designId: options.designId,
            requesterId: options.requesterId,
            quantity: options.quantity,
            unitPrice,
            totalPrice: Math.round(unitPrice * options.quantity * 100) / 100,
            currency: 'USD',
            breakdown: {
                materials: Math.round(materialsCost * options.quantity * 100) / 100,
                labor: Math.round(laborCost * options.quantity * 100) / 100,
                overhead: Math.round(overhead * options.quantity * 100) / 100,
            },
            leadTimeDays: manufacturer.leadTimeDays.production,
            validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            status: 'pending',
            createdAt: new Date(),
        };

        quotes.set(quote.id, quote);

        this.emit({
            type: 'quote_received',
            data: { quoteId: quote.id, manufacturerId: options.manufacturerId },
        });

        return quote;
    }

    /**
     * Get quotes for a design
     */
    getQuotesForDesign(designId: string): ProductionQuote[] {
        return Array.from(quotes.values())
            .filter(q => q.designId === designId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Accept a quote
     */
    acceptQuote(quoteId: string): ProductionQuote {
        const quote = quotes.get(quoteId);
        if (!quote) {
            throw new Error(`Quote ${quoteId} not found`);
        }

        if (quote.status !== 'pending') {
            throw new Error('Quote is no longer available');
        }

        if (new Date() > quote.validUntil) {
            quote.status = 'expired';
            quotes.set(quoteId, quote);
            throw new Error('Quote has expired');
        }

        quote.status = 'accepted';
        quotes.set(quoteId, quote);

        return quote;
    }

    // ========================================================================
    // SAMPLE ORDERS
    // ========================================================================

    /**
     * Create a sample order
     */
    createSampleOrder(options: {
        manufacturerId: string;
        designId: string;
        customerId: string;
        quantity: number;
        specifications: SampleOrder['specifications'];
        shippingAddress: ShippingAddress;
    }): SampleOrder {
        const manufacturer = manufacturers.get(options.manufacturerId);
        if (!manufacturer) {
            throw new Error(`Manufacturer ${options.manufacturerId} not found`);
        }

        // Sample pricing: $50-$200 per sample
        const price = 50 + Math.random() * 150;

        const order: SampleOrder = {
            id: generateId('smp'),
            manufacturerId: options.manufacturerId,
            designId: options.designId,
            customerId: options.customerId,
            quantity: options.quantity,
            specifications: options.specifications,
            status: 'pending',
            price: Math.round(price * options.quantity * 100) / 100,
            currency: 'USD',
            shippingAddress: options.shippingAddress,
            estimatedDelivery: new Date(Date.now() + manufacturer.leadTimeDays.sample * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        sampleOrders.set(order.id, order);
        return order;
    }

    /**
     * Get sample order by ID
     */
    getSampleOrder(orderId: string): SampleOrder | null {
        return sampleOrders.get(orderId) || null;
    }

    /**
     * List sample orders for a customer
     */
    listSampleOrders(customerId: string): SampleOrder[] {
        return Array.from(sampleOrders.values())
            .filter(o => o.customerId === customerId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Update sample order status
     */
    updateSampleOrderStatus(
        orderId: string,
        status: SampleOrder['status'],
        trackingNumber?: string
    ): SampleOrder {
        const order = sampleOrders.get(orderId);
        if (!order) {
            throw new Error(`Sample order ${orderId} not found`);
        }

        order.status = status;
        order.updatedAt = new Date();

        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }

        if (status === 'delivered') {
            order.actualDelivery = new Date();
        }

        sampleOrders.set(orderId, order);
        return order;
    }

    /**
     * Submit sample feedback
     */
    submitSampleFeedback(
        orderId: string,
        feedback: NonNullable<SampleOrder['feedback']>
    ): SampleOrder {
        const order = sampleOrders.get(orderId);
        if (!order) {
            throw new Error(`Sample order ${orderId} not found`);
        }

        order.feedback = feedback;
        order.status = feedback.approved ? 'approved' : 'rejected';
        order.updatedAt = new Date();
        sampleOrders.set(orderId, order);

        return order;
    }

    // ========================================================================
    // PRODUCTION ORDERS
    // ========================================================================

    /**
     * Create a production order from an accepted quote
     */
    createProductionOrder(options: {
        quoteId: string;
        licenseId: string;
        customerId: string;
        quantities: ProductionOrder['quantities'];
        specifications: ProductionOrder['specifications'];
        shippingAddress: ShippingAddress;
    }): ProductionOrder {
        const quote = quotes.get(options.quoteId);
        if (!quote) {
            throw new Error(`Quote ${options.quoteId} not found`);
        }

        if (quote.status !== 'accepted') {
            throw new Error('Quote must be accepted before creating production order');
        }

        const totalQuantity = options.quantities.reduce((sum, q) => sum + q.quantity, 0);

        // Calculate payment schedule (30% deposit, 40% mid-production, 30% on completion)
        const paymentSchedule = [
            {
                milestone: 'Deposit',
                amount: Math.round(quote.totalPrice * 0.3 * 100) / 100,
                dueDate: new Date(),
            },
            {
                milestone: 'Mid-Production',
                amount: Math.round(quote.totalPrice * 0.4 * 100) / 100,
                dueDate: new Date(Date.now() + (quote.leadTimeDays / 2) * 24 * 60 * 60 * 1000),
            },
            {
                milestone: 'Completion',
                amount: Math.round(quote.totalPrice * 0.3 * 100) / 100,
                dueDate: new Date(Date.now() + quote.leadTimeDays * 24 * 60 * 60 * 1000),
            },
        ];

        const order: ProductionOrder = {
            id: generateId('prd'),
            manufacturerId: quote.manufacturerId,
            designId: quote.designId,
            customerId: options.customerId,
            licenseId: options.licenseId,
            quoteId: options.quoteId,
            status: 'pending_confirmation',
            quantities: options.quantities.map(q => ({ ...q, completed: 0 })),
            totalQuantity,
            completedQuantity: 0,
            specifications: options.specifications,
            timeline: {
                ordered: new Date(),
            },
            shippingAddress: options.shippingAddress,
            price: quote.totalPrice,
            currency: quote.currency,
            paymentStatus: 'pending',
            paymentSchedule,
            qualityReports: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        productionOrders.set(order.id, order);

        this.emit({
            type: 'production_started',
            data: { orderId: order.id },
        });

        return order;
    }

    /**
     * Get production order by ID
     */
    getProductionOrder(orderId: string): ProductionOrder | null {
        return productionOrders.get(orderId) || null;
    }

    /**
     * List production orders for a customer
     */
    listProductionOrders(
        customerId: string,
        options?: {
            status?: ProductionStatus;
            limit?: number;
        }
    ): ProductionOrder[] {
        let results = Array.from(productionOrders.values())
            .filter(o => o.customerId === customerId);

        if (options?.status) {
            results = results.filter(o => o.status === options.status);
        }

        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Update production order status
     */
    updateProductionOrderStatus(
        orderId: string,
        status: ProductionStatus
    ): ProductionOrder {
        const order = productionOrders.get(orderId);
        if (!order) {
            throw new Error(`Production order ${orderId} not found`);
        }

        order.status = status;
        order.updatedAt = new Date();

        // Update timeline
        const now = new Date();
        switch (status) {
            case 'confirmed':
                order.timeline.confirmed = now;
                break;
            case 'in_production':
                order.timeline.productionStarted = now;
                break;
            case 'quality_check':
                order.timeline.qualityCheckPassed = now;
                break;
            case 'shipped':
                order.timeline.shipped = now;
                break;
            case 'delivered':
                order.timeline.delivered = now;
                break;
            case 'completed':
                this.emit({
                    type: 'production_completed',
                    data: { orderId },
                });
                break;
        }

        productionOrders.set(orderId, order);
        return order;
    }

    /**
     * Update production progress
     */
    updateProductionProgress(
        orderId: string,
        sizeUpdates: { size: string; completed: number }[]
    ): ProductionOrder {
        const order = productionOrders.get(orderId);
        if (!order) {
            throw new Error(`Production order ${orderId} not found`);
        }

        for (const update of sizeUpdates) {
            const quantity = order.quantities.find(q => q.size === update.size);
            if (quantity) {
                quantity.completed = Math.min(update.completed, quantity.quantity);
            }
        }

        order.completedQuantity = order.quantities.reduce((sum, q) => sum + q.completed, 0);
        order.updatedAt = new Date();
        productionOrders.set(orderId, order);

        return order;
    }

    // ========================================================================
    // QUALITY CONTROL
    // ========================================================================

    /**
     * Create quality report
     */
    createQualityReport(options: {
        orderId: string;
        inspector: string;
        checklist: QualityReport['checklist'];
        defectsFound: number;
        images?: string[];
        recommendations?: string;
    }): QualityReport {
        const order = productionOrders.get(options.orderId);
        if (!order) {
            throw new Error(`Production order ${options.orderId} not found`);
        }

        const passedItems = options.checklist.filter(c => c.passed).length;
        const totalItems = options.checklist.length;
        const defectRate = order.completedQuantity > 0
            ? options.defectsFound / order.completedQuantity
            : 0;

        const report: QualityReport = {
            id: generateId('qr'),
            orderId: options.orderId,
            inspector: options.inspector,
            date: new Date(),
            status: passedItems === totalItems && defectRate < 0.05 ? 'passed' :
                passedItems >= totalItems * 0.8 && defectRate < 0.1 ? 'conditional' : 'failed',
            checklist: options.checklist,
            defectsFound: options.defectsFound,
            defectRate,
            images: options.images,
            recommendations: options.recommendations,
        };

        qualityReports.set(report.id, report);
        order.qualityReports.push(report);
        productionOrders.set(options.orderId, order);

        return report;
    }

    /**
     * Get quality reports for an order
     */
    getQualityReports(orderId: string): QualityReport[] {
        const order = productionOrders.get(orderId);
        return order?.qualityReports || [];
    }

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    /**
     * Get manufacturer statistics
     */
    getManufacturerStats(manufacturerId: string): {
        pendingQuotes: number;
        activeOrders: number;
        completedOrders: number;
        averageLeadTime: number;
        onTimeRate: number;
        defectRate: number;
    } {
        const manufacturerQuotes = Array.from(quotes.values())
            .filter(q => q.manufacturerId === manufacturerId);

        const manufacturerOrders = Array.from(productionOrders.values())
            .filter(o => o.manufacturerId === manufacturerId);

        const completedOrders = manufacturerOrders.filter(o => o.status === 'completed');
        const onTimeOrders = completedOrders.filter(o =>
            o.timeline.delivered &&
            o.timeline.delivered <= new Date(o.createdAt.getTime() + 45 * 24 * 60 * 60 * 1000)
        );

        const totalDefects = completedOrders.reduce((sum, o) =>
            sum + o.qualityReports.reduce((s, r) => s + r.defectsFound, 0), 0
        );
        const totalUnits = completedOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

        return {
            pendingQuotes: manufacturerQuotes.filter(q => q.status === 'pending').length,
            activeOrders: manufacturerOrders.filter(o =>
                !['completed', 'canceled'].includes(o.status)
            ).length,
            completedOrders: completedOrders.length,
            averageLeadTime: completedOrders.length > 0
                ? completedOrders.reduce((sum, o) => {
                    const days = o.timeline.delivered
                        ? (o.timeline.delivered.getTime() - o.timeline.ordered.getTime()) / (24 * 60 * 60 * 1000)
                        : 0;
                    return sum + days;
                }, 0) / completedOrders.length
                : 0,
            onTimeRate: completedOrders.length > 0
                ? onTimeOrders.length / completedOrders.length
                : 0,
            defectRate: totalUnits > 0
                ? totalDefects / totalUnits
                : 0,
        };
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let manufacturingServiceInstance: ManufacturingService | null = null;

export function getManufacturingService(): ManufacturingService {
    if (!manufacturingServiceInstance) {
        manufacturingServiceInstance = new ManufacturingService();
    }
    return manufacturingServiceInstance;
}

export function resetManufacturingService(): void {
    manufacturingServiceInstance = null;
    manufacturers.clear();
    quotes.clear();
    sampleOrders.clear();
    productionOrders.clear();
    qualityReports.clear();
    initialized = false;
}
