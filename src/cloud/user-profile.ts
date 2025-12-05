/**
 * User Profile Service
 *
 * Manages user profiles, settings, subscriptions, and credits.
 */

import { getSupabaseClient } from './supabase';
import { auth } from './auth';
import type {
    UserProfile,
    SubscriptionTier,
    SubscriptionPlan,
    CreditTransaction,
    PaginatedResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    language: string;
    emailNotifications: {
        marketing: boolean;
        productUpdates: boolean;
        teamActivity: boolean;
        comments: boolean;
        likes: boolean;
    };
    privacy: {
        profileVisible: boolean;
        showDesignCount: boolean;
        showFollowers: boolean;
    };
    defaultDesignVisibility: 'private' | 'team' | 'public';
    autoSaveDrafts: boolean;
    highQualityPreviews: boolean;
}

export interface UserStats {
    designCount: number;
    totalLikes: number;
    totalViews: number;
    followersCount: number;
    followingCount: number;
    creditsUsed: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: UserSettings = {
    theme: 'system',
    language: 'en',
    emailNotifications: {
        marketing: false,
        productUpdates: true,
        teamActivity: true,
        comments: true,
        likes: true,
    },
    privacy: {
        profileVisible: true,
        showDesignCount: true,
        showFollowers: true,
    },
    defaultDesignVisibility: 'private',
    autoSaveDrafts: true,
    highQualityPreviews: true,
};

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        tier: 'free',
        name: 'Free',
        price: 0,
        yearlyPrice: 0,
        features: {
            aiCreditsMonthly: 50,
            storageGb: 1,
            teamMembers: 1,
            designVersions: 5,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            ssoEnabled: false,
        },
    },
    {
        tier: 'pro',
        name: 'Pro',
        price: 2900, // $29/month
        yearlyPrice: 29000, // $290/year (2 months free)
        features: {
            aiCreditsMonthly: 500,
            storageGb: 50,
            teamMembers: 5,
            designVersions: 50,
            prioritySupport: true,
            customBranding: false,
            apiAccess: true,
            ssoEnabled: false,
        },
    },
    {
        tier: 'enterprise',
        name: 'Enterprise',
        price: 9900, // $99/month
        yearlyPrice: 99000, // $990/year
        features: {
            aiCreditsMonthly: 5000,
            storageGb: 500,
            teamMembers: -1, // Unlimited
            designVersions: -1, // Unlimited
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            ssoEnabled: true,
        },
    },
];

// ============================================================================
// User Profile Service Class
// ============================================================================

class UserProfileService {
    private settingsCache: Map<string, UserSettings> = new Map();
    private statsCache: Map<string, { stats: UserStats; timestamp: number }> = new Map();
    private readonly STATS_CACHE_TTL = 60000; // 1 minute

    /**
     * Get user profile by ID
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !data) {
                return null;
            }

            return this.mapUserRow(data);
        } catch {
            return null;
        }
    }

    /**
     * Get current user's profile
     */
    async getCurrentProfile(): Promise<UserProfile | null> {
        const user = auth.getUser();
        if (!user) return null;
        return this.getProfile(user.id);
    }

    /**
     * Update user profile
     */
    async updateProfile(
        updates: Partial<UserProfile>
    ): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            const { error } = await client
                .from('users')
                .update({
                    display_name: updates.displayName,
                    avatar_url: updates.avatarUrl,
                    bio: updates.bio,
                    website: updates.website,
                    social_links: updates.socialLinks,
                    interests: updates.interests,
                    skill_level: updates.skillLevel,
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Update failed',
            };
        }
    }

    /**
     * Get user settings
     */
    async getSettings(userId?: string): Promise<UserSettings> {
        const user = auth.getUser();
        const targetId = userId || user?.id;

        if (!targetId) {
            return { ...DEFAULT_SETTINGS };
        }

        // Check cache
        const cached = this.settingsCache.get(targetId);
        if (cached) {
            return cached;
        }

        // For now, return default settings
        // In production, this would fetch from a user_settings table
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Update user settings
     */
    async updateSettings(
        settings: Partial<UserSettings>
    ): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Merge with existing settings
        const currentSettings = await this.getSettings(user.id);
        const newSettings = { ...currentSettings, ...settings };

        // Update cache
        this.settingsCache.set(user.id, newSettings);

        // In production, this would persist to user_settings table
        return { success: true, error: null };
    }

    /**
     * Get user statistics
     */
    async getStats(userId?: string): Promise<UserStats> {
        const user = auth.getUser();
        const targetId = userId || user?.id;

        if (!targetId) {
            return this.emptyStats();
        }

        // Check cache
        const cached = this.statsCache.get(targetId);
        if (cached && Date.now() - cached.timestamp < this.STATS_CACHE_TTL) {
            return cached.stats;
        }

        const client = getSupabaseClient();

        try {
            // Get design count and aggregates
            const { data: designs } = await client
                .from('designs')
                .select('likes_count, views_count')
                .eq('user_id', targetId);

            const designList = designs as Array<{ likes_count?: number; views_count?: number }> || [];

            const stats: UserStats = {
                designCount: designList.length,
                totalLikes: designList.reduce((sum, d) => sum + (d.likes_count || 0), 0),
                totalViews: designList.reduce((sum, d) => sum + (d.views_count || 0), 0),
                followersCount: 0, // Would come from followers table
                followingCount: 0, // Would come from following table
                creditsUsed: 0, // Would come from credit_transactions table
            };

            // Update cache
            this.statsCache.set(targetId, { stats, timestamp: Date.now() });

            return stats;
        } catch {
            return this.emptyStats();
        }
    }

    /**
     * Get subscription plans
     */
    getSubscriptionPlans(): SubscriptionPlan[] {
        return SUBSCRIPTION_PLANS;
    }

    /**
     * Get plan by tier
     */
    getPlan(tier: SubscriptionTier): SubscriptionPlan {
        return SUBSCRIPTION_PLANS.find(p => p.tier === tier) || SUBSCRIPTION_PLANS[0];
    }

    /**
     * Check if user has feature access
     */
    async hasFeatureAccess(feature: keyof SubscriptionPlan['features']): Promise<boolean> {
        const user = auth.getUser();
        if (!user) return false;

        const plan = this.getPlan(user.subscriptionTier);
        const value = plan.features[feature];

        // For numeric features, -1 means unlimited
        if (typeof value === 'number') {
            return value !== 0;
        }

        return value;
    }

    /**
     * Get remaining credits
     */
    async getRemainingCredits(): Promise<number> {
        const user = auth.getUser();
        return user?.creditsRemaining || 0;
    }

    /**
     * Use credits
     */
    async useCredits(
        amount: number,
        description: string,
        resourceId?: string
    ): Promise<{ success: boolean; remaining: number; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, remaining: 0, error: 'Not authenticated' };
        }

        if (user.creditsRemaining < amount) {
            return {
                success: false,
                remaining: user.creditsRemaining,
                error: 'Insufficient credits',
            };
        }

        const client = getSupabaseClient();

        try {
            const newBalance = user.creditsRemaining - amount;

            await client
                .from('users')
                .update({ credits_remaining: newBalance })
                .eq('id', user.id);

            // In production, also insert into credit_transactions table
            return { success: true, remaining: newBalance, error: null };
        } catch (error) {
            return {
                success: false,
                remaining: user.creditsRemaining,
                error: error instanceof Error ? error.message : 'Failed to use credits',
            };
        }
    }

    /**
     * Get credit transaction history
     */
    async getCreditHistory(
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<CreditTransaction>> {
        // In production, this would query credit_transactions table
        return {
            data: [],
            total: 0,
            page,
            pageSize,
            hasMore: false,
        };
    }

    /**
     * Complete onboarding
     */
    async completeOnboarding(): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            await client
                .from('users')
                .update({ onboarding_completed: true })
                .eq('id', user.id);

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to complete onboarding',
            };
        }
    }

    /**
     * Search users
     */
    async searchUsers(
        query: string,
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<UserProfile>> {
        const client = getSupabaseClient();
        const offset = (page - 1) * pageSize;

        try {
            // In production, this would use full-text search with proper query builder
            // For the mock client, we use a simple select
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('display_name', query);

            if (error) {
                return { data: [], total: 0, page, pageSize, hasMore: false };
            }

            const users = (data as any[] || []).map(this.mapUserRow);
            const count = users.length;

            return {
                data: users.slice(offset, offset + pageSize),
                total: count,
                page,
                pageSize,
                hasMore: count > offset + pageSize,
            };
        } catch {
            return { data: [], total: 0, page, pageSize, hasMore: false };
        }
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    private mapUserRow(row: any): UserProfile {
        return {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            bio: row.bio,
            website: row.website,
            socialLinks: row.social_links || {},
            subscriptionTier: row.subscription_tier,
            creditsRemaining: row.credits_remaining,
            creditsMonthly: row.credits_monthly,
            isVerified: row.is_verified,
            skillLevel: row.skill_level || 'beginner',
            interests: row.interests || [],
            onboardingCompleted: row.onboarding_completed,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }

    private emptyStats(): UserStats {
        return {
            designCount: 0,
            totalLikes: 0,
            totalViews: 0,
            followersCount: 0,
            followingCount: 0,
            creditsUsed: 0,
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userProfileService = new UserProfileService();

// ============================================================================
// Convenience Functions
// ============================================================================

export const userProfile = {
    get: (userId: string) => userProfileService.getProfile(userId),
    getCurrent: () => userProfileService.getCurrentProfile(),
    update: (updates: Partial<UserProfile>) => userProfileService.updateProfile(updates),
    getSettings: (userId?: string) => userProfileService.getSettings(userId),
    updateSettings: (settings: Partial<UserSettings>) => userProfileService.updateSettings(settings),
    getStats: (userId?: string) => userProfileService.getStats(userId),
    getPlans: () => userProfileService.getSubscriptionPlans(),
    getPlan: (tier: SubscriptionTier) => userProfileService.getPlan(tier),
    hasFeature: (feature: keyof SubscriptionPlan['features']) =>
        userProfileService.hasFeatureAccess(feature),
    getCredits: () => userProfileService.getRemainingCredits(),
    useCredits: (amount: number, description: string, resourceId?: string) =>
        userProfileService.useCredits(amount, description, resourceId),
    getCreditHistory: (page?: number, pageSize?: number) =>
        userProfileService.getCreditHistory(page, pageSize),
    completeOnboarding: () => userProfileService.completeOnboarding(),
    search: (query: string, page?: number, pageSize?: number) =>
        userProfileService.searchUsers(query, page, pageSize),
};

export default userProfile;
