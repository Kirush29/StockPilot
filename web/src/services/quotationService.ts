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
  getAllQuotations: () => 
    apiClient.get<Quotation[]>(ENDPOINT),
    
  getQuotationById: (id: string) => 
    apiClient.get<Quotation>(`${ENDPOINT}/${id}`),
    
  createQuotation: (data: SaveQuotationRequest) => 
    apiClient.post<Quotation>(ENDPOINT, data),
    
  updateQuotationStatus: (id: string, status: QuotationStatus) => 
    apiClient.put<void>(`${ENDPOINT}/${id}/status`, { status }),
    
  getQuotationsByProduct: (productId: string) => 
    apiClient.get<Quotation[]>(`${ENDPOINT}/product/${productId}`),
    
  getQuotationsBySupplier: (supplierId: string) => 
    apiClient.get<Quotation[]>(`${ENDPOINT}/supplier/${supplierId}`),
    
  compareQuotations: (productId: string) => 
    apiClient.get<Quotation[]>(`${ENDPOINT}/compare?productId=${productId}`),
};
