import axios from 'axios'

/**
 * AUTH-INTEGRATION-POINT
 * ─────────────────────────────────────────────────────────────────────────────
 * The request interceptor below calls getAuthToken() to attach the JWT.
 *
 * What the auth team must do:
 *   Replace the getAuthToken() function body to return the real JWT string.
 *   Example implementations:
 *     - return localStorage.getItem('stockpilot_token')
 *     - return sessionStorage.getItem('token')
 *     - return yourAuthLibrary.getAccessToken()
 *
 * The interceptor already handles the Authorization header format.
 * No other changes to this file are needed once getAuthToken() is wired up.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// TODO [AUTH-TEAM]: Replace this function body with your real token retrieval.
function getAuthToken() {
  return null
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5257',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor — attach JWT when available
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle auth errors consistently
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO [AUTH-TEAM]: Redirect to login or trigger token refresh here.
      console.warn('StockPilot API: 401 Unauthorized — no valid token present.')
    }
    if (error.response?.status === 403) {
      console.warn('StockPilot API: 403 Forbidden — insufficient role for this action.')
    }
    return Promise.reject(error)
  }
)

export default apiClient
