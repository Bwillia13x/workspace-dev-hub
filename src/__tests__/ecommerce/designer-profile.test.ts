/**
 * @fileoverview Comprehensive tests for DesignerProfileService
 * Tests designer profile management, earnings, payouts, reviews, portfolio,
 * followers, badges, notifications, collaborations, analytics, and search
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getDesignerProfileService,
    resetDesignerProfileService,
    DesignerProfileService,
} from '../../ecommerce/designer-profile';

describe('DesignerProfileService', () => {
    let service: DesignerProfileService;

    beforeEach(() => {
        vi.clearAllMocks();
        resetDesignerProfileService();
        service = getDesignerProfileService();
    });

    // ========================================================================
    // SINGLETON PATTERN
    // ========================================================================

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = getDesignerProfileService();
            const instance2 = getDesignerProfileService();
            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', () => {
            const instance1 = getDesignerProfileService();
            resetDesignerProfileService();
            const instance2 = getDesignerProfileService();
            expect(instance1).not.toBe(instance2);
        });
    });

    // ========================================================================
    // PROFILE CRUD OPERATIONS
    // ========================================================================

    describe('Profile Management', () => {
        it('should create a designer profile', async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Jane Designer',
                bio: 'Fashion designer specializing in sustainable clothing',
                avatar: 'https://example.com/avatar.jpg',
                location: 'New York, NY',
                website: 'https://janedesigner.com',
                specialties: ['sustainable', 'casual', 'streetwear'],
            });

            // Profile id equals userId in this implementation
            expect(profile.id).toBe('user_1');
            expect(profile.userId).toBe('user_1');
            expect(profile.displayName).toBe('Jane Designer');
            expect(profile.bio).toBe('Fashion designer specializing in sustainable clothing');
            expect(profile.specialties).toContain('sustainable');
            expect(profile.rating).toBe(0);
            expect(profile.reviewCount).toBe(0);
            expect(profile.totalSales).toBe(0);
            expect(profile.followerCount).toBe(0);
            expect(profile.followingCount).toBe(0);
            expect(profile.verified).toBe(false);
            expect(profile.joinedAt).toBeInstanceOf(Date);
        });

        it('should get a designer profile by ID', async () => {
            const created = await service.createProfile('user_1', {
                displayName: 'Test Designer',
            });

            const retrieved = await service.getProfile(created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.displayName).toBe('Test Designer');
        });

        it('should return null for non-existent profile', async () => {
            const profile = await service.getProfile('nonexistent');
            expect(profile).toBeNull();
        });

        it('should update a designer profile', async () => {
            const created = await service.createProfile('user_1', {
                displayName: 'Original Name',
            });

            const updated = await service.updateProfile(created.id, {
                displayName: 'Updated Name',
                bio: 'New bio',
                verified: true,
            });

            expect(updated.displayName).toBe('Updated Name');
            expect(updated.bio).toBe('New bio');
            expect(updated.verified).toBe(true);
        });

        it('should throw error updating non-existent profile', async () => {
            await expect(
                service.updateProfile('nonexistent', { displayName: 'Test' })
            ).rejects.toThrow('Designer profile not found');
        });

        it('should get designer stats', async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Stats Designer',
            });

            const stats = await service.getStats(profile.id);
            expect(stats).toBeDefined();
            expect(stats.totalSales).toBe(0);
            expect(stats.totalRevenue).toBe(0);
            expect(stats.averageRating).toBe(0);
            expect(stats.reviewCount).toBe(0);
            expect(stats.followerCount).toBe(0);
        });

        it('should return empty stats for non-existent designer', async () => {
            const stats = await service.getStats('nonexistent');
            // getStats returns default stats object even for non-existent designer
            expect(stats.totalSales).toBe(0);
            expect(stats.totalRevenue).toBe(0);
            expect(stats.totalDesigns).toBe(0);
        });
    });

    // ========================================================================
    // EARNINGS MANAGEMENT
    // ========================================================================

    describe('Earnings Management', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Earning Designer',
            });
            designerId = profile.id;
        });

        it('should initialize earnings on profile creation', async () => {
            const earnings = await service.getEarnings(designerId);
            expect(earnings).not.toBeNull();
            expect(earnings?.totalEarnings).toBe(0);
            expect(earnings?.pendingEarnings).toBe(0);
            expect(earnings?.availableBalance).toBe(0);
            expect(earnings?.currency).toBe('USD');
            expect(earnings?.minimumPayout).toBe(50);
        });

        it('should add earnings', async () => {
            await service.addEarning(designerId, 100, 'sale', {
                orderId: 'order_1',
            });

            const earnings = await service.getEarnings(designerId);
            expect(earnings?.totalEarnings).toBe(100);
            expect(earnings?.pendingEarnings).toBe(100);
        });

        it('should track earnings by category', async () => {
            // earningsByCategory is tracked via metadata.category, not source
            await service.addEarning(designerId, 100, 'sale', { category: 'dresses' });
            await service.addEarning(designerId, 50, 'license', { category: 'tops' });
            await service.addEarning(designerId, 25, 'tip', { category: 'dresses' });

            const earnings = await service.getEarnings(designerId);
            expect(earnings?.earningsByCategory['dresses']).toBe(125);
            expect(earnings?.earningsByCategory['tops']).toBe(50);
        });

        it('should throw error for non-existent designer earnings', async () => {
            await expect(
                service.addEarning('nonexistent', 100, 'sale')
            ).rejects.toThrow('Designer earnings not found');
        });

        it('should process earnings to pending', async () => {
            await service.addEarning(designerId, 100, 'sale');
            await service.processEarningsToPending(designerId);

            const earnings = await service.getEarnings(designerId);
            expect(earnings?.availableBalance).toBe(100);
            expect(earnings?.pendingEarnings).toBe(0);
        });
    });

    // ========================================================================
    // PAYOUTS
    // ========================================================================

    describe('Payout System', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Payout Designer',
            });
            designerId = profile.id;

            // Add and process earnings
            await service.addEarning(designerId, 500, 'sale');
            await service.processEarningsToPending(designerId);
        });

        it('should request a bank transfer payout', async () => {
            const payout = await service.requestPayout(designerId, 100, 'bank_transfer');

            expect(payout.id).toMatch(/^payout_/);
            expect(payout.designerId).toBe(designerId);
            expect(payout.amount).toBe(100);
            expect(payout.method).toBe('bank_transfer');
            expect(payout.fees).toBe(1); // 1% of 100, max $5
            expect(payout.netAmount).toBe(99);
            expect(payout.status).toBe('pending');
            expect(payout.scheduledAt).toBeInstanceOf(Date);
        });

        it('should calculate bank transfer fee correctly (max $5)', async () => {
            const payout = await service.requestPayout(designerId, 400, 'bank_transfer');
            expect(payout.fees).toBe(4); // 1% of 400
        });

        it('should cap bank transfer fee at $5', async () => {
            await service.addEarning(designerId, 600, 'sale');
            await service.processEarningsToPending(designerId);

            const payout = await service.requestPayout(designerId, 1000, 'bank_transfer');
            expect(payout.fees).toBe(5); // Capped at $5
        });

        it('should calculate PayPal fees (2% + $0.30)', async () => {
            const payout = await service.requestPayout(designerId, 100, 'paypal');
            expect(payout.fees).toBe(2.3); // 2% + $0.30
            expect(payout.netAmount).toBe(97.7);
        });

        it('should calculate Stripe fees (0.25%)', async () => {
            const payout = await service.requestPayout(designerId, 100, 'stripe');
            expect(payout.fees).toBe(0.25);
            expect(payout.netAmount).toBe(99.75);
        });

        it('should charge flat $25 for wire transfers', async () => {
            const payout = await service.requestPayout(designerId, 100, 'wire');
            expect(payout.fees).toBe(25);
            expect(payout.netAmount).toBe(75);
        });

        it('should throw error for insufficient balance', async () => {
            await expect(
                service.requestPayout(designerId, 1000, 'bank_transfer')
            ).rejects.toThrow('Insufficient available balance');
        });

        it('should throw error for below minimum payout', async () => {
            await expect(
                service.requestPayout(designerId, 25, 'bank_transfer')
            ).rejects.toThrow('Minimum payout amount is $50');
        });

        it('should get payout history', async () => {
            await service.requestPayout(designerId, 100, 'bank_transfer');
            await service.requestPayout(designerId, 100, 'paypal');

            const history = await service.getPayoutHistory(designerId);
            expect(history).toHaveLength(2);
        });

        it('should filter payout history by status', async () => {
            await service.requestPayout(designerId, 100, 'bank_transfer');

            const pending = await service.getPayoutHistory(designerId, { status: 'pending' });
            const completed = await service.getPayoutHistory(designerId, { status: 'completed' });

            expect(pending).toHaveLength(1);
            expect(completed).toHaveLength(0);
        });

        it('should limit payout history results', async () => {
            await service.requestPayout(designerId, 100, 'bank_transfer');
            await service.requestPayout(designerId, 100, 'paypal');
            await service.requestPayout(designerId, 100, 'stripe');

            const history = await service.getPayoutHistory(designerId, { limit: 2 });
            expect(history).toHaveLength(2);
        });
    });

    // ========================================================================
    // REVIEWS & RATINGS
    // ========================================================================

    describe('Reviews & Ratings', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Reviewed Designer',
            });
            designerId = profile.id;
        });

        it('should add a review', async () => {
            const review = await service.addReview(designerId, {
                reviewerId: 'reviewer_1',
                reviewerName: 'John Buyer',
                rating: 5,
                title: 'Amazing designer!',
                content: 'Great quality and fast delivery.',
            });

            expect(review.id).toMatch(/^review_/);
            expect(review.designerId).toBe(designerId);
            expect(review.rating).toBe(5);
            expect(review.helpful).toBe(0);
            expect(review.reported).toBe(false);
        });

        it('should prevent duplicate reviews from same user', async () => {
            await service.addReview(designerId, {
                reviewerId: 'reviewer_1',
                reviewerName: 'John',
                rating: 5,
                title: 'Great',
                content: 'Good',
            });

            await expect(
                service.addReview(designerId, {
                    reviewerId: 'reviewer_1',
                    reviewerName: 'John',
                    rating: 4,
                    title: 'Changed mind',
                    content: 'Still good',
                })
            ).rejects.toThrow('You have already reviewed this designer');
        });

        it('should update designer rating after review', async () => {
            await service.addReview(designerId, {
                reviewerId: 'r1',
                reviewerName: 'User 1',
                rating: 5,
                title: 'Great',
                content: 'Content',
            });
            await service.addReview(designerId, {
                reviewerId: 'r2',
                reviewerName: 'User 2',
                rating: 4,
                title: 'Good',
                content: 'Content',
            });

            const profile = await service.getProfile(designerId);
            expect(profile?.rating).toBe(4.5);
            expect(profile?.reviewCount).toBe(2);
        });

        it('should respond to a review', async () => {
            const review = await service.addReview(designerId, {
                reviewerId: 'r1',
                reviewerName: 'User',
                rating: 4,
                title: 'Good',
                content: 'Nice work',
            });

            const responded = await service.respondToReview(
                designerId,
                review.id,
                'Thank you for your feedback!'
            );

            expect(responded.response).toBeDefined();
            expect(responded.response?.content).toBe('Thank you for your feedback!');
            expect(responded.response?.respondedAt).toBeInstanceOf(Date);
        });

        it('should throw error responding to non-existent review', async () => {
            await expect(
                service.respondToReview(designerId, 'fake_review', 'Response')
            ).rejects.toThrow('Review not found');
        });

        it('should get reviews with sorting by recent', async () => {
            await service.addReview(designerId, {
                reviewerId: 'r1',
                reviewerName: 'User 1',
                rating: 3,
                title: 'Ok',
                content: 'Content',
            });
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
            await service.addReview(designerId, {
                reviewerId: 'r2',
                reviewerName: 'User 2',
                rating: 5,
                title: 'Great',
                content: 'Content',
            });

            const { reviews, total } = await service.getReviews(designerId, {
                sortBy: 'recent',
            });

            expect(total).toBe(2);
            // Most recent review (rating 5) should be first
            expect(reviews[0].reviewerId).toBe('r2');
        });

        it('should get reviews sorted by rating', async () => {
            await service.addReview(designerId, {
                reviewerId: 'r1',
                reviewerName: 'User 1',
                rating: 3,
                title: 'Ok',
                content: 'Content',
            });
            await service.addReview(designerId, {
                reviewerId: 'r2',
                reviewerName: 'User 2',
                rating: 5,
                title: 'Great',
                content: 'Content',
            });

            const { reviews } = await service.getReviews(designerId, {
                sortBy: 'rating',
            });

            expect(reviews[0].rating).toBe(5);
            expect(reviews[1].rating).toBe(3);
        });

        it('should filter reviews by rating', async () => {
            await service.addReview(designerId, {
                reviewerId: 'r1',
                reviewerName: 'User 1',
                rating: 5,
                title: 'Great',
                content: 'Content',
            });
            await service.addReview(designerId, {
                reviewerId: 'r2',
                reviewerName: 'User 2',
                rating: 3,
                title: 'Ok',
                content: 'Content',
            });

            const { reviews, total } = await service.getReviews(designerId, {
                rating: 5,
            });

            expect(total).toBe(1);
            expect(reviews[0].rating).toBe(5);
        });

        it('should paginate reviews', async () => {
            for (let i = 1; i <= 5; i++) {
                await service.addReview(designerId, {
                    reviewerId: `r${i}`,
                    reviewerName: `User ${i}`,
                    rating: i,
                    title: `Review ${i}`,
                    content: 'Content',
                });
            }

            const { reviews } = await service.getReviews(designerId, {
                limit: 2,
                offset: 2,
            });

            expect(reviews).toHaveLength(2);
        });
    });

    // ========================================================================
    // PORTFOLIO MANAGEMENT
    // ========================================================================

    describe('Portfolio Management', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Portfolio Designer',
            });
            designerId = profile.id;
        });

        it('should add item to portfolio', async () => {
            const item = await service.addToPortfolio(designerId, {
                designId: 'design_1',
                title: 'Summer Collection',
                description: 'A vibrant summer dress',
                category: 'dresses',
                imageUrl: 'https://example.com/img1.jpg',
                featured: true,
                tags: ['summer', 'dress', 'colorful'],
            });

            expect(item.id).toMatch(/^portfolio_/);
            expect(item.title).toBe('Summer Collection');
            expect(item.order).toBe(0);
            expect(item.stats.views).toBe(0);
            expect(item.stats.likes).toBe(0);
        });

        it('should update portfolio item', async () => {
            const item = await service.addToPortfolio(designerId, {
                designId: 'design_1',
                title: 'Original Title',
                description: 'Description',
                category: 'tops',
                imageUrl: 'https://example.com/img.jpg',
                featured: false,
                tags: [],
            });

            const updated = await service.updatePortfolioItem(designerId, item.id, {
                title: 'Updated Title',
                featured: true,
            });

            expect(updated.title).toBe('Updated Title');
            expect(updated.featured).toBe(true);
        });

        it('should throw error updating non-existent portfolio item', async () => {
            await expect(
                service.updatePortfolioItem(designerId, 'fake_id', { title: 'Test' })
            ).rejects.toThrow('Portfolio item not found');
        });

        it('should remove item from portfolio', async () => {
            const item = await service.addToPortfolio(designerId, {
                designId: 'd1',
                title: 'To Remove',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/img.jpg',
                featured: false,
                tags: [],
            });

            await service.removeFromPortfolio(designerId, item.id);
            const portfolio = await service.getPortfolio(designerId);
            expect(portfolio).toHaveLength(0);
        });

        it('should reorder portfolio items', async () => {
            const item1 = await service.addToPortfolio(designerId, {
                designId: 'd1',
                title: 'Item 1',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/img1.jpg',
                featured: false,
                tags: [],
            });
            const item2 = await service.addToPortfolio(designerId, {
                designId: 'd2',
                title: 'Item 2',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/img2.jpg',
                featured: false,
                tags: [],
            });
            const item3 = await service.addToPortfolio(designerId, {
                designId: 'd3',
                title: 'Item 3',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/img3.jpg',
                featured: false,
                tags: [],
            });

            // Verify initial order
            expect(item1.order).toBe(0);
            expect(item2.order).toBe(1);
            expect(item3.order).toBe(2);

            // Reorder: item3 first, then item1, then item2
            const reordered = await service.reorderPortfolio(designerId, [
                item3.id,
                item1.id,
                item2.id,
            ]);

            // reorderPortfolio returns items in the new order with updated order values
            expect(reordered).toHaveLength(3);
            // After reordering, the returned array is in the order of itemIds input
            // and each item's order property reflects its position
            expect(reordered[0].id).toBe(item3.id);
            expect(reordered[1].id).toBe(item1.id);
            expect(reordered[2].id).toBe(item2.id);
        });

        it('should get portfolio filtered by category', async () => {
            await service.addToPortfolio(designerId, {
                designId: 'd1',
                title: 'Dress',
                description: 'Desc',
                category: 'dresses',
                imageUrl: 'https://example.com/dress.jpg',
                featured: false,
                tags: [],
            });
            await service.addToPortfolio(designerId, {
                designId: 'd2',
                title: 'Top',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/top.jpg',
                featured: false,
                tags: [],
            });

            const dresses = await service.getPortfolio(designerId, { category: 'dresses' });
            expect(dresses).toHaveLength(1);
            expect(dresses[0].category).toBe('dresses');
        });

        it('should get featured portfolio items', async () => {
            await service.addToPortfolio(designerId, {
                designId: 'd1',
                title: 'Featured',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/featured.jpg',
                featured: true,
                tags: [],
            });
            await service.addToPortfolio(designerId, {
                designId: 'd2',
                title: 'Not Featured',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/notfeatured.jpg',
                featured: false,
                tags: [],
            });

            const featured = await service.getPortfolio(designerId, { featured: true });
            expect(featured).toHaveLength(1);
            expect(featured[0].featured).toBe(true);
        });
    });

    // ========================================================================
    // FOLLOWERS & FOLLOWING
    // ========================================================================

    describe('Followers & Following', () => {
        let designer1Id: string;
        let designer2Id: string;
        let designer3Id: string;

        beforeEach(async () => {
            const p1 = await service.createProfile('user_1', { displayName: 'Designer 1' });
            const p2 = await service.createProfile('user_2', { displayName: 'Designer 2' });
            const p3 = await service.createProfile('user_3', { displayName: 'Designer 3' });
            designer1Id = p1.id;
            designer2Id = p2.id;
            designer3Id = p3.id;
        });

        it('should follow a designer', async () => {
            await service.follow(designer1Id, designer2Id);

            const isFollowing = await service.isFollowing(designer1Id, designer2Id);
            expect(isFollowing).toBe(true);

            const follower = await service.getProfile(designer1Id);
            const followed = await service.getProfile(designer2Id);

            expect(follower?.followingCount).toBe(1);
            expect(followed?.followerCount).toBe(1);
        });

        it('should not allow self-follow', async () => {
            await expect(
                service.follow(designer1Id, designer1Id)
            ).rejects.toThrow('Cannot follow yourself');
        });

        it('should not allow duplicate follow', async () => {
            await service.follow(designer1Id, designer2Id);
            await expect(
                service.follow(designer1Id, designer2Id)
            ).rejects.toThrow('Already following this designer');
        });

        it('should unfollow a designer', async () => {
            await service.follow(designer1Id, designer2Id);
            await service.unfollow(designer1Id, designer2Id);

            const isFollowing = await service.isFollowing(designer1Id, designer2Id);
            expect(isFollowing).toBe(false);

            const follower = await service.getProfile(designer1Id);
            const followed = await service.getProfile(designer2Id);

            expect(follower?.followingCount).toBe(0);
            expect(followed?.followerCount).toBe(0);
        });

        it('should throw error unfollowing when not following', async () => {
            await expect(
                service.unfollow(designer1Id, designer2Id)
            ).rejects.toThrow('Not following this designer');
        });

        it('should get followers list', async () => {
            await service.follow(designer2Id, designer1Id);
            await service.follow(designer3Id, designer1Id);

            const { followers, total } = await service.getFollowers(designer1Id);
            expect(total).toBe(2);
            expect(followers).toHaveLength(2);
        });

        it('should paginate followers', async () => {
            await service.follow(designer2Id, designer1Id);
            await service.follow(designer3Id, designer1Id);

            const { followers } = await service.getFollowers(designer1Id, { limit: 1 });
            expect(followers).toHaveLength(1);
        });

        it('should get following list', async () => {
            await service.follow(designer1Id, designer2Id);
            await service.follow(designer1Id, designer3Id);

            const { following, total } = await service.getFollowing(designer1Id);
            expect(total).toBe(2);
            expect(following).toHaveLength(2);
        });
    });

    // ========================================================================
    // BADGES & ACHIEVEMENTS
    // ========================================================================

    describe('Badges & Achievements', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Badge Designer',
            });
            designerId = profile.id;
        });

        it('should award a badge', async () => {
            const badge = await service.awardBadge(designerId, {
                name: 'First Sale',
                description: 'Completed your first sale',
                icon: '🎉',
                category: 'sales',
            });

            expect(badge.id).toMatch(/^badge_/);
            expect(badge.name).toBe('First Sale');
            expect(badge.earnedAt).toBeInstanceOf(Date);
        });

        it('should not award duplicate badge', async () => {
            await service.awardBadge(designerId, {
                name: 'First Sale',
                description: 'Completed your first sale',
                icon: '🎉',
                category: 'sales',
            });

            await expect(
                service.awardBadge(designerId, {
                    name: 'First Sale',
                    description: 'Different description',
                    icon: '🎉',
                    category: 'sales',
                })
            ).rejects.toThrow('Designer already has this badge');
        });

        it('should get all badges', async () => {
            await service.awardBadge(designerId, {
                name: 'First Sale',
                description: 'Desc',
                icon: '🎉',
                category: 'sales',
            });
            await service.awardBadge(designerId, {
                name: 'Top Rated',
                description: 'Desc',
                icon: '⭐',
                category: 'quality',
            });

            const badges = await service.getBadges(designerId);
            expect(badges).toHaveLength(2);
        });

        it('should auto-award sales badges based on threshold', async () => {
            // Update profile to have sales
            await service.updateProfile(designerId, { totalSales: 10 });

            const newBadges = await service.checkAndAwardBadges(designerId);

            expect(newBadges.some((b) => b.name === 'First Sale')).toBe(true);
            expect(newBadges.some((b) => b.name === '10 Sales')).toBe(true);
        });

        it('should auto-award rating badge', async () => {
            // Set up high rating with enough reviews
            for (let i = 0; i < 10; i++) {
                await service.addReview(designerId, {
                    reviewerId: `r${i}`,
                    reviewerName: `User ${i}`,
                    rating: 5,
                    title: 'Great',
                    content: 'Content',
                });
            }

            const newBadges = await service.checkAndAwardBadges(designerId);
            expect(newBadges.some((b) => b.name === 'Highly Rated')).toBe(true);
        });

        it('should auto-award follower badges', async () => {
            await service.updateProfile(designerId, { followerCount: 100 });

            const newBadges = await service.checkAndAwardBadges(designerId);
            expect(newBadges.some((b) => b.name === 'Rising Star')).toBe(true);
        });
    });

    // ========================================================================
    // NOTIFICATIONS
    // ========================================================================

    describe('Notifications', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Notified Designer',
            });
            designerId = profile.id;
        });

        it('should add a notification', async () => {
            const notification = await service.addNotification(designerId, {
                type: 'sale',
                title: 'New Sale!',
                message: 'You sold a design for $50',
                metadata: { orderId: 'order_1' },
            });

            expect(notification.id).toMatch(/^notif_/);
            expect(notification.type).toBe('sale');
            expect(notification.read).toBe(false);
        });

        it('should get all notifications', async () => {
            await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale 1',
                message: 'Message 1',
            });
            await service.addNotification(designerId, {
                type: 'review',
                title: 'Review',
                message: 'Message 2',
            });

            const notifications = await service.getNotifications(designerId);
            expect(notifications).toHaveLength(2);
        });

        it('should get unread notifications only', async () => {
            const n1 = await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale',
                message: 'Message',
            });
            await service.addNotification(designerId, {
                type: 'review',
                title: 'Review',
                message: 'Message',
            });

            await service.markNotificationRead(designerId, n1.id);

            const unread = await service.getNotifications(designerId, { unreadOnly: true });
            expect(unread).toHaveLength(1);
        });

        it('should filter notifications by type', async () => {
            await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale',
                message: 'Message',
            });
            await service.addNotification(designerId, {
                type: 'review',
                title: 'Review',
                message: 'Message',
            });

            const sales = await service.getNotifications(designerId, { type: 'sale' });
            expect(sales).toHaveLength(1);
            expect(sales[0].type).toBe('sale');
        });

        it('should limit notifications', async () => {
            for (let i = 0; i < 5; i++) {
                await service.addNotification(designerId, {
                    type: 'sale',
                    title: `Sale ${i}`,
                    message: 'Message',
                });
            }

            const limited = await service.getNotifications(designerId, { limit: 3 });
            expect(limited).toHaveLength(3);
        });

        it('should mark notification as read', async () => {
            const notification = await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale',
                message: 'Message',
            });

            await service.markNotificationRead(designerId, notification.id);

            const notifications = await service.getNotifications(designerId);
            expect(notifications[0].read).toBe(true);
        });

        it('should mark all notifications as read', async () => {
            await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale 1',
                message: 'Message',
            });
            await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale 2',
                message: 'Message',
            });

            await service.markAllNotificationsRead(designerId);

            const unreadCount = await service.getUnreadCount(designerId);
            expect(unreadCount).toBe(0);
        });

        it('should get unread count', async () => {
            await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale 1',
                message: 'Message',
            });
            await service.addNotification(designerId, {
                type: 'sale',
                title: 'Sale 2',
                message: 'Message',
            });

            const count = await service.getUnreadCount(designerId);
            expect(count).toBe(2);
        });
    });

    // ========================================================================
    // COLLABORATIONS
    // ========================================================================

    describe('Collaborations', () => {
        let designer1Id: string;
        let designer2Id: string;

        beforeEach(async () => {
            const p1 = await service.createProfile('user_1', { displayName: 'Designer 1' });
            const p2 = await service.createProfile('user_2', { displayName: 'Designer 2' });
            designer1Id = p1.id;
            designer2Id = p2.id;
        });

        it('should send collaboration invite', async () => {
            const invite = await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Summer Collection 2024',
                description: 'Let\'s collaborate on a summer collection',
                revenueShare: 50,
            });

            expect(invite.id).toMatch(/^collab_/);
            expect(invite.fromDesignerId).toBe(designer1Id);
            expect(invite.toDesignerId).toBe(designer2Id);
            expect(invite.status).toBe('pending');
            expect(invite.revenueShare).toBe(50);
            expect(invite.expiresAt).toBeInstanceOf(Date);
        });

        it('should not allow self-invitation', async () => {
            await expect(
                service.sendCollaborationInvite(designer1Id, designer1Id, {
                    projectName: 'Test',
                    description: 'Test',
                    revenueShare: 50,
                })
            ).rejects.toThrow('Cannot invite yourself');
        });

        it('should validate revenue share range', async () => {
            await expect(
                service.sendCollaborationInvite(designer1Id, designer2Id, {
                    projectName: 'Test',
                    description: 'Test',
                    revenueShare: 150,
                })
            ).rejects.toThrow('Revenue share must be between 0 and 100');
        });

        it('should accept collaboration invite', async () => {
            const invite = await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Project',
                description: 'Description',
                revenueShare: 50,
            });

            const responded = await service.respondToCollaborationInvite(
                designer2Id,
                invite.id,
                true
            );

            expect(responded.status).toBe('accepted');
        });

        it('should decline collaboration invite', async () => {
            const invite = await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Project',
                description: 'Description',
                revenueShare: 50,
            });

            const responded = await service.respondToCollaborationInvite(
                designer2Id,
                invite.id,
                false
            );

            expect(responded.status).toBe('declined');
        });

        it('should throw error for non-existent invite', async () => {
            await expect(
                service.respondToCollaborationInvite(designer2Id, 'fake_invite', true)
            ).rejects.toThrow('Collaboration invite not found');
        });

        it('should throw error responding to already responded invite', async () => {
            const invite = await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Project',
                description: 'Description',
                revenueShare: 50,
            });

            await service.respondToCollaborationInvite(designer2Id, invite.id, true);

            await expect(
                service.respondToCollaborationInvite(designer2Id, invite.id, false)
            ).rejects.toThrow('Invite has already been responded to');
        });

        it('should get received collaboration invites', async () => {
            await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Project 1',
                description: 'Description',
                revenueShare: 50,
            });

            const invites = await service.getCollaborationInvites(designer2Id, {
                direction: 'received',
            });

            expect(invites).toHaveLength(1);
        });

        it('should get sent collaboration invites', async () => {
            await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Project 1',
                description: 'Description',
                revenueShare: 50,
            });

            const invites = await service.getCollaborationInvites(designer1Id, {
                direction: 'sent',
            });

            expect(invites).toHaveLength(1);
        });

        it('should filter invites by status', async () => {
            const invite = await service.sendCollaborationInvite(designer1Id, designer2Id, {
                projectName: 'Project 1',
                description: 'Description',
                revenueShare: 50,
            });

            await service.respondToCollaborationInvite(designer2Id, invite.id, true);

            const pending = await service.getCollaborationInvites(designer2Id, {
                status: 'pending',
            });
            const accepted = await service.getCollaborationInvites(designer2Id, {
                status: 'accepted',
            });

            expect(pending).toHaveLength(0);
            expect(accepted).toHaveLength(1);
        });
    });

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    describe('Analytics', () => {
        let designerId: string;

        beforeEach(async () => {
            const profile = await service.createProfile('user_1', {
                displayName: 'Analytics Designer',
            });
            designerId = profile.id;
        });

        it('should get analytics for day period', async () => {
            const analytics = await service.getAnalytics(designerId, 'day');

            expect(analytics.period).toBe('day');
            expect(analytics.startDate).toBeInstanceOf(Date);
            expect(analytics.endDate).toBeInstanceOf(Date);
            expect(analytics.revenue).toBe(0);
            expect(analytics.sales).toBe(0);
        });

        it('should get analytics for week period', async () => {
            const analytics = await service.getAnalytics(designerId, 'week');
            expect(analytics.period).toBe('week');
        });

        it('should get analytics for month period', async () => {
            const analytics = await service.getAnalytics(designerId, 'month');
            expect(analytics.period).toBe('month');
        });

        it('should get analytics for year period', async () => {
            const analytics = await service.getAnalytics(designerId, 'year');
            expect(analytics.period).toBe('year');
        });

        it('should get analytics for all-time', async () => {
            const analytics = await service.getAnalytics(designerId, 'all');
            expect(analytics.period).toBe('all');
        });

        it('should include top designs in analytics', async () => {
            await service.addToPortfolio(designerId, {
                designId: 'd1',
                title: 'Design 1',
                description: 'Desc',
                category: 'tops',
                imageUrl: 'https://example.com/design1.jpg',
                featured: false,
                tags: [],
            });

            const analytics = await service.getAnalytics(designerId, 'all');
            expect(Array.isArray(analytics.topDesigns)).toBe(true);
        });

        it('should include earnings by category', async () => {
            await service.addEarning(designerId, 100, 'sale', { category: 'designs' });

            const analytics = await service.getAnalytics(designerId, 'all');
            expect(analytics.revenueByCategory).toBeDefined();
        });
    });

    // ========================================================================
    // SEARCH & DISCOVERY
    // ========================================================================

    describe('Search & Discovery', () => {
        beforeEach(async () => {
            await service.createProfile('user_1', {
                displayName: 'Fashion Designer',
                bio: 'Specializing in sustainable fashion',
                specialties: ['sustainable', 'casual'],
            });
            await service.createProfile('user_2', {
                displayName: 'Luxury Designer',
                bio: 'High-end fashion design',
                specialties: ['luxury', 'formal'],
            });
            const p3 = await service.createProfile('user_3', {
                displayName: 'Streetwear Artist',
                bio: 'Urban streetwear designs',
                specialties: ['streetwear', 'casual'],
            });

            // Set some profiles as verified with high ratings
            await service.updateProfile(p3.id, { verified: true, rating: 4.8, totalSales: 100 });
        });

        it('should search designers by name', async () => {
            // 'Fashion' appears in 'Fashion Designer' name
            const { designers, total } = await service.searchDesigners('Fashion Designer');

            expect(total).toBe(1);
            expect(designers[0].displayName).toBe('Fashion Designer');
        });

        it('should search designers by bio', async () => {
            const { designers } = await service.searchDesigners('sustainable');

            expect(designers).toHaveLength(1);
            expect(designers[0].displayName).toBe('Fashion Designer');
        });

        it('should search designers by specialty', async () => {
            const { designers } = await service.searchDesigners('casual');

            expect(designers).toHaveLength(2);
        });

        it('should filter by specialties', async () => {
            const { designers } = await service.searchDesigners('', {
                specialties: ['luxury'],
            });

            expect(designers).toHaveLength(1);
            expect(designers[0].displayName).toBe('Luxury Designer');
        });

        it('should filter by minimum rating', async () => {
            const { designers } = await service.searchDesigners('', {
                minRating: 4.5,
            });

            expect(designers).toHaveLength(1);
        });

        it('should filter by verified status', async () => {
            const { designers } = await service.searchDesigners('', {
                verified: true,
            });

            expect(designers).toHaveLength(1);
        });

        it('should sort by rating', async () => {
            const { designers } = await service.searchDesigners('', {
                sortBy: 'rating',
            });

            expect(designers[0].rating).toBeGreaterThanOrEqual(designers[1].rating);
        });

        it('should sort by sales', async () => {
            const { designers } = await service.searchDesigners('', {
                sortBy: 'sales',
            });

            expect(designers[0].totalSales).toBeGreaterThanOrEqual(designers[1].totalSales);
        });

        it('should paginate search results', async () => {
            const { designers } = await service.searchDesigners('', {
                limit: 2,
            });

            expect(designers).toHaveLength(2);
        });

        it('should get featured designers', async () => {
            const featured = await service.getFeaturedDesigners(5);

            expect(featured).toHaveLength(1);
            expect(featured[0].verified).toBe(true);
            expect(featured[0].rating).toBeGreaterThanOrEqual(4.5);
        });

        it('should get recommended designers', async () => {
            const p1 = (await service.searchDesigners('Fashion')).designers[0];
            const p3 = (await service.searchDesigners('Streetwear')).designers[0];

            // Designer 1 follows Designer 3
            await service.follow(p1.id, p3.id);

            // Get recommendations for Designer 1 (should not include Designer 3 as already following)
            const recommendations = await service.getRecommendedDesigners(p1.id, 10);

            // Should recommend Designer 2 or others with shared specialties
            expect(recommendations.every((r) => r.id !== p3.id)).toBe(true);
        });
    });
});
