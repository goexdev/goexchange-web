import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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