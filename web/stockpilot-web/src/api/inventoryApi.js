import apiClient from './axiosClient'

// ── Inventory ────────────────────────────────────────────────────────────────
export const inventoryApi = {
  getAll:      ()                         => apiClient.get('/api/inventory'),
  getByBranch: (branchId)                 => apiClient.get(`/api/inventory/${branchId}`),
  getByBranchAndProduct: (branchId, productId) =>
    apiClient.get(`/api/inventory/${branchId}/product/${productId}`),
  getLowStock: (branchId)                 =>
    apiClient.get('/api/inventory/low-stock', { params: branchId ? { branchId } : {} }),
  search:      (term)                     => apiClient.get('/api/inventory/search', { params: { term } }),
}

// ── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:       (includeInactive = false) => apiClient.get('/api/products', { params: { includeInactive } }),
  getById:      (id)                      => apiClient.get(`/api/products/${id}`),
  getByBarcode: (barcode)                 => apiClient.get(`/api/products/barcode/${barcode}`),
  create:       (data)                    => apiClient.post('/api/products', data),
  update:       (id, data)                => apiClient.put(`/api/products/${id}`, data),
  deactivate:   (id)                      => apiClient.delete(`/api/products/${id}`),
}

// ── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll:  ()         => apiClient.get('/api/categories'),
  getById: (id)       => apiClient.get(`/api/categories/${id}`),
  create:  (data)     => apiClient.post('/api/categories', data),
  update:  (id, data) => apiClient.put(`/api/categories/${id}`, data),
}

// ── Batches ───────────────────────────────────────────────────────────────────
export const batchesApi = {
  getAll:     ()          => apiClient.get('/api/batches'),
  getById:    (id)        => apiClient.get(`/api/batches/${id}`),
  getExpiring:(days = 30) => apiClient.get('/api/batches/expiring', { params: { days } }),
  getExpired: ()          => apiClient.get('/api/batches/expired'),
  create:     (data)      => apiClient.post('/api/batches', data),
  update:     (id, data)  => apiClient.put(`/api/batches/${id}`, data),
  getExpiringByBranch: (branchId, days = 30) =>
    apiClient.get(`/api/batches/tools/expiring/${branchId}`, { params: { days } }),
}

// ── Stock Movements ───────────────────────────────────────────────────────────
export const movementsApi = {
  getAll:       ()          => apiClient.get('/api/stock-movements'),
  getById:      (id)        => apiClient.get(`/api/stock-movements/${id}`),
  getByProduct: (productId) => apiClient.get(`/api/stock-movements/product/${productId}`),
  getByBranch:  (branchId)  => apiClient.get(`/api/stock-movements/branch/${branchId}`),
  createAdjustment: (data)  => apiClient.post('/api/stock-movements/adjustment', data),
}

// ── Transfers ─────────────────────────────────────────────────────────────────
export const transfersApi = {
  getAll:   ()         => apiClient.get('/api/transfers'),
  getById:  (id)       => apiClient.get(`/api/transfers/${id}`),
  create:   (data)     => apiClient.post('/api/transfers', data),
  approve:  (id, data) => apiClient.post(`/api/transfers/${id}/approve`, data),
  reject:   (id, data) => apiClient.post(`/api/transfers/${id}/reject`, data),
  ship:     (id)       => apiClient.post(`/api/transfers/${id}/ship`),
  receive:  (id, data) => apiClient.post(`/api/transfers/${id}/receive`, data),
  cancel:   (id)       => apiClient.post(`/api/transfers/${id}/cancel`),
  getHistory: (productId, branchId) =>
    apiClient.get('/api/transfers/tools/history', { params: { productId, branchId } }),
}
