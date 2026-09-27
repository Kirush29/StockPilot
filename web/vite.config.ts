import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Restrict dep-scan to only the active app entry point,
    // preventing Vite from also scanning the legacy web/stockpilot-web/index.html
    entries: ['index.html'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  }
})
