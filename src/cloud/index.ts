/**
 * Cloud Platform Module
 *
 * Provides cloud services for NanoFashion Studio including:
 * - User authentication and profile management
 * - Design storage and synchronization
 * - Team collaboration and RBAC
 * - Real-time collaboration
 * - Asset library management
 *
 * @module cloud
 */

// ============================================================================
// Types
// ============================================================================

export type {
    // User & Auth
    UserProfile,
    AuthSession,
    AuthProvider,
    SignUpRequest,
    SignInRequest,
    OAuthOptions,

    // Subscription
    SubscriptionTier,
    SubscriptionPlan,
    CreditTransaction,

    // Design
    CloudDesign,
    DesignVersion,
    DesignComment,
    DesignLike,
    DesignMetadata,
    DesignVisibility,
    DesignStatus,
    DesignFilters,

    // Team
    Organization,
    Team,
    TeamMember,
    TeamInvitation,
    TeamActivity,
    TeamRole,

    // Real-time
    UserPresence,
    RealtimeOperation,
    DesignReview,
    ReviewFeedback,

    // Assets
    Asset,
    AssetType,
    AssetVisibility,
    AssetMetadata,
    AssetCollection,
    BrandLibrary,
    AssetFilters,

    // Common
    PaginatedResponse,
} from './types';

// ============================================================================
// Services
// ============================================================================

// Supabase client
export {
    getSupabaseClient,
    uploadFile,
    deleteFile,
} from './supabase';

// Authentication
export { auth, authService } from './auth';
export type { AuthState, AuthError, AuthEventType, AuthEventListener } from './auth';

// User Profile
export { userProfile, userProfileService } from './user-profile';
export type { UserSettings, UserStats } from './user-profile';

// Design Storage
export { designStorage, designStorageService } from './design-storage';
export type {
    CreateDesignRequest,
    UpdateDesignRequest,
    DesignSyncStatus,
} from './design-storage';

// Real-time Collaboration
export { realtime, realtimeCollaborationService } from './realtime';
export type {
    CollaborationSession,
    CursorPosition,
    Selection,
    CollaborationEvent,
    CollaborationEventHandler,
} from './realtime';

// Team Management
export { teams, teamService } from './teams';
export type {
    CreateTeamRequest,
    UpdateTeamRequest,
    InviteMemberRequest,
    TeamPermissions,
} from './teams';

// Asset Library
export { assets, assetLibraryService } from './assets';
export type {
    CreateAssetRequest,
    UpdateAssetRequest,
    CreateCollectionRequest,
    CreateBrandLibraryRequest,
} from './assets';

// ============================================================================
// React Hooks
// ============================================================================

export {
    useAuth,
    useDesigns,
    useDesign,
    useTeam,
    useMyTeams,
    useRealtime,
    useAssets,
    useUserProfile,
    useCredits,
} from './hooks';

export type {
    UseAuthReturn,
    UseDesignsReturn,
    UseDesignReturn,
    UseTeamReturn,
    UseMyTeamsReturn,
    UseRealtimeReturn,
    UseAssetsReturn,
    UseUserProfileReturn,
    UseCreditsReturn,
} from './hooks';

// ============================================================================
// Default Export
// ============================================================================

/**
 * Cloud platform unified API
 */
const cloud = {
    // Authentication
    auth: () => import('./auth').then(m => m.auth),

    // User Profile
    profile: () => import('./user-profile').then(m => m.userProfile),

    // Designs
    designs: () => import('./design-storage').then(m => m.designStorage),

    // Teams
    teams: () => import('./teams').then(m => m.teams),

    // Real-time
    realtime: () => import('./realtime').then(m => m.realtime),

    // Assets
    assets: () => import('./assets').then(m => m.assets),

    // Initialize all services
    async initialize(): Promise<void> {
        const { auth } = await import('./auth');
        await auth.initialize();
        console.log('[Cloud] Platform initialized');
    },
};

export default cloud;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const { auth } = await import('./auth');
    return auth.isAuthenticated();
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<import('./types').UserProfile | null> {
    const { auth } = await import('./auth');
    return auth.getUser();
}

/**
 * Quick check for feature access
 */
export type FeatureKey = 'aiCreditsMonthly' | 'storageGb' | 'teamMembers' | 'designVersions' | 'prioritySupport' | 'customBranding' | 'apiAccess' | 'ssoEnabled';

export async function hasFeature(
    feature: FeatureKey
): Promise<boolean> {
    const { userProfile } = await import('./user-profile');
    return userProfile.hasFeature(feature);
}

/**
 * Check remaining credits
 */
export async function getRemainingCredits(): Promise<number> {
    const { userProfile } = await import('./user-profile');
    return userProfile.getCredits();
}
