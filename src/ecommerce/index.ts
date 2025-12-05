/**
 * E-commerce Module - Phase 5 E-commerce & Monetization
 *
 * Complete e-commerce infrastructure including payments,
 * licensing, marketplace, and manufacturing.
 */

// Import services for use in convenience functions
import {
    StripeService,
    getStripeService,
    resetStripeService,
    createStripeHooks,
    PAYMENT_SPLIT,
    STRIPE_PROCESSING_FEE,
} from './stripe';

import {
    LicensingService,
    LICENSE_TEMPLATES,
    getLicensingService,
    resetLicensingService,
} from './licensing';

import {
    MarketplaceService,
    getMarketplaceService,
    resetMarketplaceService,
} from './marketplace';

import {
    ManufacturingService,
    getManufacturingService,
    resetManufacturingService,
} from './manufacturing';

import {
    DesignerProfileService,
    getDesignerProfileService,
    resetDesignerProfileService,
} from './designer-profile';

import {
    TrustService,
    getTrustService,
    resetTrustService,
} from './trust';

import type { StripeConfig } from './stripe';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
    // Payment Types
    Currency,
    PaymentStatus,
    PaymentMethod,
    PaymentIntent,
    PaymentSplit,
    Payout,
    BankAccount,
    StripeConnectAccount,

    // Licensing Types
    LicenseType,
    LicenseStatus,
    LicenseTerms,
    License,
    LicenseTemplate,
    LicenseAgreement,

    // Pricing Types
    PricingTier,
    PricingFactor,
    PriceSuggestion,
    DesignPricing,
    BulkDiscount,

    // Designer Types
    DesignerProfile,
    DesignerBadge,
    DesignerStats,
    DesignerEarnings,
    PortfolioCollection,

    // Marketplace Types
    ListingStatus,
    MarketplaceListing,
    DesignCategory,
    MarketplaceSearch,
    MarketplaceSearchResult,

    // Auction Types
    AuctionStatus,
    Auction,
    Bid,

    // Review Types
    Review,

    // Manufacturing Types
    ManufacturerStatus,
    ManufacturerCapability,
    Manufacturer,
    ProductionQuote,
    SampleOrder,
    ProductionOrder,
    ProductionStatus,
    QualityReport,
    ShippingAddress,

    // Custom Request Types
    CustomRequestStatus,
    CustomRequest,
    CustomRequestSubmission,

    // Promotion Types
    PromotionType,
    Promotion,
    PromotionPackage,

    // Subscription Types
    SubscriptionTier,
    SubscriptionPlan,
    SubscriptionFeature,
    SubscriptionLimits,
    UserSubscription,

    // Analytics Types
    SalesAnalytics,
    MarketplaceAnalytics,

    // Dispute Types
    DisputeReason,
    DisputeStatus,
    Dispute,
    DisputeMessage,

    // Copyright Types
    CopyrightClaim,
    DesignAuthenticity,

    // Event Types
    EcommerceEvent,
    EcommerceEventHandler,
} from './types';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

// Stripe Service
export {
    StripeService,
    PAYMENT_SPLIT,
    STRIPE_PROCESSING_FEE,
    getStripeService,
    resetStripeService,
    createStripeHooks,
} from './stripe';

export type { StripeConfig } from './stripe';

// Licensing Service
export {
    LicensingService,
    LICENSE_TEMPLATES,
    getLicensingService,
    resetLicensingService,
} from './licensing';

// Marketplace Service
export {
    MarketplaceService,
    getMarketplaceService,
    resetMarketplaceService,
} from './marketplace';

// Manufacturing Service
export {
    ManufacturingService,
    getManufacturingService,
    resetManufacturingService,
} from './manufacturing';

// Designer Profile Service
export {
    DesignerProfileService,
    getDesignerProfileService,
    resetDesignerProfileService,
} from './designer-profile';

export type {
    DesignerStats as DesignerProfileStats,
    DesignerAnalytics,
    DesignerBadge as ProfileBadge,
    DesignerReview,
    PortfolioItem,
    DesignerPayout,
    DesignerNotification,
    FollowRelation,
    CollaborationInvite,
} from './designer-profile';

// Trust & Verification Service
export {
    TrustService,
    getTrustService,
    resetTrustService,
} from './trust';

export type {
    VerificationLevel,
    VerificationRequest,
    VerificationDocument,
    TrustFactors,
    FraudSignal,
    UserReport,
    CopyrightVerification,
} from './trust';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize all e-commerce services
 */
export function initializeEcommerce(): {
    stripe: ReturnType<typeof getStripeService>;
    licensing: ReturnType<typeof getLicensingService>;
    marketplace: ReturnType<typeof getMarketplaceService>;
    manufacturing: ReturnType<typeof getManufacturingService>;
    designerProfile: ReturnType<typeof getDesignerProfileService>;
    trust: ReturnType<typeof getTrustService>;
} {
    return {
        stripe: getStripeService(),
        licensing: getLicensingService(),
        marketplace: getMarketplaceService(),
        manufacturing: getManufacturingService(),
        designerProfile: getDesignerProfileService(),
        trust: getTrustService(),
    };
}

/**
 * Reset all e-commerce services (useful for testing)
 */
export function resetEcommerce(): void {
    resetStripeService();
    resetLicensingService();
    resetMarketplaceService();
    resetManufacturingService();
    resetDesignerProfileService();
    resetTrustService();
}

/**
 * Calculate total platform fees for a transaction
 */
export function calculatePlatformFees(
    amount: number,
    options?: {
        includeManufacturer?: boolean;
    }
): {
    platformFee: number;
    processingFee: number;
    manufacturerFee: number;
    designerAmount: number;
    total: number;
} {
    const processingFee = amount * 0.029 + 0.30;
    const netAmount = amount - processingFee;

    const platformRate = 0.20;
    const manufacturerRate = options?.includeManufacturer ? 0.10 : 0;
    const designerRate = 1 - platformRate - manufacturerRate;

    return {
        platformFee: Math.round(netAmount * platformRate * 100) / 100,
        processingFee: Math.round(processingFee * 100) / 100,
        manufacturerFee: Math.round(netAmount * manufacturerRate * 100) / 100,
        designerAmount: Math.round(netAmount * designerRate * 100) / 100,
        total: amount,
    };
}

/**
 * Format currency for display
 */
export function formatCurrency(
    amount: number,
    currency: import('./types').Currency = 'USD'
): string {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return formatter.format(amount);
}

/**
 * Get license type display name
 */
export function getLicenseTypeName(type: import('./types').LicenseType): string {
    const names: Record<import('./types').LicenseType, string> = {
        exclusive: 'Exclusive License',
        limited: 'Limited Production',
        unlimited: 'Unlimited Commercial',
        subscription: 'Subscription Access',
        royalty: 'Royalty License',
        custom: 'Custom Agreement',
    };
    return names[type];
}

/**
 * Get production status display name
 */
export function getProductionStatusName(status: import('./types').ProductionStatus): string {
    const names: Record<import('./types').ProductionStatus, string> = {
        pending_confirmation: 'Pending Confirmation',
        confirmed: 'Confirmed',
        sourcing_materials: 'Sourcing Materials',
        in_production: 'In Production',
        quality_check: 'Quality Check',
        ready_to_ship: 'Ready to Ship',
        shipped: 'Shipped',
        delivered: 'Delivered',
        completed: 'Completed',
        canceled: 'Canceled',
        on_hold: 'On Hold',
    };
    return names[status];
}

/**
 * Check if a license is active and valid
 */
export function isLicenseValid(license: import('./types').License): boolean {
    if (license.status !== 'active') {
        return false;
    }

    if (license.expiresAt && new Date() > license.expiresAt) {
        return false;
    }

    if (
        license.terms.type === 'limited' &&
        license.productionCount !== undefined &&
        license.terms.productionLimit !== undefined &&
        license.productionCount >= license.terms.productionLimit
    ) {
        return false;
    }

    return true;
}

/**
 * Calculate days remaining on a license
 */
export function getLicenseDaysRemaining(license: import('./types').License): number | null {
    if (!license.expiresAt) {
        return null; // Perpetual
    }

    const now = new Date();
    const diff = license.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
