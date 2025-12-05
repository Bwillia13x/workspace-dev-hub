/**
 * Masking Module - Professional masking system for design editing
 *
 * Provides:
 * - Vector masks (path-based, resolution independent)
 * - Raster masks (pixel-based, grayscale)
 * - Clipping masks (shape-based)
 * - Quick masks for temporary selections
 */

export {
    MaskManager,
    createMaskManager,
} from './mask-manager';

export type {
    BaseMask,
    VectorMask,
    RasterMask,
    ClippingMask,
    QuickMask,
    Mask,
    MaskOperation,
    MaskCombineOptions,
    MaskManagerEvents,
} from './mask-manager';
