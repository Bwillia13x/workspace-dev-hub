/**
 * E-commerce Types - Phase 5 E-commerce & Monetization
 *
 * Comprehensive type definitions for payments, licensing,
 * marketplace, manufacturing, and monetization features.
 */

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';

export type PaymentStatus =
    | 'pending'
    | 'processing'
    | 'succeeded'
    | 'failed'
    | 'refunded'
    | 'partially_refunded'
    | 'disputed'
    | 'canceled';

export type PaymentMethod =
    | 'card'
    | 'bank_transfer'
    | 'paypal'
    | 'apple_pay'
    | 'google_pay'
    | 'crypto';

export interface PaymentIntent {
    id: string;
    amount: number;
    currency: Currency;
    status: PaymentStatus;
    paymentMethod?: PaymentMethod;
    customerId: string;
    sellerId: string;
    designId?: string;
    licenseId?: string;
    metadata: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentSplit {
    designerId: string;
    designerAmount: number;      // 70% default
    platformAmount: number;      // 20% default
    manufacturerAmount: number;  // 10% if applicable
    processingFee: number;       // Stripe fee ~2.9% + $0.30
}

export interface Payout {
    id: string;
    userId: string;
    amount: number;
    currency: Currency;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'canceled';
    method: 'bank_transfer' | 'paypal' | 'stripe';
    bankAccountId?: string;
    paypalEmail?: string;
    scheduledDate: Date;
    processedDate?: Date;
    transactionIds: string[];
    createdAt: Date;
}

export interface BankAccount {
    id: string;
    userId: string;
    accountHolderName: string;
    accountHolderType: 'individual' | 'company';
    bankName: string;
    last4: string;
    country: string;
    currency: Currency;
    routingNumber?: string;
    isDefault: boolean;
    isVerified: boolean;
    createdAt: Date;
}

export interface StripeConnectAccount {
    id: string;
    userId: string;
    stripeAccountId: string;
    businessType: 'individual' | 'company';
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: {
        currentlyDue: string[];
        eventuallyDue: string[];
        pastDue: string[];
    };
    country: string;
    defaultCurrency: Currency;
    createdAt: Date;
    updatedAt: Date;
}

export interface Transaction {
    id: string;
    type: 'payment' | 'payout' | 'refund' | 'fee' | 'transfer';
    amount: number;
    currency: Currency;
    status: PaymentStatus;
    fromUserId?: string;
    toUserId?: string;
    designId?: string;
    orderId?: string;
    description: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    processedAt?: Date;
}

export interface TrustScore {
    userId: string;
    score: number;                   // 0-100
    level: 'excellent' | 'good' | 'average' | 'low' | 'poor';
    factors: {
        accountAge: number;
        completedOrders: number;
        disputeRate: number;
        averageRating: number;
        responseTime: number;
        verificationLevel: 'none' | 'email' | 'identity' | 'business' | 'premium';
    };
    lastUpdated: Date;
}

// ============================================================================
// LICENSING TYPES
// ============================================================================

export type LicenseType =
    | 'exclusive'           // Single buyer, full rights
    | 'limited'             // Limited production runs
    | 'unlimited'           // Full commercial, non-exclusive
    | 'subscription'        // Catalog access
    | 'royalty'             // Revenue share model
    | 'custom';             // Negotiated terms

export type LicenseStatus =
    | 'draft'
    | 'active'
    | 'expired'
    | 'revoked'
    | 'transferred'
    | 'disputed';

export interface LicenseTerms {
    type: LicenseType;
    duration: {
        value: number;
        unit: 'days' | 'months' | 'years' | 'perpetual';
    };
    productionLimit?: number;        // For limited licenses
    territoryRestrictions?: string[]; // Country codes
    usageRestrictions?: string[];    // e.g., 'no resale', 'no modification'
    exclusivity: boolean;
    transferable: boolean;
    sublicensable: boolean;
}

export interface License {
    id: string;
    designId: string;
    sellerId: string;
    buyerId: string;
    terms: LicenseTerms;
    price: number;
    currency: Currency;
    status: LicenseStatus;
    royaltyRate?: number;            // 0-1 for royalty licenses
    royaltyEarned?: number;
    activatedAt?: Date;
    expiresAt?: Date;
    productionCount?: number;        // For limited licenses
    contractUrl?: string;            // DocuSign link
    blockchainTxHash?: string;       // For NFT-backed licenses
    createdAt: Date;
    updatedAt: Date;
}

export interface LicenseTemplate {
    id: string;
    name: string;
    description: string;
    type: LicenseType;
    defaultTerms: LicenseTerms;
    basePrice: number;
    priceMultiplier: number;         // Based on design value
    isActive: boolean;
    createdAt: Date;
}

export interface LicenseAgreement {
    id: string;
    licenseId: string;
    version: number;
    content: string;                 // Legal text
    signerIds: string[];
    signedAt: Record<string, Date>;  // userId -> signedAt
    docusignEnvelopeId?: string;
    pdfUrl?: string;
    createdAt: Date;
}

// ============================================================================
// PRICING TYPES
// ============================================================================

export interface PricingTier {
    id: string;
    name: string;
    minPrice: number;
    maxPrice: number;
    suggestedPrice: number;
    factors: PricingFactor[];
}

export interface PricingFactor {
    name: string;
    weight: number;               // 0-1
    value: number;                // Calculated value
    description: string;
}

export interface PriceSuggestion {
    designId: string;
    suggestedPrice: number;
    priceRange: {
        min: number;
        max: number;
    };
    factors: PricingFactor[];
    confidence: number;           // 0-1
    comparables: {
        designId: string;
        price: number;
        similarity: number;
    }[];
    generatedAt: Date;
}

export interface DesignPricing {
    designId: string;
    basePrice: number;
    currency: Currency;
    licensePrices: Record<LicenseType, number>;
    bulkDiscounts: BulkDiscount[];
    promotionalPrice?: {
        price: number;
        validUntil: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface BulkDiscount {
    minQuantity: number;
    discountPercent: number;
}

// ============================================================================
// DESIGNER MONETIZATION TYPES
// ============================================================================

export interface DesignerProfile {
    id: string;
    userId: string;
    displayName: string;
    bio?: string;
    avatar?: string;                 // Profile avatar URL
    avatarUrl?: string;              // Alias for avatar
    coverImageUrl?: string;
    website?: string;
    portfolioUrl?: string;
    location?: string;
    socialLinks: {
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        behance?: string;
        dribbble?: string;
        website?: string;
        [key: string]: string | undefined;
    };
    specialties?: string[];          // e.g., ['streetwear', 'sustainable']
    experience?: 'beginner' | 'intermediate' | 'professional' | 'expert';

    // Verification
    verified: boolean;
    isVerified?: boolean;            // Alias for verified
    verificationLevel: 'none' | 'email' | 'identity' | 'business' | 'premium';
    verificationDate?: Date;

    // Stats
    trustScore?: number;             // 0-100
    totalSales: number;
    totalRevenue: number;
    rating: number;                  // Average rating
    reviewCount: number;
    followerCount: number;
    followingCount: number;

    badges?: DesignerBadge[];
    joinedAt: Date;
    lastActiveAt: Date;
}

export interface DesignerBadge {
    id: string;
    type: 'verified' | 'top_seller' | 'trending' | 'new' | 'eco_friendly' | 'featured';
    name: string;
    description: string;
    earnedAt: Date;
    expiresAt?: Date;
}

export interface DesignerStats {
    userId: string;
    totalDesigns: number;
    publishedDesigns: number;
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    totalLikes: number;
    totalViews: number;
    followersCount: number;
    followingCount: number;
    conversionRate: number;          // Views to sales
    repeatBuyerRate: number;
    period: {
        start: Date;
        end: Date;
    };
}

export interface DesignerEarnings {
    // Core identifiers
    userId?: string;
    designerId?: string;

    // Balance tracking
    totalEarnings: number;
    pendingEarnings: number;
    availableBalance: number;
    lifetimeEarnings: number;

    // Payout settings
    lastPayoutAt?: Date;
    payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
    minimumPayout: number;
    currency: string;

    // Period-based reporting (optional)
    period?: {
        start: Date;
        end: Date;
    };
    grossRevenue?: number;
    platformFees?: number;
    processingFees?: number;
    refunds?: number;
    netEarnings?: number;
    pendingPayout?: number;
    paidOut?: number;

    // Breakdown by various dimensions
    earningsByMonth: Array<{
        month: string;
        amount: number;
    }>;
    earningsByCategory: Record<string, number>;

    byDesign?: {
        designId: string;
        designName: string;
        revenue: number;
        sales: number;
    }[];
    byLicenseType?: Record<LicenseType, {
        revenue: number;
        count: number;
    }>;
}

export interface PortfolioCollection {
    id: string;
    userId: string;
    name: string;
    description?: string;
    coverImageUrl?: string;
    designIds: string[];
    isPublic: boolean;
    isFeatured: boolean;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// MARKETPLACE TYPES
// ============================================================================

export type ListingStatus =
    | 'draft'
    | 'pending_review'
    | 'active'
    | 'sold'
    | 'suspended'
    | 'expired'
    | 'archived';

export interface MarketplaceListing {
    id: string;
    designId: string;
    sellerId: string;
    title: string;
    description: string;
    status: ListingStatus;
    pricing: DesignPricing;
    availableLicenses: LicenseType[];
    tags: string[];
    category: DesignCategory;
    subcategory?: string;
    style?: string[];
    season?: 'spring' | 'summer' | 'fall' | 'winter' | 'all';
    targetMarket?: string[];         // e.g., ['women', 'luxury']
    colors: string[];                // Primary colors
    materials?: string[];
    images: {
        url: string;
        type: 'main' | 'detail' | 'flat' | 'model' | 'technical';
        order: number;
    }[];
    viewCount: number;
    likeCount: number;
    salesCount: number;
    rating: number;
    reviewCount: number;
    isFeatured: boolean;
    isPromoted: boolean;
    promotionEndDate?: Date;
    publishedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type DesignCategory =
    | 'tops'
    | 'bottoms'
    | 'dresses'
    | 'outerwear'
    | 'activewear'
    | 'swimwear'
    | 'intimates'
    | 'accessories'
    | 'footwear'
    | 'prints_patterns'
    | 'collections';

export interface MarketplaceSearch {
    query?: string;
    categories?: DesignCategory[];
    priceRange?: {
        min: number;
        max: number;
    };
    licenseTypes?: LicenseType[];
    colors?: string[];
    styles?: string[];
    seasons?: string[];
    sortBy: 'relevance' | 'price_low' | 'price_high' | 'newest' | 'popular' | 'rating';
    sellerId?: string;
    isFeatured?: boolean;
    page: number;
    limit: number;
}

export interface MarketplaceSearchResult {
    listings: MarketplaceListing[];
    total: number;
    page: number;
    totalPages: number;
    facets: {
        categories: { value: string; count: number }[];
        priceRanges: { min: number; max: number; count: number }[];
        colors: { value: string; count: number }[];
        styles: { value: string; count: number }[];
    };
}

// ============================================================================
// AUCTION TYPES
// ============================================================================

export type AuctionStatus =
    | 'scheduled'
    | 'active'
    | 'ended'
    | 'sold'
    | 'canceled'
    | 'no_bids';

export interface Auction {
    id: string;
    listingId: string;
    sellerId: string;
    title: string;
    description: string;
    startingPrice: number;
    reservePrice?: number;           // Minimum to sell
    buyNowPrice?: number;
    currentBid?: number;
    currentBidderId?: string;
    bidCount: number;
    status: AuctionStatus;
    currency: Currency;
    startsAt: Date;
    endsAt: Date;
    extensionMinutes: number;        // Auto-extend on late bids
    bidIncrement: number;
    watcherCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Bid {
    id: string;
    auctionId: string;
    bidderId: string;
    amount: number;
    maxBid?: number;                 // For auto-bidding
    isWinning: boolean;
    isAutoBid: boolean;
    createdAt: Date;
}

// ============================================================================
// REVIEW & RATING TYPES
// ============================================================================

export interface Review {
    id: string;
    listingId: string;
    licenseId: string;
    reviewerId: string;
    sellerId: string;
    rating: number;                  // 1-5
    title?: string;
    content: string;
    aspects: {
        designQuality: number;
        valueForMoney: number;
        communication: number;
        techPackAccuracy?: number;
        manufacturability?: number;
    };
    images?: string[];
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    reportCount: number;
    sellerResponse?: {
        content: string;
        respondedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// MANUFACTURING PARTNER TYPES
// ============================================================================

export type ManufacturerStatus =
    | 'pending_review'
    | 'approved'
    | 'suspended'
    | 'rejected';

export type ManufacturerCapability =
    | 'cut_and_sew'
    | 'knitwear'
    | 'denim'
    | 'leather'
    | 'outerwear'
    | 'activewear'
    | 'swimwear'
    | 'intimates'
    | 'accessories'
    | 'printing'
    | 'embroidery'
    | 'dyeing';

export interface Manufacturer {
    id: string;
    name: string;
    description: string;
    logoUrl?: string;
    coverImageUrl?: string;
    status: ManufacturerStatus;
    contactEmail: string;
    contactPhone?: string;
    website?: string;
    location: {
        country: string;
        city: string;
        address?: string;
        timezone: string;
    };
    capabilities: ManufacturerCapability[];
    certifications: string[];        // e.g., 'GOTS', 'OEKO-TEX'
    minOrderQuantity: number;
    leadTimeDays: {
        sample: number;
        production: number;
    };
    sustainabilityScore: number;     // 1-5
    qualityScore: number;            // 1-5
    reliabilityScore: number;        // 1-5
    totalOrders: number;
    completedOrders: number;
    onTimeDeliveryRate: number;      // 0-1
    defectRate: number;              // 0-1
    averageRating: number;
    reviewCount: number;
    isVerified: boolean;
    joinedAt: Date;
    lastActiveAt: Date;
}

export interface ProductionQuote {
    id: string;
    manufacturerId: string;
    designId: string;
    requesterId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: Currency;
    breakdown: {
        materials: number;
        labor: number;
        overhead: number;
        shipping?: number;
    };
    leadTimeDays: number;
    validUntil: Date;
    notes?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    createdAt: Date;
}

export interface SampleOrder {
    id: string;
    manufacturerId: string;
    designId: string;
    customerId: string;
    quantity: number;
    specifications: {
        size: string;
        colorway: string;
        materials?: string[];
        modifications?: string;
    };
    status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'approved' | 'rejected';
    price: number;
    currency: Currency;
    shippingAddress: ShippingAddress;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    feedback?: {
        approved: boolean;
        comments: string;
        images?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductionOrder {
    id: string;
    manufacturerId: string;
    designId: string;
    customerId: string;
    licenseId: string;
    quoteId: string;
    status: ProductionStatus;
    quantities: {
        size: string;
        quantity: number;
        completed: number;
    }[];
    totalQuantity: number;
    completedQuantity: number;
    specifications: {
        colorways: string[];
        materials: string[];
        trims: string[];
        packaging: string;
        labeling: string;
    };
    timeline: {
        ordered: Date;
        confirmed?: Date;
        productionStarted?: Date;
        qualityCheckPassed?: Date;
        shipped?: Date;
        delivered?: Date;
    };
    shippingAddress: ShippingAddress;
    price: number;
    currency: Currency;
    paymentStatus: 'pending' | 'partial' | 'paid';
    paymentSchedule: {
        milestone: string;
        amount: number;
        dueDate: Date;
        paidDate?: Date;
    }[];
    qualityReports: QualityReport[];
    createdAt: Date;
    updatedAt: Date;
}

export type ProductionStatus =
    | 'pending_confirmation'
    | 'confirmed'
    | 'sourcing_materials'
    | 'in_production'
    | 'quality_check'
    | 'ready_to_ship'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'canceled'
    | 'on_hold';

export interface QualityReport {
    id: string;
    orderId: string;
    inspector: string;
    date: Date;
    status: 'passed' | 'failed' | 'conditional';
    checklist: {
        item: string;
        passed: boolean;
        notes?: string;
    }[];
    defectsFound: number;
    defectRate: number;
    images?: string[];
    recommendations?: string;
}

export interface ShippingAddress {
    name: string;
    company?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
}

// ============================================================================
// CUSTOM REQUEST (BOUNTY) TYPES
// ============================================================================

export type CustomRequestStatus =
    | 'open'
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'completed'
    | 'disputed'
    | 'canceled'
    | 'expired';

export interface CustomRequest {
    id: string;
    requesterId: string;
    title: string;
    description: string;
    category: DesignCategory;
    requirements: {
        style?: string[];
        colors?: string[];
        materials?: string[];
        targetMarket?: string[];
        budget?: {
            min: number;
            max: number;
        };
        deadline?: Date;
        references?: string[];       // Image URLs
    };
    bounty: number;
    currency: Currency;
    status: CustomRequestStatus;
    submissionCount: number;
    maxSubmissions?: number;
    selectedSubmissionId?: string;
    deadline: Date;
    isPublic: boolean;
    invitedDesigners?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CustomRequestSubmission {
    id: string;
    requestId: string;
    designerId: string;
    designId: string;
    coverLetter?: string;
    proposedPrice?: number;
    estimatedDelivery?: Date;
    status: 'submitted' | 'shortlisted' | 'selected' | 'rejected';
    feedback?: string;
    submittedAt: Date;
}

// ============================================================================
// PROMOTION TYPES
// ============================================================================

export type PromotionType =
    | 'featured'
    | 'spotlight'
    | 'category_boost'
    | 'search_boost'
    | 'email_feature'
    | 'social_share';

export interface Promotion {
    id: string;
    userId: string;
    listingId: string;
    type: PromotionType;
    status: 'pending' | 'active' | 'completed' | 'canceled';
    cost: number;
    currency: Currency;
    impressions: number;
    clicks: number;
    conversions: number;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
}

export interface PromotionPackage {
    id: string;
    name: string;
    description: string;
    type: PromotionType;
    duration: number;                // Days
    price: number;
    currency: Currency;
    features: string[];
    estimatedImpressions: number;
    isActive: boolean;
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface SubscriptionPlan {
    id: string;
    tier: SubscriptionTier;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: Currency;
    features: SubscriptionFeature[];
    limits: SubscriptionLimits;
    isActive: boolean;
}

export interface SubscriptionFeature {
    name: string;
    description: string;
    included: boolean;
    limit?: number;
}

export interface SubscriptionLimits {
    designsPerMonth: number;
    aiGenerationsPerMonth: number;
    storageGB: number;
    teamMembers: number;
    marketplaceListings: number;
    apiCallsPerMonth: number;
    prioritySupport: boolean;
    customBranding: boolean;
    advancedAnalytics: boolean;
    manufacturerAccess: boolean;
}

export interface UserSubscription {
    id: string;
    userId: string;
    planId: string;
    tier: SubscriptionTier;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    billingCycle: 'monthly' | 'yearly';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
    stripeSubscriptionId?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface SalesAnalytics {
    userId: string;
    period: {
        start: Date;
        end: Date;
        granularity: 'hour' | 'day' | 'week' | 'month';
    };
    revenue: {
        total: number;
        byDay: { date: string; amount: number }[];
        byDesign: { designId: string; amount: number }[];
        byLicenseType: Record<LicenseType, number>;
        byCountry: { country: string; amount: number }[];
    };
    sales: {
        total: number;
        byDay: { date: string; count: number }[];
        averageOrderValue: number;
        conversionRate: number;
    };
    traffic: {
        views: number;
        uniqueVisitors: number;
        bounceRate: number;
        averageTimeOnPage: number;
        topReferrers: { source: string; count: number }[];
    };
    engagement: {
        likes: number;
        saves: number;
        shares: number;
        comments: number;
    };
}

export interface MarketplaceAnalytics {
    period: {
        start: Date;
        end: Date;
    };
    gmv: number;                     // Gross merchandise value
    totalTransactions: number;
    averageTransactionValue: number;
    activeListings: number;
    newListings: number;
    activeSellers: number;
    activeBuyers: number;
    topCategories: { category: DesignCategory; revenue: number }[];
    topSellers: { userId: string; revenue: number }[];
    topDesigns: { designId: string; revenue: number }[];
}

// ============================================================================
// DISPUTE & SUPPORT TYPES
// ============================================================================

export type DisputeReason =
    | 'not_as_described'
    | 'quality_issues'
    | 'license_violation'
    | 'copyright_infringement'
    | 'non_delivery'
    | 'payment_issue'
    | 'other';

export type DisputeStatus =
    | 'open'
    | 'under_review'
    | 'awaiting_response'
    | 'resolved'
    | 'escalated'
    | 'closed';

export interface Dispute {
    id: string;
    transactionId: string;
    licenseId?: string;
    initiatorId: string;
    respondentId: string;
    reason: DisputeReason;
    description: string;
    evidence: {
        type: 'image' | 'document' | 'link';
        url: string;
        description?: string;
    }[];
    status: DisputeStatus;
    resolution?: {
        outcome: 'refund_full' | 'refund_partial' | 'no_refund' | 'license_revoked' | 'other';
        amount?: number;
        notes: string;
        resolvedBy: string;
        resolvedAt: Date;
    };
    messages: DisputeMessage[];
    createdAt: Date;
    updatedAt: Date;
}

export interface DisputeMessage {
    id: string;
    disputeId: string;
    senderId: string;
    senderRole: 'initiator' | 'respondent' | 'mediator';
    content: string;
    attachments?: string[];
    createdAt: Date;
}

// ============================================================================
// COPYRIGHT & AUTHENTICITY TYPES
// ============================================================================

export interface CopyrightClaim {
    id: string;
    claimantId: string;
    designId: string;
    originalWorkUrl?: string;
    originalCreationDate?: Date;
    reason?: string;
    description?: string;
    evidence: string[];
    status: 'pending' | 'investigating' | 'upheld' | 'rejected' | 'withdrawn';
    resolution?: {
        action: 'removed' | 'no_action' | 'warning';
        notes: string;
        resolvedBy: string;
        resolvedAt: Date;
    };
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt?: Date;
}

export interface DesignAuthenticity {
    id: string;
    designId: string;
    blockchainNetwork: 'polygon' | 'ethereum';
    contractAddress: string;
    tokenId: string;
    transactionHash: string;
    ipfsHash?: string;
    metadata: {
        creator: string;
        createdAt: Date;
        version: number;
        previousVersions?: string[];
    };
    mintedAt: Date;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type EcommerceEvent =
    | { type: 'sale_completed'; data: { licenseId: string; amount: number } }
    | { type: 'payout_processed'; data: { payoutId: string; amount: number } }
    | { type: 'license_activated'; data: { licenseId: string } }
    | { type: 'license_expired'; data: { licenseId: string } }
    | { type: 'dispute_opened'; data: { disputeId: string } }
    | { type: 'dispute_resolved'; data: { disputeId: string; outcome: string } }
    | { type: 'review_posted'; data: { reviewId: string; rating: number } }
    | { type: 'listing_published'; data: { listingId: string } }
    | { type: 'quote_received'; data: { quoteId: string; manufacturerId: string } }
    | { type: 'production_started'; data: { orderId: string } }
    | { type: 'production_completed'; data: { orderId: string } };

export type EcommerceEventHandler = (event: EcommerceEvent) => void;
