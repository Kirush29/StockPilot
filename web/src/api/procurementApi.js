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

// ── Procurement Coordinator Agent workflows ──────────────────────────────────
// The agent stops at PendingApproval; approve() is the human gate and delegates to the same
// approval-limit policy as proposalsApi.decide().
// ── Replenishment Orchestrator (multi-agent) ─────────────────────────────────
// One run goes Inventory Optimization → Demand Forecast → Supplier Evaluation → Procurement Coordinator
// and stops for a human. A 422/503 still carries the run's result in the response body.
export const replenishmentApi = {
  start: ({ branchId, productId, forecastDays, leadTimeDays }) =>
    apiClient.post('/api/agent-workflows/replenishment/start', {
      branchId,
      productId,
      ...(forecastDays ? { forecastDays } : {}),
      ...(leadTimeDays ? { leadTimeDays } : {}),
    }),
  get: (workflowId) => apiClient.get(`/api/agent-workflows/replenishment/${workflowId}`),
}

export const agentWorkflowsApi = {
  start: (objective) => apiClient.post('/api/agent-workflows/procurement/start', objective),
  get: (workflowId) => apiClient.get(`/api/agent-workflows/${workflowId}`),
  approve: (workflowId, comment = null) => apiClient.post(`/api/agent-workflows/${workflowId}/approve`, { comment }),
}
