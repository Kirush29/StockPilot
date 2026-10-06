import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Tailwind serves the Sales, Supplier and Users modules (src/modules); see src/styles/tailwind.css.
  plugins: [react(), tailwindcss()],
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
