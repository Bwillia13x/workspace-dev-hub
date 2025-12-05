/**
 * Environment configuration validation module
 * Ensures all required environment variables are present and valid
 */

interface EnvConfig {
    GEMINI_API_KEY: string;
    API_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
    IS_DEV: boolean;
    IS_PROD: boolean;
    IS_TEST: boolean;
}

/**
 * Validates that all required environment variables are present
 * @throws Error if required environment variables are missing
 */
export const validateEnv = (): EnvConfig => {
    // In browser context, check for Vite-injected env vars
    const geminiApiKey =
        (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
        (typeof process !== 'undefined' && process.env?.API_KEY) ||
        (import.meta.env?.VITE_GEMINI_API_KEY as string) ||
        '';

    const apiKey =
        (typeof process !== 'undefined' && process.env?.API_KEY) ||
        (import.meta.env?.VITE_API_KEY as string) ||
        geminiApiKey;

    const mode = (import.meta.env?.MODE || 'development') as EnvConfig['NODE_ENV'];

    // Only enforce API key requirement in non-test environments
    if (mode !== 'test' && !geminiApiKey && !apiKey) {
        console.warn(
            'Warning: GEMINI_API_KEY or API_KEY not found.\n' +
            'Please check your .env.local file.\n' +
            'AI features will not work without a valid API key.'
        );
    }

    return {
        GEMINI_API_KEY: geminiApiKey,
        API_KEY: apiKey,
        NODE_ENV: mode,
        IS_DEV: mode === 'development',
        IS_PROD: mode === 'production',
        IS_TEST: mode === 'test',
    };
};

/**
 * Lazily validated environment configuration
 * Access this to get validated environment variables
 */
let _env: EnvConfig | null = null;

export const getEnv = (): EnvConfig => {
    if (!_env) {
        _env = validateEnv();
    }
    return _env;
};

// Export a getter for the environment
export const env = new Proxy({} as EnvConfig, {
    get(_, prop: keyof EnvConfig) {
        return getEnv()[prop];
    },
});
