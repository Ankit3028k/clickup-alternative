import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://clickup-alternative.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
