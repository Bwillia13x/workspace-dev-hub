/**
 * Mask Manager - Professional masking system for design editing
 *
 * Provides vector and raster masking capabilities:
 * - Vector masks (path-based, resolution independent)
 * - Raster masks (pixel-based, grayscale)
 * - Layer masks (non-destructive)
 * - Clipping masks (shape-based)
 * - Quick masks for temporary selections
 */

import {
    Layer,
    LayerType,
    MaskType,
    Point,
    VectorPath,
    PathSegment,
    PathSegmentType,
} from '../types';

// ============================================================================
// Mask Data Types
// ============================================================================

/**
 * Base mask interface
 */
export interface BaseMask {
    id: string;
    type: MaskType;
    enabled: boolean;
    inverted: boolean;
    feather: number; // Edge feathering in pixels
    density: number; // 0-100, affects mask strength
    linkedToLayer: boolean;
}

/**
 * Vector mask - path-based, resolution independent
 */
export interface VectorMask extends BaseMask {
    type: MaskType.VECTOR;
    path: VectorPath;
    fillRule: 'nonzero' | 'evenodd';
}

/**
 * Raster mask - pixel-based grayscale
 */
export interface RasterMask extends BaseMask {
    type: MaskType.RASTER;
    width: number;
    height: number;
    data: Uint8ClampedArray | null; // Grayscale pixel data
    channel: 'luminosity' | 'alpha';
}

/**
 * Clipping mask - uses layer shape to clip
 */
export interface ClippingMask extends BaseMask {
    type: MaskType.CLIPPING;
    baseLayerId: string; // Layer whose shape clips others
    clippedLayerIds: string[];
}

/**
 * Quick mask - temporary selection mask
 */
export interface QuickMask extends BaseMask {
    type: MaskType.RASTER;
    data: Uint8ClampedArray | null;
    width: number;
    height: number;
    overlayColor: string;
    overlayOpacity: number;
    selectionMode: 'selected' | 'masked';
}

export type Mask = VectorMask | RasterMask | ClippingMask | QuickMask;

// ============================================================================
// Mask Operations
// ============================================================================

export type MaskOperation = 'add' | 'subtract' | 'intersect' | 'exclude';

export interface MaskCombineOptions {
    operation: MaskOperation;
    preserveOriginal: boolean;
}

// ============================================================================
// Mask Manager Events
// ============================================================================

export interface MaskManagerEvents {
    'mask:created': { mask: Mask; layerId: string };
    'mask:updated': { mask: Mask; layerId: string; changes: Partial<Mask> };
    'mask:deleted': { maskId: string; layerId: string };
    'mask:enabled': { maskId: string; layerId: string; enabled: boolean };
    'mask:inverted': { maskId: string; layerId: string; inverted: boolean };
    'mask:linked': { maskId: string; layerId: string; linked: boolean };
    'mask:path:updated': { maskId: string; path: VectorPath };
    'mask:raster:updated': { maskId: string; region?: { x: number; y: number; width: number; height: number } };
}

type MaskEventCallback<K extends keyof MaskManagerEvents> = (data: MaskManagerEvents[K]) => void;

// ============================================================================
// Mask Manager Class
// ============================================================================

export class MaskManager {
    private masks: Map<string, Mask[]> = new Map(); // layerId -> masks
    private quickMask: QuickMask | null = null;
    private eventListeners: Map<string, Set<MaskEventCallback<keyof MaskManagerEvents>>> = new Map();

    // ========================================================================
    // Event System
    // ========================================================================

    on<K extends keyof MaskManagerEvents>(
        event: K,
        callback: MaskEventCallback<K>
    ): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback as MaskEventCallback<keyof MaskManagerEvents>);

        return () => this.off(event, callback);
    }

    off<K extends keyof MaskManagerEvents>(
        event: K,
        callback: MaskEventCallback<K>
    ): void {
        this.eventListeners.get(event)?.delete(callback as MaskEventCallback<keyof MaskManagerEvents>);
    }

    private emit<K extends keyof MaskManagerEvents>(
        event: K,
        data: MaskManagerEvents[K]
    ): void {
        this.eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in mask event listener for ${event}:`, error);
            }
        });
    }

    // ========================================================================
    // Vector Mask Operations
    // ========================================================================

    /**
     * Create a vector mask from a path
     */
    createVectorMask(
        layerId: string,
        path: VectorPath,
        options: Partial<Omit<VectorMask, 'id' | 'type' | 'path'>> = {}
    ): VectorMask {
        const mask: VectorMask = {
            id: this.generateId(),
            type: MaskType.VECTOR,
            path,
            fillRule: options.fillRule ?? 'nonzero',
            enabled: options.enabled ?? true,
            inverted: options.inverted ?? false,
            feather: options.feather ?? 0,
            density: options.density ?? 100,
            linkedToLayer: options.linkedToLayer ?? true,
        };

        this.addMaskToLayer(layerId, mask);
        this.emit('mask:created', { mask, layerId });

        return mask;
    }

    /**
     * Create a rectangular vector mask
     */
    createRectangleMask(
        layerId: string,
        x: number,
        y: number,
        width: number,
        height: number,
        cornerRadius: number = 0
    ): VectorMask {
        const path = this.createRectanglePath(x, y, width, height, cornerRadius);
        return this.createVectorMask(layerId, path);
    }

    /**
     * Create an elliptical vector mask
     */
    createEllipseMask(
        layerId: string,
        cx: number,
        cy: number,
        rx: number,
        ry: number
    ): VectorMask {
        const path = this.createEllipsePath(cx, cy, rx, ry);
        return this.createVectorMask(layerId, path);
    }

    /**
     * Create a polygon vector mask
     */
    createPolygonMask(
        layerId: string,
        points: Point[],
        closed: boolean = true
    ): VectorMask {
        const path = this.createPolygonPath(points, closed);
        return this.createVectorMask(layerId, path);
    }

    /**
     * Update vector mask path
     */
    updateVectorMaskPath(maskId: string, path: VectorPath): void {
        const { mask, layerId } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.VECTOR) return;

        (mask as VectorMask).path = path;
        this.emit('mask:path:updated', { maskId, path });
    }

    // ========================================================================
    // Raster Mask Operations
    // ========================================================================

    /**
     * Create a raster mask
     */
    createRasterMask(
        layerId: string,
        width: number,
        height: number,
        options: Partial<Omit<RasterMask, 'id' | 'type' | 'width' | 'height' | 'data'>> = {}
    ): RasterMask {
        const data = new Uint8ClampedArray(width * height);
        data.fill(255); // Start with fully opaque mask

        const mask: RasterMask = {
            id: this.generateId(),
            type: MaskType.RASTER,
            width,
            height,
            data,
            channel: options.channel ?? 'luminosity',
            enabled: options.enabled ?? true,
            inverted: options.inverted ?? false,
            feather: options.feather ?? 0,
            density: options.density ?? 100,
            linkedToLayer: options.linkedToLayer ?? true,
        };

        this.addMaskToLayer(layerId, mask);
        this.emit('mask:created', { mask, layerId });

        return mask;
    }

    /**
     * Create raster mask from image data
     */
    createRasterMaskFromImageData(
        layerId: string,
        imageData: ImageData,
        channel: 'red' | 'green' | 'blue' | 'alpha' | 'luminosity' = 'luminosity'
    ): RasterMask {
        const width = imageData.width;
        const height = imageData.height;
        const data = new Uint8ClampedArray(width * height);

        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            switch (channel) {
                case 'red':
                    data[i] = imageData.data[idx];
                    break;
                case 'green':
                    data[i] = imageData.data[idx + 1];
                    break;
                case 'blue':
                    data[i] = imageData.data[idx + 2];
                    break;
                case 'alpha':
                    data[i] = imageData.data[idx + 3];
                    break;
                case 'luminosity':
                default:
                    // Calculate luminosity: 0.299 * R + 0.587 * G + 0.114 * B
                    data[i] = Math.round(
                        0.299 * imageData.data[idx] +
                        0.587 * imageData.data[idx + 1] +
                        0.114 * imageData.data[idx + 2]
                    );
                    break;
            }
        }

        const mask = this.createRasterMask(layerId, width, height);
        (mask as RasterMask).data = data;

        return mask;
    }

    /**
     * Paint on raster mask
     */
    paintOnRasterMask(
        maskId: string,
        x: number,
        y: number,
        brushRadius: number,
        value: number, // 0-255
        softness: number = 0 // 0-1, for soft brush edges
    ): void {
        const { mask } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.RASTER) return;

        const rasterMask = mask as RasterMask;
        if (!rasterMask.data) return;

        const { width, height, data } = rasterMask;
        const radius = Math.floor(brushRadius);

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const px = Math.floor(x + dx);
                const py = Math.floor(y + dy);

                if (px < 0 || px >= width || py < 0 || py >= height) continue;

                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > radius) continue;

                const idx = py * width + px;

                // Calculate falloff for soft brush
                let strength = 1;
                if (softness > 0 && radius > 0) {
                    const normalizedDistance = distance / radius;
                    strength = 1 - Math.pow(normalizedDistance, 1 / softness);
                    strength = Math.max(0, Math.min(1, strength));
                }

                // Blend the value
                const currentValue = data[idx];
                data[idx] = Math.round(currentValue * (1 - strength) + value * strength);
            }
        }

        this.emit('mask:raster:updated', {
            maskId,
            region: {
                x: Math.max(0, Math.floor(x - radius)),
                y: Math.max(0, Math.floor(y - radius)),
                width: radius * 2 + 1,
                height: radius * 2 + 1,
            },
        });
    }

    /**
     * Fill raster mask region
     */
    fillRasterMaskRegion(
        maskId: string,
        x: number,
        y: number,
        width: number,
        height: number,
        value: number
    ): void {
        const { mask } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.RASTER) return;

        const rasterMask = mask as RasterMask;
        if (!rasterMask.data) return;

        const { width: maskWidth, height: maskHeight, data } = rasterMask;

        const startX = Math.max(0, Math.floor(x));
        const startY = Math.max(0, Math.floor(y));
        const endX = Math.min(maskWidth, Math.floor(x + width));
        const endY = Math.min(maskHeight, Math.floor(y + height));

        for (let py = startY; py < endY; py++) {
            for (let px = startX; px < endX; px++) {
                data[py * maskWidth + px] = value;
            }
        }

        this.emit('mask:raster:updated', {
            maskId,
            region: { x: startX, y: startY, width: endX - startX, height: endY - startY },
        });
    }

    /**
     * Clear raster mask (fill with white/opaque)
     */
    clearRasterMask(maskId: string): void {
        const { mask } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.RASTER) return;

        const rasterMask = mask as RasterMask;
        if (rasterMask.data) {
            rasterMask.data.fill(255);
        }

        this.emit('mask:raster:updated', { maskId });
    }

    /**
     * Invert raster mask
     */
    invertRasterMask(maskId: string): void {
        const { mask } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.RASTER) return;

        const rasterMask = mask as RasterMask;
        if (rasterMask.data) {
            for (let i = 0; i < rasterMask.data.length; i++) {
                rasterMask.data[i] = 255 - rasterMask.data[i];
            }
        }

        this.emit('mask:raster:updated', { maskId });
    }

    /**
     * Apply Gaussian blur to raster mask
     */
    blurRasterMask(maskId: string, radius: number): void {
        const { mask } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.RASTER) return;

        const rasterMask = mask as RasterMask;
        if (!rasterMask.data) return;

        const { width, height, data } = rasterMask;
        const blurred = this.gaussianBlur(data, width, height, radius);
        rasterMask.data = blurred;

        this.emit('mask:raster:updated', { maskId });
    }

    // ========================================================================
    // Clipping Mask Operations
    // ========================================================================

    /**
     * Create a clipping mask
     */
    createClippingMask(
        baseLayerId: string,
        clippedLayerIds: string[]
    ): ClippingMask {
        const mask: ClippingMask = {
            id: this.generateId(),
            type: MaskType.CLIPPING,
            baseLayerId,
            clippedLayerIds: [...clippedLayerIds],
            enabled: true,
            inverted: false,
            feather: 0,
            density: 100,
            linkedToLayer: true,
        };

        this.addMaskToLayer(baseLayerId, mask);
        this.emit('mask:created', { mask, layerId: baseLayerId });

        return mask;
    }

    /**
     * Add layer to clipping group
     */
    addToClippingGroup(maskId: string, layerId: string): void {
        const { mask, layerId: baseLayerId } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.CLIPPING) return;

        const clippingMask = mask as ClippingMask;
        if (!clippingMask.clippedLayerIds.includes(layerId)) {
            clippingMask.clippedLayerIds.push(layerId);
            this.emit('mask:updated', {
                mask: clippingMask,
                layerId: baseLayerId,
                changes: { clippedLayerIds: clippingMask.clippedLayerIds },
            });
        }
    }

    /**
     * Remove layer from clipping group
     */
    removeFromClippingGroup(maskId: string, layerId: string): void {
        const { mask, layerId: baseLayerId } = this.findMask(maskId);
        if (!mask || mask.type !== MaskType.CLIPPING) return;

        const clippingMask = mask as ClippingMask;
        const idx = clippingMask.clippedLayerIds.indexOf(layerId);
        if (idx !== -1) {
            clippingMask.clippedLayerIds.splice(idx, 1);
            this.emit('mask:updated', {
                mask: clippingMask,
                layerId: baseLayerId,
                changes: { clippedLayerIds: clippingMask.clippedLayerIds },
            });
        }
    }

    // ========================================================================
    // Quick Mask Operations
    // ========================================================================

    /**
     * Enter quick mask mode
     */
    enterQuickMaskMode(
        width: number,
        height: number,
        options: Partial<QuickMask> = {}
    ): QuickMask {
        this.quickMask = {
            id: this.generateId(),
            type: MaskType.RASTER,
            width,
            height,
            data: new Uint8ClampedArray(width * height),
            channel: 'luminosity',
            enabled: true,
            inverted: false,
            feather: 0,
            density: 100,
            linkedToLayer: false,
            overlayColor: options.overlayColor ?? '#ff0000',
            overlayOpacity: options.overlayOpacity ?? 0.5,
            selectionMode: options.selectionMode ?? 'masked',
        } as QuickMask;

        return this.quickMask;
    }

    /**
     * Exit quick mask mode and convert to selection
     */
    exitQuickMaskMode(): Uint8ClampedArray | null {
        if (!this.quickMask) return null;

        const data = this.quickMask.data;
        this.quickMask = null;

        return data;
    }

    /**
     * Get current quick mask
     */
    getQuickMask(): QuickMask | null {
        return this.quickMask;
    }

    /**
     * Check if in quick mask mode
     */
    isQuickMaskMode(): boolean {
        return this.quickMask !== null;
    }

    // ========================================================================
    // General Mask Operations
    // ========================================================================

    /**
     * Get masks for a layer
     */
    getMasks(layerId: string): Mask[] {
        return this.masks.get(layerId) ?? [];
    }

    /**
     * Get a specific mask
     */
    getMask(maskId: string): Mask | undefined {
        for (const masks of this.masks.values()) {
            const mask = masks.find(m => m.id === maskId);
            if (mask) return mask;
        }
        return undefined;
    }

    /**
     * Enable/disable mask
     */
    setMaskEnabled(maskId: string, enabled: boolean): void {
        const { mask, layerId } = this.findMask(maskId);
        if (!mask) return;

        mask.enabled = enabled;
        this.emit('mask:enabled', { maskId, layerId, enabled });
    }

    /**
     * Invert mask
     */
    setMaskInverted(maskId: string, inverted: boolean): void {
        const { mask, layerId } = this.findMask(maskId);
        if (!mask) return;

        mask.inverted = inverted;
        this.emit('mask:inverted', { maskId, layerId, inverted });
    }

    /**
     * Link/unlink mask to layer
     */
    setMaskLinked(maskId: string, linked: boolean): void {
        const { mask, layerId } = this.findMask(maskId);
        if (!mask) return;

        mask.linkedToLayer = linked;
        this.emit('mask:linked', { maskId, layerId, linked });
    }

    /**
     * Update mask properties
     */
    updateMask(maskId: string, changes: Partial<BaseMask>): void {
        const { mask, layerId } = this.findMask(maskId);
        if (!mask) return;

        Object.assign(mask, changes);
        this.emit('mask:updated', { mask, layerId, changes });
    }

    /**
     * Delete mask
     */
    deleteMask(maskId: string): void {
        for (const [layerId, masks] of this.masks.entries()) {
            const idx = masks.findIndex(m => m.id === maskId);
            if (idx !== -1) {
                masks.splice(idx, 1);
                this.emit('mask:deleted', { maskId, layerId });
                return;
            }
        }
    }

    /**
     * Delete all masks for a layer
     */
    deleteLayerMasks(layerId: string): void {
        const masks = this.masks.get(layerId);
        if (masks) {
            for (const mask of masks) {
                this.emit('mask:deleted', { maskId: mask.id, layerId });
            }
            this.masks.delete(layerId);
        }
    }

    /**
     * Duplicate mask
     */
    duplicateMask(maskId: string, targetLayerId?: string): Mask | undefined {
        const { mask, layerId } = this.findMask(maskId);
        if (!mask) return undefined;

        const newMask = {
            ...mask,
            id: this.generateId(),
        };

        // Deep copy for raster masks
        if (mask.type === MaskType.RASTER && (mask as RasterMask).data) {
            (newMask as RasterMask).data = new Uint8ClampedArray((mask as RasterMask).data!);
        }

        // Deep copy for vector masks
        if (mask.type === MaskType.VECTOR) {
            (newMask as VectorMask).path = JSON.parse(JSON.stringify((mask as VectorMask).path));
        }

        const target = targetLayerId ?? layerId;
        this.addMaskToLayer(target, newMask);
        this.emit('mask:created', { mask: newMask, layerId: target });

        return newMask;
    }

    /**
     * Combine two masks
     */
    combineMasks(
        maskId1: string,
        maskId2: string,
        operation: MaskOperation
    ): RasterMask | undefined {
        const { mask: mask1, layerId: layerId1 } = this.findMask(maskId1);
        const { mask: mask2 } = this.findMask(maskId2);

        if (!mask1 || !mask2) return undefined;

        // Convert both masks to raster for combination
        const raster1 = this.convertToRaster(mask1);
        const raster2 = this.convertToRaster(mask2);

        if (!raster1?.data || !raster2?.data) return undefined;

        // Ensure same dimensions
        if (raster1.width !== raster2.width || raster1.height !== raster2.height) {
            console.warn('Masks must have same dimensions for combination');
            return undefined;
        }

        const result = new Uint8ClampedArray(raster1.width * raster1.height);

        for (let i = 0; i < result.length; i++) {
            const v1 = raster1.data[i] / 255;
            const v2 = raster2.data[i] / 255;

            let combined: number;
            switch (operation) {
                case 'add':
                    combined = Math.min(1, v1 + v2);
                    break;
                case 'subtract':
                    combined = Math.max(0, v1 - v2);
                    break;
                case 'intersect':
                    combined = v1 * v2;
                    break;
                case 'exclude':
                    combined = Math.abs(v1 - v2);
                    break;
                default:
                    combined = v1;
            }

            result[i] = Math.round(combined * 255);
        }

        const newMask = this.createRasterMask(layerId1, raster1.width, raster1.height);
        newMask.data = result;

        return newMask;
    }

    /**
     * Apply mask to image data
     */
    applyMaskToImageData(imageData: ImageData, mask: Mask): ImageData {
        const rasterMask = this.convertToRaster(mask);
        if (!rasterMask?.data) return imageData;

        const result = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        const { data, inverted, density, feather } = rasterMask;
        const densityFactor = density / 100;

        // Apply feather if needed
        let processedData = data;
        if (feather > 0) {
            processedData = this.gaussianBlur(data, rasterMask.width, rasterMask.height, feather);
        }

        for (let i = 0; i < result.width * result.height; i++) {
            let maskValue = processedData[i] / 255;

            if (inverted) {
                maskValue = 1 - maskValue;
            }

            maskValue *= densityFactor;

            // Apply mask to alpha channel
            const pixelIdx = i * 4 + 3;
            result.data[pixelIdx] = Math.round(result.data[pixelIdx] * maskValue);
        }

        return result;
    }

    // ========================================================================
    // Path Creation Helpers
    // ========================================================================

    private createRectanglePath(
        x: number,
        y: number,
        width: number,
        height: number,
        cornerRadius: number = 0
    ): VectorPath {
        const segments: PathSegment[] = [];

        if (cornerRadius <= 0) {
            // Simple rectangle
            segments.push(
                { type: PathSegmentType.MOVE, points: [{ x, y }] },
                { type: PathSegmentType.LINE, points: [{ x: x + width, y }] },
                { type: PathSegmentType.LINE, points: [{ x: x + width, y: y + height }] },
                { type: PathSegmentType.LINE, points: [{ x, y: y + height }] },
                { type: PathSegmentType.CLOSE, points: [] }
            );
        } else {
            // Rounded rectangle
            const r = Math.min(cornerRadius, width / 2, height / 2);
            const k = 0.5522847498; // Bezier curve approximation for circles

            segments.push(
                { type: PathSegmentType.MOVE, points: [{ x: x + r, y }] },
                { type: PathSegmentType.LINE, points: [{ x: x + width - r, y }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: x + width - r + r * k, y },
                        { x: x + width, y: y + r - r * k },
                        { x: x + width, y: y + r }
                    ]
                },
                { type: PathSegmentType.LINE, points: [{ x: x + width, y: y + height - r }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: x + width, y: y + height - r + r * k },
                        { x: x + width - r + r * k, y: y + height },
                        { x: x + width - r, y: y + height }
                    ]
                },
                { type: PathSegmentType.LINE, points: [{ x: x + r, y: y + height }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x: x + r - r * k, y: y + height },
                        { x, y: y + height - r + r * k },
                        { x, y: y + height - r }
                    ]
                },
                { type: PathSegmentType.LINE, points: [{ x, y: y + r }] },
                {
                    type: PathSegmentType.BEZIER,
                    points: [
                        { x, y: y + r - r * k },
                        { x: x + r - r * k, y },
                        { x: x + r, y }
                    ]
                },
                { type: PathSegmentType.CLOSE, points: [] }
            );
        }

        return {
            id: this.generateId(),
            segments,
            closed: true,
            fillColor: null,
            strokeColor: null,
            strokeWidth: 0,
        };
    }

    private createEllipsePath(
        cx: number,
        cy: number,
        rx: number,
        ry: number
    ): VectorPath {
        const k = 0.5522847498; // Bezier curve approximation for circles

        const segments: PathSegment[] = [
            { type: PathSegmentType.MOVE, points: [{ x: cx, y: cy - ry }] },
            {
                type: PathSegmentType.BEZIER,
                points: [
                    { x: cx + rx * k, y: cy - ry },
                    { x: cx + rx, y: cy - ry * k },
                    { x: cx + rx, y: cy }
                ]
            },
            {
                type: PathSegmentType.BEZIER,
                points: [
                    { x: cx + rx, y: cy + ry * k },
                    { x: cx + rx * k, y: cy + ry },
                    { x: cx, y: cy + ry }
                ]
            },
            {
                type: PathSegmentType.BEZIER,
                points: [
                    { x: cx - rx * k, y: cy + ry },
                    { x: cx - rx, y: cy + ry * k },
                    { x: cx - rx, y: cy }
                ]
            },
            {
                type: PathSegmentType.BEZIER,
                points: [
                    { x: cx - rx, y: cy - ry * k },
                    { x: cx - rx * k, y: cy - ry },
                    { x: cx, y: cy - ry }
                ]
            },
            { type: PathSegmentType.CLOSE, points: [] }
        ];

        return {
            id: this.generateId(),
            segments,
            closed: true,
            fillColor: null,
            strokeColor: null,
            strokeWidth: 0,
        };
    }

    private createPolygonPath(points: Point[], closed: boolean): VectorPath {
        if (points.length < 2) {
            return {
                id: this.generateId(),
                segments: [],
                closed: false,
                fillColor: null,
                strokeColor: null,
                strokeWidth: 0,
            };
        }

        const segments: PathSegment[] = [
            { type: PathSegmentType.MOVE, points: [points[0]] },
        ];

        for (let i = 1; i < points.length; i++) {
            segments.push({ type: PathSegmentType.LINE, points: [points[i]] });
        }

        if (closed) {
            segments.push({ type: PathSegmentType.CLOSE, points: [] });
        }

        return {
            id: this.generateId(),
            segments,
            closed,
            fillColor: null,
            strokeColor: null,
            strokeWidth: 0,
        };
    }

    // ========================================================================
    // Image Processing Helpers
    // ========================================================================

    private gaussianBlur(
        data: Uint8ClampedArray,
        width: number,
        height: number,
        radius: number
    ): Uint8ClampedArray {
        // Create Gaussian kernel
        const kernelSize = Math.ceil(radius * 2) * 2 + 1;
        const kernel = new Float32Array(kernelSize);
        const sigma = radius / 2;
        let sum = 0;

        for (let i = 0; i < kernelSize; i++) {
            const x = i - Math.floor(kernelSize / 2);
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
            sum += kernel[i];
        }

        // Normalize kernel
        for (let i = 0; i < kernelSize; i++) {
            kernel[i] /= sum;
        }

        // Horizontal pass
        const temp = new Float32Array(width * height);
        const halfKernel = Math.floor(kernelSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let value = 0;
                for (let k = 0; k < kernelSize; k++) {
                    const px = Math.min(Math.max(0, x + k - halfKernel), width - 1);
                    value += data[y * width + px] * kernel[k];
                }
                temp[y * width + x] = value;
            }
        }

        // Vertical pass
        const result = new Uint8ClampedArray(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let value = 0;
                for (let k = 0; k < kernelSize; k++) {
                    const py = Math.min(Math.max(0, y + k - halfKernel), height - 1);
                    value += temp[py * width + x] * kernel[k];
                }
                result[y * width + x] = Math.round(value);
            }
        }

        return result;
    }

    private convertToRaster(mask: Mask): RasterMask | null {
        if (mask.type === MaskType.RASTER) {
            return mask as RasterMask;
        }

        if (mask.type === MaskType.VECTOR) {
            // For vector masks, we would need canvas to rasterize
            // This is a simplified version
            console.warn('Vector to raster conversion requires canvas context');
            return null;
        }

        return null;
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    private generateId(): string {
        return `mask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private addMaskToLayer(layerId: string, mask: Mask): void {
        if (!this.masks.has(layerId)) {
            this.masks.set(layerId, []);
        }
        this.masks.get(layerId)!.push(mask);
    }

    private findMask(maskId: string): { mask: Mask | undefined; layerId: string } {
        for (const [layerId, masks] of this.masks.entries()) {
            const mask = masks.find(m => m.id === maskId);
            if (mask) return { mask, layerId };
        }
        return { mask: undefined, layerId: '' };
    }

    /**
     * Serialize masks for saving
     */
    serialize(): Record<string, unknown> {
        const serialized: Record<string, unknown[]> = {};

        for (const [layerId, masks] of this.masks.entries()) {
            serialized[layerId] = masks.map(mask => {
                if (mask.type === MaskType.RASTER && (mask as RasterMask).data) {
                    // Convert Uint8ClampedArray to base64 for storage
                    const rasterMask = mask as RasterMask;
                    return {
                        ...mask,
                        data: this.uint8ArrayToBase64(rasterMask.data!),
                    };
                }
                return mask;
            });
        }

        return {
            masks: serialized,
            quickMask: this.quickMask,
        };
    }

    /**
     * Deserialize masks from saved data
     */
    deserialize(data: Record<string, unknown>): void {
        const { masks, quickMask } = data as {
            masks: Record<string, Mask[]>;
            quickMask: QuickMask | null;
        };

        this.masks.clear();

        for (const [layerId, layerMasks] of Object.entries(masks)) {
            const deserializedMasks = layerMasks.map(mask => {
                if (mask.type === MaskType.RASTER && typeof (mask as unknown as { data: string }).data === 'string') {
                    return {
                        ...mask,
                        data: this.base64ToUint8Array((mask as unknown as { data: string }).data),
                    };
                }
                return mask;
            });
            this.masks.set(layerId, deserializedMasks);
        }

        this.quickMask = quickMask;
    }

    private uint8ArrayToBase64(array: Uint8ClampedArray): string {
        let binary = '';
        for (let i = 0; i < array.length; i++) {
            binary += String.fromCharCode(array[i]);
        }
        return btoa(binary);
    }

    private base64ToUint8Array(base64: string): Uint8ClampedArray {
        const binary = atob(base64);
        const array = new Uint8ClampedArray(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return array;
    }

    /**
     * Clear all masks
     */
    clear(): void {
        for (const [layerId, masks] of this.masks.entries()) {
            for (const mask of masks) {
                this.emit('mask:deleted', { maskId: mask.id, layerId });
            }
        }
        this.masks.clear();
        this.quickMask = null;
    }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMaskManager(): MaskManager {
    return new MaskManager();
}
