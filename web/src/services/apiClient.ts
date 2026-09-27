const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  public status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public data: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${normalizedEndpoint}`;

  const headers = new Headers(options?.headers);

  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options?.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError('Unable to connect to the StockPilot API.', 0, error);
  }

  let data;
  const contentType = response.headers.get('content-type');

  if (response.status !== 204) {
    if (contentType && (contentType.includes('application/json') || contentType.includes('application/problem+json'))) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  }

  if (!response.ok) {
    const isLoginEndpoint = normalizedEndpoint.includes('/auth/login');
    const isMeEndpoint = normalizedEndpoint.includes('/auth/me');

    if (response.status === 401 && !isLoginEndpoint && !isMeEndpoint) {
      window.dispatchEvent(new Event('auth:401'));
    }

    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    if (response.status === 401 && isLoginEndpoint) {
      errorMessage = 'Invalid username/email or password';
    } else if (response.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (data && typeof data === 'object') {
      if (data.detail) {
        errorMessage = data.detail;
      } else if (data.title) {
        errorMessage = data.title;
      } else if (data.message) {
        errorMessage = data.message;
      }
    }

    throw new ApiError(
      errorMessage,
      response.status,
      data
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestInit, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: Omit<RequestInit, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
