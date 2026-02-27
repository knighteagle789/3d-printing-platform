import apiClient from '../api-client';

export interface OrderItem {
  id: string;
  fileName: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  color: string;
  quality: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ordersApi = {
  getMine: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResponse<Order>>('/Orders/my', {
      params: { page, pageSize },
    }),

  getById: (id: string) =>
    apiClient.get<Order>(`/Orders/${id}`),

  create: (data: {
    notes?: string;
    shippingAddress?: string;
    requiredByDate?: string;
    items: {
      fileId: string;
      materialId: string;
      quantity: number;
      color?: string;
      specialInstructions?: string;
      quality: string;
      infill?: number;
      supportStructures: boolean;
    }[];
  }) => apiClient.post<Order>('/Orders', data),
};