import { apiClient } from '../services/apiClient';

export const inventoryApi = {
  getAll: () => apiClient.get('/api/inventory'),
  getByBranch: (branchId: string) => apiClient.get(`/api/inventory/${branchId}`),
  getByBranchAndProduct: (branchId: string, productId: string) =>
    apiClient.get(`/api/inventory/${branchId}/product/${productId}`),
  getLowStock: (branchId?: string) =>
    apiClient.get('/api/inventory/low-stock' + (branchId ? '?branchId=' + branchId : '')),
  search: (term: string) => apiClient.get('/api/inventory/search?term=' + encodeURIComponent(term)),
};

export const productsApi = {
  getAll: (includeInactive = false) => apiClient.get('/api/products?includeInactive=' + includeInactive),
  getById: (id: string) => apiClient.get(`/api/products/${id}`),
  getByBarcode: (barcode: string) => apiClient.get(`/api/products/barcode/${barcode}`),
  create: (data: any) => apiClient.post('/api/products', data),
  update: (id: string, data: any) => apiClient.put(`/api/products/${id}`, data),
  deactivate: (id: string) => apiClient.delete(`/api/products/${id}`),
};

export const categoriesApi = {
  getAll: () => apiClient.get('/api/categories'),
  getById: (id: string) => apiClient.get(`/api/categories/${id}`),
  create: (data: any) => apiClient.post('/api/categories', data),
  update: (id: string, data: any) => apiClient.put(`/api/categories/${id}`, data),
};

export const batchesApi = {
  getAll: () => apiClient.get('/api/batches'),
  getById: (id: string) => apiClient.get(`/api/batches/${id}`),
  getExpiring: (days = 30) => apiClient.get('/api/batches/expiring?days=' + days),
  getExpired: () => apiClient.get('/api/batches/expired'),
  create: (data: any) => apiClient.post('/api/batches', data),
  update: (id: string, data: any) => apiClient.put(`/api/batches/${id}`, data),
  getExpiringByBranch: (branchId: string, days = 30) =>
    apiClient.get(`/api/batches/tools/expiring/${branchId}?days=${days}`),
};

export const movementsApi = {
  getAll: () => apiClient.get('/api/stock-movements'),
  getById: (id: string) => apiClient.get(`/api/stock-movements/${id}`),
  getByProduct: (productId: string) => apiClient.get(`/api/stock-movements/product/${productId}`),
  getByBranch: (branchId: string) => apiClient.get(`/api/stock-movements/branch/${branchId}`),
  createAdjustment: (data: any) => apiClient.post('/api/stock-movements/adjustment', data),
};

export const transfersApi = {
  getAll: () => apiClient.get('/api/transfers'),
  getById: (id: string) => apiClient.get(`/api/transfers/${id}`),
  create: (data: any) => apiClient.post('/api/transfers', data),
  approve: (id: string, data?: any) => apiClient.post(`/api/transfers/${id}/approve`, data),
  reject: (id: string, data: any) => apiClient.post(`/api/transfers/${id}/reject`, data),
  ship: (id: string) => apiClient.post(`/api/transfers/${id}/ship`),
  receive: (id: string, data: any) => apiClient.post(`/api/transfers/${id}/receive`, data),
  cancel: (id: string) => apiClient.post(`/api/transfers/${id}/cancel`),
  getHistory: (productId: string, branchId: string) =>
    apiClient.get('/api/transfers/tools/history?productId=' + productId + '&branchId=' + branchId),
};

export const branchesApi = {
  getAll: () => apiClient.get('/api/branches'),
  getById: (id: string) => apiClient.get(`/api/branches/${id}`),
  create: (data: any) => apiClient.post('/api/branches', data),
  update: (id: string, data: any) => apiClient.put(`/api/branches/${id}`, data),
  toggleStatus: (id: string, active: boolean) => apiClient.patch(`/api/branches/${id}/status`, { isActive: active }),
};

export const optimizationApi = {
  getRecommendations: (branchId: string) => apiClient.get('/api/optimization/recommendations?branchId=' + branchId),
  getRecommendation: (id: string) => apiClient.get(`/api/optimization/recommendations/${id}`),
  analyze: (branchId: string) => apiClient.post('/api/optimization/analyze', { branchId }),
  approve: (id: string) => apiClient.post(`/api/optimization/recommendations/${id}/approve`),
  reject: (id: string, reason: string) => apiClient.post(`/api/optimization/recommendations/${id}/reject`, { reason }),
  verify: (id: string) => apiClient.post(`/api/optimization/recommendations/${id}/verify`),
};
