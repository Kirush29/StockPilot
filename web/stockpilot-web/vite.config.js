import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // The live end-to-end run is opt-in: npm run test:e2e (needs a running API).
    exclude: ['node_modules', 'dist', 'e2e/**'],
    restoreMocks: true,
  },
})
