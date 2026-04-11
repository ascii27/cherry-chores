import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_API_URL || 'http://localhost:3000';

// Paths that should be proxied to the Express API in dev mode.
// In production the API serves web/dist directly so no proxy is needed.
const proxyPaths = [
  '/api',
  '/auth',
  '/uploads',
  '/bank',
  '/children',
  '/chores',
  '/families',
  '/savers',
  '/bonuses',
  '/me',
  '/config',
  '/healthz',
  '/version',
  '/tokens',
];

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: Object.fromEntries(
      proxyPaths.map((p) => [p, { target: API_TARGET, changeOrigin: true }])
    ),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});
