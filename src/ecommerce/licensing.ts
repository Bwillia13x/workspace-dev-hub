/**
 * Licensing Service - Phase 5 E-commerce & Monetization
 *
 * Design licensing management with multiple license types,
 * contract generation, and royalty tracking.
 */

import type {
    License,
    LicenseType,
    LicenseStatus,
    LicenseTerms,
    LicenseTemplate,
    LicenseAgreement,
    Currency,
    EcommerceEvent,
    EcommerceEventHandler,
} from './types';

// ============================================================================
// LICENSE TEMPLATES
// ============================================================================

export const LICENSE_TEMPLATES: LicenseTemplate[] = [
    {
        id: 'exclusive-perpetual',
        name: 'Exclusive Perpetual License',
        description: 'Full exclusive rights to the design forever. Designer cannot resell.',
        type: 'exclusive',
        defaultTerms: {
            type: 'exclusive',
            duration: { value: 0, unit: 'perpetual' },
            exclusivity: true,
            transferable: true,
            sublicensable: true,
        },
        basePrice: 5000,
        priceMultiplier: 10,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'exclusive-limited',
        name: 'Exclusive Limited License',
        description: 'Exclusive rights for a limited time period.',
        type: 'exclusive',
        defaultTerms: {
            type: 'exclusive',
            duration: { value: 2, unit: 'years' },
            exclusivity: true,
            transferable: false,
            sublicensable: false,
        },
        basePrice: 2000,
        priceMultiplier: 5,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'limited-small',
        name: 'Limited Production (10 units)',
        description: 'Rights to produce up to 10 units of the design.',
        type: 'limited',
        defaultTerms: {
            type: 'limited',
            duration: { value: 1, unit: 'years' },
            productionLimit: 10,
            exclusivity: false,
            transferable: false,
            sublicensable: false,
        },
        basePrice: 50,
        priceMultiplier: 1,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'limited-medium',
        name: 'Limited Production (50 units)',
        description: 'Rights to produce up to 50 units of the design.',
        type: 'limited',
        defaultTerms: {
            type: 'limited',
            duration: { value: 1, unit: 'years' },
            productionLimit: 50,
            exclusivity: false,
            transferable: false,
            sublicensable: false,
        },
        basePrice: 200,
        priceMultiplier: 1.5,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'limited-large',
        name: 'Limited Production (100 units)',
        description: 'Rights to produce up to 100 units of the design.',
        type: 'limited',
        defaultTerms: {
            type: 'limited',
            duration: { value: 1, unit: 'years' },
            productionLimit: 100,
            exclusivity: false,
            transferable: false,
            sublicensable: false,
        },
        basePrice: 350,
        priceMultiplier: 2,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'unlimited-standard',
        name: 'Unlimited Commercial License',
        description: 'Full commercial rights without production limits. Non-exclusive.',
        type: 'unlimited',
        defaultTerms: {
            type: 'unlimited',
            duration: { value: 0, unit: 'perpetual' },
            exclusivity: false,
            transferable: true,
            sublicensable: false,
        },
        basePrice: 1000,
        priceMultiplier: 3,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'royalty-standard',
        name: 'Royalty License',
        description: 'No upfront cost. Pay 5-10% of revenue from manufactured items.',
        type: 'royalty',
        defaultTerms: {
            type: 'royalty',
            duration: { value: 3, unit: 'years' },
            exclusivity: false,
            transferable: false,
            sublicensable: false,
        },
        basePrice: 0,
        priceMultiplier: 0,
        isActive: true,
        createdAt: new Date(),
    },
    {
        id: 'subscription-catalog',
        name: 'Catalog Subscription Access',
        description: 'Access to entire design catalog for monthly fee.',
        type: 'subscription',
        defaultTerms: {
            type: 'subscription',
            duration: { value: 1, unit: 'months' },
            exclusivity: false,
            transferable: false,
            sublicensable: false,
        },
        basePrice: 99,
        priceMultiplier: 1,
        isActive: true,
        createdAt: new Date(),
    },
];

// ============================================================================
// MOCK DATA STORE
// ============================================================================

const licenses = new Map<string, License>();
const agreements = new Map<string, LicenseAgreement>();
const customTemplates = new Map<string, LicenseTemplate>();

// ============================================================================
// LICENSING SERVICE CLASS
// ============================================================================

export class LicensingService {
    private eventHandlers: Set<EcommerceEventHandler> = new Set();

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
    // LICENSE TEMPLATES
    // ========================================================================

    /**
     * Get all available license templates
     */
    getTemplates(): LicenseTemplate[] {
        const custom = Array.from(customTemplates.values());
        return [...LICENSE_TEMPLATES, ...custom].filter(t => t.isActive);
    }

    /**
     * Get template by ID
     */
    getTemplate(templateId: string): LicenseTemplate | null {
        const standard = LICENSE_TEMPLATES.find(t => t.id === templateId);
        if (standard) return standard;
        return customTemplates.get(templateId) || null;
    }

    /**
     * Get templates by license type
     */
    getTemplatesByType(type: LicenseType): LicenseTemplate[] {
        return this.getTemplates().filter(t => t.type === type);
    }

    /**
     * Create custom license template
     */
    createCustomTemplate(template: Omit<LicenseTemplate, 'id' | 'createdAt'>): LicenseTemplate {
        const newTemplate: LicenseTemplate = {
            ...template,
            id: this.generateId('tmpl'),
            createdAt: new Date(),
        };
        customTemplates.set(newTemplate.id, newTemplate);
        return newTemplate;
    }

    // ========================================================================
    // LICENSE MANAGEMENT
    // ========================================================================

    /**
     * Create a new license
     */
    createLicense(options: {
        designId: string;
        sellerId: string;
        buyerId: string;
        templateId?: string;
        terms?: LicenseTerms;
        price: number;
        currency: Currency;
        royaltyRate?: number;
    }): License {
        let terms = options.terms;

        // Use template terms if provided
        if (options.templateId) {
            const template = this.getTemplate(options.templateId);
            if (template) {
                terms = template.defaultTerms;
            }
        }

        if (!terms) {
            throw new Error('License terms or template ID required');
        }

        const license: License = {
            id: this.generateId('lic'),
            designId: options.designId,
            sellerId: options.sellerId,
            buyerId: options.buyerId,
            terms,
            price: options.price,
            currency: options.currency,
            status: 'draft',
            royaltyRate: options.royaltyRate,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        licenses.set(license.id, license);
        return license;
    }

    /**
     * Activate a license (after payment)
     */
    activateLicense(licenseId: string): License {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        if (license.status !== 'draft') {
            throw new Error(`Cannot activate license in ${license.status} status`);
        }

        license.status = 'active';
        license.activatedAt = new Date();
        license.expiresAt = this.calculateExpirationDate(license.terms.duration);
        license.updatedAt = new Date();

        if (license.terms.type === 'limited') {
            license.productionCount = 0;
        }

        licenses.set(licenseId, license);

        this.emit({
            type: 'license_activated',
            data: { licenseId },
        });

        return license;
    }

    /**
     * Calculate expiration date from duration
     */
    private calculateExpirationDate(duration: LicenseTerms['duration']): Date | undefined {
        if (duration.unit === 'perpetual') {
            return undefined;
        }

        const now = new Date();
        switch (duration.unit) {
            case 'days':
                return new Date(now.getTime() + duration.value * 24 * 60 * 60 * 1000);
            case 'months':
                return new Date(now.setMonth(now.getMonth() + duration.value));
            case 'years':
                return new Date(now.setFullYear(now.getFullYear() + duration.value));
            default:
                return undefined;
        }
    }

    /**
     * Get license by ID
     */
    getLicense(licenseId: string): License | null {
        return licenses.get(licenseId) || null;
    }

    /**
     * List licenses for a user
     */
    listLicenses(
        userId: string,
        role: 'buyer' | 'seller',
        options?: {
            status?: LicenseStatus;
            type?: LicenseType;
            designId?: string;
            limit?: number;
        }
    ): License[] {
        let results = Array.from(licenses.values()).filter(l =>
            role === 'buyer' ? l.buyerId === userId : l.sellerId === userId
        );

        if (options?.status) {
            results = results.filter(l => l.status === options.status);
        }

        if (options?.type) {
            results = results.filter(l => l.terms.type === options.type);
        }

        if (options?.designId) {
            results = results.filter(l => l.designId === options.designId);
        }

        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Check if a design has an active exclusive license
     */
    hasExclusiveLicense(designId: string): boolean {
        for (const license of licenses.values()) {
            if (
                license.designId === designId &&
                license.status === 'active' &&
                license.terms.exclusivity
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user can purchase a specific license type for a design
     */
    canPurchaseLicense(designId: string, type: LicenseType): { canPurchase: boolean; reason?: string } {
        // Check for existing exclusive license
        if (this.hasExclusiveLicense(designId)) {
            return {
                canPurchase: false,
                reason: 'Design is under exclusive license',
            };
        }

        // Exclusive licenses require no other active licenses
        if (type === 'exclusive') {
            const activeLicenses = Array.from(licenses.values()).filter(
                l => l.designId === designId && l.status === 'active'
            );

            if (activeLicenses.length > 0) {
                return {
                    canPurchase: false,
                    reason: 'Cannot purchase exclusive license - design has active licenses',
                };
            }
        }

        return { canPurchase: true };
    }

    // ========================================================================
    // PRODUCTION TRACKING (for limited licenses)
    // ========================================================================

    /**
     * Record production against a limited license
     */
    recordProduction(licenseId: string, quantity: number): License {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        if (license.status !== 'active') {
            throw new Error('License is not active');
        }

        if (license.terms.type !== 'limited') {
            throw new Error('Production tracking only for limited licenses');
        }

        const limit = license.terms.productionLimit || 0;
        const current = license.productionCount || 0;
        const newCount = current + quantity;

        if (newCount > limit) {
            throw new Error(`Production would exceed limit. Remaining: ${limit - current}`);
        }

        license.productionCount = newCount;
        license.updatedAt = new Date();
        licenses.set(licenseId, license);

        return license;
    }

    /**
     * Get remaining production units for a license
     */
    getRemainingProduction(licenseId: string): number | null {
        const license = licenses.get(licenseId);
        if (!license || license.terms.type !== 'limited') {
            return null;
        }

        const limit = license.terms.productionLimit || 0;
        const used = license.productionCount || 0;
        return limit - used;
    }

    // ========================================================================
    // ROYALTY TRACKING
    // ========================================================================

    /**
     * Record royalty payment for a royalty license
     */
    recordRoyalty(licenseId: string, amount: number): License {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        if (license.terms.type !== 'royalty') {
            throw new Error('Royalty tracking only for royalty licenses');
        }

        license.royaltyEarned = (license.royaltyEarned || 0) + amount;
        license.updatedAt = new Date();
        licenses.set(licenseId, license);

        return license;
    }

    /**
     * Calculate royalty for a sale amount
     */
    calculateRoyalty(licenseId: string, saleAmount: number): number {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        const rate = license.royaltyRate || 0.05; // Default 5%
        return Math.round(saleAmount * rate * 100) / 100;
    }

    // ========================================================================
    // LICENSE LIFECYCLE
    // ========================================================================

    /**
     * Revoke a license
     */
    revokeLicense(licenseId: string, reason: string): License {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        license.status = 'revoked';
        license.updatedAt = new Date();
        licenses.set(licenseId, license);

        return license;
    }

    /**
     * Transfer a license to a new owner
     */
    transferLicense(licenseId: string, newBuyerId: string): License {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        if (!license.terms.transferable) {
            throw new Error('License is not transferable');
        }

        if (license.status !== 'active') {
            throw new Error('Only active licenses can be transferred');
        }

        license.buyerId = newBuyerId;
        license.status = 'transferred';
        license.updatedAt = new Date();
        licenses.set(licenseId, license);

        // Create new license for the new owner
        const newLicense = this.createLicense({
            designId: license.designId,
            sellerId: license.sellerId,
            buyerId: newBuyerId,
            terms: license.terms,
            price: license.price,
            currency: license.currency,
        });

        newLicense.status = 'active';
        newLicense.activatedAt = new Date();
        newLicense.expiresAt = license.expiresAt;
        licenses.set(newLicense.id, newLicense);

        return newLicense;
    }

    /**
     * Check and expire licenses
     */
    processExpirations(): { expired: number } {
        const now = new Date();
        let expired = 0;

        for (const license of licenses.values()) {
            if (
                license.status === 'active' &&
                license.expiresAt &&
                license.expiresAt <= now
            ) {
                license.status = 'expired';
                license.updatedAt = now;
                licenses.set(license.id, license);

                this.emit({
                    type: 'license_expired',
                    data: { licenseId: license.id },
                });

                expired++;
            }
        }

        return { expired };
    }

    // ========================================================================
    // LICENSE AGREEMENTS
    // ========================================================================

    /**
     * Generate license agreement document
     */
    generateAgreement(licenseId: string): LicenseAgreement {
        const license = licenses.get(licenseId);
        if (!license) {
            throw new Error(`License ${licenseId} not found`);
        }

        const agreement: LicenseAgreement = {
            id: this.generateId('agr'),
            licenseId,
            version: 1,
            content: this.generateAgreementContent(license),
            signerIds: [license.sellerId, license.buyerId],
            signedAt: {},
            createdAt: new Date(),
        };

        agreements.set(agreement.id, agreement);
        return agreement;
    }

    private generateAgreementContent(license: License): string {
        const terms = license.terms;
        const typeDescriptions: Record<LicenseType, string> = {
            exclusive: 'grants exclusive rights to use, reproduce, and distribute the Design',
            limited: `grants non-exclusive rights to produce up to ${terms.productionLimit || 0} units`,
            unlimited: 'grants non-exclusive, unlimited commercial rights',
            subscription: 'grants access to the design catalog during the subscription period',
            royalty: `grants usage rights subject to ${(license.royaltyRate || 0.05) * 100}% royalty on sales`,
            custom: 'grants rights as specified in the custom terms below',
        };

        return `
LICENSE AGREEMENT

This License Agreement ("Agreement") is entered into as of ${new Date().toLocaleDateString()}.

PARTIES:
- Licensor (Designer): ${license.sellerId}
- Licensee (Buyer): ${license.buyerId}

DESIGN:
- Design ID: ${license.designId}

LICENSE GRANT:
This license ${typeDescriptions[terms.type]}.

TERMS:
- License Type: ${terms.type.toUpperCase()}
- Duration: ${terms.duration.unit === 'perpetual' ? 'Perpetual' : `${terms.duration.value} ${terms.duration.unit}`}
- Exclusivity: ${terms.exclusivity ? 'Yes' : 'No'}
- Transferable: ${terms.transferable ? 'Yes' : 'No'}
- Sublicensable: ${terms.sublicensable ? 'Yes' : 'No'}
${terms.productionLimit ? `- Production Limit: ${terms.productionLimit} units` : ''}
${terms.territoryRestrictions?.length ? `- Territory: ${terms.territoryRestrictions.join(', ')}` : ''}
${terms.usageRestrictions?.length ? `- Restrictions: ${terms.usageRestrictions.join(', ')}` : ''}

COMPENSATION:
- License Fee: ${license.price} ${license.currency}
${license.royaltyRate ? `- Royalty Rate: ${license.royaltyRate * 100}%` : ''}

INTELLECTUAL PROPERTY:
The Licensor retains all intellectual property rights not explicitly granted herein.

TERMINATION:
This license may be terminated for material breach upon 30 days written notice.

By signing below, the parties agree to the terms of this Agreement.

_________________________________
Licensor Signature / Date

_________________________________
Licensee Signature / Date
        `.trim();
    }

    /**
     * Sign license agreement
     */
    signAgreement(agreementId: string, signerId: string): LicenseAgreement {
        const agreement = agreements.get(agreementId);
        if (!agreement) {
            throw new Error(`Agreement ${agreementId} not found`);
        }

        if (!agreement.signerIds.includes(signerId)) {
            throw new Error('User is not a party to this agreement');
        }

        agreement.signedAt[signerId] = new Date();
        agreements.set(agreementId, agreement);

        // Check if all parties have signed
        const allSigned = agreement.signerIds.every(id => agreement.signedAt[id]);
        if (allSigned) {
            // Activate the license
            const license = licenses.get(agreement.licenseId);
            if (license && license.status === 'draft') {
                this.activateLicense(license.id);
            }
        }

        return agreement;
    }

    /**
     * Get agreement for a license
     */
    getAgreement(licenseId: string): LicenseAgreement | null {
        for (const agreement of agreements.values()) {
            if (agreement.licenseId === licenseId) {
                return agreement;
            }
        }
        return null;
    }

    // ========================================================================
    // PRICING HELPERS
    // ========================================================================

    /**
     * Calculate license price based on template and design value
     */
    calculatePrice(
        templateId: string,
        designValue: number,
        options?: {
            customMultiplier?: number;
            discountPercent?: number;
        }
    ): { price: number; breakdown: { base: number; multiplier: number; discount: number } } {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        const multiplier = options?.customMultiplier ?? template.priceMultiplier;
        const base = template.basePrice;
        const calculatedPrice = base + (designValue * multiplier);

        const discount = options?.discountPercent
            ? calculatedPrice * (options.discountPercent / 100)
            : 0;

        const finalPrice = Math.round((calculatedPrice - discount) * 100) / 100;

        return {
            price: finalPrice,
            breakdown: {
                base,
                multiplier,
                discount,
            },
        };
    }

    /**
     * Get available license options for a design
     */
    getAvailableLicenseOptions(designId: string): {
        template: LicenseTemplate;
        available: boolean;
        reason?: string;
    }[] {
        const templates = this.getTemplates();

        return templates.map(template => {
            const check = this.canPurchaseLicense(designId, template.type);
            return {
                template,
                available: check.canPurchase,
                reason: check.reason,
            };
        });
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    private generateId(prefix: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 24; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${prefix}_${result}`;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let licensingServiceInstance: LicensingService | null = null;

export function getLicensingService(): LicensingService {
    if (!licensingServiceInstance) {
        licensingServiceInstance = new LicensingService();
    }
    return licensingServiceInstance;
}

export function resetLicensingService(): void {
    licensingServiceInstance = null;
    licenses.clear();
    agreements.clear();
    customTemplates.clear();
}
