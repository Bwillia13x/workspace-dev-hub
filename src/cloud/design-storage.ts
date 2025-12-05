/**
 * Design Storage Service
 *
 * Handles cloud storage and synchronization of designs including
 * CRUD operations, versioning, and offline support.
 */

import { getSupabaseClient, uploadFile, deleteFile } from './supabase';
import { auth } from './auth';
import type {
    CloudDesign,
    DesignVersion,
    DesignComment,
    DesignLike,
    DesignFilters,
    DesignVisibility,
    DesignStatus,
    DesignMetadata,
    PaginatedResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface CreateDesignRequest {
    name: string;
    description?: string;
    prompt?: string;
    conceptImage?: string; // Base64
    cadImage?: string; // Base64
    materials?: string;
    tags?: string[];
    visibility?: DesignVisibility;
    teamId?: string;
}

export interface UpdateDesignRequest {
    name?: string;
    description?: string;
    prompt?: string;
    conceptImage?: string; // Base64
    cadImage?: string; // Base64
    materials?: string;
    tags?: string[];
    visibility?: DesignVisibility;
    status?: DesignStatus;
}

export interface DesignSyncStatus {
    designId: string;
    localVersion: number;
    cloudVersion: number;
    lastSyncedAt: Date | null;
    hasLocalChanges: boolean;
    conflict: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_BUCKET = 'designs';
const MAX_VERSION_HISTORY = 50;
const THUMBNAIL_SIZE = { width: 400, height: 400 };

// ============================================================================
// Design Storage Service Class
// ============================================================================

class DesignStorageService {
    private localDesigns: Map<string, CloudDesign> = new Map();
    private syncStatus: Map<string, DesignSyncStatus> = new Map();

    /**
     * Create a new design
     */
    async create(request: CreateDesignRequest): Promise<{ design: CloudDesign | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { design: null, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            // Upload images if provided
            let conceptImageUrl: string | null = null;
            let cadImageUrl: string | null = null;
            let thumbnailUrl: string | null = null;

            if (request.conceptImage) {
                const result = await this.uploadDesignImage(
                    request.conceptImage,
                    'concept'
                );
                conceptImageUrl = result.url;
                thumbnailUrl = result.thumbnailUrl;
            }

            if (request.cadImage) {
                const result = await this.uploadDesignImage(request.cadImage, 'cad');
                cadImageUrl = result.url;
            }

            // Create design record
            const designData = {
                user_id: user.id,
                team_id: request.teamId || null,
                name: request.name,
                description: request.description || null,
                prompt: request.prompt || null,
                concept_image_url: conceptImageUrl,
                cad_image_url: cadImageUrl,
                thumbnail_url: thumbnailUrl,
                materials: request.materials || null,
                tags: request.tags || [],
                visibility: request.visibility || 'private',
                status: 'draft' as DesignStatus,
                metadata: {
                    colorPalette: [],
                    styleReferences: [],
                    editHistory: [
                        {
                            timestamp: new Date().toISOString(),
                            action: 'create',
                            description: 'Design created',
                            userId: user.id,
                        },
                    ],
                },
            };

            const { data, error } = await client
                .from('designs')
                .insert(designData)
                .select()
                .single();

            if (error) {
                return { design: null, error: error.message };
            }

            const design = this.mapDesignRow(data);
            this.localDesigns.set(design.id, design);

            return { design, error: null };
        } catch (error) {
            return {
                design: null,
                error: error instanceof Error ? error.message : 'Failed to create design',
            };
        }
    }

    /**
     * Get design by ID
     */
    async get(designId: string): Promise<CloudDesign | null> {
        // Check local cache first
        const cached = this.localDesigns.get(designId);

        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('designs')
                .select('*')
                .eq('id', designId)
                .single();

            if (error || !data) {
                return cached || null;
            }

            const design = this.mapDesignRow(data);
            this.localDesigns.set(design.id, design);

            return design;
        } catch {
            return cached || null;
        }
    }

    /**
     * Update a design
     */
    async update(
        designId: string,
        updates: UpdateDesignRequest,
        createVersion = true
    ): Promise<{ design: CloudDesign | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { design: null, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            // Get existing design for versioning
            const existing = await this.get(designId);
            if (!existing) {
                return { design: null, error: 'Design not found' };
            }

            // Check ownership
            if (existing.userId !== user.id) {
                return { design: null, error: 'Not authorized to update this design' };
            }

            // Upload new images if provided
            let conceptImageUrl = existing.conceptImageUrl;
            let cadImageUrl = existing.cadImageUrl;
            let thumbnailUrl = existing.thumbnailUrl;

            if (updates.conceptImage) {
                const result = await this.uploadDesignImage(
                    updates.conceptImage,
                    'concept'
                );
                conceptImageUrl = result.url;
                thumbnailUrl = result.thumbnailUrl;
            }

            if (updates.cadImage) {
                const result = await this.uploadDesignImage(updates.cadImage, 'cad');
                cadImageUrl = result.url;
            }

            // Create version if requested
            if (createVersion && existing.version < MAX_VERSION_HISTORY) {
                await this.createVersion(existing, 'Update');
            }

            // Update metadata with edit history
            const metadata: DesignMetadata = {
                ...existing.metadata,
                editHistory: [
                    ...(existing.metadata.editHistory || []),
                    {
                        timestamp: new Date(),
                        action: 'edit',
                        description: 'Design updated',
                        userId: user.id,
                    },
                ],
            };

            // Update design record
            const updateData = {
                name: updates.name ?? existing.name,
                description: updates.description ?? existing.description,
                prompt: updates.prompt ?? existing.prompt,
                concept_image_url: conceptImageUrl,
                cad_image_url: cadImageUrl,
                thumbnail_url: thumbnailUrl,
                materials: updates.materials ?? existing.materials,
                tags: updates.tags ?? existing.tags,
                visibility: updates.visibility ?? existing.visibility,
                status: updates.status ?? existing.status,
                version: existing.version + 1,
                metadata,
            };

            const { data, error } = await client
                .from('designs')
                .update(updateData)
                .eq('id', designId)
                .select()
                .single();

            if (error) {
                return { design: null, error: error.message };
            }

            const design = this.mapDesignRow(data);
            this.localDesigns.set(design.id, design);

            return { design, error: null };
        } catch (error) {
            return {
                design: null,
                error: error instanceof Error ? error.message : 'Failed to update design',
            };
        }
    }

    /**
     * Delete a design
     */
    async delete(designId: string): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            const design = await this.get(designId);
            if (!design) {
                return { success: false, error: 'Design not found' };
            }

            if (design.userId !== user.id) {
                return { success: false, error: 'Not authorized to delete this design' };
            }

            // Delete images from storage
            const filesToDelete: string[] = [];
            if (design.conceptImageUrl) {
                filesToDelete.push(this.extractPathFromUrl(design.conceptImageUrl));
            }
            if (design.cadImageUrl) {
                filesToDelete.push(this.extractPathFromUrl(design.cadImageUrl));
            }
            if (design.thumbnailUrl) {
                filesToDelete.push(this.extractPathFromUrl(design.thumbnailUrl));
            }

            if (filesToDelete.length > 0) {
                await deleteFile(STORAGE_BUCKET, filesToDelete);
            }

            // Delete design record
            const { error } = await client.from('designs').delete().eq('id', designId) as { error: { message: string } | null };

            if (error) {
                return { success: false, error: error.message };
            }

            this.localDesigns.delete(designId);
            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete design',
            };
        }
    }

    /**
     * List designs with filters
     */
    async list(
        filters: DesignFilters = {},
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<CloudDesign>> {
        const client = getSupabaseClient();
        const offset = (page - 1) * pageSize;

        try {
            // Use any for query to support chainable Supabase pattern
            let query: any = client.from('designs').select('*');

            // Apply filters
            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }
            if (filters.teamId) {
                query = query.eq('team_id', filters.teamId);
            }
            if (filters.visibility) {
                query = query.eq('visibility', filters.visibility);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            // Sort and paginate
            const sortColumn = filters.sortBy === 'updated' ? 'updated_at' : 'created_at';
            const { data, error } = await query
                .order(sortColumn, { ascending: filters.sortOrder === 'asc' })
                .range(offset, offset + pageSize - 1);

            if (error) {
                return { data: [], total: 0, page, pageSize, hasMore: false };
            }

            const designs: CloudDesign[] = (data as any[] || []).map(this.mapDesignRow.bind(this));

            // Cache locally
            designs.forEach(d => this.localDesigns.set(d.id, d));

            return {
                data: designs,
                total: designs.length, // Would use count in production
                page,
                pageSize,
                hasMore: designs.length === pageSize,
            };
        } catch {
            return { data: [], total: 0, page, pageSize, hasMore: false };
        }
    }

    /**
     * Get user's designs
     */
    async getMyDesigns(
        filters: Omit<DesignFilters, 'userId'> = {},
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<CloudDesign>> {
        const user = auth.getUser();
        if (!user) {
            return { data: [], total: 0, page, pageSize, hasMore: false };
        }

        return this.list({ ...filters, userId: user.id }, page, pageSize);
    }

    /**
     * Duplicate a design
     */
    async duplicate(designId: string, newName?: string): Promise<{ design: CloudDesign | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { design: null, error: 'Not authenticated' };
        }

        const original = await this.get(designId);
        if (!original) {
            return { design: null, error: 'Design not found' };
        }

        return this.create({
            name: newName || `${original.name} (Copy)`,
            description: original.description || undefined,
            prompt: original.prompt || undefined,
            materials: original.materials || undefined,
            tags: original.tags,
            visibility: 'private',
        });
    }

    /**
     * Get design versions
     */
    async getVersions(designId: string): Promise<DesignVersion[]> {
        // In production, this would query design_versions table
        return [];
    }

    /**
     * Restore a version
     */
    async restoreVersion(designId: string, versionId: string): Promise<{ design: CloudDesign | null; error: string | null }> {
        // In production, this would restore from design_versions table
        return { design: null, error: 'Version restore not implemented' };
    }

    /**
     * Like a design
     */
    async like(designId: string): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            // Check if already liked - use any for chained queries
            const { data: existing } = await (client
                .from('design_likes' as any)
                .select('id')
                .eq('design_id', designId) as any)
                .eq('user_id', user.id)
                .single();

            if (existing) {
                return { success: true, error: null }; // Already liked
            }

            // Add like
            await client.from('design_likes' as any).insert({
                design_id: designId,
                user_id: user.id,
            });

            // Increment likes count
            const design = await this.get(designId);
            if (design) {
                await client
                    .from('designs')
                    .update({ likes_count: design.likesCount + 1 })
                    .eq('id', designId);
            }

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to like design',
            };
        }
    }

    /**
     * Unlike a design
     */
    async unlike(designId: string): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            // Use any for chained delete queries
            await (client
                .from('design_likes' as any)
                .delete()
                .eq('design_id', designId) as any)
                .eq('user_id', user.id);

            // Decrement likes count
            const design = await this.get(designId);
            if (design && design.likesCount > 0) {
                await client
                    .from('designs')
                    .update({ likes_count: design.likesCount - 1 })
                    .eq('id', designId);
            }

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unlike design',
            };
        }
    }

    /**
     * Add comment to design
     */
    async addComment(
        designId: string,
        content: string,
        position?: { x: number; y: number },
        parentId?: string
    ): Promise<{ comment: DesignComment | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { comment: null, error: 'Not authenticated' };
        }

        // In production, this would insert into design_comments table
        const comment: DesignComment = {
            id: `comment_${Date.now()}`,
            designId,
            userId: user.id,
            userDisplayName: user.displayName || 'Unknown',
            userAvatarUrl: user.avatarUrl,
            content,
            position: position || null,
            parentId: parentId || null,
            isResolved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return { comment, error: null };
    }

    /**
     * Get comments for a design
     */
    async getComments(designId: string): Promise<DesignComment[]> {
        // In production, this would query design_comments table
        return [];
    }

    /**
     * Increment view count
     */
    async recordView(designId: string): Promise<void> {
        const client = getSupabaseClient();

        try {
            const design = await this.get(designId);
            if (design) {
                await client
                    .from('designs')
                    .update({ views_count: design.viewsCount + 1 })
                    .eq('id', designId);
            }
        } catch {
            // Silently fail for view tracking
        }
    }

    /**
     * Get sync status for offline support
     */
    getSyncStatus(designId: string): DesignSyncStatus | null {
        return this.syncStatus.get(designId) || null;
    }

    /**
     * Sync local changes to cloud
     */
    async sync(): Promise<{ synced: number; errors: string[] }> {
        const errors: string[] = [];
        let synced = 0;

        for (const [designId, status] of this.syncStatus) {
            if (status.hasLocalChanges && !status.conflict) {
                const localDesign = this.localDesigns.get(designId);
                if (localDesign) {
                    const result = await this.update(designId, {
                        name: localDesign.name,
                        description: localDesign.description || undefined,
                        prompt: localDesign.prompt || undefined,
                        materials: localDesign.materials || undefined,
                        tags: localDesign.tags,
                        visibility: localDesign.visibility,
                        status: localDesign.status,
                    });

                    if (result.error) {
                        errors.push(`${designId}: ${result.error}`);
                    } else {
                        synced++;
                        this.syncStatus.set(designId, {
                            ...status,
                            hasLocalChanges: false,
                            lastSyncedAt: new Date(),
                        });
                    }
                }
            }
        }

        return { synced, errors };
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Upload design image and generate thumbnail
     */
    private async uploadDesignImage(
        base64Data: string,
        type: 'concept' | 'cad'
    ): Promise<{ url: string | null; thumbnailUrl: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { url: null, thumbnailUrl: null };
        }

        try {
            // Convert base64 to blob
            const base64Content = base64Data.split(',')[1] || base64Data;
            const binaryString = atob(base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'image/png' });

            // Upload main image
            const timestamp = Date.now();
            const path = `${user.id}/${type}_${timestamp}.png`;
            const { url } = await uploadFile(STORAGE_BUCKET, path, blob);

            // For thumbnails, we'd normally resize the image
            // For now, use the same URL
            return { url, thumbnailUrl: url };
        } catch (error) {
            console.error('[DesignStorage] Upload error:', error);
            return { url: null, thumbnailUrl: null };
        }
    }

    /**
     * Create a version snapshot
     */
    private async createVersion(design: CloudDesign, changeDescription: string): Promise<void> {
        // In production, this would insert into design_versions table
        console.log(
            `[DesignStorage] Created version ${design.version} for design ${design.id}: ${changeDescription}`
        );
    }

    /**
     * Extract file path from public URL
     */
    private extractPathFromUrl(url: string): string {
        const match = url.match(/\/([^/]+\/[^/]+\.[^.]+)$/);
        return match ? match[1] : url;
    }

    /**
     * Map database row to CloudDesign
     */
    private mapDesignRow(row: any): CloudDesign {
        return {
            id: row.id,
            userId: row.user_id,
            teamId: row.team_id,
            name: row.name,
            description: row.description,
            prompt: row.prompt,
            conceptImageUrl: row.concept_image_url,
            cadImageUrl: row.cad_image_url,
            thumbnailUrl: row.thumbnail_url,
            materials: row.materials,
            tags: row.tags || [],
            visibility: row.visibility,
            status: row.status,
            likesCount: row.likes_count || 0,
            viewsCount: row.views_count || 0,
            version: row.version || 1,
            parentVersionId: row.parent_version_id,
            metadata: row.metadata || {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const designStorageService = new DesignStorageService();

// ============================================================================
// Convenience Functions
// ============================================================================

export const designStorage = {
    create: (request: CreateDesignRequest) => designStorageService.create(request),
    get: (designId: string) => designStorageService.get(designId),
    update: (designId: string, updates: UpdateDesignRequest, createVersion?: boolean) =>
        designStorageService.update(designId, updates, createVersion),
    delete: (designId: string) => designStorageService.delete(designId),
    list: (filters?: DesignFilters, page?: number, pageSize?: number) =>
        designStorageService.list(filters, page, pageSize),
    getMyDesigns: (filters?: Omit<DesignFilters, 'userId'>, page?: number, pageSize?: number) =>
        designStorageService.getMyDesigns(filters, page, pageSize),
    duplicate: (designId: string, newName?: string) =>
        designStorageService.duplicate(designId, newName),
    getVersions: (designId: string) => designStorageService.getVersions(designId),
    restoreVersion: (designId: string, versionId: string) =>
        designStorageService.restoreVersion(designId, versionId),
    like: (designId: string) => designStorageService.like(designId),
    unlike: (designId: string) => designStorageService.unlike(designId),
    addComment: (
        designId: string,
        content: string,
        position?: { x: number; y: number },
        parentId?: string
    ) => designStorageService.addComment(designId, content, position, parentId),
    getComments: (designId: string) => designStorageService.getComments(designId),
    recordView: (designId: string) => designStorageService.recordView(designId),
    getSyncStatus: (designId: string) => designStorageService.getSyncStatus(designId),
    sync: () => designStorageService.sync(),
};

export default designStorage;
