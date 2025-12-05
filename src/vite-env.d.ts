/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_API_KEY: string;
    readonly VITE_AMPLITUDE_API_KEY: string;
    readonly VITE_SENTRY_DSN: string;
    readonly MODE: 'development' | 'production' | 'test';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
