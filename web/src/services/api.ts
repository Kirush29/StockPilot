import axios from 'axios';
import type {
  Sale,
  CreateSaleRequest,
  DemandForecast,
  ReorderSuggestion,
  SalesAnalyticsSummary,
} from '../types/sales';

const API_BASE_URL = 'http://localhost:5004/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const salesApi = {
  // Get sales transactions
  getSales: async (branchId?: string, startDate?: string, endDate?: string, paymentMethod?: number): Promise<Sale[]> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (paymentMethod !== undefined && paymentMethod > 0) params.paymentMethod = paymentMethod;
    const response = await apiClient.get<Sale[]>('/Sales', { params });
    return response.data;
  },

  // Record a new sale
  createSale: async (data: CreateSaleRequest): Promise<Sale> => {
    const response = await apiClient.post<Sale>('/Sales', data);
    return response.data;
  },

  // Get single sale by ID
  getSaleById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get<Sale>(`/Sales/${id}`);
    return response.data;
  },

  // Get sales analytics
  getAnalytics: async (branchId?: string, days: number = 30): Promise<SalesAnalyticsSummary> => {
    const params: Record<string, any> = { days };
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get<SalesAnalyticsSummary>('/Sales/analytics', { params });
    return response.data;
  },
};

export const demandApi = {
  // Trigger AI Demand Forecast Agent
  generateForecast: async (payload: {
    productId: string;
    productSku: string;
    productName: string;
    branchId?: string;
    branchName?: string;
    period: number;
    leadTimeDays?: number;
    currentStockLevel?: number;
  }): Promise<DemandForecast> => {
    const response = await apiClient.post<DemandForecast>('/demand/generate', payload);
    return response.data;
  },

  // Get latest forecast for product
  getLatestForecast: async (productId: string, branchId?: string): Promise<DemandForecast> => {
    const params: Record<string, any> = { productId };
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get<DemandForecast>('/demand/latest', { params });
    return response.data;
  },

  // Get forecast history
  getForecastHistory: async (branchId?: string): Promise<DemandForecast[]> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get<DemandForecast[]>('/demand/history', { params });
    return response.data;
  },

  // Get Reorder Point Suggestions
  getReorderSuggestions: async (branchId?: string): Promise<ReorderSuggestion[]> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get<ReorderSuggestion[]>('/demand/reorder-suggestions', { params });
    return response.data;
  },
};

export const agentApi = {
  // Execute Demand Forecast Agent with multi-step workflow
  runForecastAgent: async (payload: import('../types/sales').DemandForecastWorkflowRequest): Promise<import('../types/sales').AgentExecutionResult> => {
    const response = await apiClient.post<import('../types/sales').AgentExecutionResult>('/agent/demand-forecast/run', payload);
    return response.data;
  },

  // Get Workflow Audits
  getAudits: async (take: number = 20): Promise<import('../types/sales').WorkflowState[]> => {
    const response = await apiClient.get<import('../types/sales').WorkflowState[]>('/agent/audits', { params: { take } });
    return response.data;
  },

  // Get Workflow Audit by ID
  getAuditById: async (workflowId: string): Promise<import('../types/sales').WorkflowState> => {
    const response = await apiClient.get<import('../types/sales').WorkflowState>(`/agent/audits/${workflowId}`);
    return response.data;
  },

  // Evaluate Golden Benchmark Cases
  evaluateGoldenCases: async () => {
    const response = await apiClient.post('/agent/golden-cases/evaluate');
    return response.data;
  },
};

