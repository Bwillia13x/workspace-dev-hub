/**
 * Designer Profile Service - Phase 5 E-commerce
 *
 * Comprehensive designer profile management including:
 * - Portfolio and showcase
 * - Earnings and payouts
 * - Reputation and reviews
 * - Verification and trust
 * - Analytics and insights
 */

import type {
    DesignerProfile,
    DesignerEarnings,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface DesignerStats {
    totalDesigns: number;
    publishedDesigns: number;
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
    reviewCount: number;
    followerCount: number;
    followingCount: number;
    profileViews: number;
    designViews: number;
    conversionRate: number;
}

export interface DesignerAnalytics {
    period: 'day' | 'week' | 'month' | 'year' | 'all';
    startDate: Date;
    endDate: Date;
    revenue: number;
    sales: number;
    views: number;
    followers: number;
    topDesigns: Array<{
        designId: string;
        name: string;
        sales: number;
        revenue: number;
    }>;
    revenueByCategory: Record<string, number>;
    salesByRegion: Record<string, number>;
    trafficSources: Record<string, number>;
}

export interface DesignerBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
    category: 'sales' | 'quality' | 'community' | 'special';
}

export interface DesignerReview {
    id: string;
    designerId: string;
    reviewerId: string;
    reviewerName: string;
    reviewerAvatar?: string;
    rating: number;
    title: string;
    content: string;
    orderId?: string;
    designId?: string;
    photos?: string[];
    helpful: number;
    reported: boolean;
    response?: {
        content: string;
        respondedAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface PortfolioItem {
    id: string;
    designId: string;
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    tags: string[];
    featured: boolean;
    order: number;
    stats: {
        views: number;
        likes: number;
        saves: number;
    };
    createdAt: Date;
}

export interface DesignerPayout {
    id: string;
    designerId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    method: 'bank_transfer' | 'paypal' | 'stripe' | 'wire';
    fees: number;
    netAmount: number;
    reference: string;
    scheduledAt?: Date;
    processedAt?: Date;
    failureReason?: string;
    createdAt: Date;
}

export interface DesignerNotification {
    id: string;
    designerId: string;
    type: 'sale' | 'review' | 'follower' | 'payout' | 'message' | 'system';
    title: string;
    message: string;
    read: boolean;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface FollowRelation {
    followerId: string;
    followingId: string;
    createdAt: Date;
}

export interface CollaborationInvite {
    id: string;
    fromDesignerId: string;
    toDesignerId: string;
    projectName: string;
    description: string;
    revenueShare: number;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expiresAt: Date;
    createdAt: Date;
}

// ============================================================================
// DESIGNER PROFILE SERVICE
// ============================================================================

export class DesignerProfileService {
    private profiles: Map<string, DesignerProfile> = new Map();
    private earnings: Map<string, DesignerEarnings> = new Map();
    private reviews: Map<string, DesignerReview[]> = new Map();
    private portfolios: Map<string, PortfolioItem[]> = new Map();
    private payouts: Map<string, DesignerPayout[]> = new Map();
    private notifications: Map<string, DesignerNotification[]> = new Map();
    private follows: FollowRelation[] = [];
    private badges: Map<string, DesignerBadge[]> = new Map();
    private collaborations: Map<string, CollaborationInvite[]> = new Map();

    // ========================================================================
    // PROFILE MANAGEMENT
    // ========================================================================

    async createProfile(
        userId: string,
        data: {
            displayName: string;
            bio?: string;
            avatar?: string;
            website?: string;
            socialLinks?: Record<string, string>;
            specialties?: string[];
            location?: string;
        }
    ): Promise<DesignerProfile> {
        if (this.profiles.has(userId)) {
            throw new Error('Designer profile already exists');
        }

        const profile: DesignerProfile = {
            id: userId,
            userId,
            displayName: data.displayName,
            bio: data.bio || '',
            avatar: data.avatar,
            website: data.website,
            socialLinks: data.socialLinks || {},
            specialties: data.specialties || [],
            location: data.location,
            verified: false,
            verificationLevel: 'none',
            totalSales: 0,
            totalRevenue: 0,
            rating: 0,
            reviewCount: 0,
            followerCount: 0,
            followingCount: 0,
            joinedAt: new Date(),
            lastActiveAt: new Date(),
        };

        this.profiles.set(userId, profile);
        this.initializeEarnings(userId);
        this.reviews.set(userId, []);
        this.portfolios.set(userId, []);
        this.payouts.set(userId, []);
        this.notifications.set(userId, []);
        this.badges.set(userId, []);
        this.collaborations.set(userId, []);

        return profile;
    }

    async getProfile(designerId: string): Promise<DesignerProfile | null> {
        return this.profiles.get(designerId) || null;
    }

    async updateProfile(
        designerId: string,
        updates: Partial<Omit<DesignerProfile, 'id' | 'userId' | 'joinedAt'>>
    ): Promise<DesignerProfile> {
        const profile = this.profiles.get(designerId);
        if (!profile) {
            throw new Error('Designer profile not found');
        }

        const updated: DesignerProfile = {
            ...profile,
            ...updates,
            lastActiveAt: new Date(),
        };

        this.profiles.set(designerId, updated);
        return updated;
    }

    async getStats(designerId: string): Promise<DesignerStats> {
        const profile = this.profiles.get(designerId);
        const portfolio = this.portfolios.get(designerId) || [];

        return {
            totalDesigns: portfolio.length,
            publishedDesigns: portfolio.filter((p) => p.featured).length,
            totalSales: profile?.totalSales || 0,
            totalRevenue: profile?.totalRevenue || 0,
            averageRating: profile?.rating || 0,
            reviewCount: profile?.reviewCount || 0,
            followerCount: profile?.followerCount || 0,
            followingCount: profile?.followingCount || 0,
            profileViews: 0, // Would track separately
            designViews: portfolio.reduce((sum, p) => sum + p.stats.views, 0),
            conversionRate:
                portfolio.length > 0
                    ? profile?.totalSales || 0 / portfolio.length
                    : 0,
        };
    }

    // ========================================================================
    // EARNINGS & PAYOUTS
    // ========================================================================

    private initializeEarnings(designerId: string): void {
        const earnings: DesignerEarnings = {
            designerId,
            totalEarnings: 0,
            pendingEarnings: 0,
            availableBalance: 0,
            lifetimeEarnings: 0,
            lastPayoutAt: undefined,
            payoutSchedule: 'monthly',
            minimumPayout: 50,
            currency: 'USD',
            earningsByMonth: [],
            earningsByCategory: {},
        };
        this.earnings.set(designerId, earnings);
    }

    async getEarnings(designerId: string): Promise<DesignerEarnings | null> {
        return this.earnings.get(designerId) || null;
    }

    async addEarning(
        designerId: string,
        amount: number,
        source: 'sale' | 'license' | 'royalty' | 'tip' | 'collaboration',
        metadata?: {
            orderId?: string;
            licenseId?: string;
            category?: string;
        }
    ): Promise<DesignerEarnings> {
        const earnings = this.earnings.get(designerId);
        if (!earnings) {
            throw new Error('Designer earnings not found');
        }

        earnings.totalEarnings += amount;
        earnings.pendingEarnings += amount;
        earnings.lifetimeEarnings += amount;

        // Track by category
        if (metadata?.category) {
            earnings.earningsByCategory[metadata.category] =
                (earnings.earningsByCategory[metadata.category] || 0) + amount;
        }

        // Track by month
        const monthKey = new Date().toISOString().slice(0, 7);
        const monthEntry = earnings.earningsByMonth.find(
            (m) => m.month === monthKey
        );
        if (monthEntry) {
            monthEntry.amount += amount;
        } else {
            earnings.earningsByMonth.push({ month: monthKey, amount });
        }

        this.earnings.set(designerId, earnings);

        // Send notification
        await this.addNotification(designerId, {
            type: 'sale',
            title: 'New Earning',
            message: `You earned $${amount.toFixed(2)} from a ${source}!`,
            metadata: { amount, source, ...metadata },
        });

        // Update profile stats
        const profile = this.profiles.get(designerId);
        if (profile && source === 'sale') {
            profile.totalSales++;
            profile.totalRevenue += amount;
            this.profiles.set(designerId, profile);
        }

        return earnings;
    }

    async processEarningsToPending(designerId: string): Promise<void> {
        const earnings = this.earnings.get(designerId);
        if (!earnings) return;

        // Move pending to available after clearing period (e.g., 14 days)
        earnings.availableBalance += earnings.pendingEarnings;
        earnings.pendingEarnings = 0;

        this.earnings.set(designerId, earnings);
    }

    async requestPayout(
        designerId: string,
        amount: number,
        method: DesignerPayout['method']
    ): Promise<DesignerPayout> {
        const earnings = this.earnings.get(designerId);
        if (!earnings) {
            throw new Error('Designer earnings not found');
        }

        if (amount > earnings.availableBalance) {
            throw new Error('Insufficient available balance');
        }

        if (amount < earnings.minimumPayout) {
            throw new Error(
                `Minimum payout amount is $${earnings.minimumPayout}`
            );
        }

        const fees = this.calculatePayoutFees(amount, method);

        const payout: DesignerPayout = {
            id: `payout_${Date.now()}`,
            designerId,
            amount,
            currency: earnings.currency,
            status: 'pending',
            method,
            fees,
            netAmount: amount - fees,
            reference: `REF-${Date.now().toString(36).toUpperCase()}`,
            scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            createdAt: new Date(),
        };

        earnings.availableBalance -= amount;
        this.earnings.set(designerId, earnings);

        const payouts = this.payouts.get(designerId) || [];
        payouts.push(payout);
        this.payouts.set(designerId, payouts);

        await this.addNotification(designerId, {
            type: 'payout',
            title: 'Payout Requested',
            message: `Your payout of $${payout.netAmount.toFixed(2)} is being processed.`,
            metadata: { payoutId: payout.id },
        });

        return payout;
    }

    private calculatePayoutFees(
        amount: number,
        method: DesignerPayout['method']
    ): number {
        switch (method) {
            case 'bank_transfer':
                return Math.min(amount * 0.01, 5);
            case 'paypal':
                return amount * 0.02 + 0.3;
            case 'stripe':
                return amount * 0.0025;
            case 'wire':
                return 25;
            default:
                return 0;
        }
    }

    async getPayoutHistory(
        designerId: string,
        options?: {
            status?: DesignerPayout['status'];
            limit?: number;
        }
    ): Promise<DesignerPayout[]> {
        let payouts = this.payouts.get(designerId) || [];

        if (options?.status) {
            payouts = payouts.filter((p) => p.status === options.status);
        }

        payouts.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        if (options?.limit) {
            payouts = payouts.slice(0, options.limit);
        }

        return payouts;
    }

    // ========================================================================
    // REVIEWS & RATINGS
    // ========================================================================

    async addReview(
        designerId: string,
        data: {
            reviewerId: string;
            reviewerName: string;
            reviewerAvatar?: string;
            rating: number;
            title: string;
            content: string;
            orderId?: string;
            designId?: string;
            photos?: string[];
        }
    ): Promise<DesignerReview> {
        const reviews = this.reviews.get(designerId) || [];

        // Check if reviewer already reviewed this designer
        const existingReview = reviews.find(
            (r) => r.reviewerId === data.reviewerId
        );
        if (existingReview) {
            throw new Error('You have already reviewed this designer');
        }

        const review: DesignerReview = {
            id: `review_${Date.now()}`,
            designerId,
            ...data,
            helpful: 0,
            reported: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        reviews.push(review);
        this.reviews.set(designerId, reviews);

        // Update designer rating
        await this.updateDesignerRating(designerId);

        await this.addNotification(designerId, {
            type: 'review',
            title: 'New Review',
            message: `${data.reviewerName} left you a ${data.rating}-star review!`,
            metadata: { reviewId: review.id, rating: data.rating },
        });

        return review;
    }

    async respondToReview(
        designerId: string,
        reviewId: string,
        response: string
    ): Promise<DesignerReview> {
        const reviews = this.reviews.get(designerId) || [];
        const review = reviews.find((r) => r.id === reviewId);

        if (!review) {
            throw new Error('Review not found');
        }

        review.response = {
            content: response,
            respondedAt: new Date(),
        };
        review.updatedAt = new Date();

        this.reviews.set(designerId, reviews);
        return review;
    }

    async getReviews(
        designerId: string,
        options?: {
            rating?: number;
            sortBy?: 'recent' | 'helpful' | 'rating';
            limit?: number;
            offset?: number;
        }
    ): Promise<{ reviews: DesignerReview[]; total: number }> {
        let reviews = this.reviews.get(designerId) || [];

        if (options?.rating) {
            reviews = reviews.filter((r) => r.rating === options.rating);
        }

        const total = reviews.length;

        // Sort
        switch (options?.sortBy) {
            case 'helpful':
                reviews.sort((a, b) => b.helpful - a.helpful);
                break;
            case 'rating':
                reviews.sort((a, b) => b.rating - a.rating);
                break;
            case 'recent':
            default:
                reviews.sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
                );
        }

        // Paginate
        if (options?.offset) {
            reviews = reviews.slice(options.offset);
        }
        if (options?.limit) {
            reviews = reviews.slice(0, options.limit);
        }

        return { reviews, total };
    }

    private async updateDesignerRating(designerId: string): Promise<void> {
        const reviews = this.reviews.get(designerId) || [];
        const profile = this.profiles.get(designerId);

        if (!profile || reviews.length === 0) return;

        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        profile.rating = Math.round((totalRating / reviews.length) * 10) / 10;
        profile.reviewCount = reviews.length;

        this.profiles.set(designerId, profile);
    }

    // ========================================================================
    // PORTFOLIO MANAGEMENT
    // ========================================================================

    async addToPortfolio(
        designerId: string,
        item: Omit<PortfolioItem, 'id' | 'stats' | 'createdAt' | 'order'>
    ): Promise<PortfolioItem> {
        const portfolio = this.portfolios.get(designerId) || [];

        const portfolioItem: PortfolioItem = {
            ...item,
            id: `portfolio_${Date.now()}`,
            order: portfolio.length,
            stats: { views: 0, likes: 0, saves: 0 },
            createdAt: new Date(),
        };

        portfolio.push(portfolioItem);
        this.portfolios.set(designerId, portfolio);

        return portfolioItem;
    }

    async updatePortfolioItem(
        designerId: string,
        itemId: string,
        updates: Partial<
            Omit<PortfolioItem, 'id' | 'designId' | 'stats' | 'createdAt'>
        >
    ): Promise<PortfolioItem> {
        const portfolio = this.portfolios.get(designerId) || [];
        const itemIndex = portfolio.findIndex((p) => p.id === itemId);

        if (itemIndex === -1) {
            throw new Error('Portfolio item not found');
        }

        portfolio[itemIndex] = { ...portfolio[itemIndex], ...updates };
        this.portfolios.set(designerId, portfolio);

        return portfolio[itemIndex];
    }

    async removeFromPortfolio(
        designerId: string,
        itemId: string
    ): Promise<void> {
        const portfolio = this.portfolios.get(designerId) || [];
        const filtered = portfolio.filter((p) => p.id !== itemId);
        this.portfolios.set(designerId, filtered);
    }

    async reorderPortfolio(
        designerId: string,
        itemIds: string[]
    ): Promise<PortfolioItem[]> {
        const portfolio = this.portfolios.get(designerId) || [];

        const reordered = itemIds
            .map((id, index) => {
                const item = portfolio.find((p) => p.id === id);
                if (item) {
                    item.order = index;
                    return item;
                }
                return null;
            })
            .filter((item): item is PortfolioItem => item !== null);

        this.portfolios.set(designerId, reordered);
        return reordered;
    }

    async getPortfolio(
        designerId: string,
        options?: {
            category?: string;
            featured?: boolean;
        }
    ): Promise<PortfolioItem[]> {
        let portfolio = this.portfolios.get(designerId) || [];

        if (options?.category) {
            portfolio = portfolio.filter(
                (p) => p.category === options.category
            );
        }

        if (options?.featured !== undefined) {
            portfolio = portfolio.filter(
                (p) => p.featured === options.featured
            );
        }

        return portfolio.sort((a, b) => a.order - b.order);
    }

    // ========================================================================
    // FOLLOWERS & FOLLOWING
    // ========================================================================

    async follow(followerId: string, designerId: string): Promise<void> {
        if (followerId === designerId) {
            throw new Error('Cannot follow yourself');
        }

        const existing = this.follows.find(
            (f) => f.followerId === followerId && f.followingId === designerId
        );

        if (existing) {
            throw new Error('Already following this designer');
        }

        this.follows.push({
            followerId,
            followingId: designerId,
            createdAt: new Date(),
        });

        // Update follower counts
        const followerProfile = this.profiles.get(followerId);
        const designerProfile = this.profiles.get(designerId);

        if (followerProfile) {
            followerProfile.followingCount++;
            this.profiles.set(followerId, followerProfile);
        }

        if (designerProfile) {
            designerProfile.followerCount++;
            this.profiles.set(designerId, designerProfile);
        }

        await this.addNotification(designerId, {
            type: 'follower',
            title: 'New Follower',
            message: `${followerProfile?.displayName || 'Someone'} started following you!`,
            metadata: { followerId },
        });
    }

    async unfollow(followerId: string, designerId: string): Promise<void> {
        const index = this.follows.findIndex(
            (f) => f.followerId === followerId && f.followingId === designerId
        );

        if (index === -1) {
            throw new Error('Not following this designer');
        }

        this.follows.splice(index, 1);

        // Update follower counts
        const followerProfile = this.profiles.get(followerId);
        const designerProfile = this.profiles.get(designerId);

        if (followerProfile) {
            followerProfile.followingCount = Math.max(
                0,
                followerProfile.followingCount - 1
            );
            this.profiles.set(followerId, followerProfile);
        }

        if (designerProfile) {
            designerProfile.followerCount = Math.max(
                0,
                designerProfile.followerCount - 1
            );
            this.profiles.set(designerId, designerProfile);
        }
    }

    async getFollowers(
        designerId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<{ followers: DesignerProfile[]; total: number }> {
        const relations = this.follows.filter(
            (f) => f.followingId === designerId
        );
        const total = relations.length;

        let followers = relations
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((r) => this.profiles.get(r.followerId))
            .filter((p): p is DesignerProfile => p !== undefined);

        if (options?.offset) {
            followers = followers.slice(options.offset);
        }
        if (options?.limit) {
            followers = followers.slice(0, options.limit);
        }

        return { followers, total };
    }

    async getFollowing(
        designerId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<{ following: DesignerProfile[]; total: number }> {
        const relations = this.follows.filter(
            (f) => f.followerId === designerId
        );
        const total = relations.length;

        let following = relations
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((r) => this.profiles.get(r.followingId))
            .filter((p): p is DesignerProfile => p !== undefined);

        if (options?.offset) {
            following = following.slice(options.offset);
        }
        if (options?.limit) {
            following = following.slice(0, options.limit);
        }

        return { following, total };
    }

    async isFollowing(followerId: string, designerId: string): Promise<boolean> {
        return this.follows.some(
            (f) => f.followerId === followerId && f.followingId === designerId
        );
    }

    // ========================================================================
    // BADGES & ACHIEVEMENTS
    // ========================================================================

    async awardBadge(
        designerId: string,
        badge: Omit<DesignerBadge, 'id' | 'earnedAt'>
    ): Promise<DesignerBadge> {
        const badges = this.badges.get(designerId) || [];

        // Check if already has this badge
        if (badges.some((b) => b.name === badge.name)) {
            throw new Error('Designer already has this badge');
        }

        const newBadge: DesignerBadge = {
            ...badge,
            id: `badge_${Date.now()}`,
            earnedAt: new Date(),
        };

        badges.push(newBadge);
        this.badges.set(designerId, badges);

        await this.addNotification(designerId, {
            type: 'system',
            title: 'Badge Earned!',
            message: `Congratulations! You earned the "${badge.name}" badge.`,
            metadata: { badgeId: newBadge.id },
        });

        return newBadge;
    }

    async getBadges(designerId: string): Promise<DesignerBadge[]> {
        return this.badges.get(designerId) || [];
    }

    async checkAndAwardBadges(designerId: string): Promise<DesignerBadge[]> {
        const profile = this.profiles.get(designerId);
        const currentBadges = this.badges.get(designerId) || [];
        const newBadges: DesignerBadge[] = [];

        if (!profile) return newBadges;

        // Sales badges
        const salesBadges = [
            { threshold: 1, name: 'First Sale', icon: '🎉' },
            { threshold: 10, name: '10 Sales', icon: '⭐' },
            { threshold: 50, name: '50 Sales', icon: '🌟' },
            { threshold: 100, name: '100 Club', icon: '💯' },
            { threshold: 500, name: 'Top Seller', icon: '🏆' },
        ];

        for (const badge of salesBadges) {
            if (
                profile.totalSales >= badge.threshold &&
                !currentBadges.some((b) => b.name === badge.name)
            ) {
                const awarded = await this.awardBadge(designerId, {
                    name: badge.name,
                    description: `Achieved ${badge.threshold} sales`,
                    icon: badge.icon,
                    category: 'sales',
                });
                newBadges.push(awarded);
            }
        }

        // Rating badges
        if (
            profile.rating >= 4.8 &&
            profile.reviewCount >= 10 &&
            !currentBadges.some((b) => b.name === 'Highly Rated')
        ) {
            const awarded = await this.awardBadge(designerId, {
                name: 'Highly Rated',
                description: 'Maintained 4.8+ rating with 10+ reviews',
                icon: '⭐',
                category: 'quality',
            });
            newBadges.push(awarded);
        }

        // Follower badges
        const followerBadges = [
            { threshold: 100, name: 'Rising Star', icon: '🌱' },
            { threshold: 1000, name: 'Influencer', icon: '📢' },
            { threshold: 10000, name: 'Fashion Icon', icon: '👑' },
        ];

        for (const badge of followerBadges) {
            if (
                profile.followerCount >= badge.threshold &&
                !currentBadges.some((b) => b.name === badge.name)
            ) {
                const awarded = await this.awardBadge(designerId, {
                    name: badge.name,
                    description: `Reached ${badge.threshold} followers`,
                    icon: badge.icon,
                    category: 'community',
                });
                newBadges.push(awarded);
            }
        }

        return newBadges;
    }

    // ========================================================================
    // NOTIFICATIONS
    // ========================================================================

    async addNotification(
        designerId: string,
        notification: Omit<DesignerNotification, 'id' | 'designerId' | 'read' | 'createdAt'>
    ): Promise<DesignerNotification> {
        const notifications = this.notifications.get(designerId) || [];

        const newNotification: DesignerNotification = {
            ...notification,
            id: `notif_${Date.now()}`,
            designerId,
            read: false,
            createdAt: new Date(),
        };

        notifications.unshift(newNotification);

        // Keep only last 100 notifications
        if (notifications.length > 100) {
            notifications.splice(100);
        }

        this.notifications.set(designerId, notifications);
        return newNotification;
    }

    async getNotifications(
        designerId: string,
        options?: {
            unreadOnly?: boolean;
            type?: DesignerNotification['type'];
            limit?: number;
        }
    ): Promise<DesignerNotification[]> {
        let notifications = this.notifications.get(designerId) || [];

        if (options?.unreadOnly) {
            notifications = notifications.filter((n) => !n.read);
        }

        if (options?.type) {
            notifications = notifications.filter(
                (n) => n.type === options.type
            );
        }

        if (options?.limit) {
            notifications = notifications.slice(0, options.limit);
        }

        return notifications;
    }

    async markNotificationRead(
        designerId: string,
        notificationId: string
    ): Promise<void> {
        const notifications = this.notifications.get(designerId) || [];
        const notification = notifications.find((n) => n.id === notificationId);

        if (notification) {
            notification.read = true;
            this.notifications.set(designerId, notifications);
        }
    }

    async markAllNotificationsRead(designerId: string): Promise<void> {
        const notifications = this.notifications.get(designerId) || [];
        notifications.forEach((n) => (n.read = true));
        this.notifications.set(designerId, notifications);
    }

    async getUnreadCount(designerId: string): Promise<number> {
        const notifications = this.notifications.get(designerId) || [];
        return notifications.filter((n) => !n.read).length;
    }

    // ========================================================================
    // COLLABORATIONS
    // ========================================================================

    async sendCollaborationInvite(
        fromDesignerId: string,
        toDesignerId: string,
        details: {
            projectName: string;
            description: string;
            revenueShare: number;
        }
    ): Promise<CollaborationInvite> {
        if (fromDesignerId === toDesignerId) {
            throw new Error('Cannot invite yourself');
        }

        if (details.revenueShare < 0 || details.revenueShare > 100) {
            throw new Error('Revenue share must be between 0 and 100');
        }

        const invite: CollaborationInvite = {
            id: `collab_${Date.now()}`,
            fromDesignerId,
            toDesignerId,
            projectName: details.projectName,
            description: details.description,
            revenueShare: details.revenueShare,
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdAt: new Date(),
        };

        const collabs = this.collaborations.get(toDesignerId) || [];
        collabs.push(invite);
        this.collaborations.set(toDesignerId, collabs);

        const fromProfile = this.profiles.get(fromDesignerId);
        await this.addNotification(toDesignerId, {
            type: 'message',
            title: 'Collaboration Invite',
            message: `${fromProfile?.displayName || 'A designer'} invited you to collaborate on "${details.projectName}"`,
            actionUrl: `/collaborations/${invite.id}`,
            metadata: { inviteId: invite.id },
        });

        return invite;
    }

    async respondToCollaborationInvite(
        designerId: string,
        inviteId: string,
        accept: boolean
    ): Promise<CollaborationInvite> {
        const collabs = this.collaborations.get(designerId) || [];
        const invite = collabs.find((c) => c.id === inviteId);

        if (!invite) {
            throw new Error('Collaboration invite not found');
        }

        if (invite.status !== 'pending') {
            throw new Error('Invite has already been responded to');
        }

        if (new Date() > invite.expiresAt) {
            invite.status = 'expired';
            this.collaborations.set(designerId, collabs);
            throw new Error('Invite has expired');
        }

        invite.status = accept ? 'accepted' : 'declined';
        this.collaborations.set(designerId, collabs);

        await this.addNotification(invite.fromDesignerId, {
            type: 'message',
            title: 'Collaboration Response',
            message: `Your collaboration invite for "${invite.projectName}" was ${accept ? 'accepted' : 'declined'}`,
            metadata: { inviteId: invite.id, accepted: accept },
        });

        return invite;
    }

    async getCollaborationInvites(
        designerId: string,
        options?: {
            status?: CollaborationInvite['status'];
            direction?: 'received' | 'sent';
        }
    ): Promise<CollaborationInvite[]> {
        let invites: CollaborationInvite[] = [];

        if (!options?.direction || options.direction === 'received') {
            invites = [...(this.collaborations.get(designerId) || [])];
        }

        if (!options?.direction || options.direction === 'sent') {
            // Find invites sent by this designer
            for (const [, collabs] of this.collaborations.entries()) {
                invites.push(
                    ...collabs.filter(
                        (c) => c.fromDesignerId === designerId
                    )
                );
            }
        }

        if (options?.status) {
            invites = invites.filter((i) => i.status === options.status);
        }

        return invites.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
    }

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    async getAnalytics(
        designerId: string,
        period: DesignerAnalytics['period']
    ): Promise<DesignerAnalytics> {
        const earnings = this.earnings.get(designerId);
        const portfolio = this.portfolios.get(designerId) || [];

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'day':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                startDate = new Date(0);
        }

        // Calculate top designs (simplified)
        const topDesigns = portfolio
            .sort((a, b) => b.stats.views - a.stats.views)
            .slice(0, 5)
            .map((p) => ({
                designId: p.designId,
                name: p.title,
                sales: 0, // Would track separately
                revenue: 0,
            }));

        return {
            period,
            startDate,
            endDate: now,
            revenue: earnings?.totalEarnings || 0,
            sales: this.profiles.get(designerId)?.totalSales || 0,
            views: portfolio.reduce((sum, p) => sum + p.stats.views, 0),
            followers: this.profiles.get(designerId)?.followerCount || 0,
            topDesigns,
            revenueByCategory: earnings?.earningsByCategory || {},
            salesByRegion: {},
            trafficSources: {},
        };
    }

    // ========================================================================
    // SEARCH & DISCOVERY
    // ========================================================================

    async searchDesigners(
        query: string,
        options?: {
            specialties?: string[];
            minRating?: number;
            verified?: boolean;
            sortBy?: 'rating' | 'sales' | 'followers' | 'recent';
            limit?: number;
            offset?: number;
        }
    ): Promise<{ designers: DesignerProfile[]; total: number }> {
        let designers = Array.from(this.profiles.values());

        // Text search
        if (query) {
            const lowerQuery = query.toLowerCase();
            designers = designers.filter(
                (d) =>
                    d.displayName.toLowerCase().includes(lowerQuery) ||
                    d.bio?.toLowerCase().includes(lowerQuery) ||
                    d.specialties?.some((s) =>
                        s.toLowerCase().includes(lowerQuery)
                    )
            );
        }

        // Filters
        if (options?.specialties?.length) {
            designers = designers.filter((d) =>
                d.specialties?.some((s) => options.specialties?.includes(s))
            );
        }

        if (options?.minRating) {
            designers = designers.filter(
                (d) => d.rating >= options.minRating!
            );
        }

        if (options?.verified !== undefined) {
            designers = designers.filter(
                (d) => d.verified === options.verified
            );
        }

        const total = designers.length;

        // Sort
        switch (options?.sortBy) {
            case 'rating':
                designers.sort((a, b) => b.rating - a.rating);
                break;
            case 'sales':
                designers.sort((a, b) => b.totalSales - a.totalSales);
                break;
            case 'followers':
                designers.sort((a, b) => b.followerCount - a.followerCount);
                break;
            case 'recent':
            default:
                designers.sort(
                    (a, b) =>
                        b.lastActiveAt.getTime() - a.lastActiveAt.getTime()
                );
        }

        // Paginate
        if (options?.offset) {
            designers = designers.slice(options.offset);
        }
        if (options?.limit) {
            designers = designers.slice(0, options.limit);
        }

        return { designers, total };
    }

    async getFeaturedDesigners(limit: number = 10): Promise<DesignerProfile[]> {
        return Array.from(this.profiles.values())
            .filter((d) => d.verified && d.rating >= 4.5)
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, limit);
    }

    async getRecommendedDesigners(
        forDesignerId: string,
        limit: number = 10
    ): Promise<DesignerProfile[]> {
        const profile = this.profiles.get(forDesignerId);
        if (!profile) return [];

        // Get designers with similar specialties that aren't already followed
        const following = new Set(
            this.follows
                .filter((f) => f.followerId === forDesignerId)
                .map((f) => f.followingId)
        );

        return Array.from(this.profiles.values())
            .filter(
                (d) =>
                    d.id !== forDesignerId &&
                    !following.has(d.id) &&
                    d.specialties?.some((s) =>
                        profile.specialties?.includes(s)
                    )
            )
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let designerProfileServiceInstance: DesignerProfileService | null = null;

export function getDesignerProfileService(): DesignerProfileService {
    if (!designerProfileServiceInstance) {
        designerProfileServiceInstance = new DesignerProfileService();
    }
    return designerProfileServiceInstance;
}

export function resetDesignerProfileService(): void {
    designerProfileServiceInstance = null;
}
