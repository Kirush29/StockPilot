import { apiClient } from './apiClient';

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  rating: number;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRating {
  id: string;
  supplierId: string;
  rating: number;
  comment: string;
  ratedAt: string;
  isActive: boolean;
}

// Used for Create and Update (ID is optional for Create, ignored if empty Guid backend-side)
export interface SaveSupplierRequest {
  id?: string;
  supplierCode: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  rating: number;
  isActive: boolean;
  isBlocked: boolean;
}

export interface CreateSupplierRatingRequest {
  rating: number;
  comment?: string;
}

const ENDPOINT = '/Suppliers';

export const supplierService = {
  getAllSuppliers: () => apiClient.get<Supplier[]>(ENDPOINT),
  
  getSupplierById: (id: string) => apiClient.get<Supplier>(`${ENDPOINT}/${id}`),
  
  createSupplier: (data: SaveSupplierRequest) => 
    apiClient.post<Supplier>(ENDPOINT, data),
    
  updateSupplier: (id: string, data: SaveSupplierRequest) => 
    apiClient.put<Supplier>(`${ENDPOINT}/${id}`, { ...data, id }),
    
  deactivateSupplier: (id: string) => 
    apiClient.delete<void>(`${ENDPOINT}/${id}`),
    
  searchSuppliers: (keyword: string) => 
    apiClient.get<Supplier[]>(`${ENDPOINT}/search?keyword=${encodeURIComponent(keyword)}`),
    
  addSupplierRating: (supplierId: string, data: CreateSupplierRatingRequest) => 
    apiClient.post<SupplierRating>(`${ENDPOINT}/${supplierId}/ratings`, data),
    
  getSupplierRatings: (supplierId: string) => 
    apiClient.get<SupplierRating[]>(`${ENDPOINT}/${supplierId}/ratings`),
};
