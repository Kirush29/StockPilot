import { apiClient } from './apiClient';

export type QuotationStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface Quotation {
  id: string;
  quotationReference: string;
  supplierId: string;
  productId: string;
  unitPrice: number;
  quantity: number;
  deliveryDays: number;
  status: QuotationStatus;
  validUntil: string;
  submittedAt: string;
  createdAt?: string; // Optional because comparison doesn't return it
}

export interface SaveQuotationRequest {
  id?: string;
  supplierId: string;
  productId: string;
  unitPrice: number;
  quantity: number;
  deliveryDays: number;
  validUntil: string;
}

export interface UpdateQuotationStatusRequest {
  status: QuotationStatus;
}

const ENDPOINT = '/Quotations';

export const quotationService = {
  getAllQuotations: async (): Promise<Quotation[]> => {
    const data = await apiClient.get<any>(ENDPOINT);
    return (Array.isArray(data) ? data : data?.data ?? []) as Quotation[];
  },
    
  getQuotationById: (id: string) => 
    apiClient.get<Quotation>(`${ENDPOINT}/${id}`),
    
  createQuotation: (data: SaveQuotationRequest) => 
    apiClient.post<Quotation>(ENDPOINT, data),
    
  updateQuotationStatus: (id: string, status: QuotationStatus) => 
    apiClient.put<void>(`${ENDPOINT}/${id}/status`, { status }),
    
  getQuotationsByProduct: async (productId: string): Promise<Quotation[]> => {
    const data = await apiClient.get<any>(`${ENDPOINT}/product/${productId}`);
    return (Array.isArray(data) ? data : data?.data ?? []) as Quotation[];
  },
    
  getQuotationsBySupplier: async (supplierId: string): Promise<Quotation[]> => {
    const data = await apiClient.get<any>(`${ENDPOINT}/supplier/${supplierId}`);
    return (Array.isArray(data) ? data : data?.data ?? []) as Quotation[];
  },
    
  compareQuotations: async (productId: string): Promise<Quotation[]> => {
    const data = await apiClient.get<any>(`${ENDPOINT}/compare?productId=${productId}`);
    return (Array.isArray(data) ? data : data?.data ?? []) as Quotation[];
  },
};
