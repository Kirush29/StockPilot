import apiClient from './axiosClient'

// ── Proposals ────────────────────────────────────────────────────────────────
export const proposalsApi = {
  list: ({ status, supplierId, branchId, page = 1, pageSize = 20, sort = '-createdAt' } = {}) =>
    apiClient.get('/api/procurement/proposals', {
      params: { status, supplierId, branchId, page, pageSize, sort },
    }),
  getById: (id) => apiClient.get(`/api/procurement/proposals/${id}`),
  create: (data) => apiClient.post('/api/procurement/proposals', data),
  update: (id, data) => apiClient.put(`/api/procurement/proposals/${id}`, data),
  decide: (id, data) => apiClient.post(`/api/procurement/proposals/${id}/decision`, data),
  convert: (id) => apiClient.post(`/api/procurement/proposals/${id}/convert`),
}

// ── Purchase Orders ──────────────────────────────────────────────────────────
export const ordersApi = {
  list: ({ status, page = 1, pageSize = 20 } = {}) =>
    apiClient.get('/api/procurement/orders', { params: { status, page, pageSize } }),
  getById: (id) => apiClient.get(`/api/procurement/orders/${id}`),
  updateStatus: (id, data) => apiClient.patch(`/api/procurement/orders/${id}/status`, data),
}

// ── Budgets ──────────────────────────────────────────────────────────────────
export const budgetsApi = {
  list: (branchId) => apiClient.get('/api/procurement/budgets', { params: branchId ? { branchId } : {} }),
  create: (data) => apiClient.post('/api/procurement/budgets', data),
  getUtilization: (id) => apiClient.get(`/api/procurement/budgets/${id}/utilization`),
}
