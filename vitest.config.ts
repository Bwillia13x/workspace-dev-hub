import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.config.*',
                '**/*.d.ts',
                '**/test/**',
                '**/__tests__/**',
            ],
            thresholds: {
                lines: 75,
                functions: 75,
                branches: 65,
                statements: 75,
            },
        },
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            '@components': path.resolve(__dirname, './components'),
            '@services': path.resolve(__dirname, './services'),
            '@types': path.resolve(__dirname, './types'),
            '@core': path.resolve(__dirname, './src/core'),
        },
    },
});
