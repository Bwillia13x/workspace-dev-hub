/**
 * Tests for Image Compression Utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    extractBase64Data,
    getMimeType,
    calculateBase64Size,
    shouldCompress,
    CompressionPresets,
    ImageCompressionError,
    fileToBase64,
    base64ToFile,
} from '../../core/image-compression';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
    default: vi.fn().mockImplementation(async (file: File) => {
        // Return a smaller mock file
        return new File(['compressed'], file.name, { type: file.type });
    }),
}));

describe('Image Compression Utilities', () => {
    describe('extractBase64Data', () => {
        it('should extract base64 data from data URL', () => {
            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg';
            const result = extractBase64Data(dataUrl);
            expect(result).toBe('iVBORw0KGgoAAAANSUhEUg');
        });

        it('should return raw base64 if no data URL prefix', () => {
            const rawBase64 = 'iVBORw0KGgoAAAANSUhEUg';
            const result = extractBase64Data(rawBase64);
            expect(result).toBe(rawBase64);
        });

        it('should handle JPEG data URLs', () => {
            const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ';
            const result = extractBase64Data(dataUrl);
            expect(result).toBe('/9j/4AAQSkZJRgABAQ');
        });

        it('should handle WebP data URLs', () => {
            const dataUrl = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4';
            const result = extractBase64Data(dataUrl);
            expect(result).toBe('UklGRh4AAABXRUJQVlA4');
        });
    });

    describe('getMimeType', () => {
        it('should extract MIME type from PNG data URL', () => {
            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg';
            const result = getMimeType(dataUrl);
            expect(result).toBe('image/png');
        });

        it('should extract MIME type from JPEG data URL', () => {
            const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg';
            const result = getMimeType(dataUrl);
            expect(result).toBe('image/jpeg');
        });

        it('should extract MIME type from WebP data URL', () => {
            const dataUrl = 'data:image/webp;base64,UklGRh4AAABXRUJQ';
            const result = getMimeType(dataUrl);
            expect(result).toBe('image/webp');
        });

        it('should return null for raw base64 without data URL', () => {
            const rawBase64 = 'iVBORw0KGgoAAAANSUhEUg';
            const result = getMimeType(rawBase64);
            expect(result).toBeNull();
        });

        it('should handle invalid data URL format', () => {
            const invalid = 'not-a-data-url';
            const result = getMimeType(invalid);
            expect(result).toBeNull();
        });
    });

    describe('calculateBase64Size', () => {
        it('should calculate correct size for base64 string', () => {
            // "Hello" in base64 is "SGVsbG8=" (5 bytes, 8 characters)
            const base64 = 'SGVsbG8=';
            const size = calculateBase64Size(base64);
            expect(size).toBe(5); // 5 bytes for "Hello"
        });

        it('should handle data URL format', () => {
            const dataUrl = 'data:image/png;base64,SGVsbG8=';
            const size = calculateBase64Size(dataUrl);
            expect(size).toBe(5);
        });

        it('should handle base64 without padding', () => {
            // "Hi" in base64 is "SGk" (2 bytes, 3 characters, no padding)
            const base64 = 'SGk';
            const size = calculateBase64Size(base64);
            expect(size).toBe(2);
        });

        it('should handle base64 with double padding', () => {
            // "H" in base64 is "SA==" (1 byte, 4 characters, 2 padding)
            const base64 = 'SA==';
            const size = calculateBase64Size(base64);
            expect(size).toBe(1);
        });

        it('should return 0 for empty string', () => {
            const size = calculateBase64Size('');
            expect(size).toBe(0);
        });
    });

    describe('shouldCompress', () => {
        it('should return true for files larger than threshold', () => {
            const largeFile = new File(['x'.repeat(600 * 1024)], 'large.jpg', { type: 'image/jpeg' });
            expect(shouldCompress(largeFile, 500)).toBe(true);
        });

        it('should return false for files smaller than threshold', () => {
            const smallFile = new File(['x'.repeat(100 * 1024)], 'small.jpg', { type: 'image/jpeg' });
            expect(shouldCompress(smallFile, 500)).toBe(false);
        });

        it('should use default threshold of 500KB', () => {
            const mediumFile = new File(['x'.repeat(400 * 1024)], 'medium.jpg', { type: 'image/jpeg' });
            expect(shouldCompress(mediumFile)).toBe(false);
        });

        it('should return true for files exactly at threshold', () => {
            const exactFile = new File(['x'.repeat(500 * 1024 + 1)], 'exact.jpg', { type: 'image/jpeg' });
            expect(shouldCompress(exactFile, 500)).toBe(true);
        });

        it('should handle custom threshold', () => {
            const file = new File(['x'.repeat(200 * 1024)], 'test.jpg', { type: 'image/jpeg' });
            expect(shouldCompress(file, 100)).toBe(true);
            expect(shouldCompress(file, 300)).toBe(false);
        });
    });

    describe('CompressionPresets', () => {
        it('should have highQuality preset', () => {
            expect(CompressionPresets.highQuality).toBeDefined();
            expect(CompressionPresets.highQuality.maxSizeMB).toBe(2);
            expect(CompressionPresets.highQuality.maxWidthOrHeight).toBe(2560);
            expect(CompressionPresets.highQuality.initialQuality).toBe(0.9);
        });

        it('should have balanced preset', () => {
            expect(CompressionPresets.balanced).toBeDefined();
            expect(CompressionPresets.balanced.maxSizeMB).toBe(1);
            expect(CompressionPresets.balanced.maxWidthOrHeight).toBe(1920);
            expect(CompressionPresets.balanced.initialQuality).toBe(0.8);
        });

        it('should have apiOptimized preset', () => {
            expect(CompressionPresets.apiOptimized).toBeDefined();
            expect(CompressionPresets.apiOptimized.maxSizeMB).toBe(0.5);
            expect(CompressionPresets.apiOptimized.maxWidthOrHeight).toBe(1280);
            expect(CompressionPresets.apiOptimized.initialQuality).toBe(0.75);
        });

        it('should have thumbnail preset', () => {
            expect(CompressionPresets.thumbnail).toBeDefined();
            expect(CompressionPresets.thumbnail.maxSizeMB).toBe(0.05);
            expect(CompressionPresets.thumbnail.maxWidthOrHeight).toBe(200);
            expect(CompressionPresets.thumbnail.initialQuality).toBe(0.7);
        });

        it('should have preview preset', () => {
            expect(CompressionPresets.preview).toBeDefined();
            expect(CompressionPresets.preview.maxSizeMB).toBe(0.2);
            expect(CompressionPresets.preview.maxWidthOrHeight).toBe(800);
            expect(CompressionPresets.preview.initialQuality).toBe(0.7);
        });
    });

    describe('ImageCompressionError', () => {
        it('should create error with message', () => {
            const error = new ImageCompressionError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('ImageCompressionError');
        });

        it('should include cause when provided', () => {
            const cause = new Error('Original error');
            const error = new ImageCompressionError('Wrapped error', cause);
            expect(error.cause).toBe(cause);
        });

        it('should be instance of Error', () => {
            const error = new ImageCompressionError('Test');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ImageCompressionError);
        });
    });

    describe('fileToBase64', () => {
        it('should convert file to base64 data URL', async () => {
            const content = 'test content';
            const file = new File([content], 'test.txt', { type: 'text/plain' });
            const result = await fileToBase64(file);
            expect(result).toMatch(/^data:text\/plain;base64,/);
        });

        it('should handle image files', async () => {
            const file = new File(['fake image data'], 'test.png', { type: 'image/png' });
            const result = await fileToBase64(file);
            expect(result).toMatch(/^data:image\/png;base64,/);
        });
    });

    describe('base64ToFile', () => {
        beforeEach(() => {
            // Mock fetch for base64 conversion
            global.fetch = vi.fn().mockImplementation(async (url: string) => {
                const base64Data = url.split(',')[1] || '';
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return {
                    blob: async () => new Blob([bytes], { type: 'image/jpeg' }),
                };
            });
        });

        it('should convert base64 data URL to File', async () => {
            const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ';
            const file = await base64ToFile(dataUrl, 'test.jpg');
            expect(file).toBeInstanceOf(File);
            expect(file.name).toBe('test.jpg');
        });

        it('should add data URL prefix if missing', async () => {
            const rawBase64 = '/9j/4AAQ';
            const file = await base64ToFile(rawBase64, 'test.jpg');
            expect(file).toBeInstanceOf(File);
        });
    });
});
