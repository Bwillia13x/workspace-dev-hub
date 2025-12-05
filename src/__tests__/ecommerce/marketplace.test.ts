/**
 * Marketplace Service Tests
 *
 * Tests for design marketplace listings, search, auctions, and reviews.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    MarketplaceService,
    getMarketplaceService,
    resetMarketplaceService,
} from '../../ecommerce/marketplace';
import type { DesignCategory, LicenseType, DesignPricing } from '../../ecommerce/types';

describe('Marketplace Service', () => {
    let marketplaceService: MarketplaceService;

    const createTestPricing = (basePrice: number = 150): DesignPricing => ({
        designId: 'design_test',
        basePrice,
        currency: 'USD',
        licensePrices: {
            exclusive: basePrice * 10,
            limited: basePrice,
            unlimited: basePrice * 3,
            subscription: basePrice * 0.5,
            royalty: 0,
            custom: basePrice * 2,
        },
        bulkDiscounts: [
            { minQuantity: 5, discountPercent: 10 },
            { minQuantity: 10, discountPercent: 20 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const createTestListing = (overrides: Record<string, unknown> = {}) => {
        return marketplaceService.createListing({
            designId: 'design_123',
            sellerId: 'seller_123',
            title: 'Beautiful Summer Dress Design',
            description: 'A stunning summer dress design with floral patterns and comfortable fit.',
            pricing: createTestPricing(),
            availableLicenses: ['limited', 'unlimited'] as LicenseType[],
            tags: ['summer', 'dress', 'floral'],
            category: 'dresses' as DesignCategory,
            style: ['casual', 'boho'],
            season: 'summer',
            colors: ['white', 'pink'],
            images: [{
                url: 'https://example.com/image1.jpg',
                type: 'main',
                order: 1,
            }],
            ...overrides,
        });
    };

    beforeEach(() => {
        resetMarketplaceService();
        marketplaceService = getMarketplaceService();
    });

    describe('Listing Management', () => {
        it('should create a listing', () => {
            const listing = createTestListing();

            expect(listing).toBeDefined();
            expect(listing.id).toMatch(/^lst_/);
            expect(listing.status).toBe('draft');
            expect(listing.title).toBe('Beautiful Summer Dress Design');
        });

        it('should get listing by ID', () => {
            const created = createTestListing();
            const listing = marketplaceService.getListing(created.id);

            expect(listing).toBeDefined();
            expect(listing?.id).toBe(created.id);
        });

        it('should get listing by design ID', () => {
            createTestListing({ designId: 'unique_design' });
            const listing = marketplaceService.getListingByDesignId('unique_design');

            expect(listing).toBeDefined();
            expect(listing?.designId).toBe('unique_design');
        });

        it('should return null for non-existent listing', () => {
            const listing = marketplaceService.getListing('non_existent');
            expect(listing).toBeNull();
        });

        it('should update listing', () => {
            const listing = createTestListing();
            const updated = marketplaceService.updateListing(listing.id, {
                title: 'Updated Title',
                description: 'Updated description with more content here.',
            });

            expect(updated.title).toBe('Updated Title');
        });

        it('should archive listing', () => {
            const listing = createTestListing();
            const archived = marketplaceService.archiveListing(listing.id);

            expect(archived.status).toBe('archived');
        });
    });

    describe('Listing Review & Publishing', () => {
        it('should submit listing for review', () => {
            const listing = createTestListing();
            const submitted = marketplaceService.submitForReview(listing.id);

            expect(submitted.status).toBe('pending_review');
        });

        it('should reject invalid listing submission', () => {
            const listing = marketplaceService.createListing({
                designId: 'design_invalid',
                sellerId: 'seller_invalid',
                title: 'Hi', // Too short
                description: 'Short', // Too short
                pricing: createTestPricing(0), // Invalid price
                availableLicenses: [],
                category: 'dresses',
                images: [],
            });

            expect(() => {
                marketplaceService.submitForReview(listing.id);
            }).toThrow('validation failed');
        });

        it('should publish a listing', () => {
            const listing = createTestListing();
            const published = marketplaceService.publishListing(listing.id);

            expect(published.status).toBe('active');
            expect(published.publishedAt).toBeInstanceOf(Date);
        });

        it('should throw error submitting non-draft listing', () => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);

            expect(() => {
                marketplaceService.submitForReview(listing.id);
            }).toThrow('Only draft');
        });
    });

    describe('Search & Discovery', () => {
        beforeEach(() => {
            // Create multiple listings for search tests
            const categories: DesignCategory[] = ['dresses', 'tops', 'bottoms', 'outerwear'];
            const styles = ['casual', 'formal', 'boho', 'minimalist'];

            for (let i = 0; i < 20; i++) {
                const listing = createTestListing({
                    designId: `design_${i}`,
                    title: `Test Design ${i} ${i % 2 === 0 ? 'Summer' : 'Winter'}`,
                    category: categories[i % categories.length],
                    style: [styles[i % styles.length]],
                    pricing: createTestPricing(50 + i * 25),
                    colors: i % 3 === 0 ? ['red', 'blue'] : ['black', 'white'],
                });
                marketplaceService.publishListing(listing.id);
            }
        });

        it('should search with text query', () => {
            const result = marketplaceService.search({
                query: 'Summer',
                page: 1,
                limit: 10,
                sortBy: 'relevance',
            });

            expect(result.listings.length).toBeGreaterThan(0);
            expect(result.total).toBeGreaterThan(0);
        });

        it('should filter by category', () => {
            const result = marketplaceService.search({
                categories: ['dresses'],
                page: 1,
                limit: 20,
                sortBy: 'relevance',
            });

            expect(result.listings.every(l => l.category === 'dresses')).toBe(true);
        });

        it('should filter by price range', () => {
            const result = marketplaceService.search({
                priceRange: { min: 100, max: 200 },
                page: 1,
                limit: 20,
                sortBy: 'relevance',
            });

            expect(result.listings.every(l =>
                l.pricing.basePrice >= 100 && l.pricing.basePrice <= 200
            )).toBe(true);
        });

        it('should filter by license type', () => {
            const result = marketplaceService.search({
                licenseTypes: ['limited'],
                page: 1,
                limit: 20,
                sortBy: 'relevance',
            });

            expect(result.listings.every(l =>
                l.availableLicenses.includes('limited')
            )).toBe(true);
        });

        it('should filter by color', () => {
            const result = marketplaceService.search({
                colors: ['red'],
                page: 1,
                limit: 20,
                sortBy: 'relevance',
            });

            expect(result.listings.every(l =>
                l.colors.includes('red')
            )).toBe(true);
        });

        it('should sort by price low to high', () => {
            const result = marketplaceService.search({
                sortBy: 'price_low',
                page: 1,
                limit: 10,
            });

            for (let i = 1; i < result.listings.length; i++) {
                expect(result.listings[i].pricing.basePrice)
                    .toBeGreaterThanOrEqual(result.listings[i - 1].pricing.basePrice);
            }
        });

        it('should sort by price high to low', () => {
            const result = marketplaceService.search({
                sortBy: 'price_high',
                page: 1,
                limit: 10,
            });

            for (let i = 1; i < result.listings.length; i++) {
                expect(result.listings[i].pricing.basePrice)
                    .toBeLessThanOrEqual(result.listings[i - 1].pricing.basePrice);
            }
        });

        it('should paginate results', () => {
            const page1 = marketplaceService.search({ page: 1, limit: 5, sortBy: 'relevance' });
            const page2 = marketplaceService.search({ page: 2, limit: 5, sortBy: 'relevance' });

            expect(page1.listings.length).toBe(5);
            expect(page2.listings.length).toBe(5);
            expect(page1.listings[0].id).not.toBe(page2.listings[0].id);
        });

        it('should return facets', () => {
            const result = marketplaceService.search({ page: 1, limit: 10, sortBy: 'relevance' });

            expect(result.facets).toBeDefined();
            expect(result.facets.categories.length).toBeGreaterThan(0);
            expect(result.facets.priceRanges.length).toBeGreaterThan(0);
        });
    });

    describe('Featured & Trending', () => {
        beforeEach(() => {
            for (let i = 0; i < 15; i++) {
                const listing = createTestListing({
                    designId: `design_featured_${i}`,
                    title: `Featured Design ${i}`,
                });
                marketplaceService.publishListing(listing.id);

                // Set some as featured
                if (i < 5) {
                    const fetched = marketplaceService.getListing(listing.id);
                    if (fetched) {
                        fetched.isFeatured = true;
                    }
                }

                // Add views for trending
                for (let v = 0; v < i * 10; v++) {
                    marketplaceService.recordView(listing.id);
                }
            }
        });

        it('should get featured listings', () => {
            const featured = marketplaceService.getFeaturedListings(10);
            expect(featured.every(l => l.isFeatured)).toBe(true);
        });

        it('should limit featured listings', () => {
            const featured = marketplaceService.getFeaturedListings(3);
            expect(featured.length).toBeLessThanOrEqual(3);
        });

        it('should get trending listings', () => {
            const trending = marketplaceService.getTrendingListings(10);
            expect(trending.length).toBeLessThanOrEqual(10);
        });

        it('should get similar listings', () => {
            const listing = createTestListing({
                designId: 'design_similar',
                title: 'Similar Test Design',
            });
            marketplaceService.publishListing(listing.id);

            const similar = marketplaceService.getSimilarListings(listing.id, 5);
            expect(Array.isArray(similar)).toBe(true);
        });
    });

    describe('Engagement', () => {
        it('should record views', () => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);

            marketplaceService.recordView(listing.id);
            marketplaceService.recordView(listing.id);
            marketplaceService.recordView(listing.id);

            const updated = marketplaceService.getListing(listing.id);
            expect(updated?.viewCount).toBe(3);
        });

        it('should like a listing', () => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);

            marketplaceService.likeListing(listing.id, 'user_123');

            const updated = marketplaceService.getListing(listing.id);
            expect(updated?.likeCount).toBe(1);
        });

        it('should unlike a listing', () => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);
            marketplaceService.likeListing(listing.id, 'user_123');
            marketplaceService.unlikeListing(listing.id, 'user_123');

            const updated = marketplaceService.getListing(listing.id);
            expect(updated?.likeCount).toBe(0);
        });

        it('should record sales', () => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);

            marketplaceService.recordSale(listing.id);
            marketplaceService.recordSale(listing.id);

            const updated = marketplaceService.getListing(listing.id);
            expect(updated?.salesCount).toBe(2);
        });
    });

    describe('Auctions', () => {
        let auctionId: string;

        beforeEach(() => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);

            const auction = marketplaceService.createAuction({
                listingId: listing.id,
                sellerId: 'seller_123',
                title: 'Auction for Summer Dress',
                description: 'Bid on this exclusive design',
                startingPrice: 100,
                reservePrice: 200,
                buyNowPrice: 500,
                currency: 'USD',
                startsAt: new Date(Date.now() - 1000), // Started 1 second ago
                durationDays: 7,
                bidIncrement: 10,
            });
            auctionId = auction.id;

            // Start the auction
            marketplaceService.processAuctionEndings();
        });

        it('should create an auction', () => {
            const auction = marketplaceService.getAuction(auctionId);
            expect(auction).toBeDefined();
            expect(auction?.id).toMatch(/^auc_/);
        });

        it('should start scheduled auction', () => {
            const auction = marketplaceService.getAuction(auctionId);
            expect(auction?.status).toBe('active');
        });

        it('should place a bid', () => {
            const bid = marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_123',
                amount: 100,
            });

            expect(bid).toBeDefined();
            expect(bid.id).toMatch(/^bid_/);
            expect(bid.isWinning).toBe(true);
        });

        it('should reject bid below minimum', () => {
            expect(() => {
                marketplaceService.placeBid({
                    auctionId,
                    bidderId: 'bidder_123',
                    amount: 50, // Below starting price
                });
            }).toThrow('Minimum bid');
        });

        it('should update current bid on auction', () => {
            marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_123',
                amount: 100,
            });

            const auction = marketplaceService.getAuction(auctionId);
            expect(auction?.currentBid).toBe(100);
            expect(auction?.currentBidderId).toBe('bidder_123');
        });

        it('should require increment for subsequent bids', () => {
            marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_123',
                amount: 100,
            });

            expect(() => {
                marketplaceService.placeBid({
                    auctionId,
                    bidderId: 'bidder_456',
                    amount: 105, // Less than increment of 10
                });
            }).toThrow('Minimum bid');
        });

        it('should get auction bids', () => {
            marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_123',
                amount: 100,
            });
            marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_456',
                amount: 150,
            });

            const bids = marketplaceService.getAuctionBids(auctionId);
            expect(bids.length).toBe(2);
            // Should be sorted by amount descending
            expect(bids[0].amount).toBe(150);
        });

        it('should get active auctions', () => {
            const activeAuctions = marketplaceService.getActiveAuctions();
            expect(activeAuctions.length).toBeGreaterThan(0);
        });

        it('should increment bid count', () => {
            marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_123',
                amount: 100,
            });
            marketplaceService.placeBid({
                auctionId,
                bidderId: 'bidder_456',
                amount: 150,
            });

            const auction = marketplaceService.getAuction(auctionId);
            expect(auction?.bidCount).toBe(2);
        });
    });

    describe('Reviews', () => {
        let listingId: string;

        const createTestAspects = () => ({
            designQuality: 5,
            valueForMoney: 4,
            communication: 5,
        });

        beforeEach(() => {
            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);
            listingId = listing.id;
        });

        it('should create a review', () => {
            const review = marketplaceService.createReview({
                listingId,
                licenseId: 'lic_123',
                reviewerId: 'buyer_123',
                sellerId: 'seller_123',
                rating: 5,
                title: 'Amazing design!',
                content: 'This design exceeded my expectations.',
                aspects: {
                    designQuality: 5,
                    valueForMoney: 4,
                    communication: 5,
                    techPackAccuracy: 5,
                },
            });

            expect(review).toBeDefined();
            expect(review.id).toMatch(/^rev_/);
            expect(review.rating).toBe(5);
            expect(review.isVerifiedPurchase).toBe(true);
        });

        it('should reject invalid rating', () => {
            expect(() => {
                marketplaceService.createReview({
                    listingId,
                    licenseId: 'lic_123',
                    reviewerId: 'buyer_123',
                    sellerId: 'seller_123',
                    rating: 6, // Invalid
                    content: 'Test review content',
                    aspects: createTestAspects(),
                });
            }).toThrow('between 1 and 5');
        });

        it('should update listing rating', () => {
            marketplaceService.createReview({
                listingId,
                licenseId: 'lic_1',
                reviewerId: 'buyer_1',
                sellerId: 'seller_123',
                rating: 5,
                content: 'Great!',
                aspects: createTestAspects(),
            });
            marketplaceService.createReview({
                listingId,
                licenseId: 'lic_2',
                reviewerId: 'buyer_2',
                sellerId: 'seller_123',
                rating: 3,
                content: 'Okay',
                aspects: { ...createTestAspects(), designQuality: 3 },
            });

            const listing = marketplaceService.getListing(listingId);
            expect(listing?.rating).toBe(4); // Average of 5 and 3
            expect(listing?.reviewCount).toBe(2);
        });

        it('should get listing reviews', () => {
            for (let i = 0; i < 5; i++) {
                marketplaceService.createReview({
                    listingId,
                    licenseId: `lic_${i}`,
                    reviewerId: `buyer_${i}`,
                    sellerId: 'seller_123',
                    rating: 3 + (i % 3),
                    content: `Review content ${i}`,
                    aspects: createTestAspects(),
                });
            }

            const reviews = marketplaceService.getListingReviews(listingId);
            expect(reviews.length).toBe(5);
        });

        it('should sort reviews by rating', () => {
            marketplaceService.createReview({
                listingId,
                licenseId: 'lic_1',
                reviewerId: 'buyer_1',
                sellerId: 'seller_123',
                rating: 3,
                content: 'Average',
                aspects: createTestAspects(),
            });
            marketplaceService.createReview({
                listingId,
                licenseId: 'lic_2',
                reviewerId: 'buyer_2',
                sellerId: 'seller_123',
                rating: 5,
                content: 'Excellent',
                aspects: createTestAspects(),
            });

            const reviews = marketplaceService.getListingReviews(listingId, {
                sortBy: 'rating_high',
            });
            expect(reviews[0].rating).toBe(5);
        });

        it('should mark review as helpful', () => {
            const review = marketplaceService.createReview({
                listingId,
                licenseId: 'lic_123',
                reviewerId: 'buyer_123',
                sellerId: 'seller_123',
                rating: 5,
                content: 'Helpful review',
                aspects: createTestAspects(),
            });

            marketplaceService.markReviewHelpful(review.id);
            marketplaceService.markReviewHelpful(review.id);

            const reviews = marketplaceService.getListingReviews(listingId);
            expect(reviews[0].helpfulCount).toBe(2);
        });

        it('should add seller response', () => {
            const review = marketplaceService.createReview({
                listingId,
                licenseId: 'lic_123',
                reviewerId: 'buyer_123',
                sellerId: 'seller_123',
                rating: 4,
                content: 'Good design',
                aspects: createTestAspects(),
            });

            const updated = marketplaceService.respondToReview(review.id, 'Thank you for your feedback!');

            expect(updated.sellerResponse).toBeDefined();
            expect(updated.sellerResponse?.content).toBe('Thank you for your feedback!');
        });
    });

    describe('Seller Statistics', () => {
        beforeEach(() => {
            // Create multiple listings for a seller
            for (let i = 0; i < 5; i++) {
                const listing = createTestListing({
                    designId: `design_stats_${i}`,
                    sellerId: 'seller_stats',
                    title: `Stats Design ${i}`,
                });
                if (i < 3) {
                    marketplaceService.publishListing(listing.id);
                    // Add some activity
                    for (let v = 0; v < i * 5; v++) {
                        marketplaceService.recordView(listing.id);
                    }
                    for (let s = 0; s < i; s++) {
                        marketplaceService.recordSale(listing.id);
                    }
                }
            }
        });

        it('should get seller listings', () => {
            const listings = marketplaceService.getSellerListings('seller_stats');
            expect(listings.length).toBe(5);
        });

        it('should filter seller listings by status', () => {
            const activeListings = marketplaceService.getSellerListings('seller_stats', {
                status: 'active',
            });
            expect(activeListings.length).toBe(3);
        });

        it('should get seller stats', () => {
            const stats = marketplaceService.getSellerStats('seller_stats');

            expect(stats.totalListings).toBe(5);
            expect(stats.activeListings).toBe(3);
            expect(typeof stats.totalSales).toBe('number');
            expect(typeof stats.totalViews).toBe('number');
        });
    });

    describe('Event Subscription', () => {
        it('should subscribe to events', () => {
            const events: unknown[] = [];
            const unsubscribe = marketplaceService.subscribe((event) => {
                events.push(event);
            });

            expect(typeof unsubscribe).toBe('function');
            unsubscribe();
        });

        it('should emit events on publish', () => {
            const events: unknown[] = [];
            marketplaceService.subscribe((event) => {
                events.push(event);
            });

            const listing = createTestListing();
            marketplaceService.publishListing(listing.id);

            expect(events.length).toBeGreaterThan(0);
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance from getMarketplaceService', () => {
            const instance1 = getMarketplaceService();
            const instance2 = getMarketplaceService();
            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', () => {
            const instance1 = getMarketplaceService();
            resetMarketplaceService();
            const instance2 = getMarketplaceService();
            expect(instance1).not.toBe(instance2);
        });
    });
});
