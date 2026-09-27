// Integration: the Supplier (S3) and Users (S1) pages were written against web/src's fetch-based apiClient
// (base "/api", token under localStorage "token"). This keeps that interface — get/post/put/patch/delete
// resolving to the response body, ApiError with the same messages — but sends every request through the
// shell's axios client, so the modules use the shell's base URL, JWT and 401 handling.
import shellClient from '../../api/axiosClient'

export class ApiError extends Error {
  public status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public data: any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, status: number, data?: any) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'ApiError'
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T>(method: Method, endpoint: string, body?: any): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  try {
    const response = await shellClient.request({ method, url: `/api${normalizedEndpoint}`, data: body })
    return response.data as T
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any
    const status: number = err.response?.status ?? 0
    const data = err.response?.data
    if (!err.response) {
      throw new ApiError('Unable to connect to the StockPilot API.', 0, error)
    }

    // Same message rules as web/src/services/apiClient.ts.
    let message = `API Error: ${status} ${err.response.statusText ?? ''}`.trim()
    if (status === 401 && normalizedEndpoint.includes('/auth/login')) {
      message = 'Invalid username/email or password'
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.'
    } else if (data && typeof data === 'object') {
      message = data.detail ?? data.title ?? data.message ?? message
    }
    throw new ApiError(message, status, data)
  }
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T>(endpoint: string, body?: any) => request<T>('POST', endpoint, body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T>(endpoint: string, body?: any) => request<T>('PUT', endpoint, body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T>(endpoint: string, body?: any) => request<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
}
