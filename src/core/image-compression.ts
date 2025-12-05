/**
 * Image Compression Utilities
 * 
 * Provides utilities for compressing and optimizing images before
 * sending to the AI API or storing locally, reducing bandwidth and
 * improving performance.
 */

import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    /** Maximum file size in MB (default: 1) */
    maxSizeMB?: number;
    /** Maximum width or height in pixels (default: 1920) */
    maxWidthOrHeight?: number;
    /** Use web worker for compression (default: true) */
    useWebWorker?: boolean;
    /** Initial quality for JPEG/WebP (0-1, default: 0.8) */
    initialQuality?: number;
    /** File type to convert to (optional) */
    fileType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressionResult {
    /** Compressed image as File object */
    file: File;
    /** Compressed image as base64 data URL */
    base64: string;
    /** Original file size in bytes */
    originalSize: number;
    /** Compressed file size in bytes */
    compressedSize: number;
    /** Compression ratio (0-1, lower is better) */
    compressionRatio: number;
    /** Time taken to compress in milliseconds */
    compressionTimeMs: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: 'image/jpeg',
};

/**
 * Compress an image file with the specified options.
 * 
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compression result
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<CompressionResult> {
    const startTime = performance.now();
    const originalSize = file.size;

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    try {
        const compressedFile = await imageCompression(file, {
            maxSizeMB: mergedOptions.maxSizeMB,
            maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
            useWebWorker: mergedOptions.useWebWorker,
            initialQuality: mergedOptions.initialQuality,
            fileType: mergedOptions.fileType,
        });

        const base64 = await fileToBase64(compressedFile);
        const compressionTimeMs = performance.now() - startTime;

        return {
            file: compressedFile,
            base64,
            originalSize,
            compressedSize: compressedFile.size,
            compressionRatio: compressedFile.size / originalSize,
            compressionTimeMs,
        };
    } catch (error) {
        throw new ImageCompressionError(
            `Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error
        );
    }
}

/**
 * Compress an image from a base64 string.
 * 
 * @param base64 - Base64 encoded image (with or without data URL prefix)
 * @param filename - Optional filename for the resulting file
 * @param options - Compression options
 * @returns Promise resolving to compression result
 */
export async function compressBase64Image(
    base64: string,
    filename: string = 'image.jpg',
    options: CompressionOptions = {}
): Promise<CompressionResult> {
    const file = await base64ToFile(base64, filename);
    return compressImage(file, options);
}

/**
 * Convert a File to base64 data URL.
 * 
 * @param file - The file to convert
 * @returns Promise resolving to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = () => {
            reject(new ImageCompressionError('Failed to read file as base64'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Convert a base64 string to a File object.
 * 
 * @param base64 - Base64 string (with or without data URL prefix)
 * @param filename - Filename for the resulting file
 * @returns Promise resolving to File object
 */
export async function base64ToFile(base64: string, filename: string): Promise<File> {
    // Handle both data URL format and raw base64
    let dataUrl = base64;
    if (!base64.startsWith('data:')) {
        // Assume JPEG if no mime type provided
        dataUrl = `data:image/jpeg;base64,${base64}`;
    }

    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const mimeType = blob.type || 'image/jpeg';
        return new File([blob], filename, { type: mimeType });
    } catch (error) {
        throw new ImageCompressionError(
            'Failed to convert base64 to File',
            error
        );
    }
}

/**
 * Extract the raw base64 data from a data URL.
 * 
 * @param dataUrl - The data URL to extract from
 * @returns The raw base64 string without prefix
 */
export function extractBase64Data(dataUrl: string): string {
    const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (match) {
        return match[1];
    }
    // Already raw base64
    return dataUrl;
}

/**
 * Get the MIME type from a data URL.
 * 
 * @param dataUrl - The data URL to extract from
 * @returns The MIME type or null if not found
 */
export function getMimeType(dataUrl: string): string | null {
    const match = dataUrl.match(/^data:([^;]+);base64,/);
    return match ? match[1] : null;
}

/**
 * Calculate the approximate file size from a base64 string.
 * 
 * @param base64 - The base64 string (with or without data URL prefix)
 * @returns Approximate size in bytes
 */
export function calculateBase64Size(base64: string): number {
    const rawBase64 = extractBase64Data(base64);
    // Base64 encoding increases size by ~33%
    // Each base64 character represents 6 bits, so 4 characters = 3 bytes
    const padding = (rawBase64.match(/=/g) || []).length;
    return Math.floor((rawBase64.length * 3) / 4) - padding;
}

/**
 * Check if compression would be beneficial for the given file.
 * 
 * @param file - The file to check
 * @param thresholdKB - Size threshold in KB (default: 500)
 * @returns True if compression is recommended
 */
export function shouldCompress(file: File, thresholdKB: number = 500): boolean {
    return file.size > thresholdKB * 1024;
}

/**
 * Create an optimized thumbnail from an image.
 * 
 * @param file - The image file
 * @param maxSize - Maximum width/height in pixels (default: 200)
 * @returns Promise resolving to thumbnail compression result
 */
export async function createThumbnail(
    file: File,
    maxSize: number = 200
): Promise<CompressionResult> {
    return compressImage(file, {
        maxSizeMB: 0.05, // 50KB max for thumbnails
        maxWidthOrHeight: maxSize,
        initialQuality: 0.7,
    });
}

/**
 * Custom error class for image compression errors.
 */
export class ImageCompressionError extends Error {
    public readonly cause: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = 'ImageCompressionError';
        this.cause = cause;
    }
}

/**
 * Presets for common compression scenarios.
 */
export const CompressionPresets = {
    /** High quality, larger file size - good for final images */
    highQuality: {
        maxSizeMB: 2,
        maxWidthOrHeight: 2560,
        initialQuality: 0.9,
    } as CompressionOptions,

    /** Balanced quality and size - good for most use cases */
    balanced: {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        initialQuality: 0.8,
    } as CompressionOptions,

    /** Optimized for API calls - smaller size */
    apiOptimized: {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        initialQuality: 0.75,
    } as CompressionOptions,

    /** Thumbnail preset - very small */
    thumbnail: {
        maxSizeMB: 0.05,
        maxWidthOrHeight: 200,
        initialQuality: 0.7,
    } as CompressionOptions,

    /** Preview images - quick loading */
    preview: {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        initialQuality: 0.7,
    } as CompressionOptions,
} as const;
