/**
 * Cloud Platform Types
 *
 * Type definitions for the cloud platform including database schemas,
 * authentication, real-time collaboration, and team management.
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

/**
 * Subscription tier levels
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/**
 * Authentication provider types
 */
export type AuthProvider = 'email' | 'google' | 'github' | 'apple';

/**
 * User role within a team/organization
 */
export type TeamRole = 'owner' | 'admin' | 'designer' | 'viewer';

/**
 * User profile data
 */
export interface UserProfile {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    website: string | null;
    socialLinks: {
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        behance?: string;
        dribbble?: string;
    };
    subscriptionTier: SubscriptionTier;
    creditsRemaining: number;
    creditsMonthly: number;
    isVerified: boolean;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    interests: string[];
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Authentication session
 */
export interface AuthSession {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    provider: AuthProvider;
}

/**
 * Sign up request data
 */
export interface SignUpRequest {
    email: string;
    password: string;
    displayName?: string;
}

/**
 * Sign in request data
 */
export interface SignInRequest {
    email: string;
    password: string;
}

/**
 * OAuth sign in options
 */
export interface OAuthOptions {
    provider: 'google' | 'github' | 'apple';
    redirectTo?: string;
    scopes?: string[];
}

// ============================================================================
// Design & Storage Types
// ============================================================================

/**
 * Design visibility options
 */
export type DesignVisibility = 'private' | 'team' | 'public';

/**
 * Design status in workflow
 */
export type DesignStatus = 'draft' | 'in_review' | 'approved' | 'published';

/**
 * Cloud-stored design
 */
export interface CloudDesign {
    id: string;
    userId: string;
    teamId: string | null;
    name: string;
    description: string | null;
    prompt: string | null;
    conceptImageUrl: string | null;
    cadImageUrl: string | null;
    thumbnailUrl: string | null;
    materials: string | null;
    tags: string[];
    visibility: DesignVisibility;
    status: DesignStatus;
    likesCount: number;
    viewsCount: number;
    version: number;
    parentVersionId: string | null;
    metadata: DesignMetadata;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Design metadata
 */
export interface DesignMetadata {
    width?: number;
    height?: number;
    fileSize?: number;
    colorPalette?: string[];
    styleReferences?: string[];
    aiModel?: string;
    generationTime?: number;
    editHistory?: EditHistoryEntry[];
}

/**
 * Edit history entry
 */
export interface EditHistoryEntry {
    timestamp: Date;
    action: 'create' | 'edit' | 'generate' | 'regenerate' | 'apply_style';
    description: string;
    userId: string;
}

/**
 * Design version for history
 */
export interface DesignVersion {
    id: string;
    designId: string;
    version: number;
    conceptImageUrl: string | null;
    cadImageUrl: string | null;
    prompt: string | null;
    materials: string | null;
    createdBy: string;
    createdAt: Date;
    changeDescription: string | null;
}

/**
 * Design comment/annotation
 */
export interface DesignComment {
    id: string;
    designId: string;
    userId: string;
    userDisplayName: string;
    userAvatarUrl: string | null;
    content: string;
    position: { x: number; y: number } | null; // For pinned comments
    parentId: string | null; // For threaded replies
    isResolved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Design like
 */
export interface DesignLike {
    id: string;
    designId: string;
    userId: string;
    createdAt: Date;
}

// ============================================================================
// Team & Organization Types
// ============================================================================

/**
 * Organization (parent of teams)
 */
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
    website: string | null;
    subscriptionTier: SubscriptionTier;
    memberCount: number;
    storageUsed: number; // bytes
    storageLimit: number; // bytes
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Team within an organization
 */
export interface Team {
    id: string;
    organizationId: string | null;
    name: string;
    slug: string;
    description: string | null;
    avatarUrl: string | null;
    isPersonal: boolean;
    memberCount: number;
    designCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Team member
 */
export interface TeamMember {
    id: string;
    teamId: string;
    userId: string;
    role: TeamRole;
    user: Pick<UserProfile, 'id' | 'email' | 'displayName' | 'avatarUrl'>;
    joinedAt: Date;
    invitedBy: string | null;
}

/**
 * Team invitation
 */
export interface TeamInvitation {
    id: string;
    teamId: string;
    email: string;
    role: TeamRole;
    token: string;
    invitedBy: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
}

/**
 * Team activity log entry
 */
export interface TeamActivity {
    id: string;
    teamId: string;
    userId: string;
    userDisplayName: string;
    action: string;
    resourceType: 'design' | 'team' | 'member' | 'asset' | 'comment' | 'invitation';
    resourceId: string;
    resourceName: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

// ============================================================================
// Asset Library Types
// ============================================================================

/**
 * Asset type categories
 */
export type AssetType =
    | 'fabric'
    | 'trim'
    | 'pattern'
    | 'color'
    | 'logo'
    | 'template'
    | 'reference'
    | 'texture';

/**
 * Asset visibility
 */
export type AssetVisibility = 'private' | 'team' | 'organization' | 'public';

/**
 * Asset in the library
 */
export interface Asset {
    id: string;
    teamId: string | null;
    organizationId: string | null;
    userId: string;
    name: string;
    description: string | null;
    type: AssetType;
    visibility: AssetVisibility;
    fileUrl: string;
    thumbnailUrl: string | null;
    fileSize: number;
    mimeType: string;
    metadata: AssetMetadata;
    tags: string[];
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Asset metadata
 */
export interface AssetMetadata {
    width?: number;
    height?: number;
    colorPalette?: string[];
    fabricType?: string;
    weight?: string;
    composition?: string;
    pantoneCode?: string;
    supplierInfo?: string;
}

/**
 * Asset collection/folder
 */
export interface AssetCollection {
    id: string;
    teamId: string | null;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    assetCount: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Brand library
 */
export interface BrandLibrary {
    id: string;
    teamId: string;
    name: string;
    description: string | null;
    primaryColors: string[];
    secondaryColors: string[];
    logos: string[]; // Asset IDs
    fonts: string[];
    patterns: string[]; // Asset IDs
    guidelines: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Real-time Collaboration Types
// ============================================================================

/**
 * User presence in a design
 */
export interface UserPresence {
    odId: string;
    displayName: string;
    avatarUrl: string | null;
    color: string; // Cursor color
    cursor: { x: number; y: number } | null;
    selection: { startX: number; startY: number; endX: number; endY: number } | null;
    lastSeen: Date;
    isActive: boolean;
}

/**
 * Real-time operation for conflict resolution
 */
export interface RealtimeOperation {
    id: string;
    designId: string;
    userId: string;
    type: 'insert' | 'update' | 'delete' | 'move' | 'style';
    path: string; // JSON path to the changed property
    value: unknown;
    previousValue: unknown;
    timestamp: Date;
    version: number;
}

/**
 * Design review request
 */
export interface DesignReview {
    id: string;
    designId: string;
    requestedBy: string;
    assignedTo: string[];
    status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
    dueDate: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
}

/**
 * Review feedback
 */
export interface ReviewFeedback {
    id: string;
    reviewId: string;
    userId: string;
    decision: 'approve' | 'reject' | 'request_changes';
    feedback: string | null;
    createdAt: Date;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification type
 */
export type NotificationType =
    | 'team_invite'
    | 'design_shared'
    | 'design_comment'
    | 'design_like'
    | 'review_requested'
    | 'review_completed'
    | 'mention'
    | 'system';

/**
 * User notification
 */
export interface UserNotification {
    id: string;
    odId: string;
    type: NotificationType;
    title: string;
    message: string;
    resourceType: string | null;
    resourceId: string | null;
    actionUrl: string | null;
    isRead: boolean;
    createdAt: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/**
 * API error response
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

// ============================================================================
// Query & Filter Types
// ============================================================================

/**
 * Design search/filter options
 */
export interface DesignFilters {
    search?: string;
    tags?: string[];
    userId?: string;
    teamId?: string;
    visibility?: DesignVisibility;
    status?: DesignStatus;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: 'created' | 'updated' | 'likes' | 'views' | 'name';
    sortOrder?: 'asc' | 'desc';
}

/**
 * Asset search/filter options
 */
export interface AssetFilters {
    search?: string;
    type?: AssetType;
    tags?: string[];
    teamId?: string;
    visibility?: AssetVisibility;
    sortBy?: 'created' | 'updated' | 'usage' | 'name';
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Subscription & Billing Types
// ============================================================================

/**
 * Subscription plan details
 */
export interface SubscriptionPlan {
    tier: SubscriptionTier;
    name: string;
    price: number; // Monthly in cents
    yearlyPrice: number; // Yearly in cents
    features: {
        aiCreditsMonthly: number;
        storageGb: number;
        teamMembers: number;
        designVersions: number;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
        ssoEnabled: boolean;
    };
}

/**
 * Credit transaction
 */
export interface CreditTransaction {
    id: string;
    odId: string;
    amount: number; // Positive for additions, negative for usage
    type: 'monthly_grant' | 'purchase' | 'usage' | 'refund' | 'bonus';
    description: string;
    resourceId: string | null;
    createdAt: Date;
}

// ============================================================================
// Database Row Types (for Supabase)
// ============================================================================

/**
 * Database row types matching Supabase schema
 */
export namespace Database {
    export interface Tables {
        users: {
            Row: {
                id: string;
                email: string;
                display_name: string | null;
                avatar_url: string | null;
                bio: string | null;
                website: string | null;
                social_links: Record<string, string> | null;
                subscription_tier: SubscriptionTier;
                credits_remaining: number;
                credits_monthly: number;
                is_verified: boolean;
                skill_level: string;
                interests: string[] | null;
                onboarding_completed: boolean;
                created_at: string;
                updated_at: string;
            };
            Insert: Omit<Tables['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
            Update: Partial<Tables['users']['Insert']>;
        };
        designs: {
            Row: {
                id: string;
                user_id: string;
                team_id: string | null;
                name: string;
                description: string | null;
                prompt: string | null;
                concept_image_url: string | null;
                cad_image_url: string | null;
                thumbnail_url: string | null;
                materials: string | null;
                tags: string[] | null;
                visibility: DesignVisibility;
                status: DesignStatus;
                likes_count: number;
                views_count: number;
                version: number;
                parent_version_id: string | null;
                metadata: Record<string, unknown> | null;
                created_at: string;
                updated_at: string;
            };
            Insert: Omit<
                Tables['designs']['Row'],
                'id' | 'likes_count' | 'views_count' | 'version' | 'created_at' | 'updated_at'
            >;
            Update: Partial<Tables['designs']['Insert']>;
        };
        teams: {
            Row: {
                id: string;
                organization_id: string | null;
                name: string;
                slug: string;
                description: string | null;
                avatar_url: string | null;
                is_personal: boolean;
                member_count: number;
                design_count: number;
                created_at: string;
                updated_at: string;
            };
            Insert: Omit<
                Tables['teams']['Row'],
                'id' | 'member_count' | 'design_count' | 'created_at' | 'updated_at'
            >;
            Update: Partial<Tables['teams']['Insert']>;
        };
        team_members: {
            Row: {
                id: string;
                team_id: string;
                user_id: string;
                role: TeamRole;
                joined_at: string;
                invited_by: string | null;
            };
            Insert: Omit<Tables['team_members']['Row'], 'id' | 'joined_at'>;
            Update: Partial<Tables['team_members']['Insert']>;
        };
        assets: {
            Row: {
                id: string;
                team_id: string | null;
                organization_id: string | null;
                user_id: string;
                name: string;
                description: string | null;
                type: AssetType;
                visibility: AssetVisibility;
                file_url: string;
                thumbnail_url: string | null;
                file_size: number;
                mime_type: string;
                metadata: Record<string, unknown> | null;
                tags: string[] | null;
                usage_count: number;
                created_at: string;
                updated_at: string;
            };
            Insert: Omit<
                Tables['assets']['Row'],
                'id' | 'usage_count' | 'created_at' | 'updated_at'
            >;
            Update: Partial<Tables['assets']['Insert']>;
        };
    }
}
