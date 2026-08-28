import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Split the vendor + chart libs out of the main bundle so the
    // initial JS payload is smaller (L13 from the 2026-08-28 audit).
    // `react` stays in its own chunk so it's cacheable across deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['lightweight-charts'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: '0.0.0.0',
    // Accept requests proxied through nginx from goexchange.top (and
    // its www subdomain + the localhost variants used by tests).
    allowedHosts: [
      'goexchange.top',
      'www.goexchange.top',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8099',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8099',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})