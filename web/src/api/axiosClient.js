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

    // Parse ValidationProblemDetails or ApiResponse errors consistently
    if (error.response?.data) {
      const data = error.response.data;

      // ValidationProblemDetails (ASP.NET Core standard)
      if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
        // Map camelCase or PascalCase keys to standard camelCase for the frontend
        error.fieldErrors = {};
        for (const [key, messages] of Object.entries(data.errors)) {
          const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
          error.fieldErrors[camelKey] = Array.isArray(messages) ? messages[0] : messages;
        }
      }

      // Determine best generic display message
      error.displayMessage =
        data.title && data.status === 400 ? 'Please correct the highlighted errors.' :
        data.message ? data.message :
        data.title ? data.title :
        'An unexpected error occurred.';
    } else {
      error.displayMessage = 'Network error or server unavailable.';
    }

    return Promise.reject(error)
  }
)

export default apiClient
