/**
 * Marketplace Service - Phase 5 E-commerce & Monetization
 *
 * Design marketplace with listings, search, auctions,
 * and curated collections.
 */

import type {
    MarketplaceListing,
    MarketplaceSearch,
    MarketplaceSearchResult,
    DesignPricing,
    DesignCategory,
    ListingStatus,
    LicenseType,
    Auction,
    AuctionStatus,
    Bid,
    Review,
    Currency,
    EcommerceEvent,
    EcommerceEventHandler,
} from './types';

// ============================================================================
// MOCK DATA STORE
// ============================================================================

const listings = new Map<string, MarketplaceListing>();
const auctions = new Map<string, Auction>();
const bids = new Map<string, Bid>();
const reviews = new Map<string, Review>();

// ============================================================================
// MARKETPLACE SERVICE CLASS
// ============================================================================

export class MarketplaceService {
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
    // LISTING MANAGEMENT
    // ========================================================================

    /**
     * Create a new marketplace listing
     */
    createListing(options: {
        designId: string;
        sellerId: string;
        title: string;
        description: string;
        pricing: DesignPricing;
        availableLicenses: LicenseType[];
        tags?: string[];
        category: DesignCategory;
        subcategory?: string;
        style?: string[];
        season?: MarketplaceListing['season'];
        targetMarket?: string[];
        colors?: string[];
        materials?: string[];
        images: MarketplaceListing['images'];
    }): MarketplaceListing {
        const listing: MarketplaceListing = {
            id: this.generateId('lst'),
            designId: options.designId,
            sellerId: options.sellerId,
            title: options.title,
            description: options.description,
            status: 'draft',
            pricing: options.pricing,
            availableLicenses: options.availableLicenses,
            tags: options.tags || [],
            category: options.category,
            subcategory: options.subcategory,
            style: options.style,
            season: options.season,
            targetMarket: options.targetMarket,
            colors: options.colors || [],
            materials: options.materials,
            images: options.images,
            viewCount: 0,
            likeCount: 0,
            salesCount: 0,
            rating: 0,
            reviewCount: 0,
            isFeatured: false,
            isPromoted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        listings.set(listing.id, listing);
        return listing;
    }

    /**
     * Submit listing for review
     */
    submitForReview(listingId: string): MarketplaceListing {
        const listing = listings.get(listingId);
        if (!listing) {
            throw new Error(`Listing ${listingId} not found`);
        }

        if (listing.status !== 'draft') {
            throw new Error('Only draft listings can be submitted for review');
        }

        // Validate listing
        const validation = this.validateListing(listing);
        if (!validation.valid) {
            throw new Error(`Listing validation failed: ${validation.errors.join(', ')}`);
        }

        listing.status = 'pending_review';
        listing.updatedAt = new Date();
        listings.set(listingId, listing);

        return listing;
    }

    /**
     * Validate listing before publishing
     */
    private validateListing(listing: MarketplaceListing): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!listing.title || listing.title.length < 5) {
            errors.push('Title must be at least 5 characters');
        }

        if (!listing.description || listing.description.length < 20) {
            errors.push('Description must be at least 20 characters');
        }

        if (!listing.images || listing.images.length === 0) {
            errors.push('At least one image is required');
        }

        if (!listing.availableLicenses || listing.availableLicenses.length === 0) {
            errors.push('At least one license type must be available');
        }

        if (listing.pricing.basePrice <= 0) {
            errors.push('Base price must be greater than 0');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Publish a listing (after review approval)
     */
    publishListing(listingId: string): MarketplaceListing {
        const listing = listings.get(listingId);
        if (!listing) {
            throw new Error(`Listing ${listingId} not found`);
        }

        listing.status = 'active';
        listing.publishedAt = new Date();
        listing.updatedAt = new Date();
        listings.set(listingId, listing);

        this.emit({
            type: 'listing_published',
            data: { listingId },
        });

        return listing;
    }

    /**
     * Update listing
     */
    updateListing(
        listingId: string,
        updates: Partial<Pick<MarketplaceListing,
            'title' | 'description' | 'pricing' | 'availableLicenses' |
            'tags' | 'category' | 'style' | 'season' | 'images'
        >>
    ): MarketplaceListing {
        const listing = listings.get(listingId);
        if (!listing) {
            throw new Error(`Listing ${listingId} not found`);
        }

        Object.assign(listing, updates, { updatedAt: new Date() });
        listings.set(listingId, listing);

        return listing;
    }

    /**
     * Get listing by ID
     */
    getListing(listingId: string): MarketplaceListing | null {
        return listings.get(listingId) || null;
    }

    /**
     * Get listing by design ID
     */
    getListingByDesignId(designId: string): MarketplaceListing | null {
        for (const listing of listings.values()) {
            if (listing.designId === designId) {
                return listing;
            }
        }
        return null;
    }

    /**
     * Archive a listing
     */
    archiveListing(listingId: string): MarketplaceListing {
        const listing = listings.get(listingId);
        if (!listing) {
            throw new Error(`Listing ${listingId} not found`);
        }

        listing.status = 'archived';
        listing.updatedAt = new Date();
        listings.set(listingId, listing);

        return listing;
    }

    // ========================================================================
    // SEARCH & DISCOVERY
    // ========================================================================

    /**
     * Search marketplace listings
     */
    search(params: MarketplaceSearch): MarketplaceSearchResult {
        let results = Array.from(listings.values())
            .filter(l => l.status === 'active');

        // Text search
        if (params.query) {
            const query = params.query.toLowerCase();
            results = results.filter(l =>
                l.title.toLowerCase().includes(query) ||
                l.description.toLowerCase().includes(query) ||
                l.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        // Category filter
        if (params.categories && params.categories.length > 0) {
            results = results.filter(l => params.categories!.includes(l.category));
        }

        // Price range filter
        if (params.priceRange) {
            results = results.filter(l =>
                l.pricing.basePrice >= params.priceRange!.min &&
                l.pricing.basePrice <= params.priceRange!.max
            );
        }

        // License type filter
        if (params.licenseTypes && params.licenseTypes.length > 0) {
            results = results.filter(l =>
                l.availableLicenses.some(lt => params.licenseTypes!.includes(lt))
            );
        }

        // Color filter
        if (params.colors && params.colors.length > 0) {
            results = results.filter(l =>
                l.colors.some(c => params.colors!.includes(c))
            );
        }

        // Style filter
        if (params.styles && params.styles.length > 0) {
            results = results.filter(l =>
                l.style?.some(s => params.styles!.includes(s))
            );
        }

        // Season filter
        if (params.seasons && params.seasons.length > 0) {
            results = results.filter(l =>
                l.season && (params.seasons!.includes(l.season) || l.season === 'all')
            );
        }

        // Seller filter
        if (params.sellerId) {
            results = results.filter(l => l.sellerId === params.sellerId);
        }

        // Featured filter
        if (params.isFeatured !== undefined) {
            results = results.filter(l => l.isFeatured === params.isFeatured);
        }

        // Calculate facets before sorting/pagination
        const facets = this.calculateFacets(results);

        // Sort
        results = this.sortResults(results, params.sortBy);

        // Pagination
        const total = results.length;
        const totalPages = Math.ceil(total / params.limit);
        const start = (params.page - 1) * params.limit;
        const paginatedResults = results.slice(start, start + params.limit);

        return {
            listings: paginatedResults,
            total,
            page: params.page,
            totalPages,
            facets,
        };
    }

    private sortResults(
        results: MarketplaceListing[],
        sortBy: MarketplaceSearch['sortBy']
    ): MarketplaceListing[] {
        switch (sortBy) {
            case 'price_low':
                return results.sort((a, b) => a.pricing.basePrice - b.pricing.basePrice);
            case 'price_high':
                return results.sort((a, b) => b.pricing.basePrice - a.pricing.basePrice);
            case 'newest':
                return results.sort((a, b) =>
                    (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0)
                );
            case 'popular':
                return results.sort((a, b) => b.salesCount - a.salesCount);
            case 'rating':
                return results.sort((a, b) => b.rating - a.rating);
            case 'relevance':
            default:
                // Relevance combines multiple factors
                return results.sort((a, b) => {
                    const scoreA = (a.isFeatured ? 100 : 0) + (a.isPromoted ? 50 : 0) + a.viewCount * 0.1;
                    const scoreB = (b.isFeatured ? 100 : 0) + (b.isPromoted ? 50 : 0) + b.viewCount * 0.1;
                    return scoreB - scoreA;
                });
        }
    }

    private calculateFacets(results: MarketplaceListing[]): MarketplaceSearchResult['facets'] {
        const categories: Record<string, number> = {};
        const colors: Record<string, number> = {};
        const styles: Record<string, number> = {};
        const prices: { min: number; max: number }[] = [];

        for (const listing of results) {
            // Categories
            categories[listing.category] = (categories[listing.category] || 0) + 1;

            // Colors
            for (const color of listing.colors) {
                colors[color] = (colors[color] || 0) + 1;
            }

            // Styles
            if (listing.style) {
                for (const style of listing.style) {
                    styles[style] = (styles[style] || 0) + 1;
                }
            }
        }

        // Price ranges
        const priceRanges = [
            { min: 0, max: 50 },
            { min: 50, max: 100 },
            { min: 100, max: 500 },
            { min: 500, max: 1000 },
            { min: 1000, max: Infinity },
        ];

        const priceRangeCounts = priceRanges.map(range => ({
            ...range,
            count: results.filter(l =>
                l.pricing.basePrice >= range.min &&
                l.pricing.basePrice < (range.max === Infinity ? Number.MAX_VALUE : range.max)
            ).length,
        }));

        return {
            categories: Object.entries(categories).map(([value, count]) => ({ value, count })),
            priceRanges: priceRangeCounts,
            colors: Object.entries(colors).map(([value, count]) => ({ value, count })),
            styles: Object.entries(styles).map(([value, count]) => ({ value, count })),
        };
    }

    /**
     * Get featured listings
     */
    getFeaturedListings(limit: number = 10): MarketplaceListing[] {
        return Array.from(listings.values())
            .filter(l => l.status === 'active' && l.isFeatured)
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, limit);
    }

    /**
     * Get trending listings
     */
    getTrendingListings(limit: number = 10): MarketplaceListing[] {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        return Array.from(listings.values())
            .filter(l => l.status === 'active')
            .sort((a, b) => {
                // Score based on recent activity
                const scoreA = a.viewCount + a.likeCount * 5 + a.salesCount * 20;
                const scoreB = b.viewCount + b.likeCount * 5 + b.salesCount * 20;
                return scoreB - scoreA;
            })
            .slice(0, limit);
    }

    /**
     * Get similar listings
     */
    getSimilarListings(listingId: string, limit: number = 6): MarketplaceListing[] {
        const listing = listings.get(listingId);
        if (!listing) return [];

        return Array.from(listings.values())
            .filter(l =>
                l.id !== listingId &&
                l.status === 'active' &&
                (l.category === listing.category ||
                    l.tags.some(t => listing.tags.includes(t)) ||
                    l.style?.some(s => listing.style?.includes(s)))
            )
            .slice(0, limit);
    }

    // ========================================================================
    // ENGAGEMENT
    // ========================================================================

    /**
     * Record a view on a listing
     */
    recordView(listingId: string): void {
        const listing = listings.get(listingId);
        if (listing) {
            listing.viewCount++;
            listings.set(listingId, listing);
        }
    }

    /**
     * Like a listing
     */
    likeListing(listingId: string, userId: string): void {
        const listing = listings.get(listingId);
        if (listing) {
            listing.likeCount++;
            listings.set(listingId, listing);
        }
    }

    /**
     * Unlike a listing
     */
    unlikeListing(listingId: string, userId: string): void {
        const listing = listings.get(listingId);
        if (listing && listing.likeCount > 0) {
            listing.likeCount--;
            listings.set(listingId, listing);
        }
    }

    /**
     * Record a sale
     */
    recordSale(listingId: string): void {
        const listing = listings.get(listingId);
        if (listing) {
            listing.salesCount++;
            listings.set(listingId, listing);
        }
    }

    // ========================================================================
    // AUCTIONS
    // ========================================================================

    /**
     * Create an auction
     */
    createAuction(options: {
        listingId: string;
        sellerId: string;
        title: string;
        description: string;
        startingPrice: number;
        reservePrice?: number;
        buyNowPrice?: number;
        currency: Currency;
        startsAt: Date;
        durationDays: number;
        bidIncrement?: number;
    }): Auction {
        const auction: Auction = {
            id: this.generateId('auc'),
            listingId: options.listingId,
            sellerId: options.sellerId,
            title: options.title,
            description: options.description,
            startingPrice: options.startingPrice,
            reservePrice: options.reservePrice,
            buyNowPrice: options.buyNowPrice,
            bidCount: 0,
            status: 'scheduled',
            currency: options.currency,
            startsAt: options.startsAt,
            endsAt: new Date(options.startsAt.getTime() + options.durationDays * 24 * 60 * 60 * 1000),
            extensionMinutes: 5,
            bidIncrement: options.bidIncrement || 5,
            watcherCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        auctions.set(auction.id, auction);
        return auction;
    }

    /**
     * Place a bid
     */
    placeBid(options: {
        auctionId: string;
        bidderId: string;
        amount: number;
        maxBid?: number;
    }): Bid {
        const auction = auctions.get(options.auctionId);
        if (!auction) {
            throw new Error(`Auction ${options.auctionId} not found`);
        }

        if (auction.status !== 'active') {
            throw new Error('Auction is not active');
        }

        const minBid = auction.currentBid
            ? auction.currentBid + auction.bidIncrement
            : auction.startingPrice;

        if (options.amount < minBid) {
            throw new Error(`Minimum bid is ${minBid}`);
        }

        // Check for auto-bidding
        if (options.maxBid && options.maxBid < options.amount) {
            throw new Error('Max bid must be greater than or equal to bid amount');
        }

        const bid: Bid = {
            id: this.generateId('bid'),
            auctionId: options.auctionId,
            bidderId: options.bidderId,
            amount: options.amount,
            maxBid: options.maxBid,
            isWinning: true,
            isAutoBid: false,
            createdAt: new Date(),
        };

        // Update previous winning bid
        for (const existingBid of bids.values()) {
            if (existingBid.auctionId === options.auctionId && existingBid.isWinning) {
                existingBid.isWinning = false;
                bids.set(existingBid.id, existingBid);
            }
        }

        bids.set(bid.id, bid);

        // Update auction
        auction.currentBid = options.amount;
        auction.currentBidderId = options.bidderId;
        auction.bidCount++;
        auction.updatedAt = new Date();

        // Extend auction if bid placed in last 5 minutes
        const timeRemaining = auction.endsAt.getTime() - Date.now();
        if (timeRemaining < auction.extensionMinutes * 60 * 1000) {
            auction.endsAt = new Date(Date.now() + auction.extensionMinutes * 60 * 1000);
        }

        auctions.set(options.auctionId, auction);

        return bid;
    }

    /**
     * Get auction by ID
     */
    getAuction(auctionId: string): Auction | null {
        return auctions.get(auctionId) || null;
    }

    /**
     * Get bids for an auction
     */
    getAuctionBids(auctionId: string): Bid[] {
        return Array.from(bids.values())
            .filter(b => b.auctionId === auctionId)
            .sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get active auctions
     */
    getActiveAuctions(limit: number = 20): Auction[] {
        return Array.from(auctions.values())
            .filter(a => a.status === 'active')
            .sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime())
            .slice(0, limit);
    }

    /**
     * Process auction endings
     */
    processAuctionEndings(): { ended: number; sold: number; noBids: number } {
        const now = new Date();
        let ended = 0;
        let sold = 0;
        let noBids = 0;

        for (const auction of auctions.values()) {
            if (auction.status === 'active' && auction.endsAt <= now) {
                auction.status = 'ended';

                if (auction.currentBid) {
                    // Check reserve price
                    if (!auction.reservePrice || auction.currentBid >= auction.reservePrice) {
                        auction.status = 'sold';
                        sold++;
                    } else {
                        // Reserve not met
                        ended++;
                    }
                } else {
                    auction.status = 'no_bids';
                    noBids++;
                }

                auction.updatedAt = now;
                auctions.set(auction.id, auction);
                ended++;
            }

            // Start scheduled auctions
            if (auction.status === 'scheduled' && auction.startsAt <= now) {
                auction.status = 'active';
                auction.updatedAt = now;
                auctions.set(auction.id, auction);
            }
        }

        return { ended, sold, noBids };
    }

    // ========================================================================
    // REVIEWS
    // ========================================================================

    /**
     * Create a review
     */
    createReview(options: {
        listingId: string;
        licenseId: string;
        reviewerId: string;
        sellerId: string;
        rating: number;
        title?: string;
        content: string;
        aspects: Review['aspects'];
        images?: string[];
    }): Review {
        if (options.rating < 1 || options.rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        const review: Review = {
            id: this.generateId('rev'),
            listingId: options.listingId,
            licenseId: options.licenseId,
            reviewerId: options.reviewerId,
            sellerId: options.sellerId,
            rating: options.rating,
            title: options.title,
            content: options.content,
            aspects: options.aspects,
            images: options.images,
            isVerifiedPurchase: true,
            helpfulCount: 0,
            reportCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        reviews.set(review.id, review);

        // Update listing rating
        this.updateListingRating(options.listingId);

        this.emit({
            type: 'review_posted',
            data: { reviewId: review.id, rating: review.rating },
        });

        return review;
    }

    private updateListingRating(listingId: string): void {
        const listing = listings.get(listingId);
        if (!listing) return;

        const listingReviews = Array.from(reviews.values())
            .filter(r => r.listingId === listingId);

        if (listingReviews.length === 0) {
            listing.rating = 0;
            listing.reviewCount = 0;
        } else {
            const totalRating = listingReviews.reduce((sum, r) => sum + r.rating, 0);
            listing.rating = Math.round((totalRating / listingReviews.length) * 10) / 10;
            listing.reviewCount = listingReviews.length;
        }

        listings.set(listingId, listing);
    }

    /**
     * Get reviews for a listing
     */
    getListingReviews(
        listingId: string,
        options?: {
            sortBy?: 'newest' | 'helpful' | 'rating_high' | 'rating_low';
            limit?: number;
        }
    ): Review[] {
        let results = Array.from(reviews.values())
            .filter(r => r.listingId === listingId);

        switch (options?.sortBy) {
            case 'helpful':
                results.sort((a, b) => b.helpfulCount - a.helpfulCount);
                break;
            case 'rating_high':
                results.sort((a, b) => b.rating - a.rating);
                break;
            case 'rating_low':
                results.sort((a, b) => a.rating - b.rating);
                break;
            case 'newest':
            default:
                results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Mark review as helpful
     */
    markReviewHelpful(reviewId: string): void {
        const review = reviews.get(reviewId);
        if (review) {
            review.helpfulCount++;
            reviews.set(reviewId, review);
        }
    }

    /**
     * Add seller response to review
     */
    respondToReview(reviewId: string, content: string): Review {
        const review = reviews.get(reviewId);
        if (!review) {
            throw new Error(`Review ${reviewId} not found`);
        }

        review.sellerResponse = {
            content,
            respondedAt: new Date(),
        };
        review.updatedAt = new Date();
        reviews.set(reviewId, review);

        return review;
    }

    // ========================================================================
    // SELLER LISTINGS
    // ========================================================================

    /**
     * Get listings for a seller
     */
    getSellerListings(
        sellerId: string,
        options?: {
            status?: ListingStatus;
            limit?: number;
        }
    ): MarketplaceListing[] {
        let results = Array.from(listings.values())
            .filter(l => l.sellerId === sellerId);

        if (options?.status) {
            results = results.filter(l => l.status === options.status);
        }

        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (options?.limit) {
            results = results.slice(0, options.limit);
        }

        return results;
    }

    /**
     * Get seller statistics
     */
    getSellerStats(sellerId: string): {
        totalListings: number;
        activeListings: number;
        totalSales: number;
        totalViews: number;
        averageRating: number;
        totalReviews: number;
    } {
        const sellerListings = Array.from(listings.values())
            .filter(l => l.sellerId === sellerId);

        const totalSales = sellerListings.reduce((sum, l) => sum + l.salesCount, 0);
        const totalViews = sellerListings.reduce((sum, l) => sum + l.viewCount, 0);
        const totalReviews = sellerListings.reduce((sum, l) => sum + l.reviewCount, 0);

        const ratingsSum = sellerListings
            .filter(l => l.reviewCount > 0)
            .reduce((sum, l) => sum + l.rating * l.reviewCount, 0);

        const averageRating = totalReviews > 0 ? ratingsSum / totalReviews : 0;

        return {
            totalListings: sellerListings.length,
            activeListings: sellerListings.filter(l => l.status === 'active').length,
            totalSales,
            totalViews,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
        };
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

let marketplaceServiceInstance: MarketplaceService | null = null;

export function getMarketplaceService(): MarketplaceService {
    if (!marketplaceServiceInstance) {
        marketplaceServiceInstance = new MarketplaceService();
    }
    return marketplaceServiceInstance;
}

export function resetMarketplaceService(): void {
    marketplaceServiceInstance = null;
    listings.clear();
    auctions.clear();
    bids.clear();
    reviews.clear();
}
