import axios from 'axios'

function getAuthToken() {
  return localStorage.getItem('stockpilot_token')
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
      localStorage.removeItem('stockpilot_token')
      localStorage.removeItem('stockpilot_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      console.warn('StockPilot API: 401 Unauthorized — no valid token present.')
    }
    if (error.response?.status === 403) {
      console.warn('StockPilot API: 403 Forbidden — insufficient role for this action.')
    }
    return Promise.reject(error)
  }
)

export default apiClient
