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

const ENDPOINT = '/supplier-products';

export const productService = {
  getAllProducts: async (): Promise<Product[]> => {
    try {
      const res = await apiClient.get<any>(ENDPOINT);
      const list = Array.isArray(res) ? res : res?.data ?? [];
      if (list.length > 0) {
        return list.map((p: any) => ({
          ...p,
          id: p.id || p.productId,
          sku: p.sku || p.productCode || '',
          name: p.name || 'Unnamed Product',
          isActive: p.isActive !== false,
        }));
      }
    } catch {
      // Continue to fallback
    }

    try {
      const fallback = await apiClient.get<any>('/products');
      const list = Array.isArray(fallback) ? fallback : fallback?.data ?? [];
      return list.map((p: any) => ({
        ...p,
        id: p.id || p.productId,
        sku: p.sku || p.productCode || '',
        name: p.name || 'Unnamed Product',
        isActive: p.isActive !== false,
      }));
    } catch {
      return [];
    }
  },
  
  getProductById: async (id: string): Promise<Product> => {
    try {
      return await apiClient.get<Product>(`${ENDPOINT}/${id}`);
    } catch {
      return await apiClient.get<Product>(`/products/${id}`);
    }
  },
};
