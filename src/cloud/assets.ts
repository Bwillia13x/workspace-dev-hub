/**
 * Asset Library Service
 *
 * Manages design assets including fabrics, trims, patterns,
 * colors, logos, templates, and brand libraries.
 */

import { getSupabaseClient, uploadFile, deleteFile } from './supabase';
import { auth } from './auth';
import type {
    Asset,
    AssetType,
    AssetVisibility,
    AssetMetadata,
    AssetCollection,
    BrandLibrary,
    AssetFilters,
    PaginatedResponse,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface CreateAssetRequest {
    name: string;
    description?: string;
    type: AssetType;
    visibility?: AssetVisibility;
    file: File | Blob;
    metadata?: Partial<AssetMetadata>;
    tags?: string[];
    teamId?: string;
    collectionId?: string;
}

export interface UpdateAssetRequest {
    name?: string;
    description?: string;
    visibility?: AssetVisibility;
    metadata?: Partial<AssetMetadata>;
    tags?: string[];
}

export interface CreateCollectionRequest {
    name: string;
    description?: string;
    teamId?: string;
}

export interface CreateBrandLibraryRequest {
    teamId: string;
    name: string;
    description?: string;
    primaryColors?: string[];
    secondaryColors?: string[];
    fonts?: string[];
    guidelines?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ASSET_BUCKET = 'assets';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES: Record<AssetType, string[]> = {
    fabric: ['image/jpeg', 'image/png', 'image/webp'],
    trim: ['image/jpeg', 'image/png', 'image/webp'],
    pattern: ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf'],
    color: ['image/jpeg', 'image/png'],
    logo: ['image/png', 'image/svg+xml'],
    template: ['application/json', 'image/png', 'image/svg+xml'],
    reference: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    texture: ['image/jpeg', 'image/png', 'image/webp'],
};

// ============================================================================
// Asset Library Service Class
// ============================================================================

class AssetLibraryService {
    private assetCache: Map<string, Asset> = new Map();
    private collectionCache: Map<string, AssetCollection> = new Map();

    /**
     * Upload and create a new asset
     */
    async createAsset(
        request: CreateAssetRequest
    ): Promise<{ asset: Asset | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { asset: null, error: 'Not authenticated' };
        }

        // Validate file
        const validation = this.validateFile(request.file, request.type);
        if (validation.error) {
            return { asset: null, error: validation.error };
        }

        try {
            // Upload file
            const timestamp = Date.now();
            const extension = this.getFileExtension(request.file);
            const path = `${user.id}/${request.type}/${timestamp}.${extension}`;

            const { url, error: uploadError } = await uploadFile(ASSET_BUCKET, path, request.file);

            if (uploadError || !url) {
                return { asset: null, error: uploadError?.message || 'Upload failed' };
            }

            // Generate thumbnail (in production, this would be server-side)
            const thumbnailUrl = url; // Same URL for now

            // Extract metadata
            const metadata = await this.extractMetadata(request.file, request.type, request.metadata);

            const client = getSupabaseClient();

            const assetData = {
                user_id: user.id,
                team_id: request.teamId || null,
                organization_id: null,
                name: request.name,
                description: request.description || null,
                type: request.type,
                visibility: request.visibility || 'private',
                file_url: url,
                thumbnail_url: thumbnailUrl,
                file_size: request.file.size,
                mime_type: request.file.type,
                metadata,
                tags: request.tags || [],
            };

            const { data, error } = await client
                .from('assets')
                .insert(assetData)
                .select()
                .single();

            if (error) {
                return { asset: null, error: error.message };
            }

            const asset = this.mapAssetRow(data);
            this.assetCache.set(asset.id, asset);

            return { asset, error: null };
        } catch (error) {
            return {
                asset: null,
                error: error instanceof Error ? error.message : 'Failed to create asset',
            };
        }
    }

    /**
     * Get asset by ID
     */
    async getAsset(assetId: string): Promise<Asset | null> {
        const cached = this.assetCache.get(assetId);

        const client = getSupabaseClient();

        try {
            const { data, error } = await client
                .from('assets')
                .select('*')
                .eq('id', assetId)
                .single();

            if (error || !data) {
                return cached || null;
            }

            const asset = this.mapAssetRow(data);
            this.assetCache.set(asset.id, asset);

            return asset;
        } catch {
            return cached || null;
        }
    }

    /**
     * Update asset
     */
    async updateAsset(
        assetId: string,
        updates: UpdateAssetRequest
    ): Promise<{ asset: Asset | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { asset: null, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            const existing = await this.getAsset(assetId);
            if (!existing) {
                return { asset: null, error: 'Asset not found' };
            }

            if (existing.userId !== user.id) {
                return { asset: null, error: 'Not authorized to update this asset' };
            }

            const updateData: Record<string, unknown> = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
            if (updates.tags !== undefined) updateData.tags = updates.tags;
            if (updates.metadata !== undefined) {
                updateData.metadata = { ...existing.metadata, ...updates.metadata };
            }

            const { data, error } = await client
                .from('assets')
                .update(updateData)
                .eq('id', assetId)
                .select()
                .single();

            if (error) {
                return { asset: null, error: error.message };
            }

            const asset = this.mapAssetRow(data);
            this.assetCache.set(asset.id, asset);

            return { asset, error: null };
        } catch (error) {
            return {
                asset: null,
                error: error instanceof Error ? error.message : 'Failed to update asset',
            };
        }
    }

    /**
     * Delete asset
     */
    async deleteAsset(assetId: string): Promise<{ success: boolean; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const client = getSupabaseClient();

        try {
            const asset = await this.getAsset(assetId);
            if (!asset) {
                return { success: false, error: 'Asset not found' };
            }

            if (asset.userId !== user.id) {
                return { success: false, error: 'Not authorized to delete this asset' };
            }

            // Delete file from storage
            const path = this.extractPathFromUrl(asset.fileUrl);
            await deleteFile(ASSET_BUCKET, [path]);

            // Delete record
            const { error } = await client.from('assets').delete().eq('id', assetId) as { error: { message: string } | null };

            if (error) {
                return { success: false, error: error.message };
            }

            this.assetCache.delete(assetId);

            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete asset',
            };
        }
    }

    /**
     * List assets with filters
     */
    async listAssets(
        filters: AssetFilters = {},
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<Asset>> {
        const client = getSupabaseClient();
        const offset = (page - 1) * pageSize;

        try {
            // Use any for chainable Supabase query pattern
            let query: any = client.from('assets').select('*');

            // Apply filters
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.teamId) {
                query = query.eq('team_id', filters.teamId);
            }
            if (filters.visibility) {
                query = query.eq('visibility', filters.visibility);
            }

            const sortColumn = filters.sortBy === 'updated' ? 'updated_at' : 'created_at';
            const { data, error } = await query
                .order(sortColumn, { ascending: filters.sortOrder === 'asc' })
                .range(offset, offset + pageSize - 1);

            if (error) {
                return { data: [], total: 0, page, pageSize, hasMore: false };
            }

            const assets: Asset[] = (data as any[] || []).map(this.mapAssetRow.bind(this));
            assets.forEach(a => this.assetCache.set(a.id, a));

            return {
                data: assets,
                total: assets.length,
                page,
                pageSize,
                hasMore: assets.length === pageSize,
            };
        } catch {
            return { data: [], total: 0, page, pageSize, hasMore: false };
        }
    }

    /**
     * Get user's assets
     */
    async getMyAssets(
        filters: Omit<AssetFilters, 'userId'> = {},
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<Asset>> {
        const user = auth.getUser();
        if (!user) {
            return { data: [], total: 0, page, pageSize, hasMore: false };
        }

        const client = getSupabaseClient();
        const offset = (page - 1) * pageSize;

        try {
            // Use any for chainable Supabase query pattern
            let query: any = client.from('assets').select('*').eq('user_id', user.id);

            if (filters.type) {
                query = query.eq('type', filters.type);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1);

            if (error) {
                return { data: [], total: 0, page, pageSize, hasMore: false };
            }

            const assets: Asset[] = (data as any[] || []).map(this.mapAssetRow.bind(this));

            return {
                data: assets,
                total: assets.length,
                page,
                pageSize,
                hasMore: assets.length === pageSize,
            };
        } catch {
            return { data: [], total: 0, page, pageSize, hasMore: false };
        }
    }

    /**
     * Record asset usage
     */
    async recordUsage(assetId: string): Promise<void> {
        const client = getSupabaseClient();

        try {
            const asset = await this.getAsset(assetId);
            if (asset) {
                await client
                    .from('assets')
                    .update({ usage_count: asset.usageCount + 1 })
                    .eq('id', assetId);
            }
        } catch {
            // Silently fail for usage tracking
        }
    }

    // ============================================================================
    // Collections
    // ============================================================================

    /**
     * Create asset collection
     */
    async createCollection(
        request: CreateCollectionRequest
    ): Promise<{ collection: AssetCollection | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { collection: null, error: 'Not authenticated' };
        }

        const collection: AssetCollection = {
            id: `collection_${Date.now()}`,
            teamId: request.teamId || null,
            name: request.name,
            description: request.description || null,
            coverImageUrl: null,
            assetCount: 0,
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.collectionCache.set(collection.id, collection);

        return { collection, error: null };
    }

    /**
     * Get collections
     */
    async getCollections(teamId?: string): Promise<AssetCollection[]> {
        // In production, this would query asset_collections table
        return Array.from(this.collectionCache.values()).filter(
            c => !teamId || c.teamId === teamId
        );
    }

    /**
     * Add asset to collection
     */
    async addToCollection(
        assetId: string,
        collectionId: string
    ): Promise<{ success: boolean; error: string | null }> {
        // In production, this would update asset_collection_items table
        return { success: true, error: null };
    }

    /**
     * Remove asset from collection
     */
    async removeFromCollection(
        assetId: string,
        collectionId: string
    ): Promise<{ success: boolean; error: string | null }> {
        // In production, this would delete from asset_collection_items table
        return { success: true, error: null };
    }

    // ============================================================================
    // Brand Libraries
    // ============================================================================

    /**
     * Create brand library
     */
    async createBrandLibrary(
        request: CreateBrandLibraryRequest
    ): Promise<{ library: BrandLibrary | null; error: string | null }> {
        const user = auth.getUser();
        if (!user) {
            return { library: null, error: 'Not authenticated' };
        }

        const library: BrandLibrary = {
            id: `brand_${Date.now()}`,
            teamId: request.teamId,
            name: request.name,
            description: request.description || null,
            primaryColors: request.primaryColors || [],
            secondaryColors: request.secondaryColors || [],
            logos: [],
            fonts: request.fonts || [],
            patterns: [],
            guidelines: request.guidelines || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return { library, error: null };
    }

    /**
     * Get brand library for team
     */
    async getBrandLibrary(teamId: string): Promise<BrandLibrary | null> {
        // In production, this would query brand_libraries table
        return null;
    }

    /**
     * Update brand library
     */
    async updateBrandLibrary(
        libraryId: string,
        updates: Partial<BrandLibrary>
    ): Promise<{ library: BrandLibrary | null; error: string | null }> {
        // In production, this would update brand_libraries table
        return { library: null, error: 'Brand library not found' };
    }

    // ============================================================================
    // Asset Templates
    // ============================================================================

    /**
     * Get preset asset templates
     */
    getPresetTemplates(): Array<{
        id: string;
        name: string;
        type: AssetType;
        thumbnailUrl: string;
    }> {
        return [
            {
                id: 'template_cotton',
                name: 'Cotton Basic',
                type: 'fabric',
                thumbnailUrl: '/assets/templates/cotton.jpg',
            },
            {
                id: 'template_denim',
                name: 'Denim Classic',
                type: 'fabric',
                thumbnailUrl: '/assets/templates/denim.jpg',
            },
            {
                id: 'template_silk',
                name: 'Silk Luxury',
                type: 'fabric',
                thumbnailUrl: '/assets/templates/silk.jpg',
            },
            {
                id: 'template_zipper',
                name: 'Metal Zipper',
                type: 'trim',
                thumbnailUrl: '/assets/templates/zipper.jpg',
            },
            {
                id: 'template_button',
                name: 'Shell Button',
                type: 'trim',
                thumbnailUrl: '/assets/templates/button.jpg',
            },
        ];
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Validate file for asset upload
     */
    private validateFile(
        file: File | Blob,
        type: AssetType
    ): { valid: boolean; error: string | null } {
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
        }

        const allowedTypes = ALLOWED_MIME_TYPES[type];
        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
            };
        }

        return { valid: true, error: null };
    }

    /**
     * Extract metadata from file
     */
    private async extractMetadata(
        file: File | Blob,
        type: AssetType,
        providedMetadata?: Partial<AssetMetadata>
    ): Promise<AssetMetadata> {
        const metadata: AssetMetadata = { ...providedMetadata };

        // For images, extract dimensions
        if (file.type.startsWith('image/')) {
            try {
                const dimensions = await this.getImageDimensions(file);
                metadata.width = dimensions.width;
                metadata.height = dimensions.height;
            } catch {
                // Ignore dimension extraction errors
            }
        }

        return metadata;
    }

    /**
     * Get image dimensions
     */
    private getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({ width: img.width, height: img.height });
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    /**
     * Get file extension from file
     */
    private getFileExtension(file: File | Blob): string {
        if ('name' in file) {
            const parts = file.name.split('.');
            return parts[parts.length - 1] || 'bin';
        }

        const mimeExtensions: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
            'application/pdf': 'pdf',
            'application/json': 'json',
        };

        return mimeExtensions[file.type] || 'bin';
    }

    /**
     * Extract file path from URL
     */
    private extractPathFromUrl(url: string): string {
        const match = url.match(/\/([^/]+\/[^/]+\/[^/]+\.[^.]+)$/);
        return match ? match[1] : url;
    }

    /**
     * Map database row to Asset
     */
    private mapAssetRow(row: any): Asset {
        return {
            id: row.id,
            teamId: row.team_id,
            organizationId: row.organization_id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            type: row.type,
            visibility: row.visibility,
            fileUrl: row.file_url,
            thumbnailUrl: row.thumbnail_url,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            metadata: row.metadata || {},
            tags: row.tags || [],
            usageCount: row.usage_count || 0,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const assetLibraryService = new AssetLibraryService();

// ============================================================================
// Convenience Functions
// ============================================================================

export const assets = {
    create: (request: CreateAssetRequest) => assetLibraryService.createAsset(request),
    get: (assetId: string) => assetLibraryService.getAsset(assetId),
    update: (assetId: string, updates: UpdateAssetRequest) =>
        assetLibraryService.updateAsset(assetId, updates),
    delete: (assetId: string) => assetLibraryService.deleteAsset(assetId),
    list: (filters?: AssetFilters, page?: number, pageSize?: number) =>
        assetLibraryService.listAssets(filters, page, pageSize),
    getMyAssets: (filters?: Omit<AssetFilters, 'userId'>, page?: number, pageSize?: number) =>
        assetLibraryService.getMyAssets(filters, page, pageSize),
    recordUsage: (assetId: string) => assetLibraryService.recordUsage(assetId),

    // Collections
    createCollection: (request: CreateCollectionRequest) =>
        assetLibraryService.createCollection(request),
    getCollections: (teamId?: string) => assetLibraryService.getCollections(teamId),
    addToCollection: (assetId: string, collectionId: string) =>
        assetLibraryService.addToCollection(assetId, collectionId),
    removeFromCollection: (assetId: string, collectionId: string) =>
        assetLibraryService.removeFromCollection(assetId, collectionId),

    // Brand Libraries
    createBrandLibrary: (request: CreateBrandLibraryRequest) =>
        assetLibraryService.createBrandLibrary(request),
    getBrandLibrary: (teamId: string) => assetLibraryService.getBrandLibrary(teamId),
    updateBrandLibrary: (libraryId: string, updates: Partial<BrandLibrary>) =>
        assetLibraryService.updateBrandLibrary(libraryId, updates),

    // Templates
    getPresetTemplates: () => assetLibraryService.getPresetTemplates(),
};

export default assets;
