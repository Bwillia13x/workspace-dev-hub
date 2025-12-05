import { describe, it, expect } from 'vitest';
import {
    ValidationError,
    sanitizePrompt,
    validateImageBase64,
    validateRawBase64,
    validatePrice,
    validateProductName,
    validateProductDescription,
    sanitizeForDisplay,
    validateUUID,
    generateUUID,
    validateEmail,
    validateURL,
} from '../../core/validation';

describe('Validation Utilities', () => {
    describe('ValidationError', () => {
        it('should create a validation error with message', () => {
            const error = new ValidationError('Test error');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('ValidationError');
        });

        it('should create a validation error with field', () => {
            const error = new ValidationError('Invalid value', 'fieldName');
            expect(error.field).toBe('fieldName');
        });
    });

    describe('sanitizePrompt', () => {
        it('should pass through clean prompts', () => {
            const prompt = 'A beautiful summer dress in blue';
            expect(sanitizePrompt(prompt)).toBe(prompt);
        });

        it('should remove HTML tags', () => {
            const prompt = '<script>alert("xss")</script>A dress';
            expect(sanitizePrompt(prompt)).toBe('alert("xss")A dress');
        });

        it('should remove javascript: protocol', () => {
            const prompt = 'javascript:alert(1) A dress';
            expect(sanitizePrompt(prompt)).toBe('alert(1) A dress');
        });

        it('should remove event handlers', () => {
            const prompt = 'onclick= A dress with patterns';
            expect(sanitizePrompt(prompt)).toBe('A dress with patterns');
        });

        it('should truncate long prompts', () => {
            const longPrompt = 'A'.repeat(3000);
            expect(sanitizePrompt(longPrompt).length).toBe(2000);
        });

        it('should trim whitespace', () => {
            const prompt = '   A dress   ';
            expect(sanitizePrompt(prompt)).toBe('A dress');
        });

        it('should throw for non-string input', () => {
            expect(() => sanitizePrompt(123 as unknown as string)).toThrow(ValidationError);
        });

        it('should throw for empty string', () => {
            expect(() => sanitizePrompt('')).toThrow(ValidationError);
        });

        it('should throw for whitespace-only string', () => {
            expect(() => sanitizePrompt('   ')).toThrow(ValidationError);
        });
    });

    describe('validateImageBase64', () => {
        it('should validate PNG data URL', () => {
            const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            expect(validateImageBase64(validPng)).toBe(true);
        });

        it('should validate JPEG data URL', () => {
            const validJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==';
            expect(validateImageBase64(validJpeg)).toBe(true);
        });

        it('should validate WebP data URL', () => {
            const validWebp = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4IA4AAAAwAQCdASoBAAEAAIAMJYgCdAEO/g==';
            expect(validateImageBase64(validWebp)).toBe(true);
        });

        it('should reject non-image data URLs', () => {
            const textDataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
            expect(validateImageBase64(textDataUrl)).toBe(false);
        });

        it('should reject invalid base64', () => {
            expect(validateImageBase64('not-a-data-url')).toBe(false);
        });

        it('should reject non-string input', () => {
            expect(validateImageBase64(null as unknown as string)).toBe(false);
            expect(validateImageBase64(undefined as unknown as string)).toBe(false);
            expect(validateImageBase64(123 as unknown as string)).toBe(false);
        });
    });

    describe('validateRawBase64', () => {
        it('should validate raw base64 string', () => {
            const validBase64 = 'SGVsbG8gV29ybGQ=';
            expect(validateRawBase64(validBase64)).toBe(true);
        });

        it('should reject invalid characters', () => {
            expect(validateRawBase64('SGVsbG8@V29ybGQ=')).toBe(false);
        });

        it('should reject invalid length', () => {
            expect(validateRawBase64('SGVsbG8')).toBe(false); // Not multiple of 4
        });

        it('should reject non-string input', () => {
            expect(validateRawBase64(null as unknown as string)).toBe(false);
        });
    });

    describe('validatePrice', () => {
        it('should validate zero price', () => {
            expect(validatePrice(0)).toBe(true);
        });

        it('should validate positive price', () => {
            expect(validatePrice(99.99)).toBe(true);
        });

        it('should validate max price', () => {
            expect(validatePrice(1000000)).toBe(true);
        });

        it('should reject negative price', () => {
            expect(validatePrice(-1)).toBe(false);
        });

        it('should reject price over max', () => {
            expect(validatePrice(1000001)).toBe(false);
        });

        it('should reject NaN', () => {
            expect(validatePrice(NaN)).toBe(false);
        });

        it('should reject Infinity', () => {
            expect(validatePrice(Infinity)).toBe(false);
        });

        it('should reject non-number', () => {
            expect(validatePrice('100' as unknown as number)).toBe(false);
        });
    });

    describe('validateProductName', () => {
        it('should validate normal name', () => {
            expect(validateProductName('Summer Dress')).toBe(true);
        });

        it('should validate name at max length', () => {
            expect(validateProductName('A'.repeat(200))).toBe(true);
        });

        it('should reject empty name', () => {
            expect(validateProductName('')).toBe(false);
        });

        it('should reject whitespace-only name', () => {
            expect(validateProductName('   ')).toBe(false);
        });

        it('should reject name over max length', () => {
            expect(validateProductName('A'.repeat(201))).toBe(false);
        });

        it('should reject non-string', () => {
            expect(validateProductName(123 as unknown as string)).toBe(false);
        });
    });

    describe('validateProductDescription', () => {
        it('should validate normal description', () => {
            expect(validateProductDescription('A beautiful summer dress made of silk')).toBe(true);
        });

        it('should validate description at max length', () => {
            expect(validateProductDescription('A'.repeat(2000))).toBe(true);
        });

        it('should reject empty description', () => {
            expect(validateProductDescription('')).toBe(false);
        });

        it('should reject description over max length', () => {
            expect(validateProductDescription('A'.repeat(2001))).toBe(false);
        });
    });

    describe('sanitizeForDisplay', () => {
        it('should escape HTML entities', () => {
            expect(sanitizeForDisplay('<script>')).toBe('&lt;script&gt;');
        });

        it('should escape ampersands', () => {
            expect(sanitizeForDisplay('A & B')).toBe('A &amp; B');
        });

        it('should escape quotes', () => {
            expect(sanitizeForDisplay('"test"')).toBe('&quot;test&quot;');
            expect(sanitizeForDisplay("'test'")).toBe('&#039;test&#039;');
        });

        it('should return empty string for non-string', () => {
            expect(sanitizeForDisplay(null as unknown as string)).toBe('');
        });
    });

    describe('validateUUID', () => {
        it('should validate valid UUID v4', () => {
            expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
            expect(validateUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
        });

        it('should reject invalid UUID', () => {
            expect(validateUUID('not-a-uuid')).toBe(false);
            expect(validateUUID('550e8400-e29b-51d4-a716-446655440000')).toBe(false); // Version 5
            expect(validateUUID('')).toBe(false);
        });

        it('should reject non-string', () => {
            expect(validateUUID(123 as unknown as string)).toBe(false);
        });
    });

    describe('generateUUID', () => {
        it('should generate valid UUID v4', () => {
            const uuid = generateUUID();
            expect(validateUUID(uuid)).toBe(true);
        });

        it('should generate unique UUIDs', () => {
            const uuids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                uuids.add(generateUUID());
            }
            expect(uuids.size).toBe(100);
        });
    });

    describe('validateEmail', () => {
        it('should validate normal email', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name@domain.co.uk')).toBe(true);
        });

        it('should reject invalid email', () => {
            expect(validateEmail('not-an-email')).toBe(false);
            expect(validateEmail('@domain.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
            expect(validateEmail('')).toBe(false);
        });

        it('should reject email over max length', () => {
            const longEmail = 'a'.repeat(250) + '@b.com';
            expect(validateEmail(longEmail)).toBe(false);
        });
    });

    describe('validateURL', () => {
        it('should validate HTTP URLs', () => {
            expect(validateURL('http://example.com')).toBe(true);
            expect(validateURL('https://example.com/path?query=1')).toBe(true);
        });

        it('should reject non-HTTP protocols', () => {
            expect(validateURL('ftp://example.com')).toBe(false);
            expect(validateURL('javascript:alert(1)')).toBe(false);
            expect(validateURL('file:///etc/passwd')).toBe(false);
        });

        it('should reject invalid URLs', () => {
            expect(validateURL('not-a-url')).toBe(false);
            expect(validateURL('')).toBe(false);
        });
    });
});
