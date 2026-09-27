import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Live end-to-end run against a real API (no MSW). Requires E2E_API_URL and E2E_STATE_FILE;
// see scripts/e2e/run-replenishment-e2e.sh (run from web/).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./e2e/setup.js'],
    include: ['e2e/**/*.e2e.test.{js,jsx}'],
    env: { VITE_API_BASE_URL: process.env.E2E_API_URL ?? '' },
    sequence: { concurrent: false },
    testTimeout: 30000,
  },
})
