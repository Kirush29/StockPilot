import { apiClient } from './apiClient';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

const ENDPOINT = '/Products';

export const productService = {
  getAllProducts: () => apiClient.get<Product[]>(ENDPOINT),
  
  getProductById: (id: string) => apiClient.get<Product>(`${ENDPOINT}/${id}`),
};
