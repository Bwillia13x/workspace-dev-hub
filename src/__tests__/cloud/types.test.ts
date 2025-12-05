/**
 * Cloud Types Tests
 *
 * Tests for all cloud platform type definitions
 */

import { describe, it, expect } from 'vitest';
import type {
    UserProfile,
    AuthSession,
    CloudDesign,
    DesignVersion,
    Team,
    TeamMember,
    Organization,
    Asset,
    AssetCollection,
    TeamInvitation,
    TeamActivity,
    SubscriptionTier,
    SubscriptionPlan,
    UserPresence,
    RealtimeOperation,
    DesignFilters,
    AssetFilters,
    PaginatedResponse,
    DesignMetadata,
    AssetMetadata,
} from '../../cloud/types';

describe('Cloud Types', () => {
    describe('UserProfile', () => {
        it('should validate user profile structure', () => {
            const user: UserProfile = {
                id: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                avatarUrl: 'https://example.com/avatar.png',
                bio: 'Fashion designer',
                website: 'https://example.com',
                socialLinks: {
                    instagram: '@testuser',
                    twitter: '@testuser',
                },
                subscriptionTier: 'pro',
                creditsRemaining: 100,
                creditsMonthly: 500,
                isVerified: true,
                skillLevel: 'advanced',
                interests: ['fashion', 'design', 'sustainability'],
                onboardingCompleted: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(user.id).toBeDefined();
            expect(user.email).toContain('@');
            expect(['free', 'pro', 'enterprise']).toContain(user.subscriptionTier);
            expect(user.creditsRemaining).toBeGreaterThanOrEqual(0);
            expect(user.creditsMonthly).toBeGreaterThanOrEqual(0);
            expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(user.skillLevel);
        });

        it('should allow optional fields to be null', () => {
            const minimalUser: UserProfile = {
                id: 'user-456',
                email: 'minimal@example.com',
                displayName: null,
                avatarUrl: null,
                bio: null,
                website: null,
                socialLinks: {},
                subscriptionTier: 'free',
                creditsRemaining: 50,
                creditsMonthly: 100,
                isVerified: false,
                skillLevel: 'beginner',
                interests: [],
                onboardingCompleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(minimalUser.avatarUrl).toBeNull();
            expect(minimalUser.bio).toBeNull();
            expect(minimalUser.displayName).toBeNull();
        });
    });

    describe('AuthSession', () => {
        it('should validate auth session structure', () => {
            const session: AuthSession = {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'refresh-token-123',
                expiresAt: new Date(Date.now() + 3600000),
                provider: 'email',
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    displayName: 'Test User',
                    avatarUrl: null,
                    bio: null,
                    website: null,
                    socialLinks: {},
                    subscriptionTier: 'free',
                    creditsRemaining: 50,
                    creditsMonthly: 100,
                    isVerified: false,
                    skillLevel: 'beginner',
                    interests: [],
                    onboardingCompleted: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };

            expect(session.accessToken).toBeDefined();
            expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
            expect(session.user).toBeDefined();
            expect(['email', 'google', 'github', 'apple']).toContain(session.provider);
        });
    });

    describe('CloudDesign', () => {
        it('should validate cloud design structure', () => {
            const design: CloudDesign = {
                id: 'design-123',
                userId: 'user-123',
                teamId: null,
                name: 'Summer Collection Dress',
                description: 'A flowing summer dress',
                prompt: 'Elegant summer dress with floral pattern',
                conceptImageUrl: 'https://example.com/concept.png',
                cadImageUrl: 'https://example.com/cad.png',
                thumbnailUrl: 'https://example.com/thumb.png',
                materials: 'Cotton, Silk',
                tags: ['summer', 'dress', 'floral'],
                visibility: 'public',
                status: 'published',
                version: 1,
                parentVersionId: null,
                likesCount: 10,
                viewsCount: 100,
                metadata: {
                    width: 1024,
                    height: 768,
                    colorPalette: ['#FF5733', '#33FF57'],
                    styleReferences: ['bohemian', 'casual'],
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(design.id).toBeDefined();
            expect(['draft', 'in_review', 'approved', 'published']).toContain(design.status);
            expect(['private', 'team', 'public']).toContain(design.visibility);
            expect(design.tags).toBeInstanceOf(Array);
            expect(design.version).toBeGreaterThanOrEqual(1);
        });

        it('should handle draft designs', () => {
            const draftDesign: CloudDesign = {
                id: 'draft-123',
                userId: 'user-123',
                teamId: 'team-123',
                name: 'Work in Progress',
                description: null,
                prompt: 'Test prompt',
                conceptImageUrl: null,
                cadImageUrl: null,
                thumbnailUrl: null,
                materials: null,
                tags: [],
                visibility: 'private',
                status: 'draft',
                version: 1,
                parentVersionId: null,
                likesCount: 0,
                viewsCount: 0,
                metadata: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(draftDesign.status).toBe('draft');
            expect(draftDesign.visibility).toBe('private');
            expect(draftDesign.likesCount).toBe(0);
        });
    });

    describe('DesignVersion', () => {
        it('should validate version structure', () => {
            const version: DesignVersion = {
                id: 'version-123',
                designId: 'design-123',
                version: 2,
                changeDescription: 'Updated colors',
                conceptImageUrl: 'https://example.com/v2.png',
                cadImageUrl: null,
                prompt: 'Updated prompt',
                materials: 'Cotton',
                createdBy: 'user-123',
                createdAt: new Date(),
            };

            expect(version.version).toBeGreaterThan(0);
            expect(version.designId).toBeDefined();
            expect(version.createdBy).toBeDefined();
        });
    });

    describe('Team', () => {
        it('should validate team structure', () => {
            const team: Team = {
                id: 'team-123',
                organizationId: null,
                name: 'Design Team Alpha',
                slug: 'design-team-alpha',
                description: 'Our main design team',
                avatarUrl: 'https://example.com/team.png',
                isPersonal: false,
                memberCount: 5,
                designCount: 20,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(team.memberCount).toBeGreaterThanOrEqual(0);
            expect(team.designCount).toBeGreaterThanOrEqual(0);
            expect(team.slug).toBeDefined();
            expect(team.isPersonal).toBe(false);
        });

        it('should support personal teams', () => {
            const personalTeam: Team = {
                id: 'team-personal',
                organizationId: null,
                name: 'Personal',
                slug: 'user-personal',
                description: null,
                avatarUrl: null,
                isPersonal: true,
                memberCount: 1,
                designCount: 5,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(personalTeam.isPersonal).toBe(true);
            expect(personalTeam.memberCount).toBe(1);
        });
    });

    describe('TeamMember', () => {
        it('should validate team member roles', () => {
            const owner: TeamMember = {
                id: 'member-1',
                teamId: 'team-123',
                userId: 'user-123',
                role: 'owner',
                user: {
                    id: 'user-123',
                    email: 'owner@example.com',
                    displayName: 'Team Owner',
                    avatarUrl: 'https://example.com/avatar.png',
                },
                joinedAt: new Date(),
                invitedBy: null,
            };

            const viewer: TeamMember = {
                id: 'member-2',
                teamId: 'team-123',
                userId: 'user-456',
                role: 'viewer',
                user: {
                    id: 'user-456',
                    email: 'viewer@example.com',
                    displayName: 'Team Viewer',
                    avatarUrl: null,
                },
                joinedAt: new Date(),
                invitedBy: 'user-123',
            };

            expect(['owner', 'admin', 'designer', 'viewer']).toContain(owner.role);
            expect(['owner', 'admin', 'designer', 'viewer']).toContain(viewer.role);
            expect(owner.user.email).toBeDefined();
            expect(viewer.invitedBy).toBe('user-123');
        });
    });

    describe('TeamInvitation', () => {
        it('should validate invitation structure', () => {
            const invitation: TeamInvitation = {
                id: 'invite-123',
                teamId: 'team-123',
                email: 'invitee@example.com',
                role: 'designer',
                token: 'invite-token-abc123',
                invitedBy: 'user-123',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                acceptedAt: null,
                createdAt: new Date(),
            };

            expect(invitation.email).toContain('@');
            expect(['owner', 'admin', 'designer', 'viewer']).toContain(invitation.role);
            expect(invitation.token).toBeDefined();
            expect(invitation.acceptedAt).toBeNull();
        });
    });

    describe('Asset', () => {
        it('should validate asset types', () => {
            const fabricAsset: Asset = {
                id: 'asset-123',
                teamId: 'team-123',
                organizationId: null,
                userId: 'user-123',
                name: 'Blue Denim',
                description: 'Premium blue denim fabric',
                type: 'fabric',
                visibility: 'team',
                fileUrl: 'https://example.com/fabric.png',
                thumbnailUrl: 'https://example.com/fabric-thumb.png',
                fileSize: 1024000,
                mimeType: 'image/png',
                metadata: {
                    width: 2048,
                    height: 2048,
                    weight: '12oz',
                    composition: '100% Cotton',
                    fabricType: 'Denim',
                },
                tags: ['denim', 'blue', 'heavy'],
                usageCount: 15,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect([
                'fabric',
                'trim',
                'pattern',
                'color',
                'logo',
                'template',
                'reference',
                'texture',
            ]).toContain(fabricAsset.type);
            expect(fabricAsset.fileSize).toBeGreaterThan(0);
            expect(fabricAsset.usageCount).toBeGreaterThanOrEqual(0);
        });

        it('should handle different asset types', () => {
            const logoAsset: Asset = {
                id: 'asset-456',
                teamId: 'team-123',
                organizationId: 'org-123',
                userId: 'user-123',
                name: 'Brand Logo',
                description: 'Official brand logo',
                type: 'logo',
                visibility: 'organization',
                fileUrl: 'https://example.com/logo.svg',
                thumbnailUrl: 'https://example.com/logo-thumb.png',
                fileSize: 51200,
                mimeType: 'image/svg+xml',
                metadata: {
                    colorPalette: ['#1E3A8A', '#FFFFFF'],
                },
                tags: ['logo', 'brand', 'official'],
                usageCount: 150,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(logoAsset.type).toBe('logo');
            expect(logoAsset.visibility).toBe('organization');
        });
    });

    describe('SubscriptionPlan', () => {
        it('should validate subscription tiers and features', () => {
            const proPlan: SubscriptionPlan = {
                tier: 'pro',
                name: 'Pro Plan',
                price: 2900, // $29.00
                yearlyPrice: 29000, // $290.00
                features: {
                    aiCreditsMonthly: 500,
                    storageGb: 100,
                    teamMembers: 10,
                    designVersions: 100,
                    prioritySupport: true,
                    customBranding: false,
                    apiAccess: true,
                    ssoEnabled: false,
                },
            };

            expect(['free', 'pro', 'enterprise']).toContain(proPlan.tier);
            expect(proPlan.price).toBeLessThan(proPlan.yearlyPrice);
            expect(proPlan.features.aiCreditsMonthly).toBeGreaterThan(0);
        });
    });

    describe('UserPresence', () => {
        it('should validate presence data', () => {
            const presence: UserPresence = {
                odId: 'user-123',
                displayName: 'Test User',
                avatarUrl: 'https://example.com/avatar.png',
                cursor: { x: 100, y: 200 },
                selection: { startX: 50, startY: 50, endX: 150, endY: 150 },
                lastSeen: new Date(),
                isActive: true,
                color: '#FF5733',
            };

            expect(presence.cursor).toBeDefined();
            expect(presence.cursor?.x).toBeGreaterThanOrEqual(0);
            expect(presence.isActive).toBe(true);
            expect(presence.color).toMatch(/^#[0-9A-F]{6}$/i);
        });

        it('should handle idle users', () => {
            const idlePresence: UserPresence = {
                odId: 'user-456',
                displayName: 'Idle User',
                avatarUrl: null,
                cursor: null,
                selection: null,
                lastSeen: new Date(Date.now() - 60000), // 1 minute ago
                isActive: false,
                color: '#33FF57',
            };

            expect(idlePresence.isActive).toBe(false);
            expect(idlePresence.cursor).toBeNull();
            expect(idlePresence.selection).toBeNull();
        });
    });

    describe('RealtimeOperation', () => {
        it('should validate operation types', () => {
            const insertOp: RealtimeOperation = {
                id: 'op-123',
                designId: 'design-123',
                userId: 'user-123',
                type: 'insert',
                path: 'layers[0]',
                value: { name: 'New Layer' },
                previousValue: null,
                timestamp: new Date(),
                version: 1,
            };

            const updateOp: RealtimeOperation = {
                id: 'op-456',
                designId: 'design-123',
                userId: 'user-456',
                type: 'update',
                path: 'layers[0].opacity',
                value: 0.8,
                previousValue: 1.0,
                timestamp: new Date(),
                version: 2,
            };

            expect(['insert', 'update', 'delete', 'move', 'style']).toContain(insertOp.type);
            expect(['insert', 'update', 'delete', 'move', 'style']).toContain(updateOp.type);
            expect(insertOp.path).toBeDefined();
            expect(updateOp.previousValue).toBe(1.0);
        });
    });

    describe('PaginatedResponse', () => {
        it('should validate pagination structure', () => {
            const response: PaginatedResponse<CloudDesign> = {
                data: [],
                total: 100,
                page: 1,
                pageSize: 20,
                hasMore: true,
            };

            expect(response.page).toBeGreaterThanOrEqual(1);
            expect(response.pageSize).toBeGreaterThan(0);
            expect(response.hasMore).toBe(response.page * response.pageSize < response.total);
        });

        it('should handle last page', () => {
            const lastPage: PaginatedResponse<Asset> = {
                data: [],
                total: 45,
                page: 3,
                pageSize: 20,
                hasMore: false,
            };

            expect(lastPage.hasMore).toBe(false);
            expect(lastPage.page * lastPage.pageSize).toBeGreaterThanOrEqual(lastPage.total);
        });
    });

    describe('DesignFilters', () => {
        it('should validate filter options', () => {
            const filters: DesignFilters = {
                userId: 'user-123',
                teamId: 'team-123',
                visibility: 'public',
                status: 'published',
                tags: ['summer', 'dress'],
                search: 'floral',
                sortBy: 'updated',
                sortOrder: 'desc',
            };

            expect(['created', 'updated', 'likes', 'views', 'name']).toContain(filters.sortBy);
            expect(['asc', 'desc']).toContain(filters.sortOrder);
        });

        it('should support date range filters', () => {
            const dateFilters: DesignFilters = {
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-12-31'),
                sortBy: 'created',
                sortOrder: 'asc',
            };

            expect(dateFilters.dateFrom).toBeInstanceOf(Date);
            expect(dateFilters.dateTo).toBeInstanceOf(Date);
            expect(dateFilters.dateFrom!.getTime()).toBeLessThan(dateFilters.dateTo!.getTime());
        });
    });

    describe('AssetFilters', () => {
        it('should validate asset filter options', () => {
            const filters: AssetFilters = {
                type: 'fabric',
                teamId: 'team-123',
                visibility: 'team',
                tags: ['cotton'],
                search: 'blue',
                sortBy: 'created',
                sortOrder: 'desc',
            };

            expect([
                'fabric',
                'trim',
                'pattern',
                'color',
                'logo',
                'template',
                'reference',
                'texture',
            ]).toContain(filters.type);
            expect(['private', 'team', 'organization', 'public']).toContain(filters.visibility);
        });

        it('should support usage-based sorting', () => {
            const usageFilters: AssetFilters = {
                sortBy: 'usage',
                sortOrder: 'desc',
            };

            expect(usageFilters.sortBy).toBe('usage');
        });
    });

    describe('Organization', () => {
        it('should validate organization structure', () => {
            const org: Organization = {
                id: 'org-123',
                name: 'Fashion Corp',
                slug: 'fashion-corp',
                logoUrl: 'https://example.com/org-logo.png',
                description: 'Leading fashion design company',
                website: 'https://fashioncorp.com',
                subscriptionTier: 'enterprise',
                memberCount: 50,
                storageUsed: 10737418240, // 10GB
                storageLimit: 107374182400, // 100GB
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(org.slug).toBeDefined();
            expect(org.storageUsed).toBeLessThanOrEqual(org.storageLimit);
            expect(['free', 'pro', 'enterprise']).toContain(org.subscriptionTier);
        });
    });

    describe('AssetCollection', () => {
        it('should validate asset collection structure', () => {
            const collection: AssetCollection = {
                id: 'collection-123',
                teamId: 'team-123',
                name: 'Summer 2024 Fabrics',
                description: 'Fabric swatches for summer collection',
                coverImageUrl: 'https://example.com/collection-cover.png',
                assetCount: 25,
                createdBy: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(collection.assetCount).toBeGreaterThanOrEqual(0);
            expect(collection.name).toBeDefined();
            expect(collection.createdBy).toBeDefined();
        });
    });

    describe('TeamActivity', () => {
        it('should validate team activity log entry', () => {
            const activity: TeamActivity = {
                id: 'activity-123',
                teamId: 'team-123',
                userId: 'user-123',
                userDisplayName: 'John Doe',
                action: 'created',
                resourceType: 'design',
                resourceId: 'design-456',
                resourceName: 'Summer Dress v2',
                metadata: { version: 2 },
                createdAt: new Date(),
            };

            expect(['design', 'team', 'member', 'asset', 'comment', 'invitation']).toContain(
                activity.resourceType
            );
            expect(activity.action).toBeDefined();
            expect(activity.userDisplayName).toBeDefined();
        });
    });
});
