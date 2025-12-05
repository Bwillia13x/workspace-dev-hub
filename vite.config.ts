import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, 'components'),
        '@services': path.resolve(__dirname, 'services'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
      }
    },
    build: {
      // Code splitting configuration - let Vite handle chunking automatically
      rollupOptions: {
        output: {
          // Use automatic chunking with vendor separation
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Separate larger vendor packages
              if (id.includes('@google/genai')) {
                return 'ai-vendor';
              }
              // Group other node_modules as vendor
              return 'vendor';
            }
          },
        },
      },
      // Target modern browsers for smaller bundles
      target: 'es2022',
      // Generate source maps for production debugging
      sourcemap: true,
      // Minification settings
      minify: 'esbuild',
      // Chunk size warnings
      chunkSizeWarningLimit: 500,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@google/genai'],
    },
  };
});
