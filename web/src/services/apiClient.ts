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
  // Ensure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${normalizedEndpoint}`;
  
  const headers = new Headers(options?.headers);
  
  // Automatically set Content-Type to JSON if a body is provided and not already set
  if (options?.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get('content-type');
  
  // Safely parse response
  if (response.status !== 204) { // 204 No Content
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  }

  if (!response.ok) {
    throw new ApiError(
      `API Error: ${response.status} ${response.statusText}`,
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
};
