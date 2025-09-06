import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true }
    },
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
