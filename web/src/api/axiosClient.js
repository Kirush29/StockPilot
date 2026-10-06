import axios from 'axios'

function getAuthToken() {
  return sessionStorage.getItem('stockpilot_token') || localStorage.getItem('stockpilot_token')
}

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL
const resolvedBaseUrl = rawBaseUrl && rawBaseUrl.trim() !== ''
  ? rawBaseUrl.trim().replace(/\/+$/, '')
  : (import.meta.env.DEV ? 'http://localhost:5257' : '')

const apiClient = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
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
      sessionStorage.removeItem('stockpilot_token')
      sessionStorage.removeItem('stockpilot_user')
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
      if (data.errors && typeof data.errors === 'object') {
        if (!Array.isArray(data.errors)) {
          // Map camelCase or PascalCase keys (and strip JSON-path prefixes like "$.") to standard camelCase for the frontend
          error.fieldErrors = {};
          for (const [key, messages] of Object.entries(data.errors)) {
            const cleanKey = key.replace(/^\$\.?/, '').replace(/^\[['"]?/, '').replace(/['"]?\]$/, '');
            const camelKey = cleanKey ? (cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1)) : key;
            let rawMsg = Array.isArray(messages) ? messages[0] : messages;
            if (typeof rawMsg === 'string') {
              if (rawMsg.includes('could not be converted to System.Guid')) {
                rawMsg = 'Invalid selection. Please choose a valid item from the list.';
              } else if (rawMsg.includes('could not be converted to System.DateTime') || rawMsg.includes('Nullable`1[System.DateTime]') || rawMsg.includes('Nullable<System.DateTime>')) {
                rawMsg = 'Please enter a valid date.';
              } else if (rawMsg.includes('could not be converted to System.Decimal') || rawMsg.includes('could not be converted to System.Double') || rawMsg.includes('System.Int32')) {
                rawMsg = 'Please enter a valid number.';
              }
            }
            error.fieldErrors[camelKey] = rawMsg;
          }
        }
      }

      // Determine best human-readable display message
      const firstErrorMessage =
        data.errors && typeof data.errors === 'object'
          ? (Array.isArray(data.errors)
              ? data.errors.filter(Boolean).join(' ')
              : Object.values(data.errors).flat().filter(Boolean).join(' '))
          : null;

      error.displayMessage =
        data.detail ? data.detail :
        data.title && data.status === 400 ? 'Please correct the highlighted errors.' :
        firstErrorMessage ? firstErrorMessage :
        data.errorMessage ? data.errorMessage :
        data.ErrorMessage ? data.ErrorMessage :
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
