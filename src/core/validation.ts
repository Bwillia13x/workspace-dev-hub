/**
 * Input validation utilities for security hardening
 * Provides sanitization and validation for user inputs
 */

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Sanitizes user prompt input to prevent injection attacks
 * @param prompt - Raw user input prompt
 * @returns Sanitized prompt string
 * @throws ValidationError if prompt is invalid
 */
export const sanitizePrompt = (prompt: string): string => {
    if (typeof prompt !== 'string') {
        throw new ValidationError('Prompt must be a string', 'prompt');
    }

    if (!prompt.trim()) {
        throw new ValidationError('Prompt cannot be empty', 'prompt');
    }

    // Remove potentially harmful content
    const sanitized = prompt
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .slice(0, 2000) // Max length to prevent DoS
        .trim();

    if (!sanitized) {
        throw new ValidationError('Prompt cannot be empty after sanitization', 'prompt');
    }

    return sanitized;
};

/**
 * Validates if a string is a valid base64 image data URL
 * @param image - String to validate
 * @returns true if valid base64 image
 */
export const validateImageBase64 = (image: string): boolean => {
    if (typeof image !== 'string') return false;

    // Check if it's a valid base64 image data URL
    const base64Regex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
    return base64Regex.test(image);
};

/**
 * Validates if a raw base64 string is valid (without data URL prefix)
 * @param base64 - Raw base64 string to validate
 * @returns true if valid base64
 */
export const validateRawBase64 = (base64: string): boolean => {
    if (typeof base64 !== 'string') return false;

    // Check basic base64 pattern
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(base64)) return false;

    // Check length is valid (base64 length must be multiple of 4)
    return base64.length % 4 === 0;
};

/**
 * Validates product price
 * @param price - Price value to validate
 * @returns true if valid price
 */
export const validatePrice = (price: number): boolean => {
    return (
        typeof price === 'number' &&
        !isNaN(price) &&
        isFinite(price) &&
        price >= 0 &&
        price <= 1000000
    );
};

/**
 * Validates product name
 * @param name - Product name to validate
 * @returns true if valid name
 */
export const validateProductName = (name: string): boolean => {
    if (typeof name !== 'string') return false;

    const trimmed = name.trim();
    return trimmed.length > 0 && trimmed.length <= 200;
};

/**
 * Validates product description
 * @param description - Product description to validate
 * @returns true if valid description
 */
export const validateProductDescription = (description: string): boolean => {
    if (typeof description !== 'string') return false;

    const trimmed = description.trim();
    return trimmed.length > 0 && trimmed.length <= 2000;
};

/**
 * Sanitizes a string for safe HTML display
 * @param str - String to sanitize
 * @returns Sanitized string safe for HTML
 */
export const sanitizeForDisplay = (str: string): string => {
    if (typeof str !== 'string') return '';

    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Validates UUID v4 format
 * @param id - String to validate as UUID
 * @returns true if valid UUID v4
 */
export const validateUUID = (id: string): boolean => {
    if (typeof id !== 'string') return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

/**
 * Generates a UUID v4
 * @returns A new UUID v4 string
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns true if valid email format
 */
export const validateEmail = (email: string): boolean => {
    if (typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates URL format
 * @param url - URL string to validate
 * @returns true if valid URL
 */
export const validateURL = (url: string): boolean => {
    if (typeof url !== 'string') return false;

    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};
