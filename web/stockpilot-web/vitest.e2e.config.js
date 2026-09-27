import { defineConfig } from 'vitest/config'

// Live end-to-end run against a real API (no MSW). Requires E2E_API_URL and E2E_STATE_FILE;
// see scripts/e2e/run-procurement-cross-client.sh.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['e2e/**/*.e2e.test.js'],
    env: { VITE_API_BASE_URL: process.env.E2E_API_URL ?? '' },
    sequence: { concurrent: false },
    testTimeout: 30000,
  },
})
