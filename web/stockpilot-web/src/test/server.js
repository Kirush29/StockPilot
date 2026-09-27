import { setupServer } from 'msw/node'

// Resolved exactly as src/api/axiosClient.js does, so handlers match whatever .env sets.
export const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5257'

export const server = setupServer()
